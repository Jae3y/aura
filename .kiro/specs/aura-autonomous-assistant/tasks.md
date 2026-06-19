# Implementation Plan: AURA Autonomous Assistant

## Overview

Full-stack implementation of AURA across four packages: `supabase/` (migrations), `backend/` (Node.js/Express), `frontend/` (Next.js PWA), and `shared/` (TypeScript types). Build order: database → shared types → backend core → MQTT + blockchain → Alerta → frontend → integration.

All chain writes are server-side only. Solana is primary (all real-time events). Lisk is secondary (monthly reports only). Never expose keypairs client-side.

---

## Tasks

- [x] 1. Supabase migration and database layer
  - Create `supabase/migrations/001_aura_schema.sql`: enable `uuid-ossp`, create all 9 tables (`profiles`, `devices`, `sensor_readings`, `zones`, `threat_events`, `automations`, `voice_commands`, `notifications`, `monthly_reports`) with all columns, CHECK constraints, indexes, and UNIQUE constraints exactly as specified in design.md
  - Enable RLS on all 9 tables; write per-table policies using `auth.uid()` owner pattern
  - Create `src/types/database.ts`: TypeScript interfaces for all 9 tables, all union types (`EnvironmentType`, `SurgeSensitivity`, `ZoneType`, `ThreatEventType`, `Severity`, `TriggerType`, `NotificationType`, `AlertaStatus`), export `Database` type for Supabase typed client
  - Create `src/lib/supabase.ts`: browser client (anon key) and server client (service-role key), both typed with `Database`
  - Create `src/lib/db/devices.ts`: `getDevices`, `getDeviceById`, `updateDeviceStatus`, `updateLastSeen`, `updateNftMintAddress`
  - Create `src/lib/db/sensor_readings.ts`: `insertReading`, `getRecentReadings(limit)`, `getReadingsByRange(from, to)`
  - Create `src/lib/db/threat_events.ts`: `insertEvent`, `getEventsByDevice`, `updateSolanaSignature(id, sig, slot)`, `updateAlertaStatus(id, alertId, status)`
  - Create `src/lib/db/notifications.ts`: `createNotification`, `markAsRead`, `getUnreadCount`, `markAllAsRead`
  - Create `src/lib/db/monthly_reports.ts`: `upsertReport`, `getReportByMonth`, `updateLiskTx(id, txId)`
  - _Requirements: 1.5, 3.2, 4.5_

  - [ ]* 1.1 Write schema validation tests
    - Assert all 9 tables exist with correct column types and constraints
    - Assert RLS policies reject cross-user queries
    - Assert indexes exist on `sensor_readings(device_id, recorded_at)` and `threat_events(device_id, occurred_at)`

- [x] 2. Backend scaffold and shared config
  - Initialize `backend/` package with TypeScript, Express, Socket.io, Sentry
  - Create `src/config/index.ts`: Zod-validated env vars (SUPABASE_URL, SUPABASE_SERVICE_KEY, HIVEMQ_URL, HIVEMQ_USER, HIVEMQ_PASS, SOLANA_RPC_URL, SOLANA_KEYPAIR, ALERTA_API_KEY, ALERTA_BASE_URL, FCM_PROJECT_ID, RESEND_API_KEY, SENTRY_DSN, JWT_SECRET)
  - Create `src/index.ts`: Express app + Socket.io server bootstrap, Sentry init, middleware chain, route mounting, global error handler
  - Create `src/middleware/errorHandler.ts`: structured JSON error responses, Sentry capture, HTTP 5xx detection
  - Create `src/middleware/rateLimit.ts`: per-route-group limits (auth: 10/min, readings: 100/min, default: 60/min)
  - _Requirements: 1.4, 13.2_

