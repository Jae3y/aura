import { supabaseAdmin } from '../supabase';
import type { Device } from '../../types/database';

export async function createDevice(
  device: Partial<Device>
): Promise<Device> {
  const { data, error } = await supabaseAdmin
    .from('devices')
    .insert(device)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateDevice(
  id: string,
  patch: Partial<Device>
): Promise<Device> {
  const { data, error } = await supabaseAdmin
    .from('devices')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDevice(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('devices').delete().eq('id', id);
  if (error) throw error;
}

export async function getDevices(userId: string): Promise<Device[]> {
  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDeviceById(id: string): Promise<Device | null> {
  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDeviceByToken(
  id: string,
  token: string
): Promise<Device | null> {
  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('id', id)
    .eq('device_token', token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDeviceByTokenAndUser(
  token: string,
  userId: string
): Promise<Device | null> {
  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('device_token', token)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDeviceStatus(
  id: string,
  isOnline: boolean
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('devices')
    .update({ is_online: isOnline })
    .eq('id', id);
  if (error) throw error;
}

export async function updateLastSeen(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('devices')
    .update({ last_seen: new Date().toISOString(), is_online: true })
    .eq('id', id);
  if (error) throw error;
}

export async function updateNftMintAddress(
  id: string,
  mintAddress: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('devices')
    .update({ nft_mint_address: mintAddress })
    .eq('id', id);
  if (error) throw error;
}
