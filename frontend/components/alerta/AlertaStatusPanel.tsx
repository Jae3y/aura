'use client';

// Alerta v2 — notification routing only. Shows count of threats that
// triggered a Telegram notification via Alerta for a given device.
import { useAlertaNotifications } from '@/hooks/useAlerta';

export function AlertaStatusPanel({ deviceId }: { deviceId: string | null }) {
  const { data, isLoading } = useAlertaNotifications(deviceId);
  const notifications = data ?? [];
  const notified = notifications.length;

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-lg font-semibold text-white">Alerta Notifications</h2>
      <p className="mt-1 text-xs text-zinc-500">Threat events routed to Telegram via Alerta</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Notified Events" value={isLoading ? '…' : notified} color="text-cyan-300" />
        <Metric
          label="Latest"
          value={
            isLoading
              ? '…'
              : notifications[0]
              ? new Date(notifications[0].occurred_at).toLocaleTimeString()
              : '—'
          }
          color="text-zinc-300"
        />
      </div>
    </section>
  );
}

function Metric({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded border border-zinc-800 p-3">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