- [x] 3. Authentication middleware and routes
  - Create `src/middleware/auth.ts`: verify Supabase JWT, load `profiles` row, attach `req.user = { id, walletAddress }`, call `Sentry.setUser`, return 401 on failure
  - Create `src/middleware/solana.ts`: extract wallet + signature from `X-Wallet-Address` / `X-Wallet-Signature` headers, verify Ed25519 signature via `tweetnacl`, 401 on failure
  - Create `src/routes/auth.ts`: `POST /auth/register` (upsert profile from wallet sig), `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`
  - _Requirements: 1.2, 1.4, 1.5, 13.5_

  - [ ]* 3.1 Property test: unauthenticated requests always return 401
    - Use fast-check to generate arbitrary methods, paths, and headers without a valid JWT
    - Assert every response is HTTP 401; no data is returned
    - **Validates: Property 1**

  - [ ]* 3.2 Property test: Sentry user context set on authenticated requests
    - For any request with a valid JWT, assert `Sentry.setUser` is called with the correct `walletAddress`
    - **Validates: Property 2 (auth boundary)**

- [x] 4. Device routes and CRUD
  - Create `src/routes/devices.ts`: GET list, POST create (requires `device_token`), GET `:id`, PATCH `:id`, DELETE `:id` — all protected by `authMiddleware`
  - Create `src/routes/control.ts`: `POST /devices/:id/relay/:ch/on` and `/off` — validate channel (1-4), publish MQTT `cmd` to device, log relay action
  - _Requirements: 3.2, 7.4_

- [x] 5. Zone, automation, sensor, and notification routes
  - Create `src/routes/zones.ts`: CRUD for `/devices/:id/zones` and `/zones/:id`
  - Create `src/routes/automations.ts`: CRUD + `POST /automations/:id/trigger`
  - Create `src/routes/sensor.ts`: `GET /devices/:id/readings`, `GET /devices/:id/readings/latest`
  - Create `src/routes/threats.ts`: `GET /devices/:id/threats`, `PATCH /threats/:id`
  - Create `src/routes/voice.ts`: `POST /voice/command`, `GET /devices/:id/voice`
  - Create `src/routes/notifications.ts`: `GET /notifications`, `PATCH /notifications/:id` (mark read)
  - _Requirements: 5.3, 6.3, 7.3, 8.3_

- [x] 6. Checkpoint — Core backend routes
  - Ensure all routes return correct status codes, auth middleware rejects unauthenticated requests, ask if questions arise.

- [x] 7. Solana service and non-blocking queue
  - Create `src/blockchain/events.ts`: export `AURA_SOLANA_EVENTS` constants (`SURGE_DETECTED`, `INTRUSION_DETECTED`, `RELAY_TRIGGERED`, `RELAY_OVERRIDE`, `VOICE_COMMAND`, `SYSTEM_FAULT`, `DEVICE_MINTED`)
  - Create `src/services/solana.ts`: `initSolanaClient()` (devnet), `writeEventToChain(event)` (builds JSON memo ≤566 bytes, submits via Memo Program, returns `{ signature, slot }`), `confirmTransaction(sig)`, `verifyWalletSignature(addr, sig, msg)`, `getTransactionDetails(sig)`, `getExplorerUrl(sig)`
  - Create `src/blockchain/solanaQueue.ts`: in-memory FIFO queue; `enqueue(event)`; background processor pops events, calls `writeEventToChain`, on success calls `updateSolanaSignature(eventId, sig, slot)` and sets `solana_confirmed = true`; on failure retries 3× with exponential backoff (1 s, 2 s, 4 s); on final failure logs to Sentry and sets `solana_confirmed = false`
  - _Requirements: 2.1–2.6, 13.3_

  - [ ]* 7.1 Property test: Solana queue exhaustion sets unconfirmed
    - Simulate 3 consecutive RPC failures; assert `solana_confirmed = false` set; assert exactly one Sentry error captured
    - **Validates: Property 2**

  - [ ]* 7.2 Property test: Solana signature stored on success
    - For arbitrary signature strings from a mocked RPC, assert `solana_signature` equals returned value and `solana_confirmed = true`
    - **Validates: Property 3**

