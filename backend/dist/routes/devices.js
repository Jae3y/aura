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
const devices_1 = require("../lib/db/devices");
const nft_1 = require("../services/nft");
const solanaQueue_1 = require("../blockchain/solanaQueue");
const events_1 = require("../blockchain/events");
const socket_1 = require("../socket");
const events_2 = require("../socket/events");
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
exports.default = router;
//# sourceMappingURL=devices.js.map