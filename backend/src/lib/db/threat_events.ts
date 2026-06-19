import { supabaseAdmin } from '../supabase';
import type { ThreatEvent, AlertaStatus } from '../../types/database';

export async function insertEvent(
  event: Partial<ThreatEvent>
): Promise<ThreatEvent> {
  const { data, error } = await supabaseAdmin
    .from('threat_events')
    .insert(event)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getEventsByDevice(
  deviceId: string,
  limit = 100
): Promise<ThreatEvent[]> {
  const { data, error } = await supabaseAdmin
    .from('threat_events')
    .select('*')
    .eq('device_id', deviceId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getEventById(id: string): Promise<ThreatEvent | null> {
  const { data, error } = await supabaseAdmin
    .from('threat_events')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSolanaSignature(
  id: string,
  sig: string,
  slot: number
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('threat_events')
    .update({ solana_signature: sig, solana_slot: slot, solana_confirmed: true })
    .eq('id', id);
  if (error) throw error;
}

export async function setSolanaUnconfirmed(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('threat_events')
    .update({ solana_confirmed: false })
    .eq('id', id);
  if (error) throw error;
}

export async function updateAlertaStatus(
  id: string,
  alertId: string,
  status: AlertaStatus
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('threat_events')
    .update({ alerta_alert_id: alertId, alerta_status: status })
    .eq('id', id);
  if (error) throw error;
}

export async function findByAlertaId(
  alertaAlertId: string
): Promise<ThreatEvent | null> {
  const { data, error } = await supabaseAdmin
    .from('threat_events')
    .select('*')
    .eq('alerta_alert_id', alertaAlertId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
