"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const devices_1 = require("./devices");
const monthly_reports_1 = require("../lib/db/monthly_reports");
const auraScore_1 = require("../services/auraScore");
const pdf_1 = require("../services/pdf");
const lisk_1 = require("../services/lisk");
const reportStats_1 = require("../services/reportStats");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const genSchema = zod_1.z.object({
    report_month: zod_1.z.string().regex(/^\d{4}-\d{2}$/),
});
router.get('/devices/:id/reports', async (req, res, next) => {
    try {
        await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const reports = await (0, monthly_reports_1.getReportsByDevice)(req.params.id);
        res.json({ reports });
    }
    catch (err) {
        next(err);
    }
});
router.post('/devices/:id/reports', async (req, res, next) => {
    try {
        const device = await (0, devices_1.loadOwnedDevice)(req.params.id, req.user.id);
        const { report_month } = genSchema.parse(req.body);
        const monthDate = `${report_month}-01`;
        const stats = await (0, reportStats_1.computeMonthlyStats)(device.id, report_month);
        const health = (0, auraScore_1.calculateHealthScore)({
            totalThreats: stats.total_threats,
            relayActivations: stats.relay_activations,
            totalAnomalies: stats.total_anomalies,
            totalReadings: stats.total_readings,
            uptimeRatio: stats.uptime_ratio,
        });
        // Upsert the report row (UNIQUE device_id + report_month).
        let report = await (0, monthly_reports_1.upsertReport)({
            device_id: device.id,
            user_id: req.user.id,
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
        const pdfUrl = await (0, pdf_1.generateReportPdf)(report, device, stats.alerta_ack_rate);
        report = await (0, monthly_reports_1.upsertReport)({
            id: report.id,
            device_id: device.id,
            report_month: monthDate,
            pdf_url: pdfUrl,
        });
        // Monthly-only Lisk audit — runs AFTER the PDF exists.
        await (0, lisk_1.writeMonthlyAudit)(report);
        const final = await (0, monthly_reports_1.getReportById)(report.id);
        res.status(201).json({ report: final });
    }
    catch (err) {
        next(err);
    }
});
router.get('/reports/:id/pdf', async (req, res, next) => {
    try {
        const report = await (0, monthly_reports_1.getReportById)(req.params.id);
        if (!report)
            throw new errorHandler_1.HttpError(404, 'Report not found');
        await (0, devices_1.loadOwnedDevice)(report.device_id, req.user.id);
        if (!report.pdf_url)
            throw new errorHandler_1.HttpError(404, 'PDF not generated');
        res.redirect(report.pdf_url);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map