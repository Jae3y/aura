import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '../lib/supabase';
import type { MonthlyReport, Device } from '../types/database';

const BUCKET = 'reports';

function renderToBuffer(
  report: MonthlyReport,
  device: Device,
  ackRate: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).text('AURA Monthly Report', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .text(`Device: ${device.name} (${device.environment_type})`)
      .text(`Month: ${report.report_month}`)
      .text(`Health Score: ${report.aura_health_score}/100`);
    doc.moveDown();

    const rows: [string, string | number][] = [
      ['Total Threats', report.total_threats],
      ['Surges Blocked', report.surges_blocked],
      ['Intrusions Detected', report.intrusions_detected],
      ['Relay Activations', report.relay_activations],
      ['Total Anomalies', report.total_anomalies],
      ['Avg Voltage', report.avg_voltage ?? 'n/a'],
      ['Min Voltage', report.min_voltage ?? 'n/a'],
      ['Max Voltage', report.max_voltage ?? 'n/a'],
      ['Solana Events Logged', report.solana_events_logged],
      ['Alerta Alerts', report.alerta_alerts_count],
      ['Alerta Ack Rate', `${(ackRate * 100).toFixed(1)}%`],
    ];

    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11);
    for (const [label, value] of rows) {
      doc.text(`${label}: ${value}`);
    }

    doc.moveDown();
    doc
      .fontSize(9)
      .fillColor('#888')
      .text(
        'AURA — Autonomous Utility & Response Assistant. Solana primary chain, Lisk monthly audit.',
        { align: 'center' }
      );

    doc.end();
  });
}

// Generates the monthly PDF, uploads it to Supabase Storage, and returns the
// public URL stored on monthly_reports.pdf_url.
export async function generateReportPdf(
  report: MonthlyReport,
  device: Device,
  ackRate: number
): Promise<string> {
  const buffer = await renderToBuffer(report, device, ackRate);
  const path = `${report.device_id}/${report.report_month}.pdf`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