- [x] 8. NFT service and device pairing
  - Create `src/services/nft.ts`: `mintDeviceNFT(device, ownerWallet)` using Metaplex Umi on devnet; NFT metadata includes name (`"AURA Unit - {device.name}"`), symbol (`"AURA"`), and attributes (deviceId, owner, environment_type, location_label, deployDate, firmware_version); returns `{ mintAddress, signature }`
  - Add `POST /devices/:id/pair` to `src/routes/devices.ts`: validate device ownership, call `mintDeviceNFT`, call `updateNftMintAddress(deviceId, mintAddress)`, enqueue `DEVICE_MINTED` Solana event, emit Socket.io `device:paired`
  - Create `src/services/nft.ts` `getNFTMetadata(mintAddress)` and `getNFTExplorerUrl(mintAddress)`
  - _Requirements: 3.3, 3.4, 3.5_

  - [ ]* 8.1 Property test: NFT mint address persisted after successful mint
    - Mock Metaplex Umi; for any returned mint address, assert `devices.nft_mint_address` equals it and is non-null
    - **Validates: Property 5**

- [x] 9. Lisk service and monthly report job
  - Create `src/services/lisk.ts`: `initLiskClient()` (testnet), `writeMonthlyAudit(report)` — writes `{ deviceId, month, totalThreats, surgesBlocked, healthScore, solanaEventsLogged }` to Lisk, returns `{ txId }`, retries 3× with backoff, updates `monthly_reports.lisk_tx_id` on success
  - Create `src/routes/reports.ts`: `GET /devices/:id/reports`, `POST /devices/:id/reports` (generate), `GET /reports/:id/pdf`
  - Wire `LiskService.writeMonthlyAudit` into the report generation flow ONLY — never from real-time event handlers
  - Create `src/services/pdf.ts`: generate monthly PDF (stats, charts, Alerta ack rate, Solana event count), upload to Supabase Storage, return public URL
  - Create `src/services/auraScore.ts`: calculate health score 0–100 based on threat frequency, relay trips, anomaly rate, uptime
  - _Requirements: 11.1–11.5_

  - [ ]* 9.1 Property test: Lisk writes are monthly-only
    - Assert `writeMonthlyAudit` is never called from `surgeHandler`, `presenceHandler`, `readingHandler`, `voiceHandler`, or `heartbeatHandler`
    - **Validates: Property 11**

  - [ ]* 9.2 Property test: Report counts match DB records
    - Seed known threat_events; assert `surges_blocked + intrusions_detected` equals count of matching rows
    - **Validates: Property 10**

- [x] 10. MQTT service and message routing
  - Create `src/services/mqtt.ts`: `connectMQTT()` connects to HiveMQ Cloud over TLS (MQTT v5), subscribes to `aura/+/#`; `publishCommand(deviceId, command)` publishes to `aura/{deviceId}/cmd` QoS 1; `onMessage(topic, message)` parses deviceId from topic, validates `device_token` against DB, routes to appropriate handler; `handleDisconnect()` implements exponential backoff reconnect (1 s, 2 s, 4 s, 8 s, max 60 s); `validateDeviceToken(deviceId, token)` queries `devices` table
  - Wire MQTT client startup into `src/index.ts`
  - _Requirements: 4.4, 5.2, 6.2, 10.3_

  - [ ]* 10.1 Property test: Invalid device tokens silently drop messages
    - For any MQTT payload with a mismatched `device_token`, assert no `threat_events`, `sensor_readings`, or `voice_commands` rows are created
    - **Validates: Property 4**

- [x] 11. Alerta service
  - Create `src/services/alerta.ts` with the full `AlertaPayload` interface and all 10 methods: `sendAlert`, `acknowledgeAlert`, `closeAlert`, `getAlert`, `getDeviceAlerts`, `getAlertStats`, `buildSurgePayload`, `buildIntrusionPayload`, `buildOfflinePayload`, `buildAnomalyPayload`
  - Implement severity mapping (`critical→critical`, `high→major`, `medium→minor`, `low→warning`, anomaly→`informational`, offline→`major`)
  - Implement in-memory retry queue for failed `sendAlert` calls: exponential backoff, 5-minute max window, Sentry error on final failure
  - Include `correlate` field on surge payloads linking related `overcurrent` events
  - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [ ]* 11.1 Property test: Severity mapping is exhaustive
    - For every valid AURA severity value, assert `mapSeverity` returns a defined Alerta severity string (never `undefined`)
    - **Validates: Property 7**

  - [ ]* 11.2 Property test: Alerta retry queue exhausts within 5 minutes
    - Simulate continuous API failure; assert no retries after 300 s; assert exactly one Sentry error captured
    - **Validates: Req 9.5**

