'use client';

import { WalletGuard } from '@/components/auth/WalletGuard';
import { DeviceNFTCard } from '@/components/blockchain/DeviceNFTCard';
import { SolanaExplorerBadge } from '@/components/blockchain/SolanaExplorerBadge';
import { useDevices } from '@/lib/queries/useDevices';
import { useDeviceNFT, useSolanaEvents, useWalletAccess } from '@/hooks/useBlockchain';

export default function BlockchainPage() {
  const { data: devices = [] } = useDevices();
  const device = devices[0] ?? null;
  const { data: events = [] } = useSolanaEvents(device?.id ?? null);
  const { data: nft } = useDeviceNFT(device?.id ?? null);
  const { data: access } = useWalletAccess(device?.id ?? null);

  return (
    <WalletGuard>
      <main className="min-h-screen bg-black px-4 py-6 text-white">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <p className="text-sm uppercase text-emerald-300">Blockchain</p>
            <h1 className="mt-2 text-3xl font-semibold">Solana Audit Log</h1>
          </div>
          <DeviceNFTCard mintAddress={nft?.mintAddress ?? device?.nft_mint_address} metadata={nft?.metadata} explorerUrl={nft?.explorerUrl} />
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold">Events</h2>
            <div className="mt-4 space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 p-3">
                  <span>{event.event_type}</span>
                  <SolanaExplorerBadge signature={event.solana_signature} confirmed={event.solana_confirmed} slot={event.solana_slot} />
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold">Wallet Access</h2>
            <div className="mt-4 space-y-2 text-sm text-zinc-300">
              {access?.grants.map((grant) => <div key={grant.grantee_wallet} className="break-all rounded border border-zinc-800 p-3">{grant.grantee_wallet}</div>)}
            </div>
          </section>
        </div>
      </main>
    </WalletGuard>
  );
}
