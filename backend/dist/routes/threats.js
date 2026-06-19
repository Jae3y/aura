"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const devices_1 = require("./devices");
const supabase_1 = require("../lib/supabase");
const threat_events_1 = require("../lib/db/threat_events");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const patchSchema = zod_1.z.object({
    auto_resolved: zod_1.z.boolean().optional(),
    resolved_at: zod_1.z.string().optional(),
    alerta_status: zod_1.z.enum(['open', 'ack', 'closed']).optional(),
    action_taken: zod_1.z.string().optional(),
});
router.get('/devices/:id/threats', async (req, res, next) => {
    try {
        await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const limit = req.query.limit ? Number(req.query.limit) : 100;
        const threats = await (0, threat_events_1.getEventsByDevice)(req.params.id, limit);
        res.json({ threats });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/threats/:id', async (req, res, next) => {
    try {
        const event = await (0, threat_events_1.getEventById)(req.params.id);
        if (!event)
            throw new errorHandler_1.HttpError(404, 'Threat event not found');
        await (0, devices_1.loadOwnedDevice)(event.device_id, req.user.id);
        const patch = patchSchema.parse(req.body);
        const { data, error } = await supabase_1.supabaseAdmin
            .from('threat_events')
            .update(patch)
            .eq('id', req.params.id)
            .select('*')
            .single();
        if (error)
            throw error;
        res.json({ threat: data });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=threats.js.map