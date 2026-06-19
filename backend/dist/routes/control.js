"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const devices_1 = require("./devices");
const threat_events_1 = require("../lib/db/threat_events");
const mqtt_1 = require("../services/mqtt");
const solanaQueue_1 = require("../blockchain/solanaQueue");
const events_1 = require("../blockchain/events");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
function parseChannel(raw) {
    const ch = Number(raw);
    if (!Number.isInteger(ch) || ch < 1 || ch > 4) {
        throw new errorHandler_1.HttpError(400, 'Relay channel must be 1-4');
    }
    return ch;
}
// POST /devices/:id/relay/:ch/on  and  /off
async function handleRelay(req, res, next, action) {
    try {
        const device = await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const channel = parseChannel(req.params.ch);
        // Publish the command to the device over MQTT (QoS 1).
        await (0, mqtt_1.publishCommand)(device.id, {
            command: action === 'on' ? 'relay_on' : 'relay_off',
            channel,
            requestedBy: req.user.walletAddress ?? req.user.id,
        });
        // Log the manual action as a threat_events row + Solana memo.
        const event = await (0, threat_events_1.insertEvent)({
            device_id: device.id,
            event_type: 'system_fault',
            severity: 'low',
            action_taken: `relay_ch${channel}_${action}`,
            relay_triggered: true,
            relay_channel: channel,
        });
        (0, solanaQueue_1.enqueueSolanaEvent)({
            table: 'threat_events',
            rowId: event.id,
            eventName: events_1.AURA_SOLANA_EVENTS.RELAY_OVERRIDE,
            memo: {
                deviceId: device.id,
                action,
                channel,
                requestedBy: req.user.walletAddress ?? req.user.id,
            },
        });
        res.json({ ok: true, event });
    }
    catch (err) {
        next(err);
    }
}
router.post('/devices/:id/relay/:ch/on', (req, res, next) => handleRelay(req, res, next, 'on'));
router.post('/devices/:id/relay/:ch/off', (req, res, next) => handleRelay(req, res, next, 'off'));
exports.default = router;
//# sourceMappingURL=control.js.map