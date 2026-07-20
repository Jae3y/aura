/**
 * Integration test: Heartbeat handler + watchdog
 *
 * Validates:
 *   1. handleHeartbeat updates last_seen and emits device:online
 *   2. Watchdog: repeated heartbeats reset the offline timer
 *   3. Watchdog: clearWatchdog cancels the offline declaration
 *   4. declareOffline: sets device offline, emits device:offline, sends Alerta, pushes FCM
 *
 * Strategy:
 *  - Import handleHeartbeat and clearWatchdog directly.
 *  - Mock timers to control watchdog expiration.
 *  - Mock all DB and external service calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockUpdateLastSeen,
  mockUpdateDeviceStatus,
  mockGetOwnerProfileForDevice,
  mockSendAlert,
  mockBuildOfflinePayload,
  mockNotifyOffline,
  mockEmitToDevice,
  mockCaptureException,
} = vi.hoisted(() => ({
  mockUpdateLastSeen: vi.fn(),
  mockUpdateDeviceStatus: vi.fn(),
  mockGetOwnerProfileForDevice: vi.fn(),
  mockSendAlert: vi.fn(),
  mockBuildOfflinePayload: vi.fn(),
  mockNotifyOffline: vi.fn(),
  mockEmitToDevice: vi.fn(),
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

vi.mock('../lib/db/devices', () => ({
  updateLastSeen: mockUpdateLastSeen,
  updateDeviceStatus: mockUpdateDeviceStatus,
}));

vi.mock('../lib/db/profiles', () => ({
  getOwnerProfileForDevice: mockGetOwnerProfileForDevice,
}));

vi.mock('../services/alerta', () => ({
  sendAlert: mockSendAlert,
  buildOfflinePayload: mockBuildOfflinePayload,
}));

vi.mock('../services/notify', () => ({
  notifyOffline: mockNotifyOffline,
}));

vi.mock('../socket', () => ({
  emitToDevice: mockEmitToDevice,
}));

vi.mock('../socket/events', () => ({
  SOCKET_EVENTS: {
    DEVICE_ONLINE: 'device:online',
    DEVICE_OFFLINE: 'device:offline',
  },
}));

// ---------------------------------------------------------------------------
// Import handler AFTER mocks
// ---------------------------------------------------------------------------

import { handleHeartbeat, clearWatchdog } from '../handlers/heartbeatHandler';
import type { Device } from '../types/database';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_DEVICE: Device = {
  id: 'device-uuid-hb-001',
  user_id: 'user-uuid-001',
  name: 'Kitchen Node',
  device_token: 'tok_test_hb_123456',
  firmware_version: '1.0.0',
  environment_type: 'home',
  is_online: true,
  last_seen: new Date().toISOString(),
  voltage_threshold_min: 180,
  voltage_threshold_max: 260,
  surge_sensitivity: 'medium',
  location_label: 'Kitchen',
  nft_mint_address: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_OWNER = {
  id: 'user-uuid-001',
  full_name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
  environment_type: 'home' as const,
  wallet_address: null,
  lisk_wallet_address: null,
  fcm_token: 'fcm-token-hb',
  notification_email: true,
  notification_push: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleHeartbeat — core behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockUpdateLastSeen.mockResolvedValue(undefined);
    mockEmitToDevice.mockImplementation(() => {});
  });

  afterEach(() => {
    clearWatchdog(MOCK_DEVICE.id);
    vi.useRealTimers();
  });

  it('calls updateLastSeen with the device id', async () => {
    await handleHeartbeat(MOCK_DEVICE, {});

    expect(mockUpdateLastSeen).toHaveBeenCalledOnce();
    expect(mockUpdateLastSeen).toHaveBeenCalledWith('device-uuid-hb-001');
  });

  it('emits device:online via Socket.io with the device id', async () => {
    await handleHeartbeat(MOCK_DEVICE, {});

    expect(mockEmitToDevice).toHaveBeenCalledOnce();
    expect(mockEmitToDevice).toHaveBeenCalledWith(
      'device-uuid-hb-001',
      'device:online',
      expect.objectContaining({ deviceId: 'device-uuid-hb-001' })
    );
  });

  it('does NOT trigger offline declaration when watchdog is active', async () => {
    mockUpdateDeviceStatus.mockResolvedValue(undefined);
    mockSendAlert.mockResolvedValue({ success: true });
    mockBuildOfflinePayload.mockReturnValue({
      channelRef: 'TG_ALT_TEST',
      title: 'Offline',
      message: 'test',
      severity: 'High',
    });
    mockGetOwnerProfileForDevice.mockResolvedValue(MOCK_OWNER);
    mockNotifyOffline.mockResolvedValue(true);

    // First heartbeat arms the watchdog
    await handleHeartbeat(MOCK_DEVICE, {});

    // Advance time less than the offline timeout (90s)
    vi.advanceTimersByTime(50_000);

    // No offline side effects should have fired
    expect(mockUpdateDeviceStatus).not.toHaveBeenCalled();
    expect(mockSendAlert).not.toHaveBeenCalled();
    expect(mockNotifyOffline).not.toHaveBeenCalled();
  });

  it('repeated heartbeats reset the watchdog — no offline after cumulative time', async () => {
    mockUpdateDeviceStatus.mockResolvedValue(undefined);

    // First heartbeat at t=0
    await handleHeartbeat(MOCK_DEVICE, {});
    // Second heartbeat at t=60s (within the 90s window)
    vi.advanceTimersByTime(60_000);
    await handleHeartbeat(MOCK_DEVICE, {});
    // Third heartbeat at t=120s (still within 90s of the last one)
    vi.advanceTimersByTime(60_000);
    await handleHeartbeat(MOCK_DEVICE, {});
    // Now advance 80s — less than 90s since last heartbeat
    vi.advanceTimersByTime(80_000);

    expect(mockUpdateDeviceStatus).not.toHaveBeenCalled();
  });

  it('clearWatchdog cancels the offline declaration', async () => {
    mockUpdateDeviceStatus.mockResolvedValue(undefined);

    await handleHeartbeat(MOCK_DEVICE, {});

    // Clear the watchdog before timeout
    clearWatchdog('device-uuid-hb-001');

    // Advance past the offline timeout
    vi.advanceTimersByTime(100_000);

    expect(mockUpdateDeviceStatus).not.toHaveBeenCalled();
  });

  it('clearWatchdog is safe to call with unknown id', async () => {
    expect(() => clearWatchdog('nonexistent-id')).not.toThrow();
  });
});

describe('declareOffline — triggered by watchdog expiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockUpdateLastSeen.mockResolvedValue(undefined);
    mockUpdateDeviceStatus.mockResolvedValue(undefined);
    mockSendAlert.mockResolvedValue({ success: true });
    mockBuildOfflinePayload.mockReturnValue({
      channelRef: 'TG_ALT_TEST',
      title: 'Device Offline',
      message: 'test',
      severity: 'High',
    });
    mockGetOwnerProfileForDevice.mockResolvedValue(MOCK_OWNER);
    mockNotifyOffline.mockResolvedValue(true);
    mockEmitToDevice.mockImplementation(() => {});
  });

  afterEach(() => {
    clearWatchdog(MOCK_DEVICE.id);
    vi.useRealTimers();
  });

  it('declares device offline after watchdog expires', async () => {
    await handleHeartbeat(MOCK_DEVICE, {});

    // Advance past the 90s offline timeout
    vi.advanceTimersByTime(91_000);

    // Wait for microtask queue to flush
    await vi.advanceTimersByTimeAsync(0);

    expect(mockUpdateDeviceStatus).toHaveBeenCalledWith('device-uuid-hb-001', false);
  });

  it('emits device:offline via Socket.io', async () => {
    await handleHeartbeat(MOCK_DEVICE, {});

    vi.advanceTimersByTime(91_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(mockEmitToDevice).toHaveBeenCalledWith(
      'device-uuid-hb-001',
      'device:offline',
      expect.objectContaining({ deviceId: 'device-uuid-hb-001' })
    );
  });

  it('sends Alerta offline alert', async () => {
    await handleHeartbeat(MOCK_DEVICE, {});

    vi.advanceTimersByTime(91_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(mockBuildOfflinePayload).toHaveBeenCalledWith(MOCK_DEVICE);
    expect(mockSendAlert).toHaveBeenCalled();
  });

  it('sends FCM push to owner via notifyOffline', async () => {
    await handleHeartbeat(MOCK_DEVICE, {});

    vi.advanceTimersByTime(91_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(mockGetOwnerProfileForDevice).toHaveBeenCalledWith('device-uuid-hb-001');
    expect(mockNotifyOffline).toHaveBeenCalledWith(MOCK_OWNER, MOCK_DEVICE);
  });

  it('skips notifyOffline when owner is null', async () => {
    mockGetOwnerProfileForDevice.mockResolvedValue(null);

    await handleHeartbeat(MOCK_DEVICE, {});

    vi.advanceTimersByTime(91_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(mockNotifyOffline).not.toHaveBeenCalled();
    // Other offline side effects still fire
    expect(mockUpdateDeviceStatus).toHaveBeenCalled();
    expect(mockSendAlert).toHaveBeenCalled();
  });

  it('captures Sentry error when declareOffline throws', async () => {
    mockUpdateDeviceStatus.mockRejectedValue(new Error('DB connection lost'));

    await handleHeartbeat(MOCK_DEVICE, {});

    vi.advanceTimersByTime(91_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(mockCaptureException).toHaveBeenCalled();
  });
});
