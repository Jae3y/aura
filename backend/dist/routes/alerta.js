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
const express_1 = require("express");
const Sentry = __importStar(require("@sentry/node"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const devices_1 = require("./devices");
const alerta_1 = require("../services/alerta");
const threat_events_1 = require("../lib/db/threat_events");
// ---------------------------------------------------------------------------
// Alerta routes — Encrisoft Alerta v2 (notification routing only).
// There is no alert lifecycle (no ack/close/status). All routes here either
// query local DB state or trigger a manual notification send.
// ---------------------------------------------------------------------------
const router = (0, express_1.Router)();
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
            channelRef: req.body?.channelRef ?? undefined,
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