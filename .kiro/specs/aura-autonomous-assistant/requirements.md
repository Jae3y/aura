# Requirements Document

## Introduction

AURA (Autonomous Utility & Response Assistant) is an intelligent, blockchain-first autonomous safety and automation system for Nigerian homes, hospitals, and industrial environments. Hardware nodes (ESP32-S3) monitor power quality, detect human presence, respond to voice commands, and execute relay-based protective actions — all within 10 ms of a threshold breach, fully independent of network connectivity.

Every significant event is cryptographically logged to the Solana devnet via the Memo Program. Device identity is anchored as a Metaplex NFT minted at pairing time. Monthly compliance summaries are written to the Lisk blockchain as a secondary audit trail. Alerta (alerta.io) is the bidirectional incident management layer for all threat events.

The system is delivered as a mobile-first Progressive Web App (military command center aesthetic) backed by a split-deployment: Next.js frontend on Vercel, Node.js/Express backend on Railway/Render, Supabase for database/auth/storage/realtime.

---

## Glossary

| Term | Definition |
|------|-----------|
| **AURA** | Autonomous Utility & Response Assistant — the full hardware + software system |
| **PWA** | Progressive Web App — mobile-first client (iOS + Android), same codebase as web |
| **ESP32-S3** | Embedded microcontroller running TinyML inference and MQTT communication |
| **PZEM-004T** | Power monitoring module measuring voltage, current, power, frequency, and power factor |
| **PIR Sensor** | Passive Infrared sensor for human presence detection |
| **Relay Module** | Electrically controlled switch; AURA cuts power through it within 10 ms of a surge |
| **Device** | A single AURA hardware node (ESP32-S3 + peripherals) registered in the system |
| **`device_token`** | Unique secret stored on the ESP32-S3 and in the `devices` table; validated on every inbound MQTT message |
| **Zone** | A named sub-area associated with a device; classified as `general`, `restricted`, or `critical` |
| **Environment Type** | Deployment context: `home`, `hospital`, or `industrial` — each with distinct default thresholds |
| **Automation** | A rule that triggers a relay action based on a schedule, surge, presence, voice command, or manual request |
| **Threat Event** | A recorded incident of type `surge`, `intrusion`, `undervoltage`, `overcurrent`, `frequency_anomaly`, or `system_fault` |
| **Sensor Reading** | A PZEM-004T snapshot: voltage, current, power, frequency, power factor, energy, and anomaly score |
| **NFT** | Solana-based non-fungible token minted via Metaplex Umi at device pairing; device identity + ownership certificate |
| **Solana Devnet** | Primary chain where all real-time events are logged via the Solana Memo Program |
| **Lisk** | Secondary blockchain used exclusively for monthly compliance audit summaries |
| **Alerta** | Open-source alert management platform (alerta.io cloud); bidirectional webhook integration |
| **Alerta Status** | Lifecycle state of an Alerta alert: `open` → `ack` → `closed` |
| **`solana_confirmed`** | Boolean column on `threat_events` / `voice_commands`; true when the Solana tx is confirmed |
| **Solana Queue** | Non-blocking in-memory FIFO queue on the backend that processes Solana writes asynchronously |
| **HiveMQ Cloud** | Managed MQTT v5 broker for device ↔ backend communication |
| **Phantom Wallet** | Solana wallet used for user authentication and on-chain interactions |
| **Metaplex Umi** | Solana NFT toolkit used to mint device-identity NFTs |
| **Edge Impulse** | Platform for training and exporting TinyML models to the ESP32-S3 |
| **TinyML Model** | On-device ML model classifying sensor data as `normal`, `anomaly`, or `critical_anomaly` |
| **FCM** | Firebase Cloud Messaging — push notification service |
| **Resend** | Transactional email service; fallback when FCM fails on critical events |
| **AURA Health Score** | An integer 0–100 calculated from threat frequency, relay trips, anomaly rate, and uptime |
| **Monthly Report** | Per-device monthly aggregate: threat counts, voltage stats, health score, Alerta ack rate, Lisk tx, PDF |
| **Socket.io** | WebSocket library for real-time frontend updates |
| **Supabase Realtime** | PostgreSQL-backed pub/sub channel for live data subscriptions |
| **Sentry** | Error tracking and performance monitoring in both frontend and backend |
| **`profiles`** | Supabase table extending `auth.users`; stores wallet addresses, notification prefs, environment type |
| **RLS** | Row Level Security — Supabase policy ensuring users access only their own data |

