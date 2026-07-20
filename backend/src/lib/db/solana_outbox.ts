import { supabaseAdmin } from '../supabase';

export interface OutboxItem {
  id: string;
  table_name: string;
  row_id: string;
  event_name: string;
  memo: Record<string, unknown>;
  attempts: number;
  status: 'pending' | 'processing' | 'failed';
  created_at: string;
}

export async function insertOutboxItem(item: {
  table_name: string;
  row_id: string;
  event_name: string;
  memo: Record<string, unknown>;
}): Promise<OutboxItem> {
  const { data, error } = await supabaseAdmin
    .from('solana_outbox')
    .insert({
      table_name: item.table_name,
      row_id: item.row_id,
      event_name: item.event_name,
      memo: item.memo,
      attempts: 0,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getPendingItems(limit = 50): Promise<OutboxItem[]> {
  const { data, error } = await supabaseAdmin
    .from('solana_outbox')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function markProcessing(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('solana_outbox')
    .update({ status: 'processing' })
    .eq('id', id);
  if (error) throw error;
}

export async function markFailed(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('solana_outbox')
    .update({ status: 'failed' })
    .eq('id', id);
  if (error) throw error;
}

export async function markComplete(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('solana_outbox')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function incrementAttempts(id: string): Promise<number> {
  const { data: current } = await supabaseAdmin
    .from('solana_outbox')
    .select('attempts')
    .eq('id', id)
    .single();
  const newAttempts = (current?.attempts ?? 0) + 1;
  const { error } = await supabaseAdmin
    .from('solana_outbox')
    .update({ attempts: newAttempts })
    .eq('id', id);
  if (error) throw error;
  return newAttempts;
}
