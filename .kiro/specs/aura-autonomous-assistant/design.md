# Design Document — AURA Autonomous Assistant

## Overview

AURA is a blockchain-first IoT safety and automation platform for Nigerian homes, hospitals, and industrial environments. The architecture is a five-tier system: embedded hardware nodes (ESP32-S3) communicate through HiveMQ Cloud (MQTT v5) to a standalone Node.js/Express backend, which feeds a Next.js PWA frontend while simultaneously writing immutable event records to the Solana devnet via the Memo Program. A secondary Lisk blockchain receives monthly compliance summaries only. Supabase is the primary relational store, auth provider, file store, and realtime pub/sub channel.

The system is split-deployed: Next.js frontend on Vercel, Node.js backend on Railway/Render. Both tiers instrument Sentry. Alerta (alerta.io cloud free tier) is the bidirectional incident management layer — AURA POSTs threat events to Alerta and receives lifecycle webhooks back. Every inbound MQTT message is validated against a per-device `device_token` before any processing occurs.

---

## Database Schema (Supabase / PostgreSQL)

Migration file: `supabase/migrations/001_aura_schema.sql`

```sql
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
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id    UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  voltage      FLOAT NOT NULL,
  current_amps FLOAT NOT NULL,
  power_watts  FLOAT NOT NULL,
  frequency    FLOAT NOT NULL,
  power_factor FLOAT NOT NULL,
  energy_kwh   FLOAT DEFAULT 0,
  is_anomaly   BOOLEAN DEFAULT false,
  anomaly_score FLOAT,
  recorded_at  TIMESTAMPTZ DEFAULT NOW()
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
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;
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
```

**Key improvements over original design:**
- `profiles` replaces `user_profiles` — richer with full_name, avatar, per-user environment type, both wallet addresses, and notification prefs
- `devices` owns a `device_token` for MQTT auth validation and per-device voltage thresholds / surge sensitivity
- `sensor_readings` captures full PZEM-004T output including frequency, power factor, and energy with anomaly scoring
- `zones` are device-scoped (not owner-scoped) with typed zone classifications (`general/restricted/critical`)
- `threat_events` replaces the generic `events` table — typed event_type, dual-chain fields (`solana_*` primary, `lisk_*` secondary), relay metadata, Alerta lifecycle
- `automations` enables schedule/trigger-based rule engine
- `voice_commands` tracked with execution result and on-chain reference
- `notifications` tracks delivery state per channel type
- `monthly_reports` is the Lisk integration anchor — aggregated stats, health score, PDF URL, ack rate

---

## Backend Directory Layout

```
backend/src/
├── index.ts
├── config/index.ts
├── routes/
│   ├── auth.ts         — /auth/register, /login, /logout, /refresh
│   ├── devices.ts      — CRUD + /devices/:id/pair
│   ├── sensor.ts       — GET readings, /latest
│   ├── threats.ts      — GET/PATCH threat events
│   ├── zones.ts        — CRUD zones per device
│   ├── automations.ts  — CRUD + POST /automations/:id/trigger
│   ├── voice.ts        — POST /voice/command, GET /devices/:id/voice
│   ├── blockchain.ts   — GET events/verify/NFT; POST access grant/revoke
│   ├── alerta.ts       — GET alerts/stats; POST webhook; PATCH ack/close
│   ├── notifications.ts
│   ├── reports.ts      — GET/POST reports, GET PDF
│   └── control.ts      — POST /devices/:id/relay/:ch/on|off
├── middleware/
│   ├── auth.ts         — JWT verification
│   ├── solana.ts       — Solana wallet signature verification
│   ├── rateLimit.ts    — Per-route-group rate limiting
│   └── errorHandler.ts — Global error handler + Sentry
├── services/
│   ├── mqtt.ts         — HiveMQ v5 client, subscribe aura/+/#, routing
│   ├── solana.ts       — writeEvent, verifySignature, getConfirmation
│   ├── nft.ts          — mintDeviceNFT via Metaplex Umi
│   ├── lisk.ts         — writeMonthlyReport only
│   ├── alerta.ts       — Full Alerta REST client
│   ├── fcm.ts          — Firebase Admin, sendPush, sendBulkPush
│   ├── email.ts        — Resend client
│   ├── pdf.ts          — Generate PDF, upload to Supabase Storage
│   └── auraScore.ts    — Calculate health score 0–100
├── handlers/
│   ├── surgeHandler.ts
│   ├── presenceHandler.ts
│   ├── readingHandler.ts
│   ├── voiceHandler.ts
│   └── heartbeatHandler.ts
├── blockchain/
│   ├── solanaQueue.ts  — Non-blocking tx queue, 3× retry with backoff
│   └── events.ts       — AURA_SOLANA_EVENTS constants
└── socket/
    ├── index.ts        — Socket.io setup, JWT auth, device rooms
    └── events.ts       — Socket.io event type constants
```

