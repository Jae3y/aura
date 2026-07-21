"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockUpdateLastSeen, mockUpdateDeviceStatus, mockGetOwnerProfileForDevice, mockSendAlert, mockBuildOfflinePayload, mockNotifyOffline, mockEmitToDevice, mockCaptureException, } = vitest_1.vi.hoisted(() => ({
    mockUpdateLastSeen: vitest_1.vi.fn(),
    mockUpdateDeviceStatus: vitest_1.vi.fn(),
    mockGetOwnerProfileForDevice: vitest_1.vi.fn(),
    mockSendAlert: vitest_1.vi.fn(),
    mockBuildOfflinePayload: vitest_1.vi.fn(),
    mockNotifyOffline: vitest_1.vi.fn(),
    mockEmitToDevice: vitest_1.vi.fn(),
    mockCaptureException: vitest_1.vi.fn(),
}));
// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vitest_1.vi.mock('@sentry/node', () => ({
    init: vitest_1.vi.fn(),
    captureException: mockCaptureException,
    setUser: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../lib/db/devices', () => ({
    updateLastSeen: mockUpdateLastSeen,
    updateDeviceStatus: mockUpdateDeviceStatus,
}));
vitest_1.vi.mock('../lib/db/profiles', () => ({
    getOwnerProfileForDevice: mockGetOwnerProfileForDevice,
}));
vitest_1.vi.mock('../services/alerta', () => ({
    sendAlert: mockSendAlert,
    buildOfflinePayload: mockBuildOfflinePayload,
}));
vitest_1.vi.mock('../services/notify', () => ({
    notifyOffline: mockNotifyOffline,
}));
vitest_1.vi.mock('../socket', () => ({
    emitToDevice: mockEmitToDevice,
}));
vitest_1.vi.mock('../socket/events', () => ({
    SOCKET_EVENTS: {
        DEVICE_ONLINE: 'device:online',
        DEVICE_OFFLINE: 'device:offline',
    },
}));
// ---------------------------------------------------------------------------
// Import handler AFTER mocks
// ---------------------------------------------------------------------------
const heartbeatHandler_1 = require("../handlers/heartbeatHandler");
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_DEVICE = {
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
    environment_type: 'home',
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
(0, vitest_1.describe)('handleHeartbeat — core behavior', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.useFakeTimers();
        mockUpdateLastSeen.mockResolvedValue(undefined);
        mockEmitToDevice.mockImplementation(() => { });
    });
    (0, vitest_1.afterEach)(() => {
        (0, heartbeatHandler_1.clearWatchdog)(MOCK_DEVICE.id);
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)('calls updateLastSeen with the device id', async () => {
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        (0, vitest_1.expect)(mockUpdateLastSeen).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockUpdateLastSeen).toHaveBeenCalledWith('device-uuid-hb-001');
    });
    (0, vitest_1.it)('emits device:online via Socket.io with the device id', async () => {
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalledWith('device-uuid-hb-001', 'device:online', vitest_1.expect.objectContaining({ deviceId: 'device-uuid-hb-001' }));
    });
    (0, vitest_1.it)('does NOT trigger offline declaration when watchdog is active', async () => {
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
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        // Advance time less than the offline timeout (90s)
        vitest_1.vi.advanceTimersByTime(50_000);
        // No offline side effects should have fired
        (0, vitest_1.expect)(mockUpdateDeviceStatus).not.toHaveBeenCalled();
        (0, vitest_1.expect)(mockSendAlert).not.toHaveBeenCalled();
        (0, vitest_1.expect)(mockNotifyOffline).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('repeated heartbeats reset the watchdog — no offline after cumulative time', async () => {
        mockUpdateDeviceStatus.mockResolvedValue(undefined);
        // First heartbeat at t=0
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        // Second heartbeat at t=60s (within the 90s window)
        vitest_1.vi.advanceTimersByTime(60_000);
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        // Third heartbeat at t=120s (still within 90s of the last one)
        vitest_1.vi.advanceTimersByTime(60_000);
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        // Now advance 80s — less than 90s since last heartbeat
        vitest_1.vi.advanceTimersByTime(80_000);
        (0, vitest_1.expect)(mockUpdateDeviceStatus).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('clearWatchdog cancels the offline declaration', async () => {
        mockUpdateDeviceStatus.mockResolvedValue(undefined);
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        // Clear the watchdog before timeout
        (0, heartbeatHandler_1.clearWatchdog)('device-uuid-hb-001');
        // Advance past the offline timeout
        vitest_1.vi.advanceTimersByTime(100_000);
        (0, vitest_1.expect)(mockUpdateDeviceStatus).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('clearWatchdog is safe to call with unknown id', async () => {
        (0, vitest_1.expect)(() => (0, heartbeatHandler_1.clearWatchdog)('nonexistent-id')).not.toThrow();
    });
});
(0, vitest_1.describe)('declareOffline — triggered by watchdog expiry', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.useFakeTimers();
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
        mockEmitToDevice.mockImplementation(() => { });
    });
    (0, vitest_1.afterEach)(() => {
        (0, heartbeatHandler_1.clearWatchdog)(MOCK_DEVICE.id);
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)('declares device offline after watchdog expires', async () => {
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        // Advance past the 90s offline timeout
        vitest_1.vi.advanceTimersByTime(91_000);
        // Wait for microtask queue to flush
        await vitest_1.vi.advanceTimersByTimeAsync(0);
        (0, vitest_1.expect)(mockUpdateDeviceStatus).toHaveBeenCalledWith('device-uuid-hb-001', false);
    });
    (0, vitest_1.it)('emits device:offline via Socket.io', async () => {
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        vitest_1.vi.advanceTimersByTime(91_000);
        await vitest_1.vi.advanceTimersByTimeAsync(0);
        (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalledWith('device-uuid-hb-001', 'device:offline', vitest_1.expect.objectContaining({ deviceId: 'device-uuid-hb-001' }));
    });
    (0, vitest_1.it)('sends Alerta offline alert', async () => {
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        vitest_1.vi.advanceTimersByTime(91_000);
        await vitest_1.vi.advanceTimersByTimeAsync(0);
        (0, vitest_1.expect)(mockBuildOfflinePayload).toHaveBeenCalledWith(MOCK_DEVICE);
        (0, vitest_1.expect)(mockSendAlert).toHaveBeenCalled();
    });
    (0, vitest_1.it)('sends FCM push to owner via notifyOffline', async () => {
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        vitest_1.vi.advanceTimersByTime(91_000);
        await vitest_1.vi.advanceTimersByTimeAsync(0);
        (0, vitest_1.expect)(mockGetOwnerProfileForDevice).toHaveBeenCalledWith('device-uuid-hb-001');
        (0, vitest_1.expect)(mockNotifyOffline).toHaveBeenCalledWith(MOCK_OWNER, MOCK_DEVICE);
    });
    (0, vitest_1.it)('skips notifyOffline when owner is null', async () => {
        mockGetOwnerProfileForDevice.mockResolvedValue(null);
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        vitest_1.vi.advanceTimersByTime(91_000);
        await vitest_1.vi.advanceTimersByTimeAsync(0);
        (0, vitest_1.expect)(mockNotifyOffline).not.toHaveBeenCalled();
        // Other offline side effects still fire
        (0, vitest_1.expect)(mockUpdateDeviceStatus).toHaveBeenCalled();
        (0, vitest_1.expect)(mockSendAlert).toHaveBeenCalled();
    });
    (0, vitest_1.it)('captures Sentry error when declareOffline throws', async () => {
        mockUpdateDeviceStatus.mockRejectedValue(new Error('DB connection lost'));
        await (0, heartbeatHandler_1.handleHeartbeat)(MOCK_DEVICE, {});
        vitest_1.vi.advanceTimersByTime(91_000);
        await vitest_1.vi.advanceTimersByTimeAsync(0);
        (0, vitest_1.expect)(mockCaptureException).toHaveBeenCalled();
    });
});
//# sourceMappingURL=heartbeat.integration.test.js.map