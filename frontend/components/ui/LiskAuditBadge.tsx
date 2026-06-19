import { ShieldCheck } from "lucide-react";
import { clsx } from "clsx";

interface LiskAuditBadgeProps {
  className?: string;
}

export function LiskAuditBadge({ className }: LiskAuditBadgeProps) {
  return (
    <div
      className={clsx(
        "inline-flex items-center space-x-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-text-muted",
        className
      )}
      title="Monthly compliance audit sync via Lisk Protocol"
    >
      <ShieldCheck size={12} />
      <span className="text-[9px] font-sans tracking-widest uppercase">Lisk Audit Sync</span>
    </div>
  );
}
