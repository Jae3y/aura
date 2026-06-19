import { Request, Response, NextFunction } from 'express';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';

// Verifies an Ed25519 wallet signature supplied via headers. Used to gate
// on-chain access grant/revoke endpoints with proof of wallet ownership.
//   X-Wallet-Address   — base58 Solana public key
//   X-Wallet-Signature — base58 signature of X-Wallet-Message
//   X-Wallet-Message   — the signed challenge string
export function requireSolanaAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const address = req.header('X-Wallet-Address');
    const signature = req.header('X-Wallet-Signature');
    const message = req.header('X-Wallet-Message');

    if (!address || !signature || !message) {
      res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
      return;
    }

    const pubkey = new PublicKey(address);
    const ok = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signature),
      pubkey.toBytes()
    );

    if (!ok) {
      res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
      return;
    }

    req.wallet = { address };
    next();
  } catch {
    res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
  }
}
