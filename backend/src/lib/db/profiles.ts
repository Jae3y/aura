import { supabaseAdmin } from '../supabase';
import type { Profile } from '../../types/database';

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(
  profile: Partial<Profile>
): Promise<Profile> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateWalletAddress(
  id: string,
  walletAddress: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ wallet_address: walletAddress })
    .eq('id', id);
  if (error) throw error;
}

export async function updateFcmToken(
  id: string,
  token: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ fcm_token: token })
    .eq('id', id);
  if (error) throw error;
}

export async function getOwnerProfileForDevice(
  deviceId: string
): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('user_id, profiles!inner(*)')
    .eq('id', deviceId)
    .maybeSingle();
  if (error) throw error;
  // supabase join returns nested profile
  const profile = (data as unknown as { profiles: Profile } | null)?.profiles;
  return profile ?? null;
}
