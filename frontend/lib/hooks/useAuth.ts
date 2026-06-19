import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../api/auth';
import * as Sentry from '@sentry/nextjs';

export function useAuth() {
  const { connected, publicKey } = useWallet();
  const { isAuthenticated, session, profile, clearSession } = useAuthStore();

  const isWalletUser = !!profile?.wallet_address;

  // Auto-logout when wallet disconnects (only for wallet users)
  useEffect(() => {
    if (isWalletUser && !connected && isAuthenticated) {
      clearSession();
    }
  }, [connected, isAuthenticated, clearSession, isWalletUser]);

  // Token refresh logic
  useEffect(() => {
    if (!session || !isAuthenticated) return;

    const now = Date.now();
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const timeUntilExpiry = expiresAt - now;

    // Refresh 5 minutes before expiry
    const refreshThreshold = 5 * 60 * 1000;

    if (timeUntilExpiry <= refreshThreshold && timeUntilExpiry > 0) {
      authAPI
        .refreshToken(session.refresh_token)
        .then((response) => {
          useAuthStore.getState().setSession(response);
          useAuthStore.getState().setProfile(response.profile);
        })
        .catch((error) => {
          console.error('Token refresh failed:', error);
          Sentry.captureException(error);
          clearSession();
        });
    }

    // Set up interval to check token expiry
    const interval = setInterval(() => {
      const currentSession = useAuthStore.getState().session;
      if (!currentSession) return;

      const currentTime = Date.now();
      const sessionExpiresAt = currentSession.expires_at * 1000;

      if (currentTime >= sessionExpiresAt) {
        clearSession();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [session, isAuthenticated, clearSession]);

  return {
    isAuthenticated,
    walletAddress: publicKey?.toBase58() || null,
    profile,
    session,
  };
}
