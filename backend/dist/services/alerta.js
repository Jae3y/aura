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
exports.mapSeverity = mapSeverity;
exports.sendAlert = sendAlert;
exports.buildSurgePayload = buildSurgePayload;
exports.buildIntrusionPayload = buildIntrusionPayload;
exports.buildOfflinePayload = buildOfflinePayload;
exports.buildAnomalyPayload = buildAnomalyPayload;
const axios_1 = __importDefault(require("axios"));
const Sentry = __importStar(require("@sentry/node"));
const config_1 = require("../config");
// AURA severity → Alerta severity label. Exhaustive (Property 7).
function mapSeverity(severity) {
    switch (severity) {
        case 'critical': return 'Critical';
        case 'high': return 'High';
        case 'medium': return 'Medium';
        case 'low': return 'Low';
        case 'anomaly': return 'Info';
        case 'offline': return 'High';
        default: return 'Medium';
    }
}
let http = null;
function client() {
    if (!http) {
        http = axios_1.default.create({
            baseURL: config_1.config.ALERTA_BASE_URL,
            headers: {
                'x-api-key': config_1.config.ALERTA_API_KEY,
                'x-api-secret': config_1.config.ALERTA_API_SECRET,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }
    return http;
}
// ---------------------------------------------------------------------------
// Retry queue — failed sendAlert calls retry with exponential back-off for up
// to 5 minutes; on final failure exactly one Sentry error is captured.
// ---------------------------------------------------------------------------
const MAX_RETRY_WINDOW_MS = 5 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function postNotification(notification) {
    const res = await client().post('/telegram/send', notification);
    return res.data;
}
async function sendAlert(notification) {
    const start = Date.now();
    let delay = 1000;
    let lastError;
    while (Date.now() - start < MAX_RETRY_WINDOW_MS) {
        try {
            return await postNotification(notification);
        }
        catch (err) {
            lastError = err;
            if (Date.now() - start + delay >= MAX_RETRY_WINDOW_MS)
                break;
            await sleep(delay);
            delay = Math.min(delay * 2, 60000);
        }
    }
    Sentry.captureException(lastError, {
        tags: { subsystem: 'alerta' },
        extra: { title: notification.title },
    });
    return null;
}
// ---------------------------------------------------------------------------
// Payload builders — one per event type
// ---------------------------------------------------------------------------
function locationOf(device) {
    return device.location_label ?? 'Unknown Location';
}
function buildSurgePayload(event, device) {
    const voltage = event.voltage_at_event ?? '?';
    const current = event.current_at_event ?? '?';
    return {
        channelRef: config_1.config.ALERTA_CHANNEL_REF,
        title: `⚡ Surge Detected — ${device.name}`,
        message: `Device: ${device.name}\n` +
            `Location: ${locationOf(device)}\n` +
            `Voltage: ${voltage}V | Current: ${current}A\n` +
            `Severity: ${event.severity.toUpperCase()}\n` +
            `Relay triggered: CH${event.relay_channel ?? 1}\n` +
            `Event ID: ${event.id}`,
        severity: mapSeverity(event.severity),
    };
}
function buildIntrusionPayload(event, zone, device) {
    return {
        channelRef: config_1.config.ALERTA_CHANNEL_REF,
        title: `🚨 Intrusion Detected — ${device.name}`,
        message: `Device: ${device.name}\n` +
            `Location: ${locationOf(device)}\n` +
            `Zone: ${zone.name} (${zone.zone_type})\n` +
            `Severity: ${event.severity.toUpperCase()}\n` +
            `Event ID: ${event.id}`,
        severity: mapSeverity(event.severity),
    };
}
function buildOfflinePayload(device) {
    return {
        channelRef: config_1.config.ALERTA_CHANNEL_REF,
        title: `📴 Device Offline — ${device.name}`,
        message: `Device: ${device.name}\n` +
            `Location: ${locationOf(device)}\n` +
            `Status: OFFLINE\n` +
            `Last seen: ${device.last_seen ?? 'Unknown'}`,
        severity: mapSeverity('offline'),
    };
}
function buildAnomalyPayload(reading, device) {
    return {
        channelRef: config_1.config.ALERTA_CHANNEL_REF,
        title: `⚠️ Sensor Anomaly — ${device.name}`,
        message: `Device: ${device.name}\n` +
            `Location: ${locationOf(device)}\n` +
            `Voltage: ${reading.voltage}V | Current: ${reading.current_amps}A\n` +
            `Anomaly score: ${reading.anomaly_score ?? '?'}\n` +
            `Reading ID: ${reading.id}`,
        severity: mapSeverity('anomaly'),
    };
}
//# sourceMappingURL=alerta.js.map