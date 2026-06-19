"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendThreatAlert = sendThreatAlert;
exports.sendWeeklyReport = sendWeeklyReport;
const resend_1 = require("resend");
const Sentry = __importStar(require("@sentry/node"));
const config_1 = require("../config");
const solana_1 = require("./solana");
let resend = null;
function client() {
    if (!resend)
        resend = new resend_1.Resend(config_1.config.RESEND_API_KEY);
    return resend;
}
function solanaLink(sig) {
    return sig ? (0, solana_1.getExplorerUrl)(sig) : 'pending confirmation';
}
async function sendThreatAlert(to, event, device) {
    try {
        const deepLink = `${config_1.config.FRONTEND_URL}/threats?event=${event.id}`;
        await client().emails.send({
            from: config_1.config.RESEND_FROM,
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
    }
    catch (err) {
        Sentry.captureException(err, { tags: { subsystem: 'email' } });
        return false;
    }
}
async function sendWeeklyReport(to, report) {
    try {
        const deepLink = `${config_1.config.FRONTEND_URL}/reports`;
        await client().emails.send({
            from: config_1.config.RESEND_FROM,
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
    }
    catch (err) {
        Sentry.captureException(err, { tags: { subsystem: 'email' } });
        return false;
    }
}
//# sourceMappingURL=email.js.map