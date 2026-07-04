'use client';

import { useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { config } from '@/lib/config';

export function WalletProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => clusterApiUrl(config.solana.network as 'devnet' | 'testnet' | 'mainnet-beta'),
    []
  );

  // Phantom auto-registers as a Standard Wallet — explicit adapter is
  // redundant and produces a console warning.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
