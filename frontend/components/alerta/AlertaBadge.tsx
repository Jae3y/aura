// Alerta v2 — notification-only. Badge shows whether a Telegram notification
// was sent for this threat event (stored as alerta_alert_id = requestRef).

interface AlertaBadgeProps {
  notified?: boolean | null;
  requestRef?: string | null;
}

export function AlertaBadge({ notified, requestRef }: AlertaBadgeProps) {
  if (!notified && !requestRef) {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-500">
        <span className="h-2 w-2 rounded-full bg-zinc-600" />
        NO ALERT SENT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded border border-cyan-500/30 px-2 py-1 text-xs text-cyan-300">
      <span className="h-2 w-2 rounded-full bg-cyan-400" />
      ALERTA NOTIFIED
    </span>
  );
}