---

## Requirements

### Requirement 1 — Blockchain-Gated Authentication

**User Story:** As a building manager or homeowner, I want AURA access to require a connected Phantom wallet so that every system action is cryptographically attributable to a verified identity.

#### Acceptance Criteria

1. WHEN a user navigates to any protected route of the PWA, THE Frontend SHALL redirect the user to `/connect` if no Phantom wallet is connected.
2. WHEN a user connects a Phantom wallet, THE Frontend SHALL sign a backend-issued challenge nonce with the wallet's private key and POST the signature to `POST /auth/login` before granting access to any protected route.
3. WHEN authentication succeeds, THE Backend SHALL upsert a `profiles` row containing the user's Solana `wallet_address` and return a signed JWT.
4. IF a Phantom wallet disconnects during an active session, THEN THE Frontend SHALL immediately clear the auth store and redirect the user to `/connect`.
5. THE Backend SHALL reject any API request without a valid JWT, returning HTTP 401 with a structured JSON error body — never leaking JWT internals.
6. WHEN an authenticated request results in a Sentry-captured error, THE Backend SHALL attach the user's `wallet_address` as the Sentry user context.

---

### Requirement 2 — On-Chain Event Logging (Solana — Primary Chain)

**User Story:** As an auditor or building owner, I want every significant AURA event permanently recorded on Solana so that I have a tamper-proof, verifiable history of all system activity.

#### Acceptance Criteria

1. WHEN a Threat Event of any type is inserted into the `threat_events` table, THE Backend SHALL enqueue a Solana Memo Program transaction containing the event type, device ID, severity, timestamp, and key measured values into the non-blocking Solana Queue within 1 second of insertion.
2. WHEN a Voice Command with `was_executed = true` is inserted into `voice_commands`, THE Backend SHALL enqueue a Solana memo containing the command text, device ID, and timestamp within 1 second.
3. WHEN a relay action is manually triggered via `POST /devices/:id/relay/:ch/on|off`, THE Backend SHALL enqueue a Solana memo containing the action type, device ID, relay channel, and requesting user's wallet address.
4. WHEN the Solana Queue processor successfully confirms a transaction, THE Backend SHALL set `solana_signature`, `solana_slot`, and `solana_confirmed = true` on the corresponding `threat_events` or `voice_commands` row.
5. IF a Solana RPC call fails, THEN THE Solana Queue processor SHALL retry the submission up to 3 times with exponential back-off (1 s, 2 s, 4 s); on final failure it SHALL set `solana_confirmed = false` and capture exactly one Sentry error event containing the event type, device ID, and last RPC error.
6. THE Backend SHALL expose `GET /blockchain/verify/:signature` returning `{ confirmed, slot, timestamp, explorerUrl }` so the frontend can display on-chain verification status.
7. THE Frontend SHALL display a `SolanaExplorerBadge` on every logged event row, showing the shortened signature with a copy button and a link to the Solana devnet explorer; events where `solana_confirmed = false` SHALL show a pending spinner instead.

---

### Requirement 3 — Device Pairing and NFT Identity

**User Story:** As a technician deploying a new AURA node, I want to register a device by calling the pairing API and have a Solana NFT minted as its identity certificate so that each device has a verifiable on-chain ownership record.

#### Acceptance Criteria

1. WHEN `POST /devices` is called with a `device_token`, THE Backend SHALL create a `devices` row owned by the authenticated user with `is_online = false` and `nft_mint_address = null`.
2. WHEN `POST /devices/:id/pair` is called, THE Backend SHALL invoke Metaplex Umi to mint a Solana devnet NFT with metadata: `name = "AURA Unit - {device.name}"`, `symbol = "AURA"`, and attributes for `deviceId`, owner wallet, `environment_type`, `location_label`, deploy date, and `firmware_version`.
3. WHEN the Metaplex Umi mint transaction is confirmed, THE Backend SHALL update `devices.nft_mint_address` to the returned mint address and enqueue an `AURA_MINT` Solana memo event.
4. WHEN the NFT mint fails, THE Backend SHALL leave `nft_mint_address = null`, emit a Socket.io `device:pair_failed` event to the owner's room, and capture a Sentry error containing the provisioning attempt details.
5. THE Frontend SHALL display a `DeviceNFTCard` showing the NFT name, attribute grid, mint address, and a "View on Solana" button linking to the Solana devnet explorer.
6. THE Backend SHALL expose `GET /blockchain/nft/:deviceId` returning current NFT metadata and the explorer URL.

