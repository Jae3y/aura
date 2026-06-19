'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuthStore } from '@/lib/stores/authStore';

interface WalletGuardProps {
  children: ReactNode;
}

export function WalletGuard({ children }: WalletGuardProps) {
  const router = useRouter();
  const { connected, disconnect } = useWallet();
  const { isAuthenticated, clearSession } = useAuthStore();

  useEffect(() => {
    // Redirect to connect page if not authenticated
    if (!isAuthenticated) {
      router.push('/connect');
      return;
    }

    // Clear session if wallet disconnected
    if (!connected && isAuthenticated) {
      clearSession();
      router.push('/connect');
    }
  }, [isAuthenticated, connected, router, clearSession]);

  // Handle wallet disconnect
  useEffect(() => {
    const handleDisconnect = () => {
      if (isAuthenticated) {
        clearSession();
        router.push('/connect');
      }
    };

    // Listen for wallet disconnect events
    if (connected) {
      window.addEventListener('wallet_disconnect', handleDisconnect);
      return () => {
        window.removeEventListener('wallet_disconnect', handleDisconnect);
      };
    }
  }, [connected, isAuthenticated, clearSession, router]);

  // Show loading state while checking auth
  if (!isAuthenticated || !connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-green-500 font-mono">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
