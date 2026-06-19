import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { loadOwnedDevice } from './devices';
import { readingsLimiter } from '../middleware/rateLimit';
import {
  getRecentReadings,
  getReadingsByRange,
} from '../lib/db/sensor_readings';

const router = Router();
router.use(authMiddleware);

router.get(
  '/devices/:id/readings',
  readingsLimiter,
  async (req, res, next) => {
    try {
      await loadOwnedDevice(req.params.id, req.user!.id);
      const { from, to, limit } = req.query;
      if (typeof from === 'string' && typeof to === 'string') {
        const readings = await getReadingsByRange(req.params.id, from, to);
        res.json({ readings });
        return;
      }
      const readings = await getRecentReadings(
        req.params.id,
        limit ? Number(limit) : 50
      );
      res.json({ readings });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/devices/:id/readings/latest', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    const [latest] = await getRecentReadings(req.params.id, 1);
    res.json({ reading: latest ?? null });
  } catch (err) {
    next(err);
  }
});

export default router;
