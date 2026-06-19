'use client';

// Alerta v2 — notification routing only. No ack/close buttons.
// alerta_alert_id stores the Alerta requestRef from the Telegram send.
import { Copy } from 'lucide-react';
import { toast } from '@/lib/toast';
import type { ThreatEvent } from '@/lib/types/database';
import { AlertaBadge } from './AlertaBadge';
import { SolanaExplorerBadge } from '../blockchain/SolanaExplorerBadge';

export function AlertaAlertCard({ event }: { event: ThreatEvent }) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">
            {event.event_type.replace('_', ' ').toUpperCase()}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {event.action_taken ?? 'Threat event recorded'}
          </p>
        </div>
        <AlertaBadge notified={!!event.alerta_alert_id} requestRef={event.alerta_alert_id} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Field label="Voltage" value={event.voltage_at_event ?? '—'} />
        <Field label="Current" value={event.current_at_event ?? '—'} />
        <Field label="Relay" value={event.relay_triggered ? `CH ${event.relay_channel ?? '—'}` : 'None'} />
        <Field label="Occurred" value={new Date(event.occurred_at).toLocaleString()} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SolanaExplorerBadge
          signature={event.solana_signature}
          confirmed={event.solana_confirmed}
          slot={event.solana_slot}
        />

        {event.alerta_alert_id ? (
          <button
            className="inline-flex items-center gap-2 rounded border border-cyan-700/30 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10"
            onClick={() => {
              navigator.clipboard.writeText(event.alerta_alert_id!);
              toast.success('Alerta request ref copied');
            }}
          >
            <Copy className="h-3 w-3" />
            {event.alerta_alert_id.slice(0, 14)}…
          </button>
        ) : null}
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-zinc-800 p-3">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}
