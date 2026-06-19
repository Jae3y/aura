'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WalletConnectButton } from '@/components/auth/WalletConnectButton';
import { useAuthStore } from '@/lib/stores/authStore';

export default function ConnectPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-radial-gradient from-green-900/20 via-black to-black" />

      {/* Content */}
      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="text-center space-y-8">
          {/* Logo/Brand */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                AURA
              </span>
            </h1>
            <p className="text-sm text-green-500 font-mono tracking-wider uppercase">
              Autonomous Utility & Response Assistant
            </p>
          </div>

          {/* Description */}
          <div className="space-y-4 text-gray-400">
            <p className="text-lg">
              Military-grade IoT security system with blockchain verification
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Powered by Solana</span>
            </div>
          </div>

          {/* Connect Button */}
          <div className="pt-8">
            <WalletConnectButton />
          </div>

          {/* Features */}
          <div className="pt-12 grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <p className="text-xs text-gray-500">Secure</p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <p className="text-xs text-gray-500">Real-time</p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <p className="text-xs text-gray-500">Verified</p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-12 text-xs text-gray-600">
            <p>By connecting, you agree to our terms of service</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .bg-radial-gradient {
          background: radial-gradient(circle at center, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
