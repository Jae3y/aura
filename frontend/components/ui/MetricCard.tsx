import { clsx } from "clsx";
import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | ReactNode;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  className?: string;
  highlighted?: boolean;
}

export function MetricCard({ label, value, subValue, trend, icon, className, highlighted }: MetricCardProps) {
  return (
    <div className={clsx(
      "bg-card border rounded-lg p-4 flex flex-col justify-between",
      highlighted ? "border-accent-cyan shadow-[0_0_10px_rgba(6,182,212,0.1)]" : "border-zinc-800",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted font-bold tracking-wider uppercase">{label}</span>
        {icon && <div className={clsx("text-text-secondary", highlighted && "text-accent-cyan")}>{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-mono font-bold text-text-primary">{value}</div>
        {subValue && (
          <div className="flex items-center mt-1">
            <span className={clsx(
              "text-xs font-mono",
              trend === "up" ? "text-accent-cyan" : trend === "down" ? "text-accent-danger" : "text-text-muted"
            )}>
              {subValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
