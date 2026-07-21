"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockInsertEvent, mockCreateNotification, mockGetOwnerProfileForDevice, mockEnqueueSolanaEvent, mockSendAlert, mockBuildSurgePayload, mockNotifyThreat, mockPublishCommand, mockEmitToDevice, mockUpdateAlertaStatus, mockCaptureException, } = vitest_1.vi.hoisted(() => ({
    mockInsertEvent: vitest_1.vi.fn(),
    mockCreateNotification: vitest_1.vi.fn(),
    mockGetOwnerProfileForDevice: vitest_1.vi.fn(),
    mockEnqueueSolanaEvent: vitest_1.vi.fn(),
    mockSendAlert: vitest_1.vi.fn(),
    mockBuildSurgePayload: vitest_1.vi.fn(),
    mockNotifyThreat: vitest_1.vi.fn(),
    mockPublishCommand: vitest_1.vi.fn(),
    mockEmitToDevice: vitest_1.vi.fn(),
    mockUpdateAlertaStatus: vitest_1.vi.fn(),
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
vitest_1.vi.mock('../lib/db/threat_events', () => ({
    insertEvent: mockInsertEvent,
    updateAlertaStatus: mockUpdateAlertaStatus,
}));
vitest_1.vi.mock('../lib/db/notifications', () => ({
    createNotification: mockCreateNotification,
}));
vitest_1.vi.mock('../lib/db/profiles', () => ({
    getOwnerProfileForDevice: mockGetOwnerProfileForDevice,
}));
vitest_1.vi.mock('../blockchain/solanaQueue', () => ({
    enqueueSolanaEvent: mockEnqueueSolanaEvent,
}));
vitest_1.vi.mock('../blockchain/events', () => ({
    AURA_SOLANA_EVENTS: {
        SURGE_DETECTED: 'SURGE_DETECTED',
    },
}));
vitest_1.vi.mock('../services/alerta', () => ({
    sendAlert: mockSendAlert,
    buildSurgePayload: mockBuildSurgePayload,
}));
vitest_1.vi.mock('../services/notify', () => ({
    notifyThreat: mockNotifyThreat,
}));
vitest_1.vi.mock('../services/mqtt', () => ({
    publishCommand: mockPublishCommand,
}));
vitest_1.vi.mock('../socket', () => ({
    emitToDevice: mockEmitToDevice,
}));
vitest_1.vi.mock('../socket/events', () => ({
    SOCKET_EVENTS: {
        THREAT_NEW: 'threat:new',
    },
}));
// ---------------------------------------------------------------------------
// Import handler AFTER mocks
// ---------------------------------------------------------------------------
const surgeHandler_1 = require("../handlers/surgeHandler");
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_DEVICE = {
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
const MOCK_EVENT = {
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
    environment_type: 'home',
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
    severity: 'high',
    relayChannel: 1,
    actionTaken: 'relay_cutoff',
};
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(0, vitest_1.describe)('handleSurge — full pipeline (Property 6)', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockInsertEvent.mockResolvedValue(MOCK_EVENT);
        mockEnqueueSolanaEvent.mockImplementation(() => { });
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
    (0, vitest_1.it)('inserts a threat_events row with correct fields', async () => {
        await (0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD);
        (0, vitest_1.expect)(mockInsertEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockInsertEvent).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            device_id: 'device-uuid-abc',
            event_type: 'surge',
            severity: 'high',
            voltage_at_event: 285.4,
            current_at_event: 14.2,
            action_taken: 'relay_cutoff',
            relay_triggered: true,
            relay_channel: 1,
        }));
    });
    (0, vitest_1.it)('enqueues a Solana memo write with correct table/rowId/eventName', async () => {
        await (0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD);
        (0, vitest_1.expect)(mockEnqueueSolanaEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockEnqueueSolanaEvent).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            table: 'threat_events',
            rowId: MOCK_EVENT.id,
            eventName: 'SURGE_DETECTED',
        }));
    });
    (0, vitest_1.it)('sends Alerta Telegram notification via buildSurgePayload + sendAlert', async () => {
        await (0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD);
        (0, vitest_1.expect)(mockBuildSurgePayload).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockBuildSurgePayload).toHaveBeenCalledWith(MOCK_EVENT, MOCK_DEVICE);
        (0, vitest_1.expect)(mockSendAlert).toHaveBeenCalledOnce();
    });
    (0, vitest_1.it)('updates alerta_status to open when sendAlert returns a requestRef', async () => {
        await (0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD);
        (0, vitest_1.expect)(mockUpdateAlertaStatus).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockUpdateAlertaStatus).toHaveBeenCalledWith(MOCK_EVENT.id, 'ALT-7777', 'open');
    });
    (0, vitest_1.it)('creates an in-app notification for the owner', async () => {
        await (0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD);
        (0, vitest_1.expect)(mockCreateNotification).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockCreateNotification).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            user_id: 'user-uuid-001',
            threat_event_id: MOCK_EVENT.id,
            type: 'push',
            title: vitest_1.expect.stringContaining('Surge'),
            body: vitest_1.expect.stringContaining('285.4'),
        }));
    });
    (0, vitest_1.it)('emits threat:new via Socket.io to the device', async () => {
        await (0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD);
        (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalledWith('device-uuid-abc', 'threat:new', vitest_1.expect.objectContaining({ event: MOCK_EVENT }));
    });
    (0, vitest_1.it)('publishes relay_off command back to the device via MQTT', async () => {
        await (0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD);
        (0, vitest_1.expect)(mockPublishCommand).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockPublishCommand).toHaveBeenCalledWith('device-uuid-abc', vitest_1.expect.objectContaining({
            command: 'relay_off',
            channel: 1,
            requestedBy: 'aura-auto',
        }));
    });
    (0, vitest_1.it)('sends FCM push notification via notifyThreat', async () => {
        await (0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD);
        (0, vitest_1.expect)(mockNotifyThreat).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(mockNotifyThreat).toHaveBeenCalledWith(MOCK_OWNER, MOCK_EVENT, MOCK_DEVICE);
    });
    (0, vitest_1.it)('does not throw when publishCommand fails (non-blocking)', async () => {
        mockPublishCommand.mockRejectedValue(new Error('MQTT not connected'));
        await (0, vitest_1.expect)((0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD)).resolves.toBeUndefined();
        (0, vitest_1.expect)(mockCaptureException).toHaveBeenCalled();
    });
    (0, vitest_1.it)('skips owner-dependent side effects when owner is null', async () => {
        mockGetOwnerProfileForDevice.mockResolvedValue(null);
        await (0, surgeHandler_1.handleSurge)(MOCK_DEVICE, SURGE_PAYLOAD);
        (0, vitest_1.expect)(mockNotifyThreat).not.toHaveBeenCalled();
        (0, vitest_1.expect)(mockCreateNotification).not.toHaveBeenCalled();
        // Non-owner side effects still fire
        (0, vitest_1.expect)(mockInsertEvent).toHaveBeenCalled();
        (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalled();
        (0, vitest_1.expect)(mockPublishCommand).toHaveBeenCalled();
    });
});
//# sourceMappingURL=surge-handler.integration.test.js.map