---

### Requirement 4 — Electrical Surge Protection and Auto Relay Cutoff

**User Story:** As a homeowner or hospital facilities manager, I want AURA to automatically cut power within 10 ms of detecting an electrical surge so that connected equipment is protected from damage.

#### Acceptance Criteria

1. WHILE a Device is online, THE ESP32-S3 SHALL continuously sample PZEM-004T readings (voltage, current, power, frequency, power factor, energy) at a minimum of 10 Hz and publish them to `aura/{deviceId}/readings` at QoS 0 every 2 seconds.
2. WHEN sampled voltage falls outside the `[devices.voltage_threshold_min, devices.voltage_threshold_max]` range or current exceeds the zone threshold, THE ESP32-S3 SHALL open the Relay Module within 10 milliseconds of the breach, independent of network connectivity.
3. WHEN the Relay Module is opened due to a Surge Event, THE ESP32-S3 SHALL activate the buzzer, set the RGB LED to red, and publish to `aura/{deviceId}/surge` at QoS 1.
4. WHEN THE Backend receives a `surge` MQTT message, THE Backend SHALL: (a) insert a `threat_events` row of type `surge`, (b) enqueue a Solana memo write, (c) call `AlertaService.sendAlert` with a `SurgeDetected` payload, (d) send an FCM push notification to the device owner, (e) insert a `notifications` row, (f) emit Socket.io `threat:new`, and (g) publish a relay command back to the device — all seven steps SHALL occur for every valid surge payload.
5. THE Backend SHALL expose `POST /devices/:id/relay/:ch/on` and `POST /devices/:id/relay/:ch/off` so authorized users can manually control relay channels (1–4); each manual action SHALL be logged as a `threat_events` row and a Solana memo.
6. WHEN the Backend receives sensor data, THE Backend SHALL store all PZEM-004T fields (`voltage`, `current_amps`, `power_watts`, `frequency`, `power_factor`, `energy_kwh`, `is_anomaly`, `anomaly_score`) in the `sensor_readings` table.

---

### Requirement 5 — Human Presence Detection and Intrusion Alerting

**User Story:** As a security officer or homeowner, I want AURA to detect human presence and trigger alerts so that unauthorized access to protected areas is immediately flagged.

#### Acceptance Criteria

1. WHILE a Zone is active, THE ESP32-S3 SHALL poll the PIR sensor at a minimum of 5 Hz and publish to `aura/{deviceId}/presence` at QoS 1 within 500 ms of detection.
2. WHEN the Backend receives a `presence` MQTT message for a Zone with `zone_type = 'restricted'` or `'critical'`, THE Backend SHALL insert a `threat_events` row of type `intrusion`, enqueue a Solana memo, and submit an Alerta `IntrusionDetected` alert.
3. WHEN an intrusion `threat_events` row is inserted, THE Backend SHALL send an FCM push notification to all registered push tokens of the device owner within 3 seconds.
4. WHERE the Zone's device has `environment_type = 'hospital'` and `zone_type = 'restricted'`, THE Backend SHALL set the Alerta alert severity to `critical`; for all other intrusion zones the severity SHALL be `major`.
5. IF the FCM push notification delivery fails, THEN THE Backend SHALL send a fallback email via Resend to the owner's `profiles.email` within 30 seconds; the email SHALL include the Solana transaction signature and a deep-link URL to the threat event.
6. THE Frontend SHALL display intrusion `threat_events` on the threats page with an `AlertaAlertCard` and a `SolanaExplorerBadge` on each row.

---

### Requirement 6 — Voice Interaction and On-Device Keyword Spotting

**User Story:** As a resident or medical staff member, I want to control AURA using voice commands so that I can operate the system hands-free in any environment.

#### Acceptance Criteria

