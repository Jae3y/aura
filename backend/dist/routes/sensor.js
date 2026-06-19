"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const devices_1 = require("./devices");
const rateLimit_1 = require("../middleware/rateLimit");
const sensor_readings_1 = require("../lib/db/sensor_readings");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/devices/:id/readings', rateLimit_1.readingsLimiter, async (req, res, next) => {
    try {
        await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const { from, to, limit } = req.query;
        if (typeof from === 'string' && typeof to === 'string') {
            const readings = await (0, sensor_readings_1.getReadingsByRange)(req.params.id, from, to);
            res.json({ readings });
            return;
        }
        const readings = await (0, sensor_readings_1.getRecentReadings)(req.params.id, limit ? Number(limit) : 50);
        res.json({ readings });
    }
    catch (err) {
        next(err);
    }
});
router.get('/devices/:id/readings/latest', async (req, res, next) => {
    try {
        await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const [latest] = await (0, sensor_readings_1.getRecentReadings)(req.params.id, 1);
        res.json({ reading: latest ?? null });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=sensor.js.map