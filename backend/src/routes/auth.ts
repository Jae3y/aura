import { Router } from 'express';
import crypto from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { config } from '../config';
import { supabaseAdmin, supabaseAnon } from '../lib/supabase';
import { upsertProfile, updateFcmToken } from '../lib/db/profiles';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/errorHandler';

const router = Router();
router.use(authLimiter);

const loginSchema = z.object({
  walletAddress: z.string().min(32),
  signature: z.string().min(1),
  message: z.string().min(1),
});

function verifyWalletSignature(addr: string, sig: string, msg: string): boolean {
  try {
    const pubkey = new PublicKey(addr);
    return nacl.sign.detached.verify(
      new TextEncoder().encode(msg),
      bs58.decode(sig),
      pubkey.toBytes()
    );
  } catch {
    return false;
  }
}

// Deterministic Supabase credentials derived from the wallet address so a
// wallet maps to exactly one Supabase auth user.
function walletEmail(addr: string): string {
  return `${addr.toLowerCase()}@wallet.aura`;
}
function walletPassword(addr: string): string {
  return crypto
    .createHmac('sha256', config.JWT_SECRET)
    .update(addr)
    .digest('hex');
}

async function ensureUser(addr: string): Promise<string> {
  const email = walletEmail(addr);
  const password = walletPassword(addr);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error && !/already/i.test(error.message)) throw error;
  return data?.user?.id ?? '';
}

async function sessionFor(addr: string) {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email: walletEmail(addr),
    password: walletPassword(addr),
  });
  if (error || !data.session) throw new HttpError(401, 'Authentication failed');
  return data;
}

async function authenticate(addr: string, sig: string, msg: string) {
  if (!verifyWalletSignature(addr, sig, msg)) {
    throw new HttpError(401, 'Invalid wallet signature');
  }
  await ensureUser(addr);
  const data = await sessionFor(addr);
  await upsertProfile({
    id: data.user!.id,
    email: walletEmail(addr),
    wallet_address: addr,
  });
  return data;
}

router.post('/register', async (req, res, next) => {
  try {
    const { walletAddress, signature, message } = loginSchema.parse(req.body);
    const data = await authenticate(walletAddress, signature, message);
    res.status(201).json({ session: data.session, user: data.user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { walletAddress, signature, message } = loginSchema.parse(req.body);
    const data = await authenticate(walletAddress, signature, message);
    res.json({ session: data.session, user: data.user });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = z.string().parse(req.body?.refresh_token);
    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) throw new HttpError(401, 'Invalid refresh token');
    res.json({ session: data.session });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await supabaseAdmin.auth.admin.signOut(
      req.headers.authorization!.slice('Bearer '.length)
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/fcm-token', authMiddleware, async (req, res, next) => {
  try {
    const token = z.string().min(1).parse(req.body?.token);
    await updateFcmToken(req.user!.id, token);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
