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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initLiskClient = initLiskClient;
exports.writeMonthlyAudit = writeMonthlyAudit;
const axios_1 = __importDefault(require("axios"));
const Sentry = __importStar(require("@sentry/node"));
const config_1 = require("../config");
const monthly_reports_1 = require("../lib/db/monthly_reports");
// The Lisk service is intentionally minimal: a single function with a single
// call site (the monthly report job). It is NEVER called from a real-time
// event handler — Lisk is the secondary, monthly-only audit chain.
let initialized = false;
function initLiskClient() {
    initialized = true;
}
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function submitToLisk(digest) {
    if (!config_1.config.LISK_RPC_URL) {
        // No Lisk endpoint configured — derive a deterministic local digest id so
        // the flow remains testable without a live testnet.
        return `lisk-local-${digest.deviceId}-${digest.month}`;
    }
    const res = await axios_1.default.post(`${config_1.config.LISK_RPC_URL}/api/v3/transactions`, { module: 'aura', command: 'monthlyAudit', params: digest }, { timeout: 10000 });
    const txId = res.data?.transactionId ?? res.data?.txId;
    if (!txId)
        throw new Error('Lisk did not return a transaction id');
    return txId;
}
// Writes the report digest to Lisk testnet with 3× retry/back-off and updates
// monthly_reports.lisk_tx_id on success.
async function writeMonthlyAudit(report) {
    if (!initialized)
        initLiskClient();
    const digest = {
        deviceId: report.device_id,
        month: report.report_month,
        totalThreats: report.total_threats,
        surgesBlocked: report.surges_blocked,
        healthScore: report.aura_health_score,
        solanaEventsLogged: report.solana_events_logged,
    };
    let lastError;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
            const txId = await submitToLisk(digest);
            await (0, monthly_reports_1.updateLiskTx)(report.id, txId);
            return { txId };
        }
        catch (err) {
            lastError = err;
            if (attempt < RETRY_DELAYS_MS.length)
                await sleep(RETRY_DELAYS_MS[attempt]);
        }
    }
    Sentry.captureException(lastError, {
        tags: { subsystem: 'lisk' },
        extra: { deviceId: report.device_id, month: report.report_month },
    });
    return null;
}
//# sourceMappingURL=lisk.js.map