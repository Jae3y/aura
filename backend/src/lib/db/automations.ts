import { supabaseAdmin } from '../supabase';
import type { Automation } from '../../types/database';

export async function getAutomationsByDevice(
  deviceId: string
): Promise<Automation[]> {
  const { data, error } = await supabaseAdmin
    .from('automations')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAutomationById(
  id: string
): Promise<Automation | null> {
  const { data, error } = await supabaseAdmin
    .from('automations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAutomation(
  automation: Partial<Automation>
): Promise<Automation> {
  const { data, error } = await supabaseAdmin
    .from('automations')
    .insert(automation)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateAutomation(
  id: string,
  patch: Partial<Automation>
): Promise<Automation> {
  const { data, error } = await supabaseAdmin
    .from('automations')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAutomation(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('automations')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function recordTrigger(
  automation: Automation
): Promise<Automation> {
  return updateAutomation(automation.id, {
    trigger_count: automation.trigger_count + 1,
    last_triggered_at: new Date().toISOString(),
  });
}