- [x] 12. Alerta routes and webhook handler
  - Create `src/routes/alerta.ts`: `GET /alerta/alerts`, `GET /alerta/alerts/:id`, `GET /alerta/stats/:deviceId`, `PATCH /alerta/alerts/:id/ack`, `PATCH /alerta/alerts/:id/close`
  - Add `POST /alerta/webhook`: verify HMAC signature from Alerta; on `acknowledge` set `threat_events.alerta_status = 'ack'`; on `close` set `'closed'`; both emit Socket.io `alerta:update` to owner's device room
  - _Requirements: 9.2, 9.3_

  - [ ]* 12.1 Property test: Webhook updates exactly one row
    - For any valid webhook payload, assert exactly one `threat_events` row has its `alerta_status` updated; no other rows modified
    - **Validates: Property 8**

- [x] 13. FCM, email, and notification services
  - Create `src/services/fcm.ts`: Firebase Admin SDK, `sendPush(token, payload)`, `sendBulkPush(tokens, payload)` — payload includes `solanaSig` and deep-link URL
  - Create `src/services/email.ts`: Resend client, `sendThreatAlert(to, event, device)`, `sendWeeklyReport(to, report)` — both include Solana tx link
  - Wire FCM + Resend fallback: for `critical` or `high` severity, if FCM fails within 30 s dispatch Resend email
  - _Requirements: 12.2, 12.3, 12.4, 12.5_

  - [ ]* 13.1 Property test: FCM failure triggers Resend fallback on critical events
    - Simulate FCM failure; for severity `critical`/`high` assert Resend email dispatched; for `low`/`medium` assert no email
    - **Validates: Property 9**

- [x] 14. MQTT event handlers
  - Create `src/handlers/surgeHandler.ts`: parse + validate MQTT surge payload; insert `threat_events`; enqueue Solana write; call `AlertaService.buildSurgePayload` + `sendAlert`, store `alerta_alert_id`; send FCM; insert `notifications` row; emit Socket.io `threat:new`; publish relay cmd to device
  - Create `src/handlers/presenceHandler.ts`: update `zones.presence_detected` + `last_presence_at`; if zone_type is `restricted` insert `threat_events` + submit Alerta intrusion alert; evaluate automations; emit Socket.io `presence:update`
  - Create `src/handlers/readingHandler.ts`: insert `sensor_readings`; if `isAnomaly = true` submit Alerta `informational` alert; emit Socket.io `reading:new`
  - Create `src/handlers/voiceHandler.ts`: insert `voice_commands`; validate confidence threshold; if valid execute action + enqueue Solana write + emit Socket.io `voice:new`; if invalid set `was_executed = false`
  - Create `src/handlers/heartbeatHandler.ts`: update `devices.is_online = true` + `last_seen`; if device was previously offline close Alerta offline alert; emit Socket.io `device:online`; 90 s watchdog: if no heartbeat set `is_online = false`, send Alerta `DeviceOffline` major alert, emit `device:offline`
  - _Requirements: 4.5, 5.3, 6.3, 8.6, 10.3, 10.4_

  - [ ]* 14.1 Property test: Surge pipeline fires all 5 side effects
    - For any valid surge payload, assert `threat_events` row, Solana memo queued, Alerta alert, FCM sent, Socket.io `threat:new` emitted
    - **Validates: Property 6**

  - [ ]* 14.2 Property test: Voice confidence threshold enforced
    - For `confidence_score <= threshold`, assert `was_executed = false` and no relay action triggered
    - **Validates: Property 12**

- [x] 15. Socket.io setup
  - Create `src/socket/index.ts`: `initSocket(httpServer)` — Socket.io with CORS config; JWT auth middleware on connection; `socket.join(deviceId)` on connect; export `getIO()` singleton for use in handlers
  - Create `src/socket/events.ts`: export all event name constants (`reading:new`, `threat:new`, `presence:update`, `voice:new`, `device:online`, `device:offline`, `alerta:update`)
  - _Requirements: 8.1, 8.2_

