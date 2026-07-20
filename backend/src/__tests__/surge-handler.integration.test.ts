/**
 * Integration test: Surge handler pipeline (Property 6)
 *
 * Validates that handleSurge fires all 7 side effects:
 *   1. insertEvent (threat_events row)
 *   2. enqueueSolanaEvent (Solana memo write)
 *   3. sendAlert (Alerta Telegram)
 *   4. createNotification (in-app notification row)
 *   5. emitToDevice (Socket.io threat:new)
 *   6. publishCommand (MQTT relay_off)
 *   7. notifyThreat (FCM push)
 *
 * Strategy:
 *  - Import handleSurge directly (no HTTP layer needed).
 *  - Mock every DB and external service.
 *  - Assert each side effect was called with the correct arguments.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockInsertEvent,
  mockCreateNotification,
  mockGetOwnerProfileForDevice,
  mockEnqueueSolanaEvent,
  mockSendAlert,
  mockBuildSurgePayload,
  mockNotifyThreat,
  mockPublishCommand,
  mockEmitToDevice,
  mockUpdateAlertaStatus,
  mockCaptureException,
} = vi.hoisted(() => ({
  mockInsertEvent: vi.fn(),
  mockCreateNotification: vi.fn(),
  mockGetOwnerProfileForDevice: vi.fn(),
  mockEnqueueSolanaEvent: vi.fn(),
  mockSendAlert: vi.fn(),
  mockBuildSurgePayload: vi.fn(),
  mockNotifyThreat: vi.fn(),
  mockPublishCommand: vi.fn(),
  mockEmitToDevice: vi.fn(),
  mockUpdateAlertaStatus: vi.fn(),
  mockCaptureException: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: mockCaptureException,
  setUser: vi.fn(),
}));

vi.mock('../lib/db/threat_events', () => ({
  insertEvent: mockInsertEvent,
  updateAlertaStatus: mockUpdateAlertaStatus,
}));

vi.mock('../lib/db/notifications', () => ({
  createNotification: mockCreateNotification,
}));

vi.mock('../lib/db/profiles', () => ({
  getOwnerProfileForDevice: mockGetOwnerProfileForDevice,
}));

vi.mock('../blockchain/solanaQueue', () => ({
  enqueueSolanaEvent: mockEnqueueSolanaEvent,
}));

vi.mock('../blockchain/events', () => ({
  AURA_SOLANA_EVENTS: {
    SURGE_DETECTED: 'SURGE_DETECTED',
  },
}));

vi.mock('../services/alerta', () => ({
  sendAlert: mockSendAlert,
  buildSurgePayload: mockBuildSurgePayload,
}));

vi.mock('../services/notify', () => ({
  notifyThreat: mockNotifyThreat,
}));

vi.mock('../services/mqtt', () => ({
  publishCommand: mockPublishCommand,
}));

vi.mock('../socket', () => ({
  emitToDevice: mockEmitToDevice,
}));

vi.mock('../socket/events', () => ({
  SOCKET_EVENTS: {
    THREAT_NEW: 'threat:new',
  },
}));

// ---------------------------------------------------------------------------
// Import handler AFTER mocks
// ---------------------------------------------------------------------------

import { handleSurge } from '../handlers/surgeHandler';
import type { Device, ThreatEvent } from '../types/database';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_DEVICE: Device = {
  id: 'device-uuid-abc',
  user_id: 'user-uuid-001',
  name: 'Living Room Node',
  device_token: 'tok_test123456789',
  firmware_version: '1.2.0',
  environment_type: 'home',
  is_online: true,
  last_seen: new Date().toISOString(),
  voltage_threshold_min: 180,
  voltage_threshold_max: 260,
  surge_sensitivity: 'high',
  location_label: 'Living Room',
  nft_mint_address: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_EVENT: ThreatEvent = {
  id: 'threat-uuid-001',
  device_id: 'device-uuid-abc',
  zone_id: null,
  event_type: 'surge',
  severity: 'high',
  voltage_at_event: 285.4,
  current_at_event: 14.2,
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

const MOCK_OWNER = {
  id: 'user-uuid-001',
  full_name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
  environment_type: 'home' as const,
  wallet_address: null,
  lisk_wallet_address: null,
  fcm_token: 'fcm-token-abc',
  notification_email: true,
  notification_push: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SURGE_PAYLOAD = {
  voltage: 285.4,
  current: 14.2,
  severity: 'high' as const,
  relayChannel: 1,
  actionTaken: 'relay_cutoff',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleSurge — full pipeline (Property 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockInsertEvent.mockResolvedValue(MOCK_EVENT);
    mockEnqueueSolanaEvent.mockImplementation(() => {});
    mockSendAlert.mockResolvedValue({ success: true, requestRef: 'ALT-7777' });
    mockBuildSurgePayload.mockReturnValue({
      channelRef: 'TG_ALT_TEST',
      title: 'Surge Detected',
      message: 'test',
      severity: 'High',
    });
    mockGetOwnerProfileForDevice.mockResolvedValue(MOCK_OWNER);
    mockNotifyThreat.mockResolvedValue({ pushDelivered: true, emailDelivered: false });
    mockCreateNotification.mockResolvedValue(undefined);
    mockPublishCommand.mockResolvedValue(undefined);
    mockUpdateAlertaStatus.mockResolvedValue(undefined);
  });

  it('inserts a threat_events row with correct fields', async () => {
    await handleSurge(MOCK_DEVICE, SURGE_PAYLOAD);

    expect(mockInsertEvent).toHaveBeenCalledOnce();
    expect(mockInsertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        device_id: 'device-uuid-abc',
        event_type: 'surge',
        severity: 'high',
        voltage_at_event: 285.4,
        current_at_event: 14.2,
        action_taken: 'relay_cutoff',
        relay_triggered: true,
        relay_channel: 1,
      })
    );
  });

  it('enqueues a Solana memo write with correct table/rowId/eventName', async () => {
    await handleSurge(MOCK_DEVICE, SURGE_PAYLOAD);

    expect(mockEnqueueSolanaEvent).toHaveBeenCalledOnce();
    expect(mockEnqueueSolanaEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'threat_events',
        rowId: MOCK_EVENT.id,
        eventName: 'SURGE_DETECTED',
      })
    );
  });

  it('sends Alerta Telegram notification via buildSurgePayload + sendAlert', async () => {
    await handleSurge(MOCK_DEVICE, SURGE_PAYLOAD);

    expect(mockBuildSurgePayload).toHaveBeenCalledOnce();
    expect(mockBuildSurgePayload).toHaveBeenCalledWith(MOCK_EVENT, MOCK_DEVICE);
    expect(mockSendAlert).toHaveBeenCalledOnce();
  });

  it('updates alerta_status to open when sendAlert returns a requestRef', async () => {
    await handleSurge(MOCK_DEVICE, SURGE_PAYLOAD);

    expect(mockUpdateAlertaStatus).toHaveBeenCalledOnce();
    expect(mockUpdateAlertaStatus).toHaveBeenCalledWith(
      MOCK_EVENT.id,
      'ALT-7777',
      'open'
    );
  });

  it('creates an in-app notification for the owner', async () => {
    await handleSurge(MOCK_DEVICE, SURGE_PAYLOAD);

    expect(mockCreateNotification).toHaveBeenCalledOnce();
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-001',
        threat_event_id: MOCK_EVENT.id,
        type: 'push',
        title: expect.stringContaining('Surge'),
        body: expect.stringContaining('285.4'),
      })
    );
  });

  it('emits threat:new via Socket.io to the device', async () => {
    await handleSurge(MOCK_DEVICE, SURGE_PAYLOAD);

    expect(mockEmitToDevice).toHaveBeenCalledOnce();
    expect(mockEmitToDevice).toHaveBeenCalledWith(
      'device-uuid-abc',
      'threat:new',
      expect.objectContaining({ event: MOCK_EVENT })
    );
  });

  it('publishes relay_off command back to the device via MQTT', async () => {
    await handleSurge(MOCK_DEVICE, SURGE_PAYLOAD);

    expect(mockPublishCommand).toHaveBeenCalledOnce();
    expect(mockPublishCommand).toHaveBeenCalledWith(
      'device-uuid-abc',
      expect.objectContaining({
        command: 'relay_off',
        channel: 1,
        requestedBy: 'aura-auto',
      })
    );
  });

  it('sends FCM push notification via notifyThreat', async () => {
    await handleSurge(MOCK_DEVICE, SURGE_PAYLOAD);

    expect(mockNotifyThreat).toHaveBeenCalledOnce();
    expect(mockNotifyThreat).toHaveBeenCalledWith(MOCK_OWNER, MOCK_EVENT, MOCK_DEVICE);
  });

  it('does not throw when publishCommand fails (non-blocking)', async () => {
    mockPublishCommand.mockRejectedValue(new Error('MQTT not connected'));

    await expect(handleSurge(MOCK_DEVICE, SURGE_PAYLOAD)).resolves.toBeUndefined();
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it('skips owner-dependent side effects when owner is null', async () => {
    mockGetOwnerProfileForDevice.mockResolvedValue(null);

    await handleSurge(MOCK_DEVICE, SURGE_PAYLOAD);

    expect(mockNotifyThreat).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
    // Non-owner side effects still fire
    expect(mockInsertEvent).toHaveBeenCalled();
    expect(mockEmitToDevice).toHaveBeenCalled();
    expect(mockPublishCommand).toHaveBeenCalled();
  });
});
