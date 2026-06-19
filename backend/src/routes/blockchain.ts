import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireSolanaAuth } from '../middleware/solana';
import { HttpError } from '../middleware/errorHandler';
import { loadOwnedDevice } from './devices';
import { getEventsByDevice } from '../lib/db/threat_events';
import {
  getTransactionDetails,
  getExplorerUrl,
} from '../services/solana';
import { getNFTMetadata, getNFTExplorerUrl } from '../services/nft';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();
router.use(authMiddleware);

// ---------------------------------------------------------------------------
// GET /blockchain/events?deviceId=&limit=
// Returns on-chain confirmed threat_events (those with a solana_signature).
// ---------------------------------------------------------------------------
router.get('/events', async (req, res, next) => {
  try {
    const deviceId = String(req.query.deviceId ?? '');
    if (!deviceId) throw new HttpError(400, 'deviceId required');
    await loadOwnedDevice(deviceId, req.user!.id);

    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const events = await getEventsByDevice(deviceId, limit);
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
          ? getExplorerUrl(e.solana_signature)
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /blockchain/verify/:signature
// Returns { confirmed, slot, timestamp, explorerUrl } for any Solana tx.
// ---------------------------------------------------------------------------
router.get('/verify/:signature', async (req, res, next) => {
  try {
    const details = await getTransactionDetails(req.params.signature);
    if (!details) {
      res.json({ confirmed: false, slot: null, timestamp: null, explorerUrl: null });
      return;
    }
    res.json(details);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /blockchain/nft/:deviceId
// Returns NFT metadata for the device's mint address.
// ---------------------------------------------------------------------------
router.get('/nft/:deviceId', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.deviceId, req.user!.id);
    if (!device.nft_mint_address) {
      throw new HttpError(404, 'Device has not been paired to an NFT');
    }
    const metadata = await getNFTMetadata(device.nft_mint_address);
    const explorerUrl = getNFTExplorerUrl(device.nft_mint_address);
    res.json({ metadata, explorerUrl, mintAddress: device.nft_mint_address });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /blockchain/access/grant   (requires Solana wallet signature)
// Grants a secondary wallet read access to a device's events.
// ---------------------------------------------------------------------------
const grantSchema = z.object({
  deviceId: z.string().uuid(),
  granteeWallet: z.string().min(32),
});

router.post('/access/grant', requireSolanaAuth, async (req, res, next) => {
  try {
    const { deviceId, granteeWallet } = grantSchema.parse(req.body);
    await loadOwnedDevice(deviceId, req.user!.id);

    const { error } = await supabaseAdmin.from('device_access_grants').upsert(
      {
        device_id: deviceId,
        owner_wallet: req.wallet!.address,
        grantee_wallet: granteeWallet,
        granted_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: 'device_id,grantee_wallet' }
    );
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /blockchain/access/revoke
// ---------------------------------------------------------------------------
const revokeSchema = z.object({
  deviceId: z.string().uuid(),
  granteeWallet: z.string().min(32),
});

router.post('/access/revoke', requireSolanaAuth, async (req, res, next) => {
  try {
    const { deviceId, granteeWallet } = revokeSchema.parse(req.body);
    await loadOwnedDevice(deviceId, req.user!.id);

    const { error } = await supabaseAdmin
      .from('device_access_grants')
      .update({ is_active: false })
      .eq('device_id', deviceId)
      .eq('grantee_wallet', granteeWallet);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /blockchain/access/:deviceId
// Lists active grantees for a device.
// ---------------------------------------------------------------------------
router.get('/access/:deviceId', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.deviceId, req.user!.id);
    const { data, error } = await supabaseAdmin
      .from('device_access_grants')
      .select('grantee_wallet, granted_at')
      .eq('device_id', req.params.deviceId)
      .eq('is_active', true)
      .order('granted_at', { ascending: false });
    if (error) throw error;
    res.json({ grants: data ?? [] });
  } catch (err) {
    next(err);
  }
});

export default router;
