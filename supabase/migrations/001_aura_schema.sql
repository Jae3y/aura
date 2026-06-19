CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extends auth.users — created automatically by Supabase Auth
CREATE TABLE public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT,
  email               TEXT UNIQUE NOT NULL,
  avatar_url          TEXT,
  environment_type    TEXT DEFAULT 'home'
                      CHECK (environment_type IN ('home','hospital','industrial')),
  wallet_address      TEXT,          -- Solana wallet (primary chain)
  lisk_wallet_address TEXT,          -- Lisk wallet (secondary, monthly only)
  fcm_token           TEXT,
  notification_email  BOOLEAN DEFAULT true,
  notification_push   BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.devices (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL DEFAULT 'AURA Unit',
  device_token          TEXT UNIQUE NOT NULL,
  firmware_version      TEXT DEFAULT '1.0.0',
  environment_type      TEXT DEFAULT 'home'
                        CHECK (environment_type IN ('home','hospital','industrial')),
  is_online             BOOLEAN DEFAULT false,
  last_seen             TIMESTAMPTZ,
  voltage_threshold_min FLOAT DEFAULT 180.0,
  voltage_threshold_max FLOAT DEFAULT 250.0,
  surge_sensitivity     TEXT DEFAULT 'medium'
                        CHECK (surge_sensitivity IN ('low','medium','high')),
  location_label        TEXT,
  nft_mint_address      TEXT,         -- Solana NFT mint address
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sensor_readings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id     UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  voltage       FLOAT NOT NULL,
  current_amps  FLOAT NOT NULL,
  power_watts   FLOAT NOT NULL,
  frequency     FLOAT NOT NULL,
  power_factor  FLOAT NOT NULL,
  energy_kwh    FLOAT DEFAULT 0,
  is_anomaly    BOOLEAN DEFAULT false,
  anomaly_score FLOAT,
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sensor_readings_device_time
  ON public.sensor_readings (device_id, recorded_at DESC);

CREATE TABLE public.zones (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id          UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  zone_type          TEXT DEFAULT 'general'
                     CHECK (zone_type IN ('general','restricted','critical')),
  is_active          BOOLEAN DEFAULT true,
  presence_detected  BOOLEAN DEFAULT false,
  last_presence_at   TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.threat_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id         UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  zone_id           UUID REFERENCES public.zones(id),
  event_type        TEXT NOT NULL
                    CHECK (event_type IN
                      ('surge','intrusion','undervoltage','overcurrent',
                       'frequency_anomaly','system_fault')),
  severity          TEXT DEFAULT 'medium'
                    CHECK (severity IN ('low','medium','high','critical')),
  voltage_at_event  FLOAT,
  current_at_event  FLOAT,
  action_taken      TEXT,
  relay_triggered   BOOLEAN DEFAULT false,
  relay_channel     INT,
  auto_resolved     BOOLEAN DEFAULT false,
  resolved_at       TIMESTAMPTZ,
  solana_signature  TEXT,           -- Primary chain: Solana devnet
  solana_slot       BIGINT,
  solana_confirmed  BOOLEAN DEFAULT false,
  lisk_tx_id        TEXT,           -- Secondary chain: monthly audit only
  lisk_confirmed    BOOLEAN DEFAULT false,
  alerta_alert_id   TEXT,
  alerta_status     TEXT DEFAULT 'open'
                    CHECK (alerta_status IN ('open','ack','closed')),
  occurred_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_threat_events_device_time
  ON public.threat_events (device_id, occurred_at DESC);

CREATE TABLE public.automations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id         UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  zone_id           UUID REFERENCES public.zones(id),
  name              TEXT NOT NULL,
  trigger_type      TEXT NOT NULL
                    CHECK (trigger_type IN
                      ('schedule','surge','presence','voice_command','manual')),
  trigger_value     JSONB,
  action            TEXT NOT NULL,
  relay_channel     INT,
  is_active         BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count     INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.voice_commands (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id        UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id),
  raw_command      TEXT NOT NULL,
  parsed_intent    TEXT,
  confidence_score FLOAT,
  action_triggered TEXT,
  was_executed     BOOLEAN DEFAULT false,
  execution_result TEXT,
  solana_signature TEXT,
  solana_confirmed BOOLEAN DEFAULT false,
  issued_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  threat_event_id  UUID REFERENCES public.threat_events(id),
  type             TEXT NOT NULL CHECK (type IN ('push','email','in_app')),
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  is_read          BOOLEAN DEFAULT false,
  delivered        BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, is_read) WHERE is_read = false;

CREATE TABLE public.monthly_reports (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id            UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.profiles(id),
  report_month         DATE NOT NULL,
  total_threats        INT DEFAULT 0,
  surges_blocked       INT DEFAULT 0,
  intrusions_detected  INT DEFAULT 0,
  relay_activations    INT DEFAULT 0,
  avg_voltage          FLOAT,
  min_voltage          FLOAT,
  max_voltage          FLOAT,
  total_anomalies      INT DEFAULT 0,
  aura_health_score    INT DEFAULT 100 CHECK (aura_health_score BETWEEN 0 AND 100),
  solana_events_logged INT DEFAULT 0,
  lisk_tx_id           TEXT,
  lisk_confirmed       BOOLEAN DEFAULT false,
  alerta_alerts_count  INT DEFAULT 0,
  alerta_ack_rate      FLOAT DEFAULT 0,
  pdf_url              TEXT,
  generated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (device_id, report_month)
);

-- Row Level Security
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_commands  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (own-data pattern via auth.uid())
CREATE POLICY profiles_self ON public.profiles
  USING (id = auth.uid());

CREATE POLICY devices_owner ON public.devices
  USING (user_id = auth.uid());

CREATE POLICY sensor_readings_owner ON public.sensor_readings
  USING (device_id IN (
    SELECT id FROM public.devices WHERE user_id = auth.uid()
  ));

CREATE POLICY zones_owner ON public.zones
  USING (device_id IN (
    SELECT id FROM public.devices WHERE user_id = auth.uid()
  ));

CREATE POLICY threat_events_owner ON public.threat_events
  USING (device_id IN (
    SELECT id FROM public.devices WHERE user_id = auth.uid()
  ));

CREATE POLICY automations_owner ON public.automations
  USING (device_id IN (
    SELECT id FROM public.devices WHERE user_id = auth.uid()
  ));

CREATE POLICY voice_commands_owner ON public.voice_commands
  USING (user_id = auth.uid());

CREATE POLICY notifications_owner ON public.notifications
  USING (user_id = auth.uid());

CREATE POLICY monthly_reports_owner ON public.monthly_reports
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- device_access_grants: secondary wallet read-access for a device (Req 2.6, 3.7)
-- ---------------------------------------------------------------------------
CREATE TABLE public.device_access_grants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id       UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  owner_wallet    TEXT NOT NULL,
  grantee_wallet  TEXT NOT NULL,
  granted_at      TIMESTAMPTZ DEFAULT NOW(),
  is_active       BOOLEAN DEFAULT true,
  UNIQUE (device_id, grantee_wallet)
);

ALTER TABLE public.device_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_grants_owner ON public.device_access_grants
  USING (device_id IN (
    SELECT id FROM public.devices WHERE user_id = auth.uid()
  ));
