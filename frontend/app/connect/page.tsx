'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WalletConnectButton } from '@/components/auth/WalletConnectButton';
import { useAuthStore } from '@/lib/stores/authStore';
import { authAPI } from '@/lib/api/auth';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { EnvironmentType } from '@/lib/types/database';

export default function ConnectPage() {
  const router = useRouter();
  const { isAuthenticated, setSession, setProfile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'wallet' | 'email'>('wallet');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [environmentType, setEnvironmentType] = useState<'home' | 'hospital' | 'industrial'>('home');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        const response = await authAPI.emailRegister({
          email,
          password,
          fullName: fullName || undefined,
          environmentType,
        });
        setSession(response);
        setProfile(response.profile);

        if (supabase) {
          await supabase.auth.setSession({
            access_token: response.access_token,
            refresh_token: response.refresh_token,
          });
        }
        toast.success('Registration successful');
      } else {
        const response = await authAPI.emailLogin({ email, password });
        setSession(response);
        setProfile(response.profile);

        if (supabase) {
          await supabase.auth.setSession({
            access_token: response.access_token,
            refresh_token: response.refresh_token,
          });
        }
        toast.success('Login successful');
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* Glassmorphic Auth Box */}
          <div className="bg-zinc-950/60 border border-zinc-800 backdrop-blur-md rounded-xl p-6 text-left shadow-2xl space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('wallet')}
                className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 text-center uppercase tracking-wider ${
                  activeTab === 'wallet'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Solana Wallet
              </button>
              <button
                onClick={() => setActiveTab('email')}
                className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 text-center uppercase tracking-wider ${
                  activeTab === 'email'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Email Access
              </button>
            </div>

            {activeTab === 'wallet' ? (
              <div className="space-y-6 text-center py-4">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Connect using your Solana Ledger or Phantom wallet. Your identity is cryptographically verified on-chain.
                </p>
                <div className="flex justify-center">
                  <WalletConnectButton />
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {isRegister && (
                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-zinc-500">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-zinc-500">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-zinc-500">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>

                {isRegister && (
                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-zinc-500">Deployment Environment</label>
                    <select
                      value={environmentType}
                      onChange={(e) => setEnvironmentType(e.target.value as EnvironmentType)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition-colors cursor-pointer"
                    >
                      <option value="home">Home / Domestic Node</option>
                      <option value="hospital">Hospital / Care Hub</option>
                      <option value="industrial">Industrial Node</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded text-sm transition-all duration-300 shadow-md shadow-green-500/10 hover:shadow-green-500/20"
                >
                  {isLoading ? 'Processing Node...' : isRegister ? 'Initialize Access' : 'Authenticate Credentials'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-xs text-green-500 hover:text-green-400 hover:underline transition-colors"
                  >
                    {isRegister ? 'Already have credentials? Log In' : 'Need authorization? Create standard node access'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center">
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
          <div className="text-xs text-gray-600">
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
