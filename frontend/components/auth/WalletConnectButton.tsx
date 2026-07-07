'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import bs58 from 'bs58';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';

const CHALLENGE_MESSAGE = 'Sign this message to authenticate with AURA';

export function WalletConnectButton() {
  const { publicKey, signMessage, connect, disconnect, connected, connecting, select, wallets } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasSelectedWallet, setHasSelectedWallet] = useState(false);
  const router = useRouter();
  const { setSession, setProfile } = useAuthStore();

  // Auto-select Phantom wallet on mount
  useEffect(() => {
    if (!hasSelectedWallet && wallets.length > 0) {
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      if (phantomWallet) {
        select(phantomWallet.adapter.name);
        setHasSelectedWallet(true);
      }
    }
  }, [wallets, select, hasSelectedWallet]);

  const handleConnect = async () => {
    try {
      setIsAuthenticating(true);

      // Find Phantom adapter to check its state
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');

      // On Android mobile, redirect to Phantom's in-app browser if not detected
      if (
        phantomWallet &&
        phantomWallet.adapter.readyState === WalletReadyState.NotDetected &&
        /android/i.test(navigator?.userAgent ?? '')
      ) {
        const url = encodeURIComponent(window.location.href);
        const ref = encodeURIComponent(window.location.origin);
        window.location.href = `https://phantom.app/ul/browse/${url}?ref=${ref}`;
        return;
      }

      // Ensure Phantom is selected
      if (!hasSelectedWallet) {
        if (!phantomWallet) {
          throw new Error('Phantom wallet not found. Please install Phantom wallet extension.');
        }
        await select(phantomWallet.adapter.name);
        setHasSelectedWallet(true);
        // Give selection time to register
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Connect if not already connected
      if (!connected) {
        await connect();
        // Wait for connection to establish
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Ensure we have publicKey and signMessage
      if (!publicKey || !signMessage) {
        throw new Error('Wallet not properly connected. Please ensure Phantom is unlocked and try again.');
      }

      // Sign challenge message
      const message = new TextEncoder().encode(CHALLENGE_MESSAGE);
      const signature = await signMessage(message);

      const signatureBase58 = bs58.encode(signature);
      const walletAddress = publicKey.toBase58();

      // Authenticate with backend
      const response = await authAPI.login({
        walletAddress,
        signature: signatureBase58,
        message: CHALLENGE_MESSAGE,
      });

      // Store session and profile
      setSession(response);
      setProfile(response.profile);

      // Update Supabase session (optional, for Supabase Realtime)
      if (supabase) {
        await supabase.auth.setSession({
          access_token: response.access_token,
          refresh_token: response.refresh_token,
        });
      }

      // Set Sentry user context
      Sentry.setUser({
        id: response.user.id,
        username: walletAddress,
      });

      toast.success('Wallet connected successfully');

      // Request FCM push permission after successful login (Req 12.1)
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted' && 'serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            // Extract FCM token via push subscription (VAPID key from env)
            const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
            if (vapidKey) {
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidKey,
              });
              const fcmToken = JSON.stringify(subscription);
              await authAPI.updateFCMToken(response.access_token, fcmToken);
            }
          }
        }
      } catch (fcmError) {
        // FCM errors are non-fatal
        console.warn('FCM registration failed:', fcmError);
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Authentication error:', error);
      Sentry.captureException(error);
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.warning('Signature request was rejected');
        } else {
          toast.error(error.message || 'Failed to authenticate wallet');
        }
      }

      // Disconnect wallet on auth failure
      try {
        await disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const isLoading = connecting || isAuthenticating;

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="group relative px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg shadow-lg shadow-green-500/20 hover:shadow-green-500/40 disabled:shadow-none transition-all duration-300 disabled:cursor-not-allowed"
    >
      <span className="relative z-10 flex items-center justify-center gap-3">
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{connecting ? 'Connecting...' : 'Authenticating...'}</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Connect Phantom Wallet</span>
          </>
        )}
      </span>
      
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
    </button>
  );
}
