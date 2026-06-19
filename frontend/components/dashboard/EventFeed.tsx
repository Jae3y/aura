'use client';

import type { ThreatEvent } from '@/lib/types/database';
import { useRealtimeStore } from '@/lib/stores/realtimeStore';
import { SolanaExplorerBadge } from '../blockchain/SolanaExplorerBadge';
import { AlertaBadge } from '../alerta/AlertaBadge';

export function EventFeed({ events, limit = 8 }: { events?: ThreatEvent[]; limit?: number }) {
  const realtimeThreats = useRealtimeStore((state) => state.recentThreats);
  const rows = (events ?? realtimeThreats).slice(0, limit);

  if (rows.length === 0) {
    return <p className="rounded border border-zinc-800 p-4 text-sm text-zinc-500">No recent threat events.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((event) => (
        <article key={event.id} className="rounded border border-zinc-800 bg-black/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-white">{event.event_type.replace('_', ' ').toUpperCase()}</div>
              <div className="mt-1 text-xs text-zinc-500">{new Date(event.occurred_at).toLocaleString()}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AlertaBadge notified={!!event.alerta_alert_id} requestRef={event.alerta_alert_id} />
              <SolanaExplorerBadge signature={event.solana_signature} confirmed={event.solana_confirmed} slot={event.solana_slot} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
