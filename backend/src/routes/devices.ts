import { Router } from 'express';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  updateNftMintAddress,
} from '../lib/db/devices';
import { mintDeviceNFT } from '../services/nft';
import { enqueueSolanaEvent } from '../blockchain/solanaQueue';
import { AURA_SOLANA_EVENTS } from '../blockchain/events';
import { emitToDevice } from '../socket';
import { SOCKET_EVENTS } from '../socket/events';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).optional(),
  device_token: z.string().min(8),
  firmware_version: z.string().optional(),
  environment_type: z.enum(['home', 'hospital', 'industrial']).optional(),
  voltage_threshold_min: z.number().optional(),
  voltage_threshold_max: z.number().optional(),
  surge_sensitivity: z.enum(['low', 'medium', 'high']).optional(),
  location_label: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ device_token: true });

// Loads a device and asserts the authenticated user owns it.
export async function loadOwnedDevice(deviceId: string, userId: string) {
  const device = await getDeviceById(deviceId);
  if (!device) throw new HttpError(404, 'Device not found');
  if (device.user_id !== userId) throw new HttpError(403, 'Forbidden');
  return device;
}

router.get('/devices', async (req, res, next) => {
  try {
    const devices = await getDevices(req.user!.id);
    res.json({ devices });
  } catch (err) {
    next(err);
  }
});

router.post('/devices', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const device = await createDevice({
      ...body,
      user_id: req.user!.id,
      is_online: false,
      nft_mint_address: null,
    });
    res.status(201).json({ device });
  } catch (err) {
    next(err);
  }
});

router.get('/devices/:id', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    res.json({ device });
  } catch (err) {
    next(err);
  }
});

router.patch('/devices/:id', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    const patch = updateSchema.parse(req.body);
    const device = await updateDevice(req.params.id, patch);
    res.json({ device });
  } catch (err) {
    next(err);
  }
});

router.post('/devices/:id/pair', async (req, res, next) => {
  try {
    const device = await loadOwnedDevice(req.params.id, req.user!.id);
    const ownerWallet = req.user!.walletAddress;
    if (!ownerWallet) throw new HttpError(400, 'Wallet address required');

    try {
      const { mintAddress } = await mintDeviceNFT(device, ownerWallet);
      await updateNftMintAddress(device.id, mintAddress);

      enqueueSolanaEvent({
        table: 'none',
        rowId: device.id,
        eventName: AURA_SOLANA_EVENTS.DEVICE_MINTED,
        memo: { deviceId: device.id, owner: ownerWallet, mintAddress },
      });

      emitToDevice(device.id, SOCKET_EVENTS.DEVICE_PAIRED, {
        deviceId: device.id,
        mintAddress,
      });

      res.json({ ok: true, mintAddress });
    } catch (mintErr) {
      Sentry.captureException(mintErr, {
        tags: { subsystem: 'nft-mint' },
        extra: { deviceId: device.id },
      });
      emitToDevice(device.id, SOCKET_EVENTS.DEVICE_PAIR_FAILED, {
        deviceId: device.id,
      });
      throw new HttpError(502, 'NFT mint failed');
    }
  } catch (err) {
    next(err);
  }
});

router.delete('/devices/:id', async (req, res, next) => {
  try {
    await loadOwnedDevice(req.params.id, req.user!.id);
    await deleteDevice(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
