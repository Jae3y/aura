// AURA database types — mirrors supabase/migrations/001_aura_schema.sql

export type EnvironmentType = 'home' | 'hospital' | 'industrial';
export type SurgeSensitivity = 'low' | 'medium' | 'high';
export type ZoneType = 'general' | 'restricted' | 'critical';
export type ThreatEventType =
  | 'surge'
  | 'intrusion'
  | 'undervoltage'
  | 'overcurrent'
  | 'frequency_anomaly'
  | 'system_fault';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type TriggerType =
  | 'schedule'
  | 'surge'
  | 'presence'
  | 'voice_command'
  | 'manual';
export type NotificationType = 'push' | 'email' | 'in_app';
export type AlertaStatus = 'open' | 'ack' | 'closed';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  environment_type: EnvironmentType;
  wallet_address: string | null;
  lisk_wallet_address: string | null;
  fcm_token: string | null;
  notification_email: boolean;
  notification_push: boolean;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  name: string;
  device_token: string;
  firmware_version: string;
  environment_type: EnvironmentType;
  is_online: boolean;
  last_seen: string | null;
  voltage_threshold_min: number;
  voltage_threshold_max: number;
  surge_sensitivity: SurgeSensitivity;
  location_label: string | null;
  nft_mint_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  id: string;
  device_id: string;
  voltage: number;
  current_amps: number;
  power_watts: number;
  frequency: number;
  power_factor: number;
  energy_kwh: number;
  is_anomaly: boolean;
  anomaly_score: number | null;
  recorded_at: string;
}

export interface Zone {
  id: string;
  device_id: string;
  name: string;
  zone_type: ZoneType;
  is_active: boolean;
  presence_detected: boolean;
  last_presence_at: string | null;
  created_at: string;
}

export interface ThreatEvent {
  id: string;
  device_id: string;
  zone_id: string | null;
  event_type: ThreatEventType;
  severity: Severity;
  voltage_at_event: number | null;
  current_at_event: number | null;
  action_taken: string | null;
  relay_triggered: boolean;
  relay_channel: number | null;
  auto_resolved: boolean;
  resolved_at: string | null;
  solana_signature: string | null;
  solana_slot: number | null;
  solana_confirmed: boolean;
  lisk_tx_id: string | null;
  lisk_confirmed: boolean;
  alerta_alert_id: string | null;
  alerta_status: AlertaStatus;
  occurred_at: string;
}

export interface Automation {
  id: string;
  device_id: string;
  zone_id: string | null;
  name: string;
  trigger_type: TriggerType;
  trigger_value: Record<string, unknown> | null;
  action: string;
  relay_channel: number | null;
  is_active: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
}

export interface VoiceCommand {
  id: string;
  device_id: string;
  user_id: string;
  raw_command: string;
  parsed_intent: string | null;
  confidence_score: number | null;
  action_triggered: string | null;
  was_executed: boolean;
  execution_result: string | null;
  solana_signature: string | null;
  solana_confirmed: boolean;
  issued_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  threat_event_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  delivered: boolean;
  created_at: string;
}

export interface MonthlyReport {
  id: string;
  device_id: string;
  user_id: string;
  report_month: string;
  total_threats: number;
  surges_blocked: number;
  intrusions_detected: number;
  relay_activations: number;
  avg_voltage: number | null;
  min_voltage: number | null;
  max_voltage: number | null;
  total_anomalies: number;
  aura_health_score: number;
  solana_events_logged: number;
  lisk_tx_id: string | null;
  lisk_confirmed: boolean;
  alerta_alerts_count: number;
  alerta_ack_rate: number;
  pdf_url: string | null;
  generated_at: string;
}

// Access grant type (Req 2.6, 3.7)
export interface DeviceAccessGrant {
  id: string;
  device_id: string;
  owner_wallet: string;
  grantee_wallet: string;
  granted_at: string;
  is_active: boolean;
}

type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

interface TableShape<T> {
  Row: Row<T>;
  Insert: Insert<T>;
  Update: Update<T>;
  Relationships: never[];
}

// Matches Supabase v2 GenericSchema so the typed client resolves correctly.
export interface Database {
  public: {
    Tables: {
      profiles: TableShape<Profile>;
      devices: TableShape<Device>;
      sensor_readings: TableShape<SensorReading>;
      zones: TableShape<Zone>;
      threat_events: TableShape<ThreatEvent>;
      automations: TableShape<Automation>;
      voice_commands: TableShape<VoiceCommand>;
      notifications: TableShape<Notification>;
      monthly_reports: TableShape<MonthlyReport>;
      device_access_grants: TableShape<DeviceAccessGrant>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
