import { Resend } from 'resend';
import * as Sentry from '@sentry/node';
import { config } from '../config';
import { getExplorerUrl } from './solana';
import type { ThreatEvent, Device, MonthlyReport } from '../types/database';

let resend: Resend | null = null;
function client(): Resend {
  if (!resend) resend = new Resend(config.RESEND_API_KEY);
  return resend;
}

function solanaLink(sig: string | null): string {
  return sig ? getExplorerUrl(sig) : 'pending confirmation';
}

export async function sendThreatAlert(
  to: string,
  event: ThreatEvent,
  device: Device
): Promise<boolean> {
  try {
    const deepLink = `${config.FRONTEND_URL}/threats?event=${event.id}`;
    await client().emails.send({
      from: config.RESEND_FROM,
      to,
      subject: `⚠️ AURA ${event.event_type.toUpperCase()} on ${device.name}`,
      html: `
        <h2>AURA Threat Alert</h2>
        <p><strong>Device:</strong> ${device.name} (${device.environment_type})</p>
        <p><strong>Type:</strong> ${event.event_type}</p>
        <p><strong>Severity:</strong> ${event.severity}</p>
        <p><strong>Voltage:</strong> ${event.voltage_at_event ?? 'n/a'} V</p>
        <p><strong>Solana:</strong> ${solanaLink(event.solana_signature)}</p>
        <p><a href="${deepLink}">View event in AURA</a></p>
      `,
    });
    return true;
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: 'email' } });
    return false;
  }
}

export async function sendWeeklyReport(
  to: string,
  report: MonthlyReport
): Promise<boolean> {
  try {
    const deepLink = `${config.FRONTEND_URL}/reports`;
    await client().emails.send({
      from: config.RESEND_FROM,
      to,
      subject: `AURA Monthly Report — ${report.report_month}`,
      html: `
        <h2>AURA Monthly Report</h2>
        <p><strong>Health Score:</strong> ${report.aura_health_score}/100</p>
        <p><strong>Total Threats:</strong> ${report.total_threats}</p>
        <p><strong>Surges Blocked:</strong> ${report.surges_blocked}</p>
        <p><strong>Alerta Ack Rate:</strong> ${(report.alerta_ack_rate * 100).toFixed(1)}%</p>
        <p><strong>Lisk Tx:</strong> ${report.lisk_tx_id ?? 'pending'}</p>
        <p><a href="${report.pdf_url ?? deepLink}">Download full report</a></p>
      `,
    });
    return true;
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: 'email' } });
    return false;
  }
}
