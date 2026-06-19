import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { loadOwnedDevice } from './devices';
import { insertEvent } from '../lib/db/threat_events';
import { publishCommand } from '../services/mqtt';
import { enqueueSolanaEvent } from '../blockchain/solanaQueue';
import { AURA_SOLANA_EVENTS } from '../blockchain/events';

const router = Router();
router.use(authMiddleware);

function parseChannel(raw: string): number {
  const ch = Number(raw);
  if (!Number.isInteger(ch) || ch < 1 || ch > 4) {
    throw new HttpError(400, 'Relay channel must be 1-4');
  }
  return ch;
}

// POST /devices/:id/relay/:ch/on  and  /off
async function handleRelay(
  req: Parameters<Parameters<typeof router.post>[1]>[0],
  res: Parameters<Parameters<typeof router.post>[1]>[1],
  next: Parameters<Parameters<typeof router.post>[1]>[2],
  action: 'on' | 'off'
) {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    const channel = parseChannel(req.params.ch);

    // Publish the command to the device over MQTT (QoS 1).
    await publishCommand(device.id, {
      command: action === 'on' ? 'relay_on' : 'relay_off',
      channel,
      requestedBy: req.user!.walletAddress ?? req.user!.id,
    });

    // Log the manual action as a threat_events row + Solana memo.
    const event = await insertEvent({
      device_id: device.id,
      event_type: 'system_fault',
      severity: 'low',
      action_taken: `relay_ch${channel}_${action}`,
      relay_triggered: true,
      relay_channel: channel,
    });

    enqueueSolanaEvent({
      table: 'threat_events',
      rowId: event.id,
      eventName: AURA_SOLANA_EVENTS.RELAY_OVERRIDE,
      memo: {
        deviceId: device.id,
        action,
        channel,
        requestedBy: req.user!.walletAddress ?? req.user!.id,
      },
    });

    res.json({ ok: true, event });
  } catch (err) {
    next(err);
  }
}

router.post('/devices/:id/relay/:ch/on', (req, res, next) =>
  handleRelay(req, res, next, 'on')
);
router.post('/devices/:id/relay/:ch/off', (req, res, next) =>
  handleRelay(req, res, next, 'off')
);

export default router;