- [x] 16. Blockchain routes
  - Create `src/routes/blockchain.ts`: `GET /blockchain/events?deviceId=&limit=`, `GET /blockchain/verify/:signature` (returns `{ confirmed, slot, timestamp, explorerUrl }`), `GET /blockchain/nft/:deviceId`, `POST /blockchain/access/grant` (requires `requireSolanaAuth`), `POST /blockchain/access/revoke`, `GET /blockchain/access/:deviceId`
  - _Requirements: 2.6, 3.7_

- [x] 17. Checkpoint — Complete backend
  - Ensure all routes work, MQTT connects, Solana queue processes, Alerta sends alerts, ask if questions arise.

- [x] 18. Create ESP32_MQTT_REFERENCE.md
  - Hardware reference document for firmware teammate covering: HiveMQ broker URL + credentials format; all topic names + QoS levels; full payload JSON shape for each of the 7 topics; reconnect logic with exponential backoff instructions; example Arduino MQTT publish snippet for each topic type

- [x] 19. Scaffold Next.js frontend
  - Initialize Next.js App Router project with TypeScript, Tailwind CSS, shadcn/ui
  - Install: `@solana/wallet-adapter-react`, `@solana/wallet-adapter-wallets`, `@supabase/supabase-js`, `socket.io-client`, `@tanstack/react-query`, `zustand`, `framer-motion`, `react-hook-form`, `zod`, `@sentry/nextjs`
  - Create `app/layout.tsx`: `WalletProvider` (Phantom adapter), `QueryClientProvider`, Sentry init, root `ErrorBoundary`
  - Create `public/manifest.json`: PWA manifest (name, icons, display standalone, theme_color)
  - _Requirements: 1.1, 8.5, 13.1_

- [x] 20. Wallet authentication and WalletGuard
  - Create `lib/stores/authStore.ts` (Zustand): `walletAddress`, `session`, `profile`; actions `setSession`, `clearSession`
  - Create `app/connect/page.tsx`: render `WalletConnectButton`; on connect, sign challenge message, POST to `/auth/login`, store session in `authStore`; also upsert `profiles.wallet_address`
  - Create `components/auth/WalletGuard.tsx`: redirect to `/connect` if not connected or no session; clear `authStore` and redirect on wallet disconnect
  - Create `app/page.tsx`: redirect to `/dashboard` or `/connect`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 21. Realtime store and Socket.io client
  - Create `lib/socketClient.ts`: Socket.io singleton, connect with auth token, auto-rejoin device rooms
  - Create `lib/stores/realtimeStore.ts` (Zustand): `devices` map, `recentReadings` map, `recentThreats` array; actions `upsertDevice`, `addReading`, `addThreat`, `updateAlertaStatus`
  - Wire Socket.io listeners: `reading:new` → `addReading`, `threat:new` → `addThreat`, `device:online`/`device:offline` → `upsertDevice`, `alerta:update` → `updateAlertaStatus`
  - Set up Supabase Realtime subscription on `threat_events` INSERT → `addThreat`
  - _Requirements: 8.1, 8.2_

- [x] 22. TanStack Query hooks
  - Create `lib/queries/useDevices.ts`, `useZones.ts`, `useThreats.ts`, `useSensorReadings.ts`, `useNotifications.ts`, `useReports.ts`
  - Add `onError` callbacks: shadcn/ui `toast` + Sentry `captureException`
  - _Requirements: 8.3, 11.5_

