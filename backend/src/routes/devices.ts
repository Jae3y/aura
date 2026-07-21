import { Router } from 'express';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { config } from '../config';
import {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  updateNftMintAddress,
  getDeviceByTokenAndUser,
} from '../lib/db/devices';
import { mintDeviceNFT } from '../services/nft';
import { enqueueSolanaEvent } from '../blockchain/solanaQueue';
import { AURA_SOLANA_EVENTS } from '../blockchain/events';
import { emitToDevice } from '../socket';
import { SOCKET_EVENTS } from '../socket/events';
import { insertEvent, updateAlertaStatus } from '../lib/db/threat_events';
import { sendAlert } from '../services/alerta';
import { sendDocument as sendTelegramDocument } from '../services/telegram';
import { upsertReport, getReportById } from '../lib/db/monthly_reports';
import { writeMonthlyAudit } from '../services/lisk';

const router = Router();

// Public metadata endpoint (no auth) — called by Solana explorers to resolve NFT URIs.
router.get('/nft/metadata/:deviceId', async (req, res, next) => {
  try {
    const device = await getDeviceById(req.params.deviceId);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    res.json({
      name: `AURA Unit - ${device.name}`,
      symbol: 'AURA',
      description: 'AURA device identity certificate',
      image: '',
      attributes: [
        { trait_type: 'deviceId', value: device.id },
        { trait_type: 'environment_type', value: device.environment_type ?? 'n/a' },
        { trait_type: 'location_label', value: device.location_label ?? 'n/a' },
        { trait_type: 'firmware_version', value: device.firmware_version ?? 'n/a' },
      ],
    });
  } catch (err) {
    next(err);
  }
});

router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).optional(),
  device_token: z.string().min(8),
  firmware_version: z.string().optional(),
  environment_type: z.enum(['home', 'hospital', 'industrial']).optional(),
  voltage_threshold_min: z.number().optional(),
  voltage_threshold_max: z.number().optional(),
  surge_sensitivity: z.enum(['low', 'medium', 'high']).optional(),
  location_label: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ device_token: true });

// Loads a device and asserts the authenticated user owns it.
export async function loadOwnedDevice(deviceId: string, userId: string) {
  const device = await getDeviceById(deviceId);
  if (!device) throw new HttpError(404, 'Device not found');
  if (device.user_id !== userId) throw new HttpError(403, 'Forbidden');
  return device;
}

router.get('/devices', async (req, res, next) => {
  try {
    const devices = await getDevices(req.user!.id);
    res.json({ devices });
  } catch (err) {
    next(err);
  }
});

router.post('/devices', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    // Prevent duplicate registrations: same token for the same user.
    const existing = await getDeviceByTokenAndUser(body.device_token, req.user!.id);
    if (existing) {
      throw new HttpError(409, 'Device with this token is already registered');
    }

    const device = await createDevice({
      ...body,
      user_id: req.user!.id,
      is_online: true,
      last_seen: new Date().toISOString(),
      nft_mint_address: null,
    });

    // Non-blocking: try to mint the Identity NFT on creation.
    // If the user has no wallet connected or minting fails, the device
    // is still created — they can trigger minting manually later.
    try {
      const ownerWallet = req.user!.walletAddress;
      if (ownerWallet) {
        const metadataUri = `${config.PUBLIC_URL}/api/nft/metadata/${device.id}`;
        const { mintAddress } = await mintDeviceNFT(device, ownerWallet, metadataUri);
        await updateNftMintAddress(device.id, mintAddress);
        enqueueSolanaEvent({
          table: 'none',
          rowId: device.id,
          eventName: AURA_SOLANA_EVENTS.DEVICE_MINTED,
          memo: { deviceId: device.id, owner: ownerWallet, mintAddress },
        });
        emitToDevice(device.id, SOCKET_EVENTS.DEVICE_PAIRED, {
          deviceId: device.id,
          mintAddress,
        });
      }
    } catch (mintErr) {
      console.warn(
        '[Devices] Auto NFT mint skipped (non-blocking):',
        (mintErr as Error).message
      );
    }

    res.status(201).json({ device });
  } catch (err) {
    next(err);
  }
});

