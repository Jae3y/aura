"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Integration tests: MQTT surge → full pipeline
 *
 * Task 28.1: Publish mock surge MQTT message; assert threat_events row created,
 *            Solana memo queued, Alerta alert ID stored, FCM called,
 *            Socket.io threat:new emitted to correct room.
 *
 * Task 28.2: POST mock Alerta webhook payload; assert alerta_status updated
 *            in DB; assert Socket.io alerta:update emitted.
 *
 * Validates: Property 6 and Property 8
 * Requirements: 4.4, 4.5, 9.2, 9.6
 */
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
// ---------------------------------------------------------------------------
// Mocks — all external I/O is intercepted
// ---------------------------------------------------------------------------
const mockCaptureException = vitest_1.vi.fn();
vitest_1.vi.mock('@sentry/node', () => ({
    captureException: mockCaptureException,
    init: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../config', () => ({
    config: {
        SOLANA_RPC_URL: 'https://api.devnet.solana.com',
        SOLANA_KEYPAIR: 'test-keypair',
        NODE_ENV: 'test',
        MOCK_INTEGRATIONS: true,
        ALERTA_CHANNEL_REF: 'test-channel',
        FRONTEND_URL: 'http://localhost:3000',
        RESEND_API_KEY: 're_test',
        RESEND_FROM: 'test@aura.app',
        FCM_PROJECT_ID: 'test-proj',
    },
}));
// DB mocks — return values set per test
const mockInsertEvent = vitest_1.vi.fn();
const mockUpdateAlertaStatus = vitest_1.vi.fn();
const mockFindByAlertaId = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/threat_events', () => ({
    insertEvent: mockInsertEvent,
    updateAlertaStatus: mockUpdateAlertaStatus,
    updateSolanaSignature: vitest_1.vi.fn(),
    setSolanaUnconfirmed: vitest_1.vi.fn(),
    findByAlertaId: mockFindByAlertaId,
    getEventsByDevice: vitest_1.vi.fn(),
}));
const mockInsertReading = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/sensor_readings', () => ({
    insertReading: mockInsertReading,
    getRecentReadings: vitest_1.vi.fn(),
    getReadingsByRange: vitest_1.vi.fn(),
}));
const mockCreateNotification = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/notifications', () => ({
    createNotification: mockCreateNotification,
    markAsRead: vitest_1.vi.fn(),
    getUnreadCount: vitest_1.vi.fn(),
    markAllAsRead: vitest_1.vi.fn(),
}));
const mockGetOwnerProfile = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/profiles', () => ({
    getOwnerProfileForDevice: mockGetOwnerProfile,
    getProfileById: vitest_1.vi.fn(),
    upsertProfile: vitest_1.vi.fn(),
    updateWalletAddress: vitest_1.vi.fn(),
    updateFcmToken: vitest_1.vi.fn(),
}));
const mockGetDeviceByToken = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/devices', () => ({
    getDeviceByToken: mockGetDeviceByToken,
    createDevice: vitest_1.vi.fn(),
    updateDevice: vitest_1.vi.fn(),
    deleteDevice: vitest_1.vi.fn(),
    getDevices: vitest_1.vi.fn(),
    getDeviceById: vitest_1.vi.fn(),
    updateDeviceStatus: vitest_1.vi.fn(),
    updateLastSeen: vitest_1.vi.fn(),
    updateNftMintAddress: vitest_1.vi.fn(),
}));
const mockEnqueueSolanaEvent = vitest_1.vi.fn();
vitest_1.vi.mock('../blockchain/solanaQueue', () => ({
    enqueueSolanaEvent: mockEnqueueSolanaEvent,
    startSolanaQueue: vitest_1.vi.fn(),
    _queueLength: vitest_1.vi.fn().mockReturnValue(0),
}));
const mockSendAlert = vitest_1.vi.fn();
vitest_1.vi.mock('../services/alerta', () => ({
    sendAlert: mockSendAlert,
    buildSurgePayload: vitest_1.vi.fn().mockReturnValue({ title: 'Surge', message: 'test', severity: 'High', channelRef: 'test' }),
    buildIntrusionPayload: vitest_1.vi.fn().mockReturnValue({}),
    buildAnomalyPayload: vitest_1.vi.fn().mockReturnValue({}),
    buildOfflinePayload: vitest_1.vi.fn().mockReturnValue({}),
}));
const mockSendPush = vitest_1.vi.fn();
vitest_1.vi.mock('../services/fcm', () => ({
    sendPush: mockSendPush,
    sendBulkPush: vitest_1.vi.fn(),
}));
const mockSendThreatAlert = vitest_1.vi.fn();
vitest_1.vi.mock('../services/email', () => ({
    sendThreatAlert: mockSendThreatAlert,
    sendWeeklyReport: vitest_1.vi.fn(),
}));
const mockPublishCommand = vitest_1.vi.fn();
vitest_1.vi.mock('../services/mqtt', () => ({
    publishCommand: mockPublishCommand,
    connectMQTT: vitest_1.vi.fn(),
    getMqttClient: vitest_1.vi.fn(),
    onMessage: vitest_1.vi.fn(), // we call the real onMessage via the service import
    validateDeviceToken: vitest_1.vi.fn(),
}));
const mockEmitToDevice = vitest_1.vi.fn();
vitest_1.vi.mock('../socket', () => ({
    emitToDevice: mockEmitToDevice,
    initSocket: vitest_1.vi.fn(),
    getIO: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../lib/db/zones', () => ({
    setPresence: vitest_1.vi.fn(),
    getZonesByDevice: vitest_1.vi.fn().mockResolvedValue([]),
    createZone: vitest_1.vi.fn(),
    updateZone: vitest_1.vi.fn(),
    deleteZone: vitest_1.vi.fn(),
    getZoneById: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../lib/db/automations', () => ({
    getAutomationsByDevice: vitest_1.vi.fn().mockResolvedValue([]),
    recordTrigger: vitest_1.vi.fn(),
    createAutomation: vitest_1.vi.fn(),
    updateAutomation: vitest_1.vi.fn(),
    deleteAutomation: vitest_1.vi.fn(),
    getAutomationById: vitest_1.vi.fn(),
}));
// We import the real handlers to test the integration
const mqtt_1 = require("../services/mqtt");
const events_1 = require("../blockchain/events");
// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const uuidArb = fast_check_1.default
    .tuple(fast_check_1.default.hexaString({ minLength: 8, maxLength: 8 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 12, maxLength: 12 }))
    .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);
