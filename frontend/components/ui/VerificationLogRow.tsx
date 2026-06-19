import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { SolanaExplorerBadge } from "./SolanaExplorerBadge";
import { clsx } from "clsx";

export type VerificationStatus = "verified" | "pending" | "failed";

interface VerificationLogRowProps {
  title: string;
  description?: string;
  timeAgo: string;
  signature?: string;
  status: VerificationStatus;
  icon?: React.ReactNode;
}

export function VerificationLogRow({
  title,
  description,
  timeAgo,
  signature,
  status,
  icon,
}: VerificationLogRowProps) {
  const statusConfig = {
    verified: {
      color: "text-accent-teal",
      bg: "bg-accent-teal/10",
      border: "border-accent-teal/30",
      icon: <CheckCircle2 size={14} />,
      label: "SOLANA VERIFIED",
    },
    pending: {
      color: "text-accent-warning",
      bg: "bg-accent-warning/10",
      border: "border-accent-warning/30",
      icon: <Loader2 size={14} className="animate-spin" />,
      label: "PENDING",
    },
    failed: {
      color: "text-accent-danger",
      bg: "bg-accent-danger/10",
      border: "border-accent-danger/30",
      icon: <XCircle size={14} />,
      label: "FAILED",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex flex-col p-3 bg-card border border-zinc-800 rounded-lg space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className={clsx("p-2 rounded bg-zinc-900 border border-zinc-800", config.color)}>
              {icon}
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">{title}</h4>
            <div className="flex items-center text-xs text-text-muted font-mono mt-0.5">
              <Clock size={10} className="mr-1" />
              {timeAgo}
            </div>
          </div>
        </div>
        
        {/* Verification Badge */}
        <div className={clsx("flex items-center space-x-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest border", config.bg, config.color, config.border)}>
          {config.icon}
          <span>{config.label}</span>
        </div>
      </div>

      {description && (
        <p className="text-xs text-text-secondary pl-[46px]">{description}</p>
      )}

      {signature && status === "verified" && (
        <div className="pl-[46px] pt-1">
          <SolanaExplorerBadge signature={signature} />
        </div>
      )}
    </div>
  );
}
