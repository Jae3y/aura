import { ExternalLink, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

interface SolanaExplorerBadgeProps {
  signature: string;
  type?: "tx" | "address";
  className?: string;
  showVerifiedIcon?: boolean;
}

export function SolanaExplorerBadge({
  signature,
  type = "tx",
  className,
  showVerifiedIcon = true,
}: SolanaExplorerBadgeProps) {
  const shortSig = `${signature.slice(0, 4)}...${signature.slice(-4)}`;
  const url = `https://explorer.solana.com/${type}/${signature}?cluster=devnet`;

  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        "inline-flex items-center space-x-1.5 px-2 py-1 bg-accent-teal/10 border border-accent-teal/30 rounded text-accent-teal hover:bg-accent-teal/20 transition-colors",
        className
      )}
    >
      {showVerifiedIcon && <CheckCircle2 size={12} />}
      <span className="text-[10px] font-mono tracking-widest uppercase">SOL: {shortSig}</span>
      <ExternalLink size={10} className="opacity-70" />
    </Link>
  );
}
