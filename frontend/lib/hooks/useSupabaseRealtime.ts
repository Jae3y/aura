import { useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabase';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useAuthStore } from '../stores/authStore';
import type { Database } from '../types/database';

type ThreatEvent = Database['public']['Tables']['threat_events']['Row'];

/**
 * Hook to subscribe to Supabase Realtime for database changes.
 * Provides redundancy to Socket.io events.
 * Gracefully no-ops when Supabase env vars are not configured.
 */
export function useSupabaseRealtime() {
  const { isAuthenticated, profile } = useAuthStore();
  const { addThreat, updateThreat } = useRealtimeStore();

  useEffect(() => {
    // Bail out if not authenticated or Supabase not configured
    if (!isAuthenticated || !profile) return;
    if (!isSupabaseConfigured() || !supabase) return;

    let channel: RealtimeChannel | null = null;

    try {
      channel = supabase
        .channel('threat_events_changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'threat_events' },
          (payload) => {
            const threat = payload.new as ThreatEvent;
            addThreat(threat);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'threat_events' },
          (payload) => {
            const threat = payload.new as ThreatEvent;
            updateThreat(threat.id, threat);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Supabase Realtime: subscribed to threat_events');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Supabase Realtime: channel error');
          } else if (status === 'TIMED_OUT') {
            console.error('Supabase Realtime: timed out');
          }
        });
    } catch (error) {
      console.error('Failed to setup Supabase Realtime:', error);
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAuthenticated, profile, addThreat, updateThreat]);
}
