"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportPdf = generateReportPdf;
const pdfkit_1 = __importDefault(require("pdfkit"));
const supabase_1 = require("../lib/supabase");
const BUCKET = 'reports';
function renderToBuffer(report, device, ackRate) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 50 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
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
        const rows = [
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
            .text('AURA — Autonomous Utility & Response Assistant. Solana primary chain, Lisk monthly audit.', { align: 'center' });
        doc.end();
    });
}
// Generates the monthly PDF, uploads it to Supabase Storage, and returns the
// public URL stored on monthly_reports.pdf_url.
async function generateReportPdf(report, device, ackRate) {
    const buffer = await renderToBuffer(report, device, ackRate);
    const path = `${report.device_id}/${report.report_month}.pdf`;
    const { error } = await supabase_1.supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true,
    });
    if (error)
        throw error;
    const { data } = supabase_1.supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
}
//# sourceMappingURL=pdf.js.map