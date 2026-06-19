"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const notifications_1 = require("../lib/db/notifications");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/notifications', async (req, res, next) => {
    try {
        const notifications = await (0, notifications_1.getNotifications)(req.user.id);
        const unread = await (0, notifications_1.getUnreadCount)(req.user.id);
        res.json({ notifications, unread });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/notifications/:id', async (req, res, next) => {
    try {
        await (0, notifications_1.markAsRead)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/notifications', async (req, res, next) => {
    try {
        await (0, notifications_1.markAllAsRead)(req.user.id);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map