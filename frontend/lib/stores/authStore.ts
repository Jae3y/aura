import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '../types/database';

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    wallet_address: string | null;
  };
}

interface AuthState {
  walletAddress: string | null;
  session: Session | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  
  // Actions
  setSession: (session: Session) => void;
  setProfile: (profile: Profile) => void;
  clearSession: () => void;
  updateProfile: (updates: Partial<Profile>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      walletAddress: null,
      session: null,
      profile: null,
      isAuthenticated: false,

      setSession: (session) =>
        set({
          session,
          walletAddress: session.user.wallet_address,
          isAuthenticated: true,
        }),

      setProfile: (profile) =>
        set({ profile }),

      clearSession: () =>
        set({
          walletAddress: null,
          session: null,
          profile: null,
          isAuthenticated: false,
        }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),
    }),
    {
      name: 'aura-auth',
      partialize: (state) => ({
        session: state.session,
        profile: state.profile,
        walletAddress: state.walletAddress,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
