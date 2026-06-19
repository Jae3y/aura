import type { Device } from '../types/database';
import { getZonesByDevice, setPresence } from '../lib/db/zones';
import { getAutomationsByDevice, recordTrigger } from '../lib/db/automations';
import { insertEvent, updateAlertaStatus } from '../lib/db/threat_events';
import { createNotification } from '../lib/db/notifications';
import { getOwnerProfileForDevice } from '../lib/db/profiles';
import { enqueueSolanaEvent } from '../blockchain/solanaQueue';
import { AURA_SOLANA_EVENTS } from '../blockchain/events';
import { buildIntrusionPayload, sendAlert } from '../services/alerta';
import { notifyThreat } from '../services/notify';
import { publishCommand } from '../services/mqtt';
import { emitToDevice } from '../socket';
import { SOCKET_EVENTS } from '../socket/events';

interface PresencePayload {
  zoneId?: string;
  detected: boolean;
  confidence?: number;
}

export async function handlePresence(
  device: Device,
  payload: PresencePayload
): Promise<void> {
  const { detected, zoneId } = payload;

  // 1. Update zone presence flag.
  const zones = await getZonesByDevice(device.id);
  const zone = zoneId
    ? zones.find((z) => z.id === zoneId)
    : zones[0];

  if (zone) {
    await setPresence(zone.id, detected);
    emitToDevice(device.id, SOCKET_EVENTS.PRESENCE_UPDATE, {
      deviceId: device.id,
      zoneId: zone.id,
      detected,
    });

    // 2. Intrusion logic: presence in restricted/critical zone raises a threat.
    const isRestricted =
      zone.zone_type === 'restricted' || zone.zone_type === 'critical';
    if (detected && isRestricted) {
      const severity =
        device.environment_type === 'hospital' && zone.zone_type === 'critical'
          ? 'critical'
          : 'high';

      const event = await insertEvent({
        device_id: device.id,
        event_type: 'intrusion',
        severity,
        action_taken: 'alert_raised',
      });

      enqueueSolanaEvent({
        table: 'threat_events',
        rowId: event.id,
        eventName: AURA_SOLANA_EVENTS.INTRUSION_DETECTED,
        memo: { deviceId: device.id, zoneId: zone.id, severity },
      });

      const alert = await sendAlert(buildIntrusionPayload(event, zone, device));
      if (alert?.requestRef) await updateAlertaStatus(event.id, alert.requestRef, 'open');

      const owner = await getOwnerProfileForDevice(device.id);
      if (owner) {
        await notifyThreat(owner, event, device);
        await createNotification({
          user_id: owner.id,
          threat_event_id: event.id,
          type: 'push',
          title: `Intrusion in ${zone.name}`,
          body: `${device.name}: presence detected in ${zone.zone_type} zone`,
        });
      }

      emitToDevice(device.id, SOCKET_EVENTS.THREAT_NEW, { event });
    }
  }

  // 3. Evaluate presence-triggered automations.
  if (detected) {
    const automations = await getAutomationsByDevice(device.id);
    for (const auto of automations) {
      if (!auto.is_active || auto.trigger_type !== 'presence') continue;
      await recordTrigger(auto);
      await publishCommand(device.id, {
        command: auto.action,
        requestedBy: 'automation',
      }).catch(() => undefined);
    }
  }
}
