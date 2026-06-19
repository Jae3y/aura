import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { loadOwnedDevice } from './devices';
import {
  getZonesByDevice,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
} from '../lib/db/zones';

const router = Router();
router.use(authMiddleware);

const zoneSchema = z.object({
  name: z.string().min(1),
  zone_type: z.enum(['general', 'restricted', 'critical']).optional(),
  is_active: z.boolean().optional(),
});

// Hospital deployments get tighter (critical) defaults per Req 7.2.
function defaultZoneType(env: string, requested?: string) {
  if (requested) return requested;
  return env === 'hospital' ? 'restricted' : 'general';
}

async function loadOwnedZone(zoneId: string, userId: string) {
  const zone = await getZoneById(zoneId);
  if (!zone) throw new HttpError(404, 'Zone not found');
  await loadOwnedDevice(zone.device_id, userId);
  return zone;
}

router.get('/devices/:id/zones', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    const zones = await getZonesByDevice(req.params.id);
    res.json({ zones });
  } catch (err) {
    next(err);
  }
});

router.post('/devices/:id/zones', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    const body = zoneSchema.parse(req.body);
    const zone = await createZone({
      device_id: device.id,
      name: body.name,
      zone_type: defaultZoneType(device.environment_type, body.zone_type) as
        | 'general'
        | 'restricted'
        | 'critical',
      is_active: body.is_active ?? true,
    });
    res.status(201).json({ zone });
  } catch (err) {
    next(err);
  }
});

router.get('/zones/:id', async (req, res, next) => {
  try {
    const zone = await loadOwnedZone(req.params.id, req.user!.id);
    res.json({ zone });
  } catch (err) {
    next(err);
  }
});

router.patch('/zones/:id', async (req, res, next) => {
  try {
    await loadOwnedZone(req.params.id, req.user!.id);
    const patch = zoneSchema.partial().parse(req.body);
    const zone = await updateZone(req.params.id, patch);
    res.json({ zone });
  } catch (err) {
    next(err);
  }
});

router.delete('/zones/:id', async (req, res, next) => {
  try {
    await loadOwnedZone(req.params.id, req.user!.id);
    await deleteZone(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
