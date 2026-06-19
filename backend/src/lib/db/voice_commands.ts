import { supabaseAdmin } from '../supabase';
import type { VoiceCommand } from '../../types/database';

export async function insertVoiceCommand(
  cmd: Partial<VoiceCommand>
): Promise<VoiceCommand> {
  const { data, error } = await supabaseAdmin
    .from('voice_commands')
    .insert(cmd)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateVoiceCommand(
  id: string,
  patch: Partial<VoiceCommand>
): Promise<VoiceCommand> {
  const { data, error } = await supabaseAdmin
    .from('voice_commands')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getVoiceCommandsByDevice(
  deviceId: string,
  limit = 100
): Promise<VoiceCommand[]> {
  const { data, error } = await supabaseAdmin
    .from('voice_commands')
    .select('*')
    .eq('device_id', deviceId)
    .order('issued_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function updateVoiceSolanaSignature(
  id: string,
  sig: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('voice_commands')
    .update({ solana_signature: sig, solana_confirmed: true })
    .eq('id', id);
  if (error) throw error;
}
