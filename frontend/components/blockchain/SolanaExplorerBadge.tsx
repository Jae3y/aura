'use client';

import { CheckCircle2, Copy, ExternalLink, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { toast } from '@/lib/toast';

// Solana signatures are always 88 base58 characters (64 bytes).
// Anything under 32 chars is a placeholder/mock, not a real sig.
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

type SigState = 'pending-no-sig' | 'placeholder' | 'invalid' | 'pending-unconfirmed' | 'confirmed';

function classifySignature(signature: string | null, confirmed?: boolean): SigState {
  if (!signature) return 'pending-no-sig';
  if (signature.length < 32) return 'placeholder';               // mock / queued but not yet written
  if (signature.length > 88 || !BASE58_RE.test(signature)) return 'invalid';  // malformed
  if (!confirmed) return 'pending-unconfirmed';                  // valid sig, awaiting confirmation
  return 'confirmed';
}

interface SolanaExplorerBadgeProps {
  signature: string | null;
  confirmed?: boolean;
  slot?: number | null;
}

export function SolanaExplorerBadge({ signature, confirmed = false, slot }: SolanaExplorerBadgeProps) {
  const state = classifySignature(signature, confirmed);

  if (state === 'pending-no-sig') {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-xs text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Pending
      </span>
    );
  }

  if (state === 'placeholder') {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-xs text-amber-300">
        <Clock className="h-3 w-3" />
        Queued — awaiting chain write
      </span>
    );
  }

  if (state === 'invalid') {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-red-500/30 bg-red-500/5 px-2 py-1 text-xs text-red-300">
        <AlertTriangle className="h-3 w-3" />
        Invalid format
      </span>
    );
  }

  if (state === 'pending-unconfirmed') {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-xs text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Confirming…
      </span>
    );
  }

  // confirmed — show full interactive badge
  const short = `${signature!.slice(0, 4)}...${signature!.slice(-4)}`;
  const href = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
      <CheckCircle2 className="h-3 w-3" />
      <a
        className="font-mono hover:text-white"
        href={href}
        target="_blank"
        rel="noreferrer"
        title={slot ? `Slot ${slot}` : 'View on Solana'}
      >
        {short}
      </a>
      <button
        type="button"
        aria-label="Copy Solana signature"
        className="rounded p-0.5 hover:bg-emerald-500/20"
        onClick={() => {
          navigator.clipboard.writeText(signature!);
          toast.success('Signature copied');
        }}
      >
        <Copy className="h-3 w-3" />
      </button>
      <ExternalLink className="h-3 w-3" />
    </span>
  );
}
