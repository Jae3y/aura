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
  hasProfile: boolean;
  
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
      hasProfile: false,

      setSession: (session) =>
        set({
          session,
          walletAddress: session.user.wallet_address,
          isAuthenticated: true,
        }),

      setProfile: (profile) =>
        set({ profile, hasProfile: Boolean(profile.id) }),

      clearSession: () =>
        set({
          walletAddress: null,
          session: null,
          profile: null,
          isAuthenticated: false,
          hasProfile: false,
        }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
          hasProfile: Boolean(state.profile?.id),
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

// Clear expired session on rehydration — prevents stale tokens from
// causing 401 errors on every API call until the user manually logs out.
const stored = typeof window !== 'undefined' ? localStorage.getItem('aura-auth') : null;
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    const session = parsed?.state?.session;
    if (session?.expires_at && Date.now() >= session.expires_at * 1000) {
      localStorage.removeItem('aura-auth');
    }
  } catch {
    localStorage.removeItem('aura-auth');
  }
}
