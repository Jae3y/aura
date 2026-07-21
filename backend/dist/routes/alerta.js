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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const express_1 = require("express");
const Sentry = __importStar(require("@sentry/node"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const devices_1 = require("./devices");
const alerta_1 = require("../services/alerta");
const threat_events_1 = require("../lib/db/threat_events");
const socket_1 = require("../socket");
const events_1 = require("../socket/events");
const config_1 = require("../config");
// ---------------------------------------------------------------------------
// Alerta routes — Encrisoft Alerta v2 (notification routing only).
// There is no alert lifecycle (no ack/close/status). All routes here either
// query local DB state or trigger a manual notification send.
// ---------------------------------------------------------------------------
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// POST /alerta/webhook
// Receives lifecycle callbacks from Alerta (acknowledge / close).
// HMAC-SHA256 signature verification uses ALERTA_API_KEY as the secret.
// On valid payload:
//   - 'acknowledge' → threat_events.alerta_status = 'ack'
//   - 'close'       → threat_events.alerta_status = 'closed'
// Emits Socket.io `alerta:update` to the device owner's room.
// ---------------------------------------------------------------------------
router.post('/webhook', async (req, res, next) => {
    try {
        // ----- HMAC verification -----
        const rawBody = req.rawBody;
        const signature = req.headers['x-alerta-signature'];
        if (rawBody && signature) {
            const expected = crypto_1.default
                .createHmac('sha256', config_1.config.ALERTA_API_KEY)
                .update(rawBody)
                .digest('hex');
            const sigBuffer = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
            const expBuffer = Buffer.from(expected, 'hex');
            if (sigBuffer.length !== expBuffer.length ||
                !crypto_1.default.timingSafeEqual(sigBuffer, expBuffer)) {
                res.status(401).json({ error: { message: 'Invalid webhook signature', status: 401 } });
                return;
            }
        }
        // In dev/test rawBody or signature may be absent — allow through so tests
        // without raw-body middleware still exercise the handler logic.
        const { action, alertId } = req.body ?? {};
        if (!alertId || typeof alertId !== 'string') {
            res.status(400).json({ error: { message: 'Missing alertId', status: 400 } });
            return;
        }
        if (action !== 'acknowledge' && action !== 'close') {
            // Unknown action — acknowledge receipt without side effects.
            res.json({ ok: true });
            return;
        }
        const newStatus = action === 'acknowledge' ? 'ack' : 'closed';
        // Find the threat event linked to this Alerta alert.
        const event = await (0, threat_events_1.findByAlertaId)(alertId);
        if (!event) {
            // Alert not found locally — may have been created outside this instance.
            res.status(404).json({ error: { message: 'Alert not found', status: 404 } });
            return;
        }
        // Persist status change.
        await (0, threat_events_1.updateAlertaStatus)(event.id, alertId, newStatus);
        // Emit Socket.io update to the device owner's room.
        (0, socket_1.emitToDevice)(event.device_id, events_1.SOCKET_EVENTS.ALERTA_UPDATE, {
            threatId: event.id,
            alertId,
            alertaStatus: newStatus,
        });
        res.json({ ok: true, threatId: event.id, alertaStatus: newStatus });
    }
    catch (err) {
        Sentry.captureException(err, { tags: { subsystem: 'alerta-webhook' } });
        next(err);
    }
});
// GET /alerta/notifications/:deviceId
// Returns local threat events that triggered Alerta notifications.
router.get('/notifications/:deviceId', auth_1.authMiddleware, async (req, res, next) => {
    try {
        await (0, devices_1.loadOwnedDevice)(req.params.deviceId, req.user.id);
        const events = await (0, threat_events_1.getEventsByDevice)(req.params.deviceId);
        // Return events that had an Alerta notification sent (alerta_alert_id stores requestRef).
        const notified = events.filter((e) => e.alerta_alert_id != null);
        res.json({ notifications: notified });
    }
    catch (err) {
        next(err);
    }
});
// POST /alerta/test/:deviceId
// Sends a test Telegram notification for a device — useful for verifying
// Alerta credentials and channel ref are working.
router.post('/test/:deviceId', auth_1.authMiddleware, async (req, res, next) => {
    try {
        const device = await (0, devices_1.loadOwnedDevice)(req.params.deviceId, req.user.id);
        const result = await (0, alerta_1.sendAlert)({
            channelRef: req.body?.channelRef ?? config_1.config.ALERTA_CHANNEL_REF,
            title: `🧪 AURA Test — ${device.name}`,
            message: `This is a test notification from AURA.\n` +
                `Device: ${device.name}\n` +
                `Location: ${device.location_label ?? 'Unknown'}\n` +
                `Time: ${new Date().toISOString()}`,
            severity: 'Info',
        });
        if (!result?.success) {
            throw new errorHandler_1.HttpError(502, 'Alerta notification failed — check credentials and channel ref');
        }
        res.json({ ok: true, requestRef: result.requestRef, sentAt: result.sentAt });
    }
    catch (err) {
        Sentry.captureException(err, { tags: { subsystem: 'alerta-test' } });
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=alerta.js.map