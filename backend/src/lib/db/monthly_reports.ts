import { supabaseAdmin } from '../supabase';
import type { MonthlyReport } from '../../types/database';

export async function upsertReport(
  report: Partial<MonthlyReport>
): Promise<MonthlyReport> {
  const { data, error } = await supabaseAdmin
    .from('monthly_reports')
    .upsert(report, { onConflict: 'device_id,report_month' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getReportsByDevice(
  deviceId: string
): Promise<MonthlyReport[]> {
  const { data, error } = await supabaseAdmin
    .from('monthly_reports')
    .select('*')
    .eq('device_id', deviceId)
    .order('report_month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getReportByMonth(
  deviceId: string,
  reportMonth: string
): Promise<MonthlyReport | null> {
  const { data, error } = await supabaseAdmin
    .from('monthly_reports')
    .select('*')
    .eq('device_id', deviceId)
    .eq('report_month', reportMonth)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getReportById(
  id: string
): Promise<MonthlyReport | null> {
  const { data, error } = await supabaseAdmin
    .from('monthly_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateLiskTx(id: string, txId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('monthly_reports')
    .update({ lisk_tx_id: txId, lisk_confirmed: true })
    .eq('id', id);
  if (error) throw error;
}