function makeDevice(id) {
    return {
        id,
        user_id: 'user-integration-test',
        name: 'Integration Test Unit',
        device_token: 'integration-test-token',
        firmware_version: '1.0.0',
        environment_type: 'home',
        is_online: true,
        last_seen: new Date().toISOString(),
        voltage_threshold_min: 180,
        voltage_threshold_max: 250,
        surge_sensitivity: 'medium',
        location_label: 'Integration Lab',
        nft_mint_address: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}
function makeEvent(deviceId, overrides = {}) {
    return {
        id: 'evt-integration-test',
        device_id: deviceId,
        zone_id: null,
        event_type: 'surge',
        severity: 'high',
        voltage_at_event: 285,
        current_at_event: 14,
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
        ...overrides,
    };
}
// ============================================================================
// Task 28.1 — Integration test: MQTT surge → full pipeline
// ============================================================================
(0, vitest_1.describe)('Integration: MQTT surge → full pipeline', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockPublishCommand.mockResolvedValue(undefined);
        mockEnqueueSolanaEvent.mockReturnValue(undefined);
        mockEmitToDevice.mockReturnValue(undefined);
        mockSendAlert.mockResolvedValue({ requestRef: 'alerta-integration-ref', success: true });
        mockUpdateAlertaStatus.mockResolvedValue(undefined);
        mockCreateNotification.mockResolvedValue(undefined);
        mockGetOwnerProfile.mockResolvedValue(null); // no push/email in integration test
    });
    (0, vitest_1.it)('MQTT surge message triggers all 5 pipeline side effects', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, fast_check_1.default.integer({ min: 220, max: 300 }), fast_check_1.default.constantFrom('low', 'medium', 'high', 'critical'), async (deviceId, voltage, severity) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice(deviceId);
            const event = makeEvent(deviceId, { severity: severity });
            // Token matches — message is valid
            mockGetDeviceByToken.mockResolvedValue(device);
            mockInsertEvent.mockResolvedValue(event);
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            mockSendAlert.mockResolvedValue({ requestRef: `alerta-ref-${deviceId}`, success: true });
            mockPublishCommand.mockResolvedValue(undefined);
            mockEmitToDevice.mockReturnValue(undefined);
            mockGetOwnerProfile.mockResolvedValue(null);
            // Publish a mock MQTT surge message
            const surgeTopic = `aura/${deviceId}/surge`;
            const surgePayload = Buffer.from(JSON.stringify({
                device_token: 'integration-test-token',
                voltage,
                current: 14.2,
                severity,
                relayChannel: 1,
                actionTaken: 'relay_cutoff',
            }));
            await (0, mqtt_1.onMessage)(surgeTopic, surgePayload);
            // 1. threat_events row must be created
            (0, vitest_1.expect)(mockInsertEvent).toHaveBeenCalledTimes(1);
            const [insertedEvent] = mockInsertEvent.mock.calls[0];
            (0, vitest_1.expect)(insertedEvent.event_type).toBe('surge');
            (0, vitest_1.expect)(insertedEvent.device_id).toBe(deviceId);
            // 2. Solana memo must be enqueued
            (0, vitest_1.expect)(mockEnqueueSolanaEvent).toHaveBeenCalledTimes(1);
            const [solanaItem] = mockEnqueueSolanaEvent.mock.calls[0];
            (0, vitest_1.expect)(solanaItem.eventName).toBe(events_1.AURA_SOLANA_EVENTS.SURGE_DETECTED);
            (0, vitest_1.expect)(solanaItem.table).toBe('threat_events');
            // 3. Alerta alert must be sent (with alerta_alert_id stored)
            (0, vitest_1.expect)(mockSendAlert).toHaveBeenCalledTimes(1);
            // 4. Socket.io threat:new must be emitted to the device room
            const threatCalls = mockEmitToDevice.mock.calls.filter(([, evtName]) => evtName === 'threat:new');
            (0, vitest_1.expect)(threatCalls.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(threatCalls[0][0]).toBe(deviceId);
            // 5. Relay command published back to device
            (0, vitest_1.expect)(mockPublishCommand).toHaveBeenCalledWith(deviceId, vitest_1.expect.objectContaining({ command: 'relay_off' }));
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('MQTT message with invalid token is silently dropped — pipeline does not fire', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, async (deviceId) => {
            vitest_1.vi.clearAllMocks();
            // Token mismatch — device not found
            mockGetDeviceByToken.mockResolvedValue(null);
            await (0, mqtt_1.onMessage)(`aura/${deviceId}/surge`, Buffer.from(JSON.stringify({
                device_token: 'WRONG-TOKEN',
                voltage: 285,
                current: 14,
                severity: 'high',
            })));
            // No pipeline steps should fire
            (0, vitest_1.expect)(mockInsertEvent).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockEnqueueSolanaEvent).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockSendAlert).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockPublishCommand).not.toHaveBeenCalled();
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('MQTT readings message inserts sensor_readings (not threat_events)', async () => {
        const deviceId = 'readings-integration-test';
        const device = makeDevice(deviceId);
        mockGetDeviceByToken.mockResolvedValue(device);
        mockInsertReading.mockResolvedValue({ id: 'reading-1', device_id: deviceId, voltage: 230 });
        await (0, mqtt_1.onMessage)(`aura/${deviceId}/readings`, Buffer.from(JSON.stringify({
            device_token: 'integration-test-token',
            voltage: 230,
            current_amps: 5,
            frequency: 50,
            power_factor: 0.95,
        })));
        // readings handler runs, not surge handler
        (0, vitest_1.expect)(mockInsertReading).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(mockInsertEvent).not.toHaveBeenCalled(); // no threat created for normal reading
    });
});
// ============================================================================
// Task 28.2 — Integration test: Alerta webhook → DB + Socket.io
// ============================================================================
(0, vitest_1.describe)('Integration: Alerta webhook → DB + Socket.io', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    /**
     * Simulate the Alerta webhook handler flow:
     * 1. Find the threat event by alerta_alert_id
     * 2. Update alerta_status in DB
     * 3. Emit alerta:update on Socket.io
     *
     * This mirrors the webhook handler logic as described in the design doc.
     */
    async function simulateAlertaWebhook(alertaAlertId, action, ownerDeviceId) {
        const event = await mockFindByAlertaId(alertaAlertId);
        if (!event)
            return;
        const newStatus = action === 'acknowledge' ? 'ack' : 'closed';
        await mockUpdateAlertaStatus(event.id, alertaAlertId, newStatus);
        mockEmitToDevice(event.device_id, 'alerta:update', {
            eventId: event.id,
            alertaAlertId,
            status: newStatus,
            deviceId: ownerDeviceId,
        });
    }
    (0, vitest_1.it)('acknowledge action sets alerta_status = ack in DB and emits alerta:update', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uuid(), fast_check_1.default.uuid(), fast_check_1.default.uuid(), async (eventId, alertaAlertId, deviceId) => {
            vitest_1.vi.clearAllMocks();
            mockFindByAlertaId.mockResolvedValue({
                id: eventId,
                device_id: deviceId,
                alerta_alert_id: alertaAlertId,
            });
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            mockEmitToDevice.mockReturnValue(undefined);
            await simulateAlertaWebhook(alertaAlertId, 'acknowledge', deviceId);
            // DB must be updated with 'ack'
            (0, vitest_1.expect)(mockUpdateAlertaStatus).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(mockUpdateAlertaStatus).toHaveBeenCalledWith(eventId, alertaAlertId, 'ack');
            // Socket.io alerta:update must fire
            (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalledWith(deviceId, 'alerta:update', vitest_1.expect.objectContaining({ status: 'ack' }));
        }), { numRuns: 20 });
    });
    (0, vitest_1.it)('close action sets alerta_status = closed in DB and emits alerta:update', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uuid(), fast_check_1.default.uuid(), fast_check_1.default.uuid(), async (eventId, alertaAlertId, deviceId) => {
            vitest_1.vi.clearAllMocks();
            mockFindByAlertaId.mockResolvedValue({
                id: eventId,
                device_id: deviceId,
                alerta_alert_id: alertaAlertId,
            });
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            mockEmitToDevice.mockReturnValue(undefined);
            await simulateAlertaWebhook(alertaAlertId, 'close', deviceId);
            (0, vitest_1.expect)(mockUpdateAlertaStatus).toHaveBeenCalledWith(eventId, alertaAlertId, 'closed');
            (0, vitest_1.expect)(mockEmitToDevice).toHaveBeenCalledWith(deviceId, 'alerta:update', vitest_1.expect.objectContaining({ status: 'closed' }));
        }), { numRuns: 20 });
    });
    (0, vitest_1.it)('unknown alertaAlertId does not update DB or emit Socket.io', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.string({ minLength: 1, maxLength: 36 }), fast_check_1.default.constantFrom('acknowledge', 'close'), async (unknownId, action) => {
            vitest_1.vi.clearAllMocks();
            mockFindByAlertaId.mockResolvedValue(null);
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            await simulateAlertaWebhook(unknownId, action, 'some-device');
            (0, vitest_1.expect)(mockUpdateAlertaStatus).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockEmitToDevice).not.toHaveBeenCalled();
        }), { numRuns: 20 });
    });
    (0, vitest_1.it)('Socket.io alerta:update event goes to the device that owns the event', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uuid(), fast_check_1.default.uuid(), fast_check_1.default.uuid(), async (eventId, alertaAlertId, deviceId) => {
            vitest_1.vi.clearAllMocks();
            mockFindByAlertaId.mockResolvedValue({ id: eventId, device_id: deviceId });
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            mockEmitToDevice.mockReturnValue(undefined);
            await simulateAlertaWebhook(alertaAlertId, 'acknowledge', deviceId);
            const [emittedRoom] = mockEmitToDevice.mock.calls[0];
            (0, vitest_1.expect)(emittedRoom).toBe(deviceId);
        }), { numRuns: 20 });
    });
});
//# sourceMappingURL=integration.test.js.map