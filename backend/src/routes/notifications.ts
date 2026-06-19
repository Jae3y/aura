import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../lib/db/notifications';

const router = Router();
router.use(authMiddleware);

router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await getNotifications(req.user!.id);
    const unread = await getUnreadCount(req.user!.id);
    res.json({ notifications, unread });
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/:id', async (req, res, next) => {
  try {
    await markAsRead(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications', async (req, res, next) => {
  try {
    await markAllAsRead(req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
