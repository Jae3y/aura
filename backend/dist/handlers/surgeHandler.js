"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSurge = handleSurge;
const Sentry = __importStar(require("@sentry/node"));
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
// Full surge pipeline — fires all 7 side effects for every valid payload
// (Property 6).
async function handleSurge(device, payload) {
    const severity = payload.severity ?? 'high';
    const relayChannel = payload.relayChannel ?? 1;
    // 1. Insert threat_events row.
    const event = await (0, threat_events_1.insertEvent)({
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
    (0, solanaQueue_1.enqueueSolanaEvent)({
        table: 'threat_events',
        rowId: event.id,
        eventName: events_1.AURA_SOLANA_EVENTS.SURGE_DETECTED,
        memo: {
            deviceId: device.id,
            severity,
            voltage: payload.voltage,
            current: payload.current,
        },
    });
    // 3. Submit Alerta Telegram notification and store requestRef.
    const alert = await (0, alerta_1.sendAlert)((0, alerta_1.buildSurgePayload)(event, device));
    if (alert?.requestRef)
        await (0, threat_events_1.updateAlertaStatus)(event.id, alert.requestRef, 'open');
    // 4 & 5. FCM push (+ Resend fallback) and in-app notification row.
    const owner = await (0, profiles_1.getOwnerProfileForDevice)(device.id);
    if (owner) {
        await (0, notify_1.notifyThreat)(owner, event, device);
        await (0, notifications_1.createNotification)({
            user_id: owner.id,
            threat_event_id: event.id,
            type: 'push',
            title: `Surge on ${device.name}`,
            body: `${payload.voltage ?? '?'}V — relay cut on channel ${relayChannel}`,
        });
    }
    // 6. Emit Socket.io threat:new.
    (0, socket_1.emitToDevice)(device.id, events_2.SOCKET_EVENTS.THREAT_NEW, { event });
    // 7. Publish relay command back to the device.
    try {
        await (0, mqtt_1.publishCommand)(device.id, {
            command: 'relay_off',
            channel: relayChannel,
            requestedBy: 'aura-auto',
            solanaSignature: event.solana_signature ?? undefined,
        });
    }
    catch (err) {
        Sentry.captureException(err, { tags: { subsystem: 'surge-relay' } });
    }
}
//# sourceMappingURL=surgeHandler.js.map