---

## Alerta Service Design

Alerta is the bidirectional incident management layer. 7 distinct alert types flow from AURA → Alerta. Alerta webhooks flow back to update `threat_events.alerta_status`.

### Severity Mapping

| AURA severity | Alerta severity  |
|---------------|------------------|
| `critical`    | `critical`       |
| `high`        | `major`          |
| `medium`      | `minor`          |
| `low`         | `warning`        |
| anomaly       | `informational`  |
| offline       | `major`          |

### 7 Alert Types

| AURA event          | Alerta event name    | Group      |
|---------------------|----------------------|------------|
| surge               | `SurgeDetected`      | Electrical |
| intrusion (restricted) | `IntrusionDetected` | Security  |
| intrusion (general) | `IntrusionDetected`  | Security   |
| sensor anomaly      | `VoltageAnomaly`     | Electrical |
| device offline      | `DeviceOffline`      | System     |
| frequency anomaly   | `FrequencyAnomaly`   | Electrical |
| system fault        | `SystemFault`        | System     |

### AlertaPayload

```typescript
interface AlertaPayload {
  resource: string;      // 'device-{deviceId}-{location}'
  event: string;
  environment: 'Production';
  severity: string;
  service: string[];     // ['AURA', envType]
  group: string;         // 'Electrical' | 'Security' | 'System'
  value: string;         // '287V' | 'Zone B' | 'Offline'
  text: string;
  tags: string[];        // ['nigeria', 'aura', envType, severity]
  attributes: {
    deviceId: string;
    deviceName: string;
    location: string;
    environment: string;
    voltage?: number;
    current?: number;
    relayChannel?: number;
    zone?: string;
    solanaSig?: string;  // cross-reference with Solana tx
    auraEventId: string;
  };
  correlate?: string[];  // surge + overcurrent as correlated events
  timeout?: number;
  origin: 'AURA/backend/1.0';
  type: 'auraAlert';
}
```

### AlertaService methods

- `sendAlert(payload)` → `{ id, status, href }` — POST, store `alerta_alert_id`
- `acknowledgeAlert(alertId)` — lifecycle: open → ack
- `closeAlert(alertId)` — lifecycle: ack → closed
- `getAlert(alertId)` — single alert
- `getDeviceAlerts(deviceId, status?)` — filtered list
- `getAlertStats(deviceId)` → `{ open, ack, closed, total, ackRate }`
- `buildSurgePayload(event, device)` → `AlertaPayload`
- `buildIntrusionPayload(event, zone, device)` → `AlertaPayload`
- `buildOfflinePayload(device)` → `AlertaPayload`
- `buildAnomalyPayload(reading, device)` → `AlertaPayload`

### Surge Handler Full Pipeline

1. Parse and validate MQTT surge payload
2. Insert `threat_events` row → get event ID
3. Queue Solana memo write (non-blocking)
4. POST to Alerta → store `alerta_alert_id`
5. Send FCM push to device owner
6. Insert `notifications` record
7. Emit Socket.io `threat:new`
8. Publish relay command to device via MQTT

### Alerta Webhook Handler

`POST /alerta/webhook` — HMAC-verified. On `acknowledge`: set `alerta_status = 'ack'`. On `close`: set `alerta_status = 'closed'`. Both emit Socket.io `alerta:update` to the owner's room.

---