1. WHILE a Device is online, THE ESP32-S3 SHALL run the TinyML Model continuously to perform keyword spotting on the local audio stream without transmitting audio data to the Backend.
2. WHEN the TinyML Model detects a keyword, THE ESP32-S3 SHALL publish to `aura/{deviceId}/voice` at QoS 1 with fields: `userId`, `rawCommand`, `parsedIntent`, and `confidenceScore`.
3. WHEN the Backend receives a `voice` MQTT message, THE Backend SHALL insert a `voice_commands` row with `was_executed = false` before evaluating the confidence threshold.
4. WHEN the `confidenceScore` exceeds the device zone's configured threshold, THE Backend SHALL execute the corresponding relay or zone action, set `was_executed = true` and `execution_result` on the row, enqueue a Solana memo, and emit Socket.io `voice:new`.
5. WHEN the `confidenceScore` is at or below the configured threshold, THE Backend SHALL set `was_executed = false` and SHALL NOT execute any relay or zone action; the low-confidence record SHALL remain in `voice_commands` for audit purposes.
6. THE Frontend SHALL display voice command history on the device detail page, showing `rawCommand`, `parsedIntent`, `was_executed`, `confidence_score`, and a `SolanaExplorerBadge` where `solana_confirmed = true`.

---

### Requirement 7 — Zone and Automation Management

**User Story:** As a facilities manager, I want to create zones with typed classifications and configure automated rules so that AURA responds appropriately for homes, hospitals, and industrial settings without requiring manual intervention.

#### Acceptance Criteria

1. THE Backend SHALL support three Zone types: `general`, `restricted`, and `critical`; zone classification SHALL determine Alerta severity levels as specified in Requirement 5.4.
2. WHEN a Zone is created for a device with `environment_type = 'hospital'`, THE Backend SHALL default the zone's intrusion sensitivity thresholds to hospital-grade values (tighter detection range than `home`).
3. THE Backend SHALL support Automations with five trigger types: `schedule`, `surge`, `presence`, `voice_command`, and `manual`; each Automation SHALL target a specific relay channel and zone.
4. WHEN a triggering condition matches an active Automation, THE Backend SHALL execute the Automation's relay action, increment `trigger_count`, update `last_triggered_at`, and log the action.
5. THE Backend SHALL expose full CRUD for zones (`/devices/:id/zones`, `/zones/:id`) and automations (`/devices/:id/automations`, `/automations/:id`), all protected by JWT auth.
6. THE Backend SHALL expose `POST /automations/:id/trigger` for manual test-triggering of any automation by the device owner.
7. THE Frontend SHALL provide zone and automation management pages using shadcn/ui form components with React Hook Form and Zod validation.

---

### Requirement 8 — Real-Time Dashboard and Live Telemetry

**User Story:** As a building operator, I want a live dashboard showing all device states, sensor readings, and recent events so that I can monitor the entire system at a glance.

#### Acceptance Criteria

1. THE Frontend SHALL display a real-time dashboard (`CommandCenter`) using a military command center aesthetic: dark background, green/amber accent colors, Tailwind CSS, shadcn/ui, Lucide icons, and Framer Motion entrance animations.
2. WHEN a new `threat_events` row is inserted in Supabase, THE Frontend SHALL reflect the update on the dashboard within 2 seconds via Supabase Realtime subscription — no page reload required.
3. THE Frontend SHALL display live PZEM-004T readings (voltage, current, power) per device via Socket.io `reading:new` events, refreshed at a minimum of every 5 seconds.
4. THE Frontend SHALL display a `DeviceStatusCard` per device showing: online/offline badge, last seen timestamp, relay state, and firmware version.
5. THE Frontend SHALL display an `AlertaStatusPanel` on the dashboard showing open / acknowledged / closed alert counts for the user's devices, refreshed every 10 seconds.
6. WHEN the Backend receives no MQTT heartbeat from a device for 90 seconds, THE Backend SHALL set `devices.is_online = false`, submit an Alerta `DeviceOffline` major alert, and emit Socket.io `device:offline`; the `DeviceStatusCard` SHALL update immediately.
7. WHEN a device sends a heartbeat after being offline, THE Backend SHALL set `devices.is_online = true`, close the open Alerta offline alert, and emit Socket.io `device:online`.

---

### Requirement 9 — Alerta Integration for Incident Management

**User Story:** As an operations engineer, I want all significant AURA threat events routed to Alerta so that incidents can be triaged, acknowledged, and tracked in a centralized tool — and to win the Encrisoft Alerta bounty at Hack4Futo 5.0.

#### Acceptance Criteria

