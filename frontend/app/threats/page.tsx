'use client';

import { WalletGuard } from '@/components/auth/WalletGuard';
import { AlertaAlertCard } from '@/components/alerta/AlertaAlertCard';
import { useDevices } from '@/lib/queries/useDevices';
import { useThreats } from '@/lib/queries/useThreats';

export default function ThreatsPage() {
  const { data: devices = [] } = useDevices();
  const device = devices[0] ?? null;
  const { data: threats = [] } = useThreats(device?.id ?? null, 100);

  return (
    <WalletGuard>
      <main className="min-h-screen bg-black px-4 py-6 text-white">
        <div className="mx-auto max-w-5xl space-y-4">
          <div>
            <p className="text-sm uppercase text-emerald-300">Threats</p>
            <h1 className="mt-2 text-3xl font-semibold">Incident Queue</h1>
          </div>
          {threats.map((event) => <AlertaAlertCard key={event.id} event={event} />)}
          {threats.length === 0 ? <p className="rounded border border-zinc-800 p-5 text-zinc-500">No threat events found.</p> : null}
        </div>
      </main>
    </WalletGuard>
  );
}
