import { supabaseAdmin } from '../supabase';
import type { Zone } from '../../types/database';

export async function getZonesByDevice(deviceId: string): Promise<Zone[]> {
  const { data, error } = await supabaseAdmin
    .from('zones')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getZoneById(id: string): Promise<Zone | null> {
  const { data, error } = await supabaseAdmin
    .from('zones')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createZone(zone: Partial<Zone>): Promise<Zone> {
  const { data, error } = await supabaseAdmin
    .from('zones')
    .insert(zone)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateZone(
  id: string,
  patch: Partial<Zone>
): Promise<Zone> {
  const { data, error } = await supabaseAdmin
    .from('zones')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteZone(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('zones').delete().eq('id', id);
  if (error) throw error;
}

export async function setPresence(
  id: string,
  detected: boolean
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('zones')
    .update({
      presence_detected: detected,
      last_presence_at: detected ? new Date().toISOString() : undefined,
    })
    .eq('id', id);
  if (error) throw error;
}
