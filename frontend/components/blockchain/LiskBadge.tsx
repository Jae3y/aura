import { CheckCircle2, Loader2 } from 'lucide-react';

export function LiskBadge({ txId, confirmed }: { txId?: string | null; confirmed?: boolean }) {
  if (!txId || !confirmed) {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-amber-500/30 px-2 py-1 text-xs text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Lisk pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-300">
      <CheckCircle2 className="h-3 w-3" />
      {txId.slice(0, 10)}...
    </span>
  );
}
