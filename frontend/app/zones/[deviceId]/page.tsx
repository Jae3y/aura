'use client';

import { useParams } from 'next/navigation';
import { WalletGuard } from '@/components/auth/WalletGuard';
import { useZones } from '@/lib/queries/useZones';

export default function ZonesPage() {
  const params = useParams<{ deviceId: string }>();
  const { data: zones = [] } = useZones(params.deviceId);

  return (
    <WalletGuard>
      <main className="min-h-screen bg-black px-4 py-6 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm uppercase text-emerald-300">Zones</p>
          <h1 className="mt-2 text-3xl font-semibold">Presence Detection</h1>
          <div className="mt-6 space-y-3">
            {zones.map((zone) => (
              <article key={zone.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{zone.name}</h2>
                    <p className="text-sm text-zinc-500">{zone.zone_type}</p>
                  </div>
                  <span className={zone.presence_detected ? 'text-amber-300' : 'text-emerald-300'}>
                    {zone.presence_detected ? 'Presence detected' : 'Clear'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </WalletGuard>
  );
}
