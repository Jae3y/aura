import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { loadOwnedDevice } from './devices';
import {
  insertVoiceCommand,
  updateVoiceCommand,
  getVoiceCommandsByDevice,
} from '../lib/db/voice_commands';
import { publishCommand } from '../services/mqtt';
import { enqueueSolanaEvent } from '../blockchain/solanaQueue';
import { AURA_SOLANA_EVENTS } from '../blockchain/events';

const router = Router();
router.use(authMiddleware);

const CONFIDENCE_THRESHOLD = 0.7;

const commandSchema = z.object({
  device_id: z.string().uuid(),
  raw_command: z.string().min(1),
  parsed_intent: z.string().optional(),
  confidence_score: z.number().min(0).max(1),
  action_triggered: z.string().optional(),
  relay_channel: z.number().int().min(1).max(4).optional(),
});

router.post('/voice/command', async (req, res, next) => {
  try {
    const body = commandSchema.parse(req.body);
    await loadOwnedDevice(body.device_id, req.user!.id);

    // Insert with was_executed = false before evaluating threshold (Req 6.3).
    const cmd = await insertVoiceCommand({
      device_id: body.device_id,
      user_id: req.user!.id,
      raw_command: body.raw_command,
      parsed_intent: body.parsed_intent ?? null,
      confidence_score: body.confidence_score,
      action_triggered: body.action_triggered ?? null,
      was_executed: false,
    });

    if (body.confidence_score > CONFIDENCE_THRESHOLD && body.action_triggered) {
      if (body.relay_channel) {
        await publishCommand(body.device_id, {
          command: body.action_triggered,
          channel: body.relay_channel,
          requestedBy: req.user!.walletAddress ?? req.user!.id,
        });
      }
      const updated = await updateVoiceCommand(cmd.id, {
        was_executed: true,
        execution_result: 'executed',
      });
      enqueueSolanaEvent({
        table: 'voice_commands',
        rowId: cmd.id,
        eventName: AURA_SOLANA_EVENTS.VOICE_COMMAND,
        memo: {
          deviceId: body.device_id,
          command: body.raw_command,
          intent: body.parsed_intent,
        },
      });
      res.status(201).json({ command: updated });
      return;
    }

    res.status(201).json({ command: cmd });
  } catch (err) {
    next(err);
  }
});

router.get('/devices/:id/voice', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    const commands = await getVoiceCommandsByDevice(req.params.id);
    res.json({ commands });
  } catch (err) {
    next(err);
  }
});

export default router;