1. THE Backend SHALL submit alerts to Alerta for all 7 defined event types: `SurgeDetected`, `IntrusionDetected` (restricted zone), `IntrusionDetected` (general zone), `VoltageAnomaly`, `DeviceOffline`, `FrequencyAnomaly`, and `SystemFault`.
2. WHEN building an Alerta payload, THE Backend SHALL populate the `attributes.solanaSig` field with the associated Solana transaction signature when available, cross-referencing the on-chain record.
3. THE Backend SHALL map AURA severity to Alerta severity as follows: `critical → critical`, `high → major`, `medium → minor`, `low → warning`, anomaly → `informational`, offline → `major`.
4. THE Backend SHALL populate the `correlate` field on surge-type Alerta payloads to link related `overcurrent` events from the same device.
5. IF the Alerta REST API is unreachable, THE Backend SHALL queue the alert and retry with exponential back-off for up to 5 minutes; on final failure it SHALL log exactly one Sentry error.
6. WHEN Alerta sends a webhook to `POST /alerta/webhook`, THE Backend SHALL verify the HMAC signature, update the corresponding `threat_events.alerta_status` to `'ack'` or `'closed'`, and emit Socket.io `alerta:update` to the owner's room.
7. THE Backend SHALL expose `GET /alerta/stats/:deviceId` returning `{ open, ack, closed, total, ackRate }` for use in the dashboard and monthly reports.
8. THE Frontend SHALL display an `AlertaBadge` on every event row: red pulse dot for `open`, amber for `ack`, green for `closed`.
9. THE Frontend SHALL display `AlertaAlertCard` components on the threats page with Acknowledge and Close buttons that update optimistically.

---

### Requirement 10 — TinyML Anomaly Detection On-Device

**User Story:** As a facilities engineer, I want AURA to detect sensor anomalies on-device without cloud dependency so that critical responses happen even during network outages.

#### Acceptance Criteria

1. WHILE a Device is powered on, THE ESP32-S3 SHALL run the Edge Impulse TinyML Model continuously on a 500 ms sliding window of sensor data, classifying each window as `normal`, `anomaly`, or `critical_anomaly`.
2. WHEN the TinyML Model classifies a window as `critical_anomaly`, THE ESP32-S3 SHALL immediately trigger relay cutoff, buzzer, and RGB LED alert — without waiting for any backend response.
3. WHEN the TinyML Model classifies a window as `anomaly`, THE ESP32-S3 SHALL publish to `aura/{deviceId}/readings` with `isAnomaly = true` and the `anomalyScore`; THE Backend SHALL insert a `sensor_readings` row and submit an Alerta `VoltageAnomaly` informational alert.
4. THE Backend SHALL include `anomaly_score` in `sensor_readings` rows for all readings, enabling historical anomaly trend analysis.
5. THE Backend SHALL expose `POST /devices/:id/model` accepting a TinyML model binary upload; the binary SHALL be stored in Supabase Storage, its SHA-256 checksum computed, and an OTA update command published to the device via MQTT `cmd` topic.

---

### Requirement 11 — Monthly Reports, Health Score, and Lisk Audit

**User Story:** As a compliance officer, building owner, or hackathon sponsor evaluator, I want a monthly summary with a health score, PDF export, and Lisk blockchain record so that there is a long-term, independently verifiable audit trail.

#### Acceptance Criteria

1. WHEN `POST /devices/:id/reports` is called for a given `report_month`, THE Backend SHALL compute a `monthly_reports` row containing: `total_threats`, `surges_blocked`, `intrusions_detected`, `relay_activations`, `avg_voltage`, `min_voltage`, `max_voltage`, `total_anomalies`, `solana_events_logged`, `alerta_alerts_count`, and `alerta_ack_rate` — all derived from the `threat_events` and `sensor_readings` tables for that device and month.
2. THE Backend SHALL calculate an `aura_health_score` (integer 0–100) based on threat frequency, relay trips, anomaly rate, and device uptime, and store it in `monthly_reports.aura_health_score`.
3. THE Backend SHALL generate a PDF report (stats, voltage charts, Alerta ack rate, Solana event count, health score) using `pdf.ts`, upload it to Supabase Storage, and store the public URL in `monthly_reports.pdf_url`.
4. AFTER the PDF is generated and stored, THE Backend SHALL call `LiskService.writeMonthlyAudit(report)` to write the report digest to Lisk testnet; `LiskService.writeMonthlyAudit` SHALL NOT be called from any real-time event handler.
5. WHEN the Lisk transaction is confirmed, THE Backend SHALL update `monthly_reports.lisk_tx_id` and `lisk_confirmed = true`; if all 3 retry attempts fail it SHALL set `lisk_confirmed = false` and log to Sentry.
6. THE Frontend SHALL display the reports list on `/reports` with health score, Alerta ack rate, PDF download link, and a `LiskBadge` per report showing the Lisk transaction status.
7. THE Backend SHALL enforce `UNIQUE (device_id, report_month)` — regenerating a report for the same month SHALL upsert the existing row, not create a duplicate.