router.get('/devices/:id', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    res.json({ device });
  } catch (err) {
    next(err);
  }
});

router.patch('/devices/:id', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    const patch = updateSchema.parse(req.body);
    const device = await updateDevice(req.params.id, patch);
    res.json({ device });
  } catch (err) {
    next(err);
  }
});

router.post('/devices/:id/pair', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    const ownerWallet = req.user!.walletAddress;
    if (!ownerWallet) throw new HttpError(400, 'Wallet address required');

    try {
      const metadataUri = `${config.PUBLIC_URL}/api/nft/metadata/${device.id}`;
      const { mintAddress } = await mintDeviceNFT(device, ownerWallet, metadataUri);
      await updateNftMintAddress(device.id, mintAddress);

      enqueueSolanaEvent({
        table: 'none',
        rowId: device.id,
        eventName: AURA_SOLANA_EVENTS.DEVICE_MINTED,
        memo: { deviceId: device.id, owner: ownerWallet, mintAddress },
      });

      emitToDevice(device.id, SOCKET_EVENTS.DEVICE_PAIRED, {
        deviceId: device.id,
        mintAddress,
      });

      res.json({ ok: true, mintAddress });
    } catch (mintErr) {
      const reason = mintErr instanceof Error ? mintErr.message : 'Unknown error';
      Sentry.captureException(mintErr, {
        tags: { subsystem: 'nft-mint' },
        extra: { deviceId: device.id },
      });
      emitToDevice(device.id, SOCKET_EVENTS.DEVICE_PAIR_FAILED, {
        deviceId: device.id,
      });
      throw new HttpError(502, `NFT mint failed: ${reason}`);
    }
  } catch (err) {
    next(err);
  }
});

router.delete('/devices/:id', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    await deleteDevice(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /devices/:id/simulate-threat
// Simulates a surge event, routing it to Alerta, queuing to Solana, and broadcasting to WebSocket clients
router.post('/devices/:id/simulate-threat', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    
    // 1. Create a simulated threat event in database
    const event = await insertEvent({
      device_id: device.id,
      event_type: 'surge',
      severity: 'critical',
      voltage_at_event: 285.4,
      current_at_event: 14.2,
      action_taken: 'relay_cutoff',
      relay_triggered: true,
      relay_channel: 1,
      occurred_at: new Date().toISOString(),
    });

    // 2. Route it to Alerta (Telegram notifications) in the background
    // This prevents the HTTP request from timing out if the external API is unreachable.
    sendAlert({
      channelRef: config.ALERTA_CHANNEL_REF || 'TG_ALT_FILYOOMRE4MDCNI2',
      title: `🚨 SIMULATED SURGE — ${device.name}`,
      message: 
        `An electrical surge anomaly of 285.4V was simulated on channel 1.\n` +
        `Device Node: ${device.name}\n` +
        `Location: ${device.location_label ?? 'Main Node'}\n` +
        `Emergency relay shutdown executed.`,
      severity: 'Critical',
    }).then(async (alertResult) => {
      if (alertResult?.success && alertResult.requestRef) {
        await updateAlertaStatus(event.id, alertResult.requestRef, 'open');
        emitToDevice(device.id, SOCKET_EVENTS.ALERTA_UPDATE, {
          id: event.id,
          alerta_alert_id: alertResult.requestRef,
          alerta_status: 'open',
        });
      }
    }).catch(alertaErr => {
      console.error('Simulated Alerta alert dispatch failed in background:', alertaErr);
    });

    // 3. Queue to Solana Blockchain
    try {
      enqueueSolanaEvent({
        table: 'threat_events',
        rowId: event.id,
        eventName: AURA_SOLANA_EVENTS.SURGE_DETECTED,
        memo: {
          deviceId: device.id,
          eventId: event.id,
          voltage: 285.4,
          current: 14.2,
        },
      });
    } catch (solanaErr) {
      console.error('Simulated Solana queue dispatch failed:', solanaErr);
    }

    // 4. Push real-time event to connected frontend clients via socket
    emitToDevice(device.id, SOCKET_EVENTS.THREAT_NEW, event);

    res.json({ ok: true, event });
  } catch (err) {
    next(err);
  }
});

