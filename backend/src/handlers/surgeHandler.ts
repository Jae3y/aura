import * as Sentry from '@sentry/node';
import type { Device, Severity } from '../types/database';
import { insertEvent, updateAlertaStatus } from '../lib/db/threat_events';
import { createNotification } from '../lib/db/notifications';
import { getOwnerProfileForDevice } from '../lib/db/profiles';
import { enqueueSolanaEvent } from '../blockchain/solanaQueue';
import { AURA_SOLANA_EVENTS } from '../blockchain/events';
import { buildSurgePayload, sendAlert } from '../services/alerta';
import { notifyThreat } from '../services/notify';
import * as mqttService from '../services/mqtt';
import { emitToDevice } from '../socket';
import { SOCKET_EVENTS } from '../socket/events';

interface SurgePayload {
  voltage?: number;
  current?: number;
  severity?: Severity;
  relayChannel?: number;
  actionTaken?: string;
}

// Full surge pipeline — fires all 7 side effects for every valid payload
// (Property 6).
export async function handleSurge(
  device: Device,
  payload: SurgePayload
): Promise<void> {
  const severity: Severity = payload.severity ?? 'high';
  const relayChannel = payload.relayChannel ?? 1;

  // 1. Insert threat_events row.
  const event = await insertEvent({
    device_id: device.id,
    event_type: 'surge',
    severity,
    voltage_at_event: payload.voltage ?? null,
    current_at_event: payload.current ?? null,
    action_taken: payload.actionTaken ?? 'relay_cutoff',
    relay_triggered: true,
    relay_channel: relayChannel,
  });

  // 2. Enqueue Solana memo write (non-blocking).
  enqueueSolanaEvent({
    table: 'threat_events',
    rowId: event.id,
    eventName: AURA_SOLANA_EVENTS.SURGE_DETECTED,
    memo: {
      deviceId: device.id,
      severity,
      voltage: payload.voltage,
      current: payload.current,
    },
  });

  // 3. Submit Alerta Telegram notification and store requestRef.
  const alert = await sendAlert(buildSurgePayload(event, device));
  if (alert?.requestRef) await updateAlertaStatus(event.id, alert.requestRef, 'open');

  // 4 & 5. FCM push (+ Resend fallback) and in-app notification row.
  const owner = await getOwnerProfileForDevice(device.id);
  if (owner) {
    await notifyThreat(owner, event, device);
    await createNotification({
      user_id: owner.id,
      threat_event_id: event.id,
      type: 'push',
      title: `Surge on ${device.name}`,
      body: `${payload.voltage ?? '?'}V — relay cut on channel ${relayChannel}`,
    });
  }

  // 6. Emit Socket.io threat:new.
  emitToDevice(device.id, SOCKET_EVENTS.THREAT_NEW, { event });

  // 7. Publish relay command back to the device.
  try {
    await mqttService.publishCommand(device.id, {
      command: 'relay_off',
      channel: relayChannel,
      requestedBy: 'aura-auto',
      solanaSignature: event.solana_signature ?? undefined,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: 'surge-relay' } });
  }
}