- [x] 23. Live dashboard and telemetry
  - Create `components/dashboard/CommandCenter.tsx`: military-aesthetic grid (dark bg, green/amber accents), Framer Motion entrance, Lucide icons
  - Create `components/dashboard/DeviceStatusCard.tsx`: status badge, last seen, relay state, `is_online` indicator
  - Create `components/dashboard/EventFeed.tsx`: recent `threat_events` from `realtimeStore`; `SolanaExplorerBadge` on each row; pending spinner when `solana_confirmed = false`
  - Create `components/dashboard/TelemetryGauge.tsx`: live voltage, current, power from `realtimeStore.recentReadings`; refresh every 5 s
  - Create `components/dashboard/AlertaStatusPanel.tsx`: open/ack/closed counts from `useAlertStats`, refresh every 10 s
  - Create `app/dashboard/page.tsx` composing all dashboard components
  - _Requirements: 8.1–8.5, 9.3_

  - [ ]* 23.1 Unit test: EventFeed renders Solana explorer links
    - For events with non-null `solana_signature`, assert `<a>` href contains devnet explorer URL + signature
    - For events with `solana_confirmed = false`, assert pending spinner rendered
    - **Validates: Property 3 (frontend)**

- [x] 24. Blockchain frontend components
  - Create `components/blockchain/SolanaExplorerBadge.tsx`: `{ signature, confirmed, slot }` props; shortened sig with copy button; confirmed tick or pending spinner; click opens devnet explorer
  - Create `components/blockchain/DeviceNFTCard.tsx`: `{ mintAddress, metadata }` props; NFT name, attributes grid, mint address, "View on Solana" button, ownership verified badge
  - Create `components/blockchain/LiskBadge.tsx`: `{ txId, confirmed }` props; shown on monthly reports only
  - Create `components/blockchain/WalletConnectButton.tsx`: Phantom wallet connect via `@solana/wallet-adapter-react`; on connect sign challenge and store `wallet_address` in `profiles`
  - Create `hooks/useBlockchain.ts`: `useSolanaEvents(deviceId)`, `useVerifySignature(sig)`, `useDeviceNFT(deviceId)`, `useWalletAccess(deviceId)`, `useGrantAccess()`, `useRevokeAccess()`
  - Create `app/blockchain/page.tsx`: event log with `SolanaExplorerBadge` on each row, NFT card, wallet access management
  - _Requirements: 2.6, 3.7, 8.4_

- [x] 25. Alerta frontend components
  - Create `components/alerta/AlertaBadge.tsx`: `{ alertId, status, severity }` props; `open` → red pulse dot + "OPEN"; `ack` → amber dot + "ACK"; `closed` → green dot + "RESOLVED"
  - Create `components/alerta/AlertaStatusPanel.tsx`: open (red) / ack (amber) / closed (green) counts; refresh every 10 s via `useAlertStats`
  - Create `components/alerta/AlertaAlertCard.tsx`: event type, severity badge, value, description, Solana sig cross-reference, Acknowledge + Close buttons (optimistic update), copyable Alerta alert ID
  - Create `hooks/useAlerta.ts`: `useDeviceAlerts(deviceId, status?)`, `useAlertStats(deviceId)`, `useAcknowledgeAlert()` (optimistic), `useCloseAlert()` (optimistic), `useAlertaRealtime()` (Socket.io `alerta:update` listener)
  - Integrate `AlertaStatusPanel` below health score on dashboard; `AlertaBadge` on every `EventFeed` row; `AlertaAlertCard` on threats page; `alerta_ack_rate` in monthly report stats
  - _Requirements: 9.3, 9.4_

- [x] 26. Remaining frontend pages
  - Create `app/devices/[id]/page.tsx`: device detail, `DeviceNFTCard`, relay control buttons, zone list
  - Create `app/threats/page.tsx`: threat event list, `AlertaAlertCard` per event, `SolanaExplorerBadge` per event
  - Create `app/zones/[deviceId]/page.tsx`: zone CRUD, presence detection status
  - Create `app/reports/page.tsx`: monthly reports list with `LiskBadge`, health score, ack rate, PDF download
  - Create `app/settings/page.tsx`: profile edit, notification prefs, FCM permission request + token registration
  - Add FCM service worker: request push permission after login, register token via `PATCH /auth/fcm-token`
  - _Requirements: 7.3, 11.5, 12.1_

- [x] 27. Checkpoint — Complete frontend
  - Ensure all pages render, wallet auth works, realtime updates flow, Alerta components display live data, ask if questions arise.

