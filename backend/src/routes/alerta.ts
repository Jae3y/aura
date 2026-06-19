import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { loadOwnedDevice } from './devices';
import { sendAlert, buildSurgePayload, buildOfflinePayload } from '../services/alerta';
import { getEventsByDevice } from '../lib/db/threat_events';

// ---------------------------------------------------------------------------
// Alerta routes — Encrisoft Alerta v2 (notification routing only).
// There is no alert lifecycle (no ack/close/status). All routes here either
// query local DB state or trigger a manual notification send.
// ---------------------------------------------------------------------------

const router = Router();

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
      channelRef: req.body?.channelRef ?? undefined,
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