## MQTT Topic Schema (HiveMQ Cloud, MQTT v5)

| Topic | Direction | QoS | Payload fields |
|-------|-----------|-----|----------------|
| `aura/{deviceId}/readings` | Device → Cloud | 0 | voltage, current, power, frequency, powerFactor, energyKwh, isAnomaly, anomalyScore |
| `aura/{deviceId}/surge` | Device → Cloud | 1 | voltage, current, severity, relayChannel, actionTaken |
| `aura/{deviceId}/presence` | Device → Cloud | 1 | zoneId, detected |
| `aura/{deviceId}/voice` | Device → Cloud | 1 | userId, rawCommand, parsedIntent, confidenceScore |
| `aura/{deviceId}/heartbeat` | Device → Cloud | 0 | firmwareVersion, uptime |
| `aura/{deviceId}/status` | Device → Cloud | 1 | relay/system status |
| `aura/{deviceId}/cmd` | Cloud → Device | 1 | command, channel?, requestedBy, solanaSignature |

All inbound messages validate `device_token` against the `devices` table before any processing.

---

## Blockchain Architecture

### Solana (Primary)

- All real-time events → Solana devnet Memo Program (non-blocking queue)
- `AURA_SOLANA_EVENTS`: `SURGE_DETECTED`, `INTRUSION_DETECTED`, `RELAY_TRIGGERED`, `RELAY_OVERRIDE`, `VOICE_COMMAND`, `SYSTEM_FAULT`, `DEVICE_MINTED`
- On success: `solana_signature`, `solana_slot`, `solana_confirmed = true`
- On 3× failure: Sentry error, `solana_confirmed = false`

### Device NFT (Metaplex Umi)

Minted after `POST /devices/:id/pair`. Metadata: name, symbol `"AURA"`, attributes for deviceId, owner wallet, environment_type, location_label, deploy date, firmware version. `mintAddress` → `devices.nft_mint_address`.

### Lisk (Secondary — Monthly Only)

`LiskService.writeMonthlyReport(report)` called only after monthly PDF generation. Writes aggregated stats to Lisk testnet. `txId` → `monthly_reports.lisk_tx_id`.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register |
| POST | `/auth/login` | None | Login |
| POST | `/auth/logout` | JWT | Logout |
| POST | `/auth/refresh` | Refresh | Refresh session |
| GET/POST/PATCH/DELETE | `/devices[/:id]` | JWT | Device CRUD |
| POST | `/devices/:id/pair` | JWT | Pair + mint NFT |
| GET | `/devices/:id/readings` | JWT | Sensor readings |
| GET | `/devices/:id/readings/latest` | JWT | Latest reading |
| GET | `/devices/:id/threats` | JWT | Threat events |
| PATCH | `/threats/:id` | JWT | Update threat |
| GET/POST/PATCH/DELETE | `/devices/:id/zones[/:id]` | JWT | Zone CRUD |
| GET/POST/PATCH/DELETE | `/devices/:id/automations[/:id]` | JWT | Automation CRUD |
| POST | `/automations/:id/trigger` | JWT | Manual trigger |
| POST | `/voice/command` | JWT | Submit voice |
| GET | `/devices/:id/voice` | JWT | Voice history |
| GET | `/blockchain/events` | JWT | Solana event log |
| GET | `/blockchain/verify/:sig` | JWT | Verify tx |
| GET | `/blockchain/nft/:deviceId` | JWT | NFT metadata |
| POST | `/blockchain/access/grant` | Solana sig | Grant access |
| POST | `/blockchain/access/revoke` | Solana sig | Revoke access |
| GET | `/blockchain/access/:deviceId` | JWT | Authorized wallets |
| GET | `/alerta/alerts` | JWT | Device alerts |
| GET | `/alerta/alerts/:id` | JWT | Single alert |
| GET | `/alerta/stats/:deviceId` | JWT | Alert stats |
| PATCH | `/alerta/alerts/:id/ack` | JWT | Acknowledge |
| PATCH | `/alerta/alerts/:id/close` | JWT | Close |
| POST | `/alerta/webhook` | HMAC | Alerta → AURA |
| GET/PATCH | `/notifications[/:id]` | JWT | Notifications |
| GET/POST | `/devices/:id/reports` | JWT | Monthly reports |
| GET | `/reports/:id/pdf` | JWT | Download PDF |
| POST | `/devices/:id/relay/:ch/on` | JWT | Relay on |
| POST | `/devices/:id/relay/:ch/off` | JWT | Relay off |

