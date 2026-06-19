import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { supabaseAnon } from '../lib/supabase';
import { getProfileById } from '../lib/db/profiles';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

// Verifies the Supabase-issued JWT, loads the profile row, attaches req.user,
// and sets the Sentry user context. Any failure returns a structured 401 with
// no JWT internals leaked.
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
      return;
    }

    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
      return;
    }

    const profile = await getProfileById(data.user.id);
    if (!profile) {
      res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
      return;
    }

    req.user = {
      id: profile.id,
      walletAddress: profile.wallet_address,
      email: profile.email,
    };

    Sentry.setUser({
      id: profile.id,
      username: profile.wallet_address ?? undefined,
    });

    next();
  } catch {
    res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
  }
}
