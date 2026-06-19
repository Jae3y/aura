'use client';

import { useParams } from 'next/navigation';
import { WalletGuard } from '@/components/auth/WalletGuard';
import { DeviceNFTCard } from '@/components/blockchain/DeviceNFTCard';
import { SolanaExplorerBadge } from '@/components/blockchain/SolanaExplorerBadge';
import { useDevice, useControlRelay } from '@/lib/queries/useDevices';
import { useZones } from '@/lib/queries/useZones';
import { useThreats } from '@/lib/queries/useThreats';
import { useDeviceNFT } from '@/hooks/useBlockchain';

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const deviceId = params.id;
  const { data: device } = useDevice(deviceId);
  const { data: zones = [] } = useZones(deviceId);
  const { data: threats = [] } = useThreats(deviceId, 5);
  const { data: nft } = useDeviceNFT(deviceId);
  const relay = useControlRelay(deviceId);

  return (
    <WalletGuard>
      <main className="min-h-screen bg-black px-4 py-6 text-white">
        <div className="mx-auto max-w-6xl space-y-6">
          <section>
            <p className="text-sm uppercase text-emerald-300">Device Detail</p>
            <h1 className="mt-2 text-3xl font-semibold">{device?.name ?? 'AURA Unit'}</h1>
            <p className="mt-1 text-zinc-500">{device?.location_label ?? device?.environment_type}</p>
          </section>

          <DeviceNFTCard mintAddress={nft?.mintAddress ?? device?.nft_mint_address} metadata={nft?.metadata} explorerUrl={nft?.explorerUrl} />

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold">Relay Control</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[1, 2, 3, 4].map((channel) => (
                <div key={channel} className="rounded border border-zinc-800 p-3">
                  <div className="text-sm text-zinc-400">Channel {channel}</div>
                  <div className="mt-3 flex gap-2">
                    <button className="rounded border border-emerald-500/30 px-3 py-1 text-sm text-emerald-300" onClick={() => relay.mutate({ channel, state: 'on' })}>On</button>
                    <button className="rounded border border-red-500/30 px-3 py-1 text-sm text-red-300" onClick={() => relay.mutate({ channel, state: 'off' })}>Off</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-lg font-semibold">Zones</h2>
              <div className="mt-4 space-y-3">
                {zones.map((zone) => (
                  <div key={zone.id} className="flex items-center justify-between rounded border border-zinc-800 p-3">
                    <span>{zone.name}</span>
                    <span className="text-sm text-zinc-400">{zone.zone_type}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-lg font-semibold">Recent Audit Events</h2>
              <div className="mt-4 space-y-3">
                {threats.map((event) => (
                  <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-800 p-3">
                    <span>{event.event_type}</span>
                    <SolanaExplorerBadge signature={event.solana_signature} confirmed={event.solana_confirmed} slot={event.solana_slot} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </WalletGuard>
  );
}
