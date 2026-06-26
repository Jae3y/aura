'use client';

import { ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';

interface DeviceNFTCardProps {
  mintAddress?: string | null;
  metadata?: Record<string, unknown> | null;
  explorerUrl?: string | null;
}

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidSolanaAddress(addr: string): boolean {
  return addr.length >= 32 && addr.length <= 44 && BASE58_RE.test(addr);
}

export function DeviceNFTCard({ mintAddress, metadata, explorerUrl }: DeviceNFTCardProps) {
  if (!mintAddress) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="text-lg font-semibold text-white">Device NFT</h2>
        <p className="mt-2 text-sm text-zinc-400">This device has not been paired to a Solana identity NFT yet.</p>
      </section>
    );
  }

  const isValid = isValidSolanaAddress(mintAddress);
  const attributes = Array.isArray(metadata?.attributes) ? metadata.attributes : [];

  return (
    <section className="rounded-lg border border-emerald-500/20 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-white">{String(metadata?.name ?? 'AURA Unit NFT')}</h2>
          </div>
          <p className="mt-2 break-all font-mono text-xs text-zinc-400">{mintAddress}</p>
        </div>
        {isValid ? (
          <span className="rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300">Ownership verified</span>
        ) : (
          <span className="flex items-center gap-1 rounded border border-amber-500/30 px-2 py-1 text-xs text-amber-300">
            <AlertTriangle size={10} />
            Invalid address
          </span>
        )}
      </div>

      {attributes.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {attributes.map((item, index) => {
            const attr = item as { trait_type?: string; value?: unknown };
            return (
              <div key={`${attr.trait_type}-${index}`} className="rounded border border-zinc-800 p-3">
                <div className="text-xs uppercase text-zinc-500">{attr.trait_type}</div>
                <div className="mt-1 text-zinc-200">{String(attr.value ?? '-')}</div>
              </div>
            );
          })}
        </div>
      )}

      {isValid && (
        <a
          className="mt-4 inline-flex items-center gap-2 rounded border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10"
          href={explorerUrl ?? `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
        >
          View on Solana
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </section>
  );
}
