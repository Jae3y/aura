"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const devices_1 = require("./devices");
const zones_1 = require("../lib/db/zones");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const zoneSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    zone_type: zod_1.z.enum(['general', 'restricted', 'critical']).optional(),
    is_active: zod_1.z.boolean().optional(),
});
// Hospital deployments get tighter (critical) defaults per Req 7.2.
function defaultZoneType(env, requested) {
    if (requested)
        return requested;
    return env === 'hospital' ? 'restricted' : 'general';
}
async function loadOwnedZone(zoneId, userId) {
    const zone = await (0, zones_1.getZoneById)(zoneId);
    if (!zone)
        throw new errorHandler_1.HttpError(404, 'Zone not found');
    await (0, devices_1.loadOwnedDevice)(zone.device_id, userId);
    return zone;
}
router.get('/devices/:id/zones', async (req, res, next) => {
    try {
        await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const zones = await (0, zones_1.getZonesByDevice)(req.params.id);
        res.json({ zones });
    }
    catch (err) {
        next(err);
    }
});
router.post('/devices/:id/zones', async (req, res, next) => {
    try {
        const device = await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const body = zoneSchema.parse(req.body);
        const zone = await (0, zones_1.createZone)({
            device_id: device.id,
            name: body.name,
            zone_type: defaultZoneType(device.environment_type, body.zone_type),
            is_active: body.is_active ?? true,
        });
        res.status(201).json({ zone });
    }
    catch (err) {
        next(err);
    }
});
router.get('/zones/:id', async (req, res, next) => {
    try {
        const zone = await loadOwnedZone(req.params.id, req.user.id);
        res.json({ zone });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/zones/:id', async (req, res, next) => {
    try {
        await loadOwnedZone(req.params.id, req.user.id);
        const patch = zoneSchema.partial().parse(req.body);
        const zone = await (0, zones_1.updateZone)(req.params.id, patch);
        res.json({ zone });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/zones/:id', async (req, res, next) => {
    try {
        await loadOwnedZone(req.params.id, req.user.id);
        await (0, zones_1.deleteZone)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=zones.js.map