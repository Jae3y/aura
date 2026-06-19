import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { loadOwnedDevice } from './devices';
import { supabaseAdmin } from '../lib/supabase';
import { getEventsByDevice, getEventById } from '../lib/db/threat_events';

const router = Router();
router.use(authMiddleware);

const patchSchema = z.object({
  auto_resolved: z.boolean().optional(),
  resolved_at: z.string().optional(),
  alerta_status: z.enum(['open', 'ack', 'closed']).optional(),
  action_taken: z.string().optional(),
});

router.get('/devices/:id/threats', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const threats = await getEventsByDevice(req.params.id, limit);
    res.json({ threats });
  } catch (err) {
    next(err);
  }
});

router.patch('/threats/:id', async (req, res, next) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) throw new HttpError(404, 'Threat event not found');
    await loadOwnedDevice(event.device_id, req.user!.id);
    const patch = patchSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('threat_events')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ threat: data });
  } catch (err) {
    next(err);
  }
});

export default router;
