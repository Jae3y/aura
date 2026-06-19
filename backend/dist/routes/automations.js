"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const devices_1 = require("./devices");
const automations_1 = require("../lib/db/automations");
const mqtt_1 = require("../services/mqtt");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const automationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    zone_id: zod_1.z.string().uuid().nullable().optional(),
    trigger_type: zod_1.z.enum([
        'schedule',
        'surge',
        'presence',
        'voice_command',
        'manual',
    ]),
    trigger_value: zod_1.z.record(zod_1.z.unknown()).nullable().optional(),
    action: zod_1.z.string().min(1),
    relay_channel: zod_1.z.number().int().min(1).max(4).nullable().optional(),
    is_active: zod_1.z.boolean().optional(),
});
async function loadOwnedAutomation(id, userId) {
    const automation = await (0, automations_1.getAutomationById)(id);
    if (!automation)
        throw new errorHandler_1.HttpError(404, 'Automation not found');
    await (0, devices_1.loadOwnedDevice)(automation.device_id, userId);
    return automation;
}
router.get('/devices/:id/automations', async (req, res, next) => {
    try {
        await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const automations = await (0, automations_1.getAutomationsByDevice)(req.params.id);
        res.json({ automations });
    }
    catch (err) {
        next(err);
    }
});
router.post('/devices/:id/automations', async (req, res, next) => {
    try {
        const device = await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const body = automationSchema.parse(req.body);
        const automation = await (0, automations_1.createAutomation)({ ...body, device_id: device.id });
        res.status(201).json({ automation });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/automations/:id', async (req, res, next) => {
    try {
        await loadOwnedAutomation(req.params.id, req.user.id);
        const patch = automationSchema.partial().parse(req.body);
        const automation = await (0, automations_1.updateAutomation)(req.params.id, patch);
        res.json({ automation });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/automations/:id', async (req, res, next) => {
    try {
        await loadOwnedAutomation(req.params.id, req.user.id);
        await (0, automations_1.deleteAutomation)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.post('/automations/:id/trigger', async (req, res, next) => {
    try {
        const automation = await loadOwnedAutomation(req.params.id, req.user.id);
        if (automation.relay_channel) {
            await (0, mqtt_1.publishCommand)(automation.device_id, {
                command: automation.action,
                channel: automation.relay_channel,
                requestedBy: req.user.walletAddress ?? req.user.id,
            });
        }
        const updated = await (0, automations_1.recordTrigger)(automation);
        res.json({ automation: updated });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=automations.js.map