"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const solana_1 = require("../middleware/solana");
const errorHandler_1 = require("../middleware/errorHandler");
const devices_1 = require("./devices");
const threat_events_1 = require("../lib/db/threat_events");
const solana_2 = require("../services/solana");
const nft_1 = require("../services/nft");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// ---------------------------------------------------------------------------
// GET /blockchain/events?deviceId=&limit=
// Returns on-chain confirmed threat_events (those with a solana_signature).
// ---------------------------------------------------------------------------
router.get('/events', async (req, res, next) => {
    try {
        const deviceId = String(req.query.deviceId ?? '');
        if (!deviceId)
            throw new errorHandler_1.HttpError(400, 'deviceId required');
        await (0, devices_1.loadOwnedDevice)(deviceId, req.user.id);
        const limit = Math.min(Number(req.query.limit ?? 50), 200);
        const events = await (0, threat_events_1.getEventsByDevice)(deviceId, limit);
        const chainEvents = events.filter((e) => e.solana_signature);
        res.json({
            events: chainEvents.map((e) => ({
                id: e.id,
                event_type: e.event_type,
                severity: e.severity,
                occurred_at: e.occurred_at,
                solana_signature: e.solana_signature,
                solana_slot: e.solana_slot,
                solana_confirmed: e.solana_confirmed,
                explorer_url: e.solana_signature
                    ? (0, solana_2.getExplorerUrl)(e.solana_signature)
                    : null,
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// GET /blockchain/verify/:signature
// Returns { confirmed, slot, timestamp, explorerUrl } for any Solana tx.
// ---------------------------------------------------------------------------
router.get('/verify/:signature', async (req, res, next) => {
    try {
        const details = await (0, solana_2.getTransactionDetails)(req.params.signature);
        if (!details) {
            res.json({ confirmed: false, slot: null, timestamp: null, explorerUrl: null });
            return;
        }
        res.json(details);
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// GET /blockchain/nft/:deviceId
// Returns NFT metadata for the device's mint address.
// ---------------------------------------------------------------------------
router.get('/nft/:deviceId', async (req, res, next) => {
    try {
        const device = await (0, devices_1.loadOwnedDevice)(req.params.deviceId, req.user.id);
        if (!device.nft_mint_address) {
            throw new errorHandler_1.HttpError(404, 'Device has not been paired to an NFT');
        }
        const metadata = await (0, nft_1.getNFTMetadata)(device.nft_mint_address);
        const explorerUrl = (0, nft_1.getNFTExplorerUrl)(device.nft_mint_address);
        res.json({ metadata, explorerUrl, mintAddress: device.nft_mint_address });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /blockchain/access/grant   (requires Solana wallet signature)
// Grants a secondary wallet read access to a device's events.
// ---------------------------------------------------------------------------
const grantSchema = zod_1.z.object({
    deviceId: zod_1.z.string().uuid(),
    granteeWallet: zod_1.z.string().min(32),
});
router.post('/access/grant', solana_1.requireSolanaAuth, async (req, res, next) => {
    try {
        const { deviceId, granteeWallet } = grantSchema.parse(req.body);
        await (0, devices_1.loadOwnedDevice)(deviceId, req.user.id);
        const { error } = await supabase_1.supabaseAdmin.from('device_access_grants').upsert({
            device_id: deviceId,
            owner_wallet: req.wallet.address,
            grantee_wallet: granteeWallet,
            granted_at: new Date().toISOString(),
            is_active: true,
        }, { onConflict: 'device_id,grantee_wallet' });
        if (error)
            throw error;
        res.status(201).json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /blockchain/access/revoke
// ---------------------------------------------------------------------------
const revokeSchema = zod_1.z.object({
    deviceId: zod_1.z.string().uuid(),
    granteeWallet: zod_1.z.string().min(32),
});
router.post('/access/revoke', solana_1.requireSolanaAuth, async (req, res, next) => {
    try {
        const { deviceId, granteeWallet } = revokeSchema.parse(req.body);
        await (0, devices_1.loadOwnedDevice)(deviceId, req.user.id);
        const { error } = await supabase_1.supabaseAdmin
            .from('device_access_grants')
            .update({ is_active: false })
            .eq('device_id', deviceId)
            .eq('grantee_wallet', granteeWallet);
        if (error)
            throw error;
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// GET /blockchain/access/:deviceId
// Lists active grantees for a device.
// ---------------------------------------------------------------------------
router.get('/access/:deviceId', async (req, res, next) => {
    try {
        await (0, devices_1.loadOwnedDevice)(req.params.deviceId, req.user.id);
        const { data, error } = await supabase_1.supabaseAdmin
            .from('device_access_grants')
            .select('grantee_wallet, granted_at')
            .eq('device_id', req.params.deviceId)
            .eq('is_active', true)
            .order('granted_at', { ascending: false });
        if (error)
            throw error;
        res.json({ grants: data ?? [] });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=blockchain.js.map