---

### Requirement 12 — Push and Email Notifications

**User Story:** As a building owner, I want to receive push and email notifications for critical events so that I am immediately informed even when not viewing the dashboard.

#### Acceptance Criteria

1. THE Frontend SHALL request FCM push notification permission after successful wallet authentication and register the device token with the Backend via `PATCH /auth/fcm-token`; the token SHALL be stored and linked to the user profile.
2. WHEN a `threat_events` row with `severity = 'critical'` or `'high'` is inserted, THE Backend SHALL send an FCM push notification to all registered tokens of the device owner within 3 seconds.
3. WHEN a device transitions to `is_online = false`, THE Backend SHALL send an FCM push notification to the device owner within 3 seconds.
4. ALL outbound FCM messages and Resend emails SHALL include the Solana transaction signature (or `null` if not yet confirmed) and a deep-link URL to the relevant event detail page in the PWA.
5. IF an FCM notification fails for a `severity = 'critical'` or `'high'` event, THEN THE Backend SHALL send a Resend fallback email to `profiles.email` within 30 seconds; for non-critical FCM failures no fallback email SHALL be sent.
6. THE Backend SHALL respect the `profiles.notification_email` and `profiles.notification_push` boolean flags; if either is `false` the corresponding channel SHALL be skipped.

---

### Requirement 13 — MQTT Security and Device Token Validation

**User Story:** As a system administrator, I want all inbound MQTT messages validated against a device-specific token so that only registered hardware nodes can publish telemetry or events.

#### Acceptance Criteria

1. EVERY inbound MQTT message on any `aura/{deviceId}/#` topic SHALL be validated by THE Backend's MQTT service by querying `devices.device_token` before any handler processes it.
2. IF the `device_token` in the MQTT payload does not match the stored token for `deviceId`, THEN THE Backend SHALL silently drop the message with no database writes, no Alerta submissions, and no Socket.io emissions.
3. THE Backend's MQTT client SHALL connect to HiveMQ Cloud over TLS using MQTT v5 and subscribe to `aura/+/#`.
4. WHEN the MQTT connection is lost, THE Backend SHALL attempt reconnection with exponential back-off (1 s, 2 s, 4 s, 8 s, max 60 s) without crashing the server process.
5. THE Backend SHALL publish all outbound device commands to `aura/{deviceId}/cmd` at QoS 1 with a payload of `{ command, channel?, requestedBy, solanaSignature, timestamp }`.

---

### Requirement 14 — Error Tracking and Observability

**User Story:** As a developer maintaining AURA, I want all runtime errors and performance anomalies captured by Sentry so that issues can be diagnosed and resolved quickly.

#### Acceptance Criteria

1. THE Frontend SHALL initialize Sentry at application startup and capture all unhandled JavaScript exceptions, React rendering errors, and TanStack Query `onError` callbacks.
2. THE Backend SHALL initialize Sentry at server startup and capture all unhandled exceptions, unhandled promise rejections, and HTTP 5xx responses with full request context.
3. WHEN a Solana transaction fails after all 3 retry attempts, THE Backend SHALL capture a Sentry error event containing the event type, device ID, and the last RPC error response.
4. WHEN an NFT mint fails, THE Backend SHALL capture a Sentry error event containing the device ID and the Metaplex Umi error payload.
5. WHEN the Alerta API fails after the 5-minute retry window, THE Backend SHALL capture exactly one Sentry error event per failed alert.
6. THE Backend SHALL attach the authenticated user's `wallet_address` as the Sentry user context (`Sentry.setUser`) on all captured errors from authenticated requests; unauthenticated request errors SHALL NOT have a user context.
