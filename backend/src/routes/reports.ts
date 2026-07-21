import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { loadOwnedDevice } from './devices';
import {
  upsertReport,
  getReportsByDevice,
  getReportById,
} from '../lib/db/monthly_reports';
import { calculateHealthScore } from '../services/auraScore';
import { generateReportPdf } from '../services/pdf';
import { writeMonthlyAudit } from '../services/lisk';
import { computeMonthlyStats } from '../services/reportStats';
import { sendAlert } from '../services/alerta';
import { sendDocument as sendTelegramDocument } from '../services/telegram';

const router = Router();
router.use(authMiddleware);

const genSchema = z.object({
  report_month: z.string().regex(/^\d{4}-\d{2}$/),
});

router.get('/devices/:id/reports', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    const reports = await getReportsByDevice(req.params.id);
    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

router.post('/devices/:id/reports', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    const { report_month } = genSchema.parse(req.body);
    const monthDate = `${report_month}-01`;

    const stats = await computeMonthlyStats(device.id, report_month);
    const health = calculateHealthScore({
      totalThreats: stats.total_threats,
      relayActivations: stats.relay_activations,
      totalAnomalies: stats.total_anomalies,
      totalReadings: stats.total_readings,
      uptimeRatio: stats.uptime_ratio,
    });

    // Upsert the report row (UNIQUE device_id + report_month).
    let report = await upsertReport({
      device_id: device.id,
      user_id: req.user!.id,
      report_month: monthDate,
      total_threats: stats.total_threats,
      surges_blocked: stats.surges_blocked,
      intrusions_detected: stats.intrusions_detected,
      relay_activations: stats.relay_activations,
      avg_voltage: stats.avg_voltage,
      min_voltage: stats.min_voltage,
      max_voltage: stats.max_voltage,
      total_anomalies: stats.total_anomalies,
      aura_health_score: health,
      solana_events_logged: stats.solana_events_logged,
      alerta_alerts_count: stats.alerta_alerts_count,
      alerta_ack_rate: stats.alerta_ack_rate,
    });

    // Generate + upload the PDF, then persist the URL.
    const pdfUrl = await generateReportPdf(report, device, stats.alerta_ack_rate);
    report = await upsertReport({
      id: report.id,
      device_id: device.id,
      report_month: monthDate,
      pdf_url: pdfUrl,
    });

    // Monthly-only Lisk audit — runs AFTER the PDF exists.
    await writeMonthlyAudit(report);
    const final = await getReportById(report.id);

    // Respond immediately — Alerta runs in background (5-min retry loop).
    res.status(201).json({ report: final });

    // Fire Alerta notification after response is sent.
    sendAlert({
      channelRef: config.ALERTA_CHANNEL_REF,
      title: `📋 Monthly Risk Audit — ${device.name}`,
      message:
        `AURA monthly audit for ${report_month} is complete.\n` +
        `Device: ${device.name}\n` +
        `Location: ${device.location_label ?? 'Main Node'}\n` +
        `Health Score: ${health}/100\n` +
        `Threats: ${stats.total_threats} | Surges: ${stats.surges_blocked}\n` +
        `\n📄 PDF Report:\n${pdfUrl ?? 'Generating…'}`,
      severity: 'Info',
    }).catch((e) => console.error('Report Alerta dispatch failed:', e));

    // Send the actual PDF file to Telegram via Bot API.
    console.log('[Reports] Telegram check — pdfUrl:', pdfUrl ? pdfUrl.substring(0, 80) : 'NULL');
    if (pdfUrl) {
      sendTelegramDocument(
        pdfUrl,
        `📋 ${device.name} — ${report_month} Audit Report\nHealth: ${health}/100`,
        `${device.name}_${report_month}.pdf`
      ).catch((e) => console.error('Telegram PDF send failed:', e));
    } else {
      console.warn('[Reports] No PDF URL — skipping Telegram send');
    }
  } catch (err) {
    next(err);
  }
});

router.get('/reports/:id/pdf', async (req, res, next) => {
  try {
    const report = await getReportById(req.params.id);
    if (!report) throw new HttpError(404, 'Report not found');
    await loadOwnedDevice(report.device_id, req.user!.id);
    if (!report.pdf_url) throw new HttpError(404, 'PDF not generated');
    res.redirect(report.pdf_url);
  } catch (err) {
    next(err);
  }
});

export default router;
