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
exports.loadOwnedDevice = loadOwnedDevice;
const express_1 = require("express");
const zod_1 = require("zod");
const Sentry = __importStar(require("@sentry/node"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const config_1 = require("../config");
const devices_1 = require("../lib/db/devices");
const nft_1 = require("../services/nft");
const solanaQueue_1 = require("../blockchain/solanaQueue");
const events_1 = require("../blockchain/events");
const socket_1 = require("../socket");
const events_2 = require("../socket/events");
const threat_events_1 = require("../lib/db/threat_events");
const alerta_1 = require("../services/alerta");
const monthly_reports_1 = require("../lib/db/monthly_reports");
const lisk_1 = require("../services/lisk");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    device_token: zod_1.z.string().min(8),
    firmware_version: zod_1.z.string().optional(),
    environment_type: zod_1.z.enum(['home', 'hospital', 'industrial']).optional(),
    voltage_threshold_min: zod_1.z.number().optional(),
    voltage_threshold_max: zod_1.z.number().optional(),
    surge_sensitivity: zod_1.z.enum(['low', 'medium', 'high']).optional(),
    location_label: zod_1.z.string().optional(),
});
const updateSchema = createSchema.partial().omit({ device_token: true });
// Loads a device and asserts the authenticated user owns it.
async function loadOwnedDevice(deviceId, userId) {
    const device = await (0, devices_1.getDeviceById)(deviceId);
    if (!device)
        throw new errorHandler_1.HttpError(404, 'Device not found');
    if (device.user_id !== userId)
        throw new errorHandler_1.HttpError(403, 'Forbidden');
    return device;
}
router.get('/devices', async (req, res, next) => {
    try {
        const devices = await (0, devices_1.getDevices)(req.user.id);
        res.json({ devices });
    }
    catch (err) {
        next(err);
    }
});
router.post('/devices', async (req, res, next) => {
    try {
        const body = createSchema.parse(req.body);
        const device = await (0, devices_1.createDevice)({
            ...body,
            user_id: req.user.id,
            is_online: false,
            nft_mint_address: null,
        });
        res.status(201).json({ device });
    }
    catch (err) {
        next(err);
    }
});
router.get('/devices/:id', async (req, res, next) => {
    try {
        const device = await loadOwnedDevice(req.params.id, req.user.id);
        res.json({ device });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/devices/:id', async (req, res, next) => {
    try {
        await loadOwnedDevice(req.params.id, req.user.id);
        const patch = updateSchema.parse(req.body);
        const device = await (0, devices_1.updateDevice)(req.params.id, patch);
        res.json({ device });
    }
    catch (err) {
        next(err);
    }
});
router.post('/devices/:id/pair', async (req, res, next) => {
    try {
        const device = await loadOwnedDevice(req.params.id, req.user.id);
        const ownerWallet = req.user.walletAddress;
        if (!ownerWallet)
            throw new errorHandler_1.HttpError(400, 'Wallet address required');
        try {
            const { mintAddress } = await (0, nft_1.mintDeviceNFT)(device, ownerWallet);
            await (0, devices_1.updateNftMintAddress)(device.id, mintAddress);
            (0, solanaQueue_1.enqueueSolanaEvent)({
                table: 'none',
                rowId: device.id,
                eventName: events_1.AURA_SOLANA_EVENTS.DEVICE_MINTED,
                memo: { deviceId: device.id, owner: ownerWallet, mintAddress },
            });
            (0, socket_1.emitToDevice)(device.id, events_2.SOCKET_EVENTS.DEVICE_PAIRED, {
                deviceId: device.id,
                mintAddress,
            });
            res.json({ ok: true, mintAddress });
        }
        catch (mintErr) {
            Sentry.captureException(mintErr, {
                tags: { subsystem: 'nft-mint' },
                extra: { deviceId: device.id },
            });
            (0, socket_1.emitToDevice)(device.id, events_2.SOCKET_EVENTS.DEVICE_PAIR_FAILED, {
                deviceId: device.id,
            });
            throw new errorHandler_1.HttpError(502, 'NFT mint failed');
        }
    }
    catch (err) {
        next(err);
    }
});
router.delete('/devices/:id', async (req, res, next) => {
    try {
        await loadOwnedDevice(req.params.id, req.user.id);
        await (0, devices_1.deleteDevice)(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
// POST /devices/:id/simulate-threat
// Simulates a surge event, routing it to Alerta, queuing to Solana, and broadcasting to WebSocket clients
router.post('/devices/:id/simulate-threat', async (req, res, next) => {
    try {
        const device = await loadOwnedDevice(req.params.id, req.user.id);
        // 1. Create a simulated threat event in database
        const event = await (0, threat_events_1.insertEvent)({
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
        // 2. Route it to Alerta (Telegram notifications)
        let alertId = null;
        try {
            const alertResult = await (0, alerta_1.sendAlert)({
                channelRef: config_1.config.ALERTA_CHANNEL_REF || 'TG_ALT_FILYOOMRE4MDCNI2',
                title: `🚨 SIMULATED SURGE — ${device.name}`,
                message: `An electrical surge anomaly of 285.4V was simulated on channel 1.\n` +
                    `Device Node: ${device.name}\n` +
                    `Location: ${device.location_label ?? 'Main Node'}\n` +
                    `Emergency relay shutdown executed.`,
                severity: 'Critical',
            });
            if (alertResult?.success && alertResult.requestRef) {
                alertId = alertResult.requestRef;
                await (0, threat_events_1.updateAlertaStatus)(event.id, alertId, 'open');
                event.alerta_alert_id = alertId;
                event.alerta_status = 'open';
            }
        }
        catch (alertaErr) {
            console.error('Simulated Alerta alert dispatch failed:', alertaErr);
        }
        // 3. Queue to Solana Blockchain
        try {
            (0, solanaQueue_1.enqueueSolanaEvent)({
                table: 'threat_events',
                rowId: event.id,
                eventName: events_1.AURA_SOLANA_EVENTS.SURGE_DETECTED,
                memo: {
                    deviceId: device.id,
                    eventId: event.id,
                    voltage: 285.4,
                    current: 14.2,
                },
            });
        }
        catch (solanaErr) {
            console.error('Simulated Solana queue dispatch failed:', solanaErr);
        }
        // 4. Push real-time event to connected frontend clients via socket
        (0, socket_1.emitToDevice)(device.id, events_2.SOCKET_EVENTS.THREAT_NEW, event);
        res.json({ ok: true, event });
    }
    catch (err) {
        next(err);
    }
});
// POST /devices/:id/simulate-audit
// Simulates generating and submitting monthly compliance summary to Lisk
router.post('/devices/:id/simulate-audit', async (req, res, next) => {
    try {
        const device = await loadOwnedDevice(req.params.id, req.user.id);
        // Determine month
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthDate = `${monthStr}-01`;
        // Create a mock report summary
        let report = await (0, monthly_reports_1.upsertReport)({
            device_id: device.id,
            user_id: req.user.id,
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
        // Write monthly audit to Lisk
        try {
            await (0, lisk_1.writeMonthlyAudit)(report);
            // Fetch final updated report with Lisk transaction details
            const finalReport = await (0, monthly_reports_1.getReportById)(report.id);
            res.json({ ok: true, report: finalReport });
        }
        catch (liskErr) {
            console.error('Simulated Lisk audit failed:', liskErr);
            res.status(502).json({ error: 'Lisk audit submission failed' });
        }
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=devices.js.map