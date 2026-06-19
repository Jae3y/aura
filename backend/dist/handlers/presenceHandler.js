"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePresence = handlePresence;
const zones_1 = require("../lib/db/zones");
const automations_1 = require("../lib/db/automations");
const threat_events_1 = require("../lib/db/threat_events");
const notifications_1 = require("../lib/db/notifications");
const profiles_1 = require("../lib/db/profiles");
const solanaQueue_1 = require("../blockchain/solanaQueue");
const events_1 = require("../blockchain/events");
const alerta_1 = require("../services/alerta");
const notify_1 = require("../services/notify");
const mqtt_1 = require("../services/mqtt");
const socket_1 = require("../socket");
const events_2 = require("../socket/events");
async function handlePresence(device, payload) {
    const { detected, zoneId } = payload;
    // 1. Update zone presence flag.
    const zones = await (0, zones_1.getZonesByDevice)(device.id);
    const zone = zoneId
        ? zones.find((z) => z.id === zoneId)
        : zones[0];
    if (zone) {
        await (0, zones_1.setPresence)(zone.id, detected);
        (0, socket_1.emitToDevice)(device.id, events_2.SOCKET_EVENTS.PRESENCE_UPDATE, {
            deviceId: device.id,
            zoneId: zone.id,
            detected,
        });
        // 2. Intrusion logic: presence in restricted/critical zone raises a threat.
        const isRestricted = zone.zone_type === 'restricted' || zone.zone_type === 'critical';
        if (detected && isRestricted) {
            const severity = device.environment_type === 'hospital' && zone.zone_type === 'critical'
                ? 'critical'
                : 'high';
            const event = await (0, threat_events_1.insertEvent)({
                device_id: device.id,
                event_type: 'intrusion',
                severity,
                action_taken: 'alert_raised',
            });
            (0, solanaQueue_1.enqueueSolanaEvent)({
                table: 'threat_events',
                rowId: event.id,
                eventName: events_1.AURA_SOLANA_EVENTS.INTRUSION_DETECTED,
                memo: { deviceId: device.id, zoneId: zone.id, severity },
            });
            const alert = await (0, alerta_1.sendAlert)((0, alerta_1.buildIntrusionPayload)(event, zone, device));
            if (alert?.requestRef)
                await (0, threat_events_1.updateAlertaStatus)(event.id, alert.requestRef, 'open');
            const owner = await (0, profiles_1.getOwnerProfileForDevice)(device.id);
            if (owner) {
                await (0, notify_1.notifyThreat)(owner, event, device);
                await (0, notifications_1.createNotification)({
                    user_id: owner.id,
                    threat_event_id: event.id,
                    type: 'push',
                    title: `Intrusion in ${zone.name}`,
                    body: `${device.name}: presence detected in ${zone.zone_type} zone`,
                });
            }
            (0, socket_1.emitToDevice)(device.id, events_2.SOCKET_EVENTS.THREAT_NEW, { event });
        }
    }
    // 3. Evaluate presence-triggered automations.
    if (detected) {
        const automations = await (0, automations_1.getAutomationsByDevice)(device.id);
        for (const auto of automations) {
            if (!auto.is_active || auto.trigger_type !== 'presence')
                continue;
            await (0, automations_1.recordTrigger)(auto);
            await (0, mqtt_1.publishCommand)(device.id, {
                command: auto.action,
                requestedBy: 'automation',
            }).catch(() => undefined);
        }
    }
}
//# sourceMappingURL=presenceHandler.js.map