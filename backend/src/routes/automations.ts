import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { loadOwnedDevice } from './devices';
import {
  getAutomationsByDevice,
  getAutomationById,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  recordTrigger,
} from '../lib/db/automations';
import { publishCommand } from '../services/mqtt';

const router = Router();
router.use(authMiddleware);

const automationSchema = z.object({
  name: z.string().min(1),
  zone_id: z.string().uuid().nullable().optional(),
  trigger_type: z.enum([
    'schedule',
    'surge',
    'presence',
    'voice_command',
    'manual',
  ]),
  trigger_value: z.record(z.unknown()).nullable().optional(),
  action: z.string().min(1),
  relay_channel: z.number().int().min(1).max(4).nullable().optional(),
  is_active: z.boolean().optional(),
});

async function loadOwnedAutomation(id: string, userId: string) {
  const automation = await getAutomationById(id);
  if (!automation) throw new HttpError(404, 'Automation not found');
  await loadOwnedDevice(automation.device_id, userId);
  return automation;
}

router.get('/devices/:id/automations', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    const automations = await getAutomationsByDevice(req.params.id);
    res.json({ automations });
  } catch (err) {
    next(err);
  }
});

router.post('/devices/:id/automations', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    const body = automationSchema.parse(req.body);
    const automation = await createAutomation({ ...body, device_id: device.id });
    res.status(201).json({ automation });
  } catch (err) {
    next(err);
  }
});

router.patch('/automations/:id', async (req, res, next) => {
  try {
    await loadOwnedAutomation(req.params.id, req.user!.id);
    const patch = automationSchema.partial().parse(req.body);
    const automation = await updateAutomation(req.params.id, patch);
    res.json({ automation });
  } catch (err) {
    next(err);
  }
});

router.delete('/automations/:id', async (req, res, next) => {
  try {
    await loadOwnedAutomation(req.params.id, req.user!.id);
    await deleteAutomation(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/automations/:id/trigger', async (req, res, next) => {
  try {
    const automation = await loadOwnedAutomation(req.params.id, req.user!.id);
    if (automation.relay_channel) {
      await publishCommand(automation.device_id, {
        command: automation.action,
        channel: automation.relay_channel,
        requestedBy: req.user!.walletAddress ?? req.user!.id,
      });
    }
    const updated = await recordTrigger(automation);
    res.json({ automation: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
