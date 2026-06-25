/**
 * Integration test: MQTT surge → full pipeline
 *
 * Validates Property 6: For any valid surge payload, all 5 side effects fire:
 *   1. threat_events row created in DB
 *   2. Solana memo enqueued (enqueueSolanaEvent called)
 *   3. Alerta alert sent and alert ID stored via updateAlertaStatus
 *   4. FCM notification dispatched (notifyThreat called)
 *   5. Socket.io `threat:new` emitted to the correct device room
 *
 * All external I/O (Supabase, Solana, Alerta API, FCM, Socket.io) is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock all external modules before importing the handler under test
// ---------------------------------------------------------------------------

vi.mock('../../lib/db/threat_events', () => ({
  insertEvent: vi.fn(),
  updateAlertaStatus: vi.fn(),
}));

vi.mock('../../lib/db/notifications', () => ({
  createNotification: vi.fn(),
}));

vi.mock('../../lib/db/profiles', () => ({
  getOwnerProfileForDevice: vi.fn(),
}));

vi.mock('../../blockchain/solanaQueue', () => ({
  enqueueSolanaEvent: vi.fn(),
}));

vi.mock('../../services/alerta', () => ({
  buildSurgePayload: vi.fn(),
  sendAlert: vi.fn(),
}));

vi.mock('../../services/notify', () => ({
  notifyThreat: vi.fn(),
}));

// Mock publishCommand — it attempts MQTT I/O
vi.mock('../../services/mqtt', () => ({
  publishCommand: vi.fn(),
}));

// Mock emitToDevice — it requires the Socket.io singleton to be initialised
vi.mock('../../socket', () => ({
  emitToDevice: vi.fn(),
}));

// Mock Sentry so no real SDK calls happen
vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
  init: vi.fn(),
  Handlers: { requestHandler: () => (_: unknown, __: unknown, next: () => void) => next(), errorHandler: () => (_: unknown, __: unknown, ___: unknown, next: () => void) => next() },
}));

// Mock config to avoid env-var parsing during import
vi.mock('../../config', () => ({
  config: {
    SUPABASE_URL: 'http://localhost',
    SUPABASE_SERVICE_KEY: 'service-key',
    ALERTA_BASE_URL: 'http://alerta',
    ALERTA_API_KEY: 'key',
    ALERTA_API_SECRET: 'secret',
    ALERTA_CHANNEL_REF: 'channel-ref',
    FCM_PROJECT_ID: 'project',
    FCM_CLIENT_EMAIL: '',
    FCM_PRIVATE_KEY: '',
    FRONTEND_URL: 'http://localhost:3000',
    HIVEMQ_URL: 'mqtt://localhost',
    HIVEMQ_USER: 'user',
    HIVEMQ_PASS: 'pass',
    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    SOLANA_KEYPAIR: '[]',
    RESEND_API_KEY: 'resend-key',
    SENTRY_DSN: '',
    JWT_SECRET: 'secret',
  },
}));

// ---------------------------------------------------------------------------
// Import the handler and its mocked dependencies after all mocks are declared
// ---------------------------------------------------------------------------

import { handleSurge } from '../surgeHandler';
import { insertEvent, updateAlertaStatus } from '../../lib/db/threat_events';
import { createNotification } from '../../lib/db/notifications';
import { getOwnerProfileForDevice } from '../../lib/db/profiles';
import { enqueueSolanaEvent } from '../../blockchain/solanaQueue';
import { buildSurgePayload, sendAlert } from '../../services/alerta';
import { notifyThreat } from '../../services/notify';
import { publishCommand } from '../../services/mqtt';
import { emitToDevice } from '../../socket';
import { SOCKET_EVENTS } from '../../socket/events';
import { AURA_SOLANA_EVENTS } from '../../blockchain/events';
import type { Device, ThreatEvent, Profile } from '../../types/database';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockDevice: Device = {
  id: 'device-uuid-001',
  user_id: 'user-uuid-001',
  name: 'Test AURA Unit',
  device_token: 'valid-token-abc',
  firmware_version: '1.0.0',
  environment_type: 'home',
  is_online: true,
  last_seen: new Date().toISOString(),
  voltage_threshold_min: 180,
  voltage_threshold_max: 250,
  surge_sensitivity: 'medium',
  location_label: 'Living Room',
  nft_mint_address: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockThreatEvent: ThreatEvent = {
  id: 'threat-uuid-001',
  device_id: 'device-uuid-001',
  zone_id: null,
  event_type: 'surge',
  severity: 'high',
  voltage_at_event: 280,
  current_at_event: 15,
  action_taken: 'relay_cutoff',
  relay_triggered: true,
  relay_channel: 1,
  auto_resolved: false,
  resolved_at: null,
  solana_signature: null,
  solana_slot: null,
  solana_confirmed: false,
  lisk_tx_id: null,
  lisk_confirmed: false,
  alerta_alert_id: null,
  alerta_status: 'open',
  occurred_at: new Date().toISOString(),
};

const mockProfile: Profile = {
  id: 'user-uuid-001',
  full_name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
  environment_type: 'home',
  wallet_address: 'wallet-abc123',
  lisk_wallet_address: null,
  fcm_token: 'fcm-token-xyz',
  notification_email: true,
  notification_push: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockAlertaResult = {
  success: true,
  requestRef: 'alerta-ref-001',
  messageId: 'msg-001',
  sentAt: new Date().toISOString(),
  balance: 100,
};

const mockAlertaNotification = {
  channelRef: 'channel-ref',
  title: '⚡ Surge Detected — Test AURA Unit',
  message: 'Surge details...',
  severity: 'High',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration: MQTT surge → full pipeline (Property 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock return values
    vi.mocked(insertEvent).mockResolvedValue(mockThreatEvent);
    vi.mocked(getOwnerProfileForDevice).mockResolvedValue(mockProfile);
    vi.mocked(buildSurgePayload).mockReturnValue(mockAlertaNotification);
    vi.mocked(sendAlert).mockResolvedValue(mockAlertaResult);
    vi.mocked(updateAlertaStatus).mockResolvedValue(undefined);
    vi.mocked(notifyThreat).mockResolvedValue({ pushDelivered: true, emailDelivered: false });
    vi.mocked(createNotification).mockResolvedValue({
      id: 'notif-001',
      user_id: 'user-uuid-001',
      threat_event_id: 'threat-uuid-001',
      type: 'push',
      title: 'Surge on Test AURA Unit',
      body: '280V — relay cut on channel 1',
      is_read: false,
      delivered: true,
      created_at: new Date().toISOString(),
    });
    vi.mocked(publishCommand).mockResolvedValue(undefined);
    vi.mocked(emitToDevice).mockReturnValue(undefined);
    vi.mocked(enqueueSolanaEvent).mockReturnValue(undefined);
  });

  it('side effect 1: inserts a threat_events row in the DB', async () => {
    const payload = { voltage: 280, current: 15, severity: 'high' as const, relayChannel: 1 };

    await handleSurge(mockDevice, payload);

    expect(insertEvent).toHaveBeenCalledOnce();
    expect(insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        device_id: mockDevice.id,
        event_type: 'surge',
        severity: 'high',
        voltage_at_event: 280,
        current_at_event: 15,
        relay_triggered: true,
        relay_channel: 1,
      })
    );
  });

  it('side effect 2: enqueues Solana memo write (non-blocking)', async () => {
    const payload = { voltage: 280, current: 15, severity: 'high' as const };

    await handleSurge(mockDevice, payload);

    expect(enqueueSolanaEvent).toHaveBeenCalledOnce();
    expect(enqueueSolanaEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'threat_events',
        rowId: mockThreatEvent.id,
        eventName: AURA_SOLANA_EVENTS.SURGE_DETECTED,
        memo: expect.objectContaining({ deviceId: mockDevice.id }),
      })
    );
  });

  it('side effect 3: sends Alerta alert and stores alert ID', async () => {
    const payload = { voltage: 280, current: 15, severity: 'high' as const };

    await handleSurge(mockDevice, payload);

    // Alerta notification must be built and sent
    expect(buildSurgePayload).toHaveBeenCalledOnce();
    expect(sendAlert).toHaveBeenCalledOnce();
    expect(sendAlert).toHaveBeenCalledWith(mockAlertaNotification);

    // requestRef must be persisted back to the threat_events row
    expect(updateAlertaStatus).toHaveBeenCalledOnce();
    expect(updateAlertaStatus).toHaveBeenCalledWith(
      mockThreatEvent.id,
      mockAlertaResult.requestRef,
      'open'
    );
  });

  it('side effect 4: dispatches FCM notification to device owner', async () => {
    const payload = { voltage: 280, current: 15, severity: 'high' as const };

    await handleSurge(mockDevice, payload);

    // Owner profile must be fetched
    expect(getOwnerProfileForDevice).toHaveBeenCalledWith(mockDevice.id);

    // FCM (via notifyThreat) must be called with the correct owner + event
    expect(notifyThreat).toHaveBeenCalledOnce();
    expect(notifyThreat).toHaveBeenCalledWith(mockProfile, mockThreatEvent, mockDevice);
  });

  it('side effect 5: emits Socket.io threat:new to the device room', async () => {
    const payload = { voltage: 280, current: 15, severity: 'high' as const };

    await handleSurge(mockDevice, payload);

    expect(emitToDevice).toHaveBeenCalledWith(
      mockDevice.id,               // room = device ID (correct room)
      SOCKET_EVENTS.THREAT_NEW,    // event name
      expect.objectContaining({ event: mockThreatEvent })
    );
  });

  it('fires all 5 side effects together for a single surge payload', async () => {
    const payload = { voltage: 310, current: 20, severity: 'critical' as const, relayChannel: 2 };

    await handleSurge(mockDevice, payload);

    // All 5 must have been called exactly once in a single pipeline run
    expect(insertEvent).toHaveBeenCalledOnce();
    expect(enqueueSolanaEvent).toHaveBeenCalledOnce();
    expect(sendAlert).toHaveBeenCalledOnce();
    expect(notifyThreat).toHaveBeenCalledOnce();
    expect(emitToDevice).toHaveBeenCalledWith(
      mockDevice.id,
      SOCKET_EVENTS.THREAT_NEW,
      expect.anything()
    );
  });

  it('still fires all 5 side effects when Alerta returns null (send failed)', async () => {
    // Alerta failing should NOT abort the rest of the pipeline
    vi.mocked(sendAlert).mockResolvedValue(null);

    const payload = { voltage: 280, current: 15, severity: 'high' as const };
    await handleSurge(mockDevice, payload);

    expect(insertEvent).toHaveBeenCalledOnce();
    expect(enqueueSolanaEvent).toHaveBeenCalledOnce();
    expect(sendAlert).toHaveBeenCalledOnce();
    // updateAlertaStatus should NOT be called when sendAlert returns null (no requestRef)
    expect(updateAlertaStatus).not.toHaveBeenCalled();
    expect(notifyThreat).toHaveBeenCalledOnce();
    expect(emitToDevice).toHaveBeenCalledWith(
      mockDevice.id,
      SOCKET_EVENTS.THREAT_NEW,
      expect.anything()
    );
  });

  it('still fires core side effects when owner profile is not found', async () => {
    // No owner: FCM and notification row are skipped, but DB + Solana + Socket must still fire
    vi.mocked(getOwnerProfileForDevice).mockResolvedValue(null);

    const payload = { voltage: 280, current: 15, severity: 'high' as const };
    await handleSurge(mockDevice, payload);

    expect(insertEvent).toHaveBeenCalledOnce();
    expect(enqueueSolanaEvent).toHaveBeenCalledOnce();
    expect(sendAlert).toHaveBeenCalledOnce();
    expect(notifyThreat).not.toHaveBeenCalled(); // owner null, skipped
    expect(emitToDevice).toHaveBeenCalledWith(
      mockDevice.id,
      SOCKET_EVENTS.THREAT_NEW,
      expect.anything()
    );
  });

  it('defaults severity to high and relayChannel to 1 when omitted from payload', async () => {
    // Minimal payload — no severity or relayChannel
    const payload = { voltage: 260, current: 12 };

    await handleSurge(mockDevice, payload);

    expect(insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'high',
        relay_channel: 1,
      })
    );
  });

  it('emits threat:new to the specific device room, not a broadcast', async () => {
    const payload = { voltage: 280, current: 15, severity: 'high' as const };

    await handleSurge(mockDevice, payload);

    // The first argument to emitToDevice must be exactly the device ID
    const [room] = vi.mocked(emitToDevice).mock.calls[0];
    expect(room).toBe(mockDevice.id);
    // It should not be an empty string or a wildcard
    expect(room).not.toBe('');
    expect(room).not.toBe('*');
  });
});
