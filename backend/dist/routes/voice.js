"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const devices_1 = require("./devices");
const voice_commands_1 = require("../lib/db/voice_commands");
const mqtt_1 = require("../services/mqtt");
const solanaQueue_1 = require("../blockchain/solanaQueue");
const events_1 = require("../blockchain/events");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const CONFIDENCE_THRESHOLD = 0.75;
const commandSchema = zod_1.z.object({
    device_id: zod_1.z.string().uuid(),
    raw_command: zod_1.z.string().min(1),
    parsed_intent: zod_1.z.string().optional(),
    confidence_score: zod_1.z.number().min(0).max(1),
    action_triggered: zod_1.z.string().optional(),
    relay_channel: zod_1.z.number().int().min(1).max(4).optional(),
});
router.post('/voice/command', async (req, res, next) => {
    try {
        const body = commandSchema.parse(req.body);
        await (0, devices_1.loadOwnedDevice)(body.device_id, req.user.id);
        // Insert with was_executed = false before evaluating threshold (Req 6.3).
        const cmd = await (0, voice_commands_1.insertVoiceCommand)({
            device_id: body.device_id,
            user_id: req.user.id,
            raw_command: body.raw_command,
            parsed_intent: body.parsed_intent ?? null,
            confidence_score: body.confidence_score,
            action_triggered: body.action_triggered ?? null,
            was_executed: false,
        });
        if (body.confidence_score > CONFIDENCE_THRESHOLD && body.action_triggered) {
            await (0, mqtt_1.publishCommand)(body.device_id, {
                command: body.action_triggered,
                channel: body.relay_channel,
                requestedBy: req.user.walletAddress ?? req.user.id,
            });
            const updated = await (0, voice_commands_1.updateVoiceCommand)(cmd.id, {
                was_executed: true,
                execution_result: 'executed',
            });
            (0, solanaQueue_1.enqueueSolanaEvent)({
                table: 'voice_commands',
                rowId: cmd.id,
                eventName: events_1.AURA_SOLANA_EVENTS.VOICE_COMMAND,
                memo: {
                    deviceId: body.device_id,
                    command: body.raw_command,
                    intent: body.parsed_intent,
                },
            });
            res.status(201).json({ command: updated });
            return;
        }
        res.status(201).json({ command: cmd });
    }
    catch (err) {
        next(err);
    }
});
router.get('/devices/:id/voice', async (req, res, next) => {
    try {
        await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const commands = await (0, voice_commands_1.getVoiceCommandsByDevice)(req.params.id);
        res.json({ commands });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=voice.js.map