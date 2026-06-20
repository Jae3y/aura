'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import bs58 from 'bs58';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { PublicKey } from '@solana/web3.js';

const CHALLENGE_MESSAGE = 'Sign this message to authenticate with AURA';

export function WalletConnectButton() {
  const wallet = useWallet();
  const { publicKey, signMessage, connect, disconnect, connected, connecting, select, wallets } = wallet;
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();
  const { setSession, setProfile } = useAuthStore();

  const handleConnect = async () => {
    try {
      setIsAuthenticating(true);

      let walletPublicKey = publicKey;
      let walletSignMessage = signMessage;

      // Select and connect Phantom wallet if not already connected
      if (!connected || !walletPublicKey || !walletSignMessage) {
        const phantomWallet = wallets.find(wallet => wallet.adapter.name === 'Phantom');
        if (!phantomWallet) {
          throw new Error('Phantom wallet not found. Please install Phantom wallet extension.');
        }
        
        select(phantomWallet.adapter.name);
        
        // Wait for selection to register
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Connect to the wallet
        await connect();

        // Poll the adapter until publicKey is populated (up to 3 seconds)
        const adapterInstance = phantomWallet.adapter as {
          publicKey?: PublicKey | null;
          signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
        };
        const deadline = Date.now() + 3000;
        while (Date.now() < deadline) {
          if (adapterInstance?.publicKey && adapterInstance?.signMessage) {
            walletPublicKey = adapterInstance.publicKey;
            walletSignMessage = adapterInstance.signMessage.bind(adapterInstance);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Last resort: read from Phantom's injected window.solana object
        if (!walletPublicKey) {
          const phantom = (window as Window & {
            solana?: {
              isPhantom?: boolean;
              publicKey?: PublicKey;
              signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
            };
          }).solana;
          if (phantom?.isPhantom && phantom?.publicKey && phantom?.signMessage) {
            walletPublicKey = phantom.publicKey;
            walletSignMessage = phantom.signMessage.bind(phantom);
          }
        }

        if (!walletPublicKey || !walletSignMessage) {
          throw new Error('Wallet connection succeeded but public key is not available. Please try again.');
        }
      }

      if (!walletPublicKey || !walletSignMessage) {
        throw new Error('Wallet not properly connected. Please ensure Phantom is unlocked and try again.');
      }

      // Sign challenge message
      const message = new TextEncoder().encode(CHALLENGE_MESSAGE);
      const signature = await walletSignMessage(message);

      const signatureBase58 = bs58.encode(signature);
      const walletAddress = walletPublicKey.toBase58();

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
          toast.error('Failed to authenticate wallet');
        }
      }

      // Disconnect wallet on auth failure
      await disconnect();
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