// POST /devices/:id/simulate-audit
// Simulates generating and submitting monthly compliance summary to Lisk, generating PDF, and sending to Alerta
router.post('/devices/:id/simulate-audit', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    
    // Determine month
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthDate = `${monthStr}-01`;

    // Create a mock report summary
    let report = await upsertReport({
      device_id: device.id,
      user_id: req.user!.id,
      report_month: monthDate,
      total_threats: 5,
      surges_blocked: 3,
      intrusions_detected: 2,
      relay_activations: 4,
      avg_voltage: 224.2,
      min_voltage: 178.5,
      max_voltage: 285.4,
      total_anomalies: 8,
      aura_health_score: 92,
      solana_events_logged: 5,
      alerta_alerts_count: 5,
      alerta_ack_rate: 1.0,
      generated_at: now.toISOString(),
    });

    let pdfUrl: string | null = null;
    try {
      const { generateReportPdf } = await import('../services/pdf');
      const { updatePdfUrl } = await import('../lib/db/monthly_reports');
      pdfUrl = await generateReportPdf(report, device, report.alerta_ack_rate ?? 1.0);
      await updatePdfUrl(report.id, pdfUrl);
    } catch (pdfErr) {
      console.error('Audit PDF generation failed:', pdfErr);
    }

    // Write monthly audit to Lisk
    try {
      await writeMonthlyAudit(report);
      // Fetch final updated report with Lisk transaction details
      const finalReport = await getReportById(report.id);
      
      const txId = (finalReport as any)?.lisk_tx_id ?? null;
      const liskLine = txId && !txId.startsWith('lisk-local-')
        ? `Lisk TX: ${txId}`
        : `Lisk: Local dev (configure LISK_RPC_URL for testnet)`;

      try {
        // Run Alerta notification in the background to prevent blocking
        // the HTTP response if the Alerta API is unreachable or times out.
        sendAlert({
          channelRef: config.ALERTA_CHANNEL_REF || 'TG_ALT_FILYOOMRE4MDCNI2',
          title: `📋 Monthly Audit Complete — ${device.name}`,
          message:
            `AURA Risk Audit for ${monthStr} submitted.\n` +
            `Device: ${device.name}\n` +
            `Location: ${device.location_label ?? 'Main Node'}\n` +
            `Health Score: ${report.aura_health_score}/100\n` +
            `Threats: ${report.total_threats} | Surges Blocked: ${report.surges_blocked}\n` +
            `Solana Events: ${report.solana_events_logged}\n` +
            liskLine +
            (pdfUrl ? `\nPDF Report: ${pdfUrl}` : ''),
          severity: 'Info',
        }).catch(e => console.error('Audit Alerta dispatch failed in background:', e));

        // Send the actual PDF file to Telegram channel via Bot API.
        if (pdfUrl) {
          sendTelegramDocument(
            pdfUrl,
            `📋 ${device.name} — ${monthStr} Audit Report\nHealth: ${report.aura_health_score}/100`,
            `${device.name}_${monthStr}.pdf`
          ).catch(e => console.error('Telegram PDF send failed:', e));
        }
      } catch (e) {
        console.error('Audit Alerta dispatch failed:', e);
      }

      res.json({ ok: true, report: finalReport });
    } catch (liskErr) {
      console.error('Simulated Lisk audit failed:', liskErr);
      res.status(502).json({ error: 'Lisk audit submission failed' });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
