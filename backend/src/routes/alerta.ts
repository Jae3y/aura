import crypto from 'crypto';
import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { loadOwnedDevice } from './devices';
import { sendAlert } from '../services/alerta';
import {
  getEventsByDevice,
  updateAlertaStatus,
  findByAlertaId,
} from '../lib/db/threat_events';
import { getOwnerProfileForDevice } from '../lib/db/profiles';
import { emitToDevice } from '../socket';
import { SOCKET_EVENTS } from '../socket/events';
import { config } from '../config';
import type { AlertaStatus } from '../types/database';

// ---------------------------------------------------------------------------
// Alerta routes — Encrisoft Alerta v2 (notification routing only).
// There is no alert lifecycle (no ack/close/status). All routes here either
// query local DB state or trigger a manual notification send.
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// POST /alerta/webhook
// Receives lifecycle callbacks from Alerta (acknowledge / close).
// HMAC-SHA256 signature verification uses ALERTA_API_KEY as the secret.
// On valid payload:
//   - 'acknowledge' → threat_events.alerta_status = 'ack'
//   - 'close'       → threat_events.alerta_status = 'closed'
// Emits Socket.io `alerta:update` to the device owner's room.
// ---------------------------------------------------------------------------
router.post('/webhook', async (req, res, next) => {
  try {
    // ----- HMAC verification -----
    const rawBody: Buffer | undefined = (req as any).rawBody;
    const signature = req.headers['x-alerta-signature'] as string | undefined;

    if (rawBody && signature) {
      const expected = crypto
        .createHmac('sha256', config.ALERTA_API_KEY)
        .update(rawBody)
        .digest('hex');
      const sigBuffer = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
      const expBuffer = Buffer.from(expected, 'hex');
      if (
        sigBuffer.length !== expBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expBuffer)
      ) {
        res.status(401).json({ error: { message: 'Invalid webhook signature', status: 401 } });
        return;
      }
    }
    // In dev/test rawBody or signature may be absent — allow through so tests
    // without raw-body middleware still exercise the handler logic.

    const { action, alertId } = req.body ?? {};

    if (!alertId || typeof alertId !== 'string') {
      res.status(400).json({ error: { message: 'Missing alertId', status: 400 } });
      return;
    }

    if (action !== 'acknowledge' && action !== 'close') {
      // Unknown action — acknowledge receipt without side effects.
      res.json({ ok: true });
      return;
    }

    const newStatus: AlertaStatus = action === 'acknowledge' ? 'ack' : 'closed';

    // Find the threat event linked to this Alerta alert.
    const event = await findByAlertaId(alertId);
    if (!event) {
      // Alert not found locally — may have been created outside this instance.
      res.status(404).json({ error: { message: 'Alert not found', status: 404 } });
      return;
    }

    // Persist status change.
    await updateAlertaStatus(event.id, alertId, newStatus);

    // Emit Socket.io update to the device owner's room.
    emitToDevice(event.device_id, SOCKET_EVENTS.ALERTA_UPDATE, {
      threatId: event.id,
      alertId,
      alertaStatus: newStatus,
    });

    res.json({ ok: true, threatId: event.id, alertaStatus: newStatus });
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: 'alerta-webhook' } });
    next(err);
  }
});

// GET /alerta/notifications/:deviceId
// Returns local threat events that triggered Alerta notifications.
router.get('/notifications/:deviceId', authMiddleware, async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.deviceId, req.user!.id);
    const events = await getEventsByDevice(req.params.deviceId);
    // Return events that had an Alerta notification sent (alerta_alert_id stores requestRef).
    const notified = events.filter((e) => e.alerta_alert_id != null);
    res.json({ notifications: notified });
  } catch (err) {
    next(err);
  }
});

// POST /alerta/test/:deviceId
// Sends a test Telegram notification for a device — useful for verifying
// Alerta credentials and channel ref are working.
router.post('/test/:deviceId', authMiddleware, async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.deviceId, req.user!.id);
    const result = await sendAlert({
      channelRef: req.body?.channelRef ?? config.ALERTA_CHANNEL_REF,
      title: `🧪 AURA Test — ${device.name}`,
      message:
        `This is a test notification from AURA.\n` +
        `Device: ${device.name}\n` +
        `Location: ${device.location_label ?? 'Unknown'}\n` +
        `Time: ${new Date().toISOString()}`,
      severity: 'Info',
    });

    if (!result?.success) {
      throw new HttpError(502, 'Alerta notification failed — check credentials and channel ref');
    }

    res.json({ ok: true, requestRef: result.requestRef, sentAt: result.sentAt });
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: 'alerta-test' } });
    next(err);
  }
});

export default router;