---

## Frontend Directory Layout

```
frontend/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── connect/page.tsx
│   ├── dashboard/page.tsx
│   ├── devices/[id]/page.tsx
│   ├── threats/page.tsx
│   ├── zones/[deviceId]/page.tsx
│   ├── blockchain/page.tsx
│   ├── reports/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── auth/WalletGuard.tsx
│   ├── dashboard/
│   │   ├── CommandCenter.tsx
│   │   ├── DeviceStatusCard.tsx
│   │   ├── EventFeed.tsx
│   │   ├── TelemetryGauge.tsx
│   │   └── AlertaStatusPanel.tsx
│   ├── blockchain/
│   │   ├── SolanaExplorerBadge.tsx
│   │   ├── DeviceNFTCard.tsx
│   │   ├── LiskBadge.tsx
│   │   └── WalletConnectButton.tsx
│   └── alerta/
│       ├── AlertaBadge.tsx
│       ├── AlertaStatusPanel.tsx
│       └── AlertaAlertCard.tsx
├── hooks/
│   ├── useBlockchain.ts
│   └── useAlerta.ts
└── lib/
    ├── supabase.ts
    ├── socketClient.ts
    ├── queries/
    └── stores/
        ├── authStore.ts
        └── realtimeStore.ts
```

---

## Correctness Properties

### Property 1: Unauthenticated requests always return HTTP 401
For any request without a valid JWT, auth middleware SHALL return 401 regardless of method, path, or body.
**Validates: Req 1.4**

### Property 2: Solana queue exhaustion marks events unconfirmed
After 3 failed RPC attempts, `solana_confirmed = false` SHALL be set and exactly one Sentry error captured.
**Validates: Req 2.5**

### Property 3: Solana signature stored on confirmation
For any confirmed tx, `threat_events.solana_signature` SHALL equal the RPC-returned signature and `solana_confirmed = true`.
**Validates: Req 2.6**

### Property 4: Invalid device tokens drop MQTT messages silently
For any MQTT payload with a non-matching `device_token`, no database writes SHALL occur.
**Validates: Device auth boundary**

### Property 5: NFT mint address persisted after successful mint
For any confirmed Metaplex Umi mint, `devices.nft_mint_address` SHALL be non-null and match the returned address.
**Validates: Req 3.4**

### Property 6: Surge pipeline fires all 5 side effects
For any valid surge payload: `threat_events` row, Solana memo queued, Alerta alert, FCM notification, Socket.io `threat:new` SHALL all occur.
**Validates: Req 4.5**

### Property 7: Alerta severity mapping is exhaustive
For every valid AURA severity, `AlertaService.mapSeverity` SHALL return a defined Alerta severity string and never `undefined`.
**Validates: Req 9.4**

### Property 8: Alerta webhook updates exactly one row
For any valid webhook payload, exactly one `threat_events.alerta_status` is updated; no other rows are modified.
**Validates: Req 9.2**

### Property 9: FCM failure on critical events triggers Resend fallback
For FCM failure on severity `critical` or `high`, a Resend email SHALL be dispatched. Non-critical failures SHALL NOT trigger email fallback.
**Validates: Req 12.4**

### Property 10: Monthly report counts match DB records
`monthly_reports.surges_blocked + intrusions_detected` SHALL equal the count of matching `threat_events` rows for the device and period.
**Validates: Req 11.1**

### Property 11: Lisk writes are monthly-only
`LiskService.writeMonthlyReport` SHALL only be called from the monthly report job, never from real-time event handlers.
**Validates: Blockchain strategy**

### Property 12: Voice command confidence threshold enforced
For `confidence_score <= threshold`, `was_executed = false` and no relay action SHALL be triggered.
**Validates: Req 6.3, 6.4**
