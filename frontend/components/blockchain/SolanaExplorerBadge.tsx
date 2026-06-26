'use client';

import { CheckCircle2, Copy, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function isValid(addr: string): boolean {
  return addr.length >= 32 && addr.length <= 44 && BASE58_RE.test(addr);
}

interface SolanaExplorerBadgeProps {
  signature: string | null;
  confirmed?: boolean;
  slot?: number | null;
}

export function SolanaExplorerBadge({ signature, confirmed = false, slot }: SolanaExplorerBadgeProps) {
  if (!signature) {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-amber-500/30 px-2 py-1 text-xs text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Pending
      </span>
    );
  }

  if (!confirmed) {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-amber-500/30 px-2 py-1 text-xs text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Pending
      </span>
    );
  }

  if (!isValid(signature)) {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-amber-500/30 px-2 py-1 text-xs text-amber-300">
        <AlertTriangle className="h-3 w-3" />
        Invalid
      </span>
    );
  }

  const short = `${signature.slice(0, 4)}...${signature.slice(-4)}`;
  const href = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
      <CheckCircle2 className="h-3 w-3" />
      <a className="font-mono hover:text-white" href={href} target="_blank" rel="noreferrer" title={slot ? `Slot ${slot}` : 'View on Solana'}>
        {short}
      </a>
      <button
        type="button"
        aria-label="Copy Solana signature"
        className="rounded p-0.5 hover:bg-emerald-500/20"
        onClick={() => {
          navigator.clipboard.writeText(signature);
          toast.success('Signature copied');
        }}
      >
        <Copy className="h-3 w-3" />
      </button>
      <ExternalLink className="h-3 w-3" />
    </span>
  );
}