- [x] 28. Integration wiring
  - Verify all MQTT handlers are registered in `src/index.ts` on MQTT connect
  - Verify `solanaQueue` background processor starts on server boot
  - Verify all protected routes use `authMiddleware`
  - Verify Alerta webhook HMAC validation is enforced
  - Verify Socket.io room isolation: users only receive events for their own devices
  - Add `ESP32_MQTT_REFERENCE.md` to repo root for hardware team
  - _Requirements: 2.1, 4.5, 5.3, 6.3, 8.6, 9.1, 13.2_

  - [ ]* 28.1 Integration test: MQTT surge → full pipeline
    - Publish mock surge MQTT message; assert `threat_events` row created, Solana memo queued, Alerta alert ID stored, FCM called, Socket.io `threat:new` emitted to correct room
    - **Validates: Property 6**

  - [ ]* 28.2 Integration test: Alerta webhook → DB + Socket.io
    - POST mock Alerta webhook payload; assert `alerta_status` updated in DB; assert Socket.io `alerta:update` emitted
    - **Validates: Property 8**

- [x] 29. Final checkpoint — Full system integration
  - Ensure all tests pass, MQTT → Supabase → Solana → Alerta → Socket.io flow works end-to-end, ask if questions arise.

---

## Notes

- Tasks marked `*` are optional property-based tests using [fast-check](https://fast-check.dev/)
- Checkpoints at tasks 6, 17, 27, and 29 gate each tier before the next begins
- All Solana and Lisk writes are server-side only — never expose keypairs to the frontend
- `device_token` validation on every MQTT message is the hardware security boundary
- The `lisk.ts` service is intentionally minimal — one function, one call site (monthly report job)
- Firmware tasks (ESP32-S3, FreeRTOS, Edge Impulse) require physical hardware and are out of scope for this task list; see `ESP32_MQTT_REFERENCE.md`
- Supabase service-role client is used for all backend DB writes; anon client for frontend reads with RLS

## Remaining Work

The following tasks are still open and need to be completed:

| Task | Description |
|------|-------------|
| **27** | Frontend checkpoint — verify all pages render, wallet auth, realtime updates, Alerta components |
| **29** | Final integration checkpoint — end-to-end MQTT → Supabase → Solana → Alerta → Socket.io flow |
| **1.1*** | Schema validation tests (RLS, indexes, column constraints) |
| **3.1*** | Property test: unauthenticated requests always return HTTP 401 |
| **3.2*** | Property test: Sentry user context set on authenticated requests |
| **7.1*** | Property test: Solana queue exhaustion sets `solana_confirmed = false` |
| **7.2*** | Property test: Solana signature stored on confirmed tx |
| **8.1*** | Property test: NFT mint address persisted after successful mint |
| **9.1*** | Property test: Lisk writes are monthly-only |
| **9.2*** | Property test: Report counts match DB records |
| **10.1*** | Property test: Invalid device tokens silently drop MQTT messages |
| **11.1*** | Property test: Alerta severity mapping is exhaustive |
| **11.2*** | Property test: Alerta retry queue exhausts within 5 minutes |
| **12.1*** | Property test: Alerta webhook updates exactly one row |
| **13.1*** | Property test: FCM failure triggers Resend fallback on critical events |
| **14.1*** | Property test: Surge pipeline fires all 5 side effects |
| **14.2*** | Property test: Voice confidence threshold enforced |
| **23.1*** | Unit test: EventFeed renders Solana explorer links correctly |
| **28.1*** | Integration test: MQTT surge → full pipeline |
| **28.2*** | Integration test: Alerta webhook → DB + Socket.io |

Tasks marked `*` are optional and can be skipped for a faster MVP delivery.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["3.1", "3.2"] },
    { "id": 2, "tasks": ["7.1", "7.2", "8.1", "9.1", "9.2", "10.1"] },
    { "id": 3, "tasks": ["11.1", "11.2", "12.1", "13.1", "14.1", "14.2"] },
    { "id": 4, "tasks": ["23.1"] },
    { "id": 5, "tasks": ["28.1", "28.2"] }
  ]
}
```
