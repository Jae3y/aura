import { supabaseAdmin } from '../supabase';
import type { SensorReading } from '../../types/database';

export async function insertReading(
  reading: Partial<SensorReading>
): Promise<SensorReading> {
  const { data, error } = await supabaseAdmin
    .from('sensor_readings')
    .insert(reading)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getRecentReadings(
  deviceId: string,
  limit = 50
): Promise<SensorReading[]> {
  const { data, error } = await supabaseAdmin
    .from('sensor_readings')
    .select('*')
    .eq('device_id', deviceId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getReadingsByRange(
  deviceId: string,
  from: string,
  to: string
): Promise<SensorReading[]> {
  const { data, error } = await supabaseAdmin
    .from('sensor_readings')
    .select('*')
    .eq('device_id', deviceId)
    .gte('recorded_at', from)
    .lte('recorded_at', to)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
