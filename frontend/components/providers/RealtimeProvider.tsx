'use client';

import { useEffect, type ReactNode } from 'react';
import { useRealtimeSync } from '@/lib/hooks/useRealtimeSync';
import { useSupabaseRealtime } from '@/lib/hooks/useSupabaseRealtime';
import { useAuthStore } from '@/lib/stores/authStore';
import { disconnectSocket } from '@/lib/socketClient';

interface RealtimeProviderProps {
  children: ReactNode;
}

/**
 * Provider component that sets up all realtime connections
 * Should be placed inside auth context
 */
export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { isAuthenticated } = useAuthStore();

  // Setup Socket.io sync
  useRealtimeSync();

  // Setup Supabase Realtime sync
  useSupabaseRealtime();

  // Cleanup on unmount or logout
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}
