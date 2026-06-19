import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';
import type { Database } from './types/database';

// Helper to check if client is properly configured
export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabase.url && config.supabase.anonKey);
}

// Browser client — lazy-init to avoid crashing when env vars are absent in UI-only mode
let _supabase: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  if (!_supabase) {
    _supabase = createClient<Database>(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }
  return _supabase;
}

// Legacy export for backward compat — only use where supabase is guaranteed to be configured
export const supabase = isSupabaseConfigured()
  ? createClient<Database>(config.supabase.url, config.supabase.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

