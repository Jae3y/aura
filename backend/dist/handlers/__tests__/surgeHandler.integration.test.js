"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// ---------------------------------------------------------------------------
// Mock all external modules before importing the handler under test
// ---------------------------------------------------------------------------
vitest_1.vi.mock('../../lib/db/threat_events', () => ({
    insertEvent: vitest_1.vi.fn(),
    updateAlertaStatus: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../lib/db/notifications', () => ({
    createNotification: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../lib/db/profiles', () => ({
    getOwnerProfileForDevice: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../blockchain/solanaQueue', () => ({
    enqueueSolanaEvent: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../services/alerta', () => ({
    buildSurgePayload: vitest_1.vi.fn(),
    sendAlert: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../services/notify', () => ({
    notifyThreat: vitest_1.vi.fn(),
}));
// Mock publishCommand — it attempts MQTT I/O
vitest_1.vi.mock('../../services/mqtt', () => ({
    publishCommand: vitest_1.vi.fn(),
}));
// Mock emitToDevice — it requires the Socket.io singleton to be initialised
vitest_1.vi.mock('../../socket', () => ({
    emitToDevice: vitest_1.vi.fn(),
}));
// Mock Sentry so no real SDK calls happen
vitest_1.vi.mock('@sentry/node', () => ({
    captureException: vitest_1.vi.fn(),
    setUser: vitest_1.vi.fn(),
    init: vitest_1.vi.fn(),
    Handlers: { requestHandler: () => (_, __, next) => next(), errorHandler: () => (_, __, ___, next) => next() },
}));
// Mock config to avoid env-var parsing during import
vitest_1.vi.mock('../../config', () => ({
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
const surgeHandler_1 = require("../surgeHandler");
const threat_events_1 = require("../../lib/db/threat_events");
const notifications_1 = require("../../lib/db/notifications");
const profiles_1 = require("../../lib/db/profiles");
const solanaQueue_1 = require("../../blockchain/solanaQueue");
const alerta_1 = require("../../services/alerta");
const notify_1 = require("../../services/notify");
const mqtt_1 = require("../../services/mqtt");
const socket_1 = require("../../socket");
const events_1 = require("../../socket/events");
const events_2 = require("../../blockchain/events");
// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const mockDevice = {
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
const mockThreatEvent = {
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
const mockProfile = {
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
(0, vitest_1.describe)('Integration: MQTT surge → full pipeline (Property 6)', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Set up default mock return values
        vitest_1.vi.mocked(threat_events_1.insertEvent).mockResolvedValue(mockThreatEvent);
        vitest_1.vi.mocked(profiles_1.getOwnerProfileForDevice).mockResolvedValue(mockProfile);
        vitest_1.vi.mocked(alerta_1.buildSurgePayload).mockReturnValue(mockAlertaNotification);
        vitest_1.vi.mocked(alerta_1.sendAlert).mockResolvedValue(mockAlertaResult);
        vitest_1.vi.mocked(threat_events_1.updateAlertaStatus).mockResolvedValue(undefined);
        vitest_1.vi.mocked(notify_1.notifyThreat).mockResolvedValue({ pushDelivered: true, emailDelivered: false });
        vitest_1.vi.mocked(notifications_1.createNotification).mockResolvedValue({
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
        vitest_1.vi.mocked(mqtt_1.publishCommand).mockResolvedValue(undefined);
        vitest_1.vi.mocked(socket_1.emitToDevice).mockReturnValue(undefined);
        vitest_1.vi.mocked(solanaQueue_1.enqueueSolanaEvent).mockResolvedValue(undefined);
    });
    (0, vitest_1.it)('side effect 1: inserts a threat_events row in the DB', async () => {
        const payload = { voltage: 280, current: 15, severity: 'high', relayChannel: 1 };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        (0, vitest_1.expect)(threat_events_1.insertEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(threat_events_1.insertEvent).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            device_id: mockDevice.id,
            event_type: 'surge',
            severity: 'high',
            voltage_at_event: 280,
            current_at_event: 15,
            relay_triggered: true,
            relay_channel: 1,
        }));
    });
    (0, vitest_1.it)('side effect 2: enqueues Solana memo write (non-blocking)', async () => {
        const payload = { voltage: 280, current: 15, severity: 'high' };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        (0, vitest_1.expect)(solanaQueue_1.enqueueSolanaEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(solanaQueue_1.enqueueSolanaEvent).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            table: 'threat_events',
            rowId: mockThreatEvent.id,
            eventName: events_2.AURA_SOLANA_EVENTS.SURGE_DETECTED,
            memo: vitest_1.expect.objectContaining({ deviceId: mockDevice.id }),
        }));
    });
    (0, vitest_1.it)('side effect 3: sends Alerta alert and stores alert ID', async () => {
        const payload = { voltage: 280, current: 15, severity: 'high' };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        // Alerta notification must be built and sent
        (0, vitest_1.expect)(alerta_1.buildSurgePayload).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(alerta_1.sendAlert).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(alerta_1.sendAlert).toHaveBeenCalledWith(mockAlertaNotification);
        // requestRef must be persisted back to the threat_events row
        (0, vitest_1.expect)(threat_events_1.updateAlertaStatus).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(threat_events_1.updateAlertaStatus).toHaveBeenCalledWith(mockThreatEvent.id, mockAlertaResult.requestRef, 'open');
    });
    (0, vitest_1.it)('side effect 4: dispatches FCM notification to device owner', async () => {
        const payload = { voltage: 280, current: 15, severity: 'high' };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        // Owner profile must be fetched
        (0, vitest_1.expect)(profiles_1.getOwnerProfileForDevice).toHaveBeenCalledWith(mockDevice.id);
        // FCM (via notifyThreat) must be called with the correct owner + event
        (0, vitest_1.expect)(notify_1.notifyThreat).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(notify_1.notifyThreat).toHaveBeenCalledWith(mockProfile, mockThreatEvent, mockDevice);
    });
    (0, vitest_1.it)('side effect 5: emits Socket.io threat:new to the device room', async () => {
        const payload = { voltage: 280, current: 15, severity: 'high' };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        (0, vitest_1.expect)(socket_1.emitToDevice).toHaveBeenCalledWith(mockDevice.id, // room = device ID (correct room)
        events_1.SOCKET_EVENTS.THREAT_NEW, // event name
        vitest_1.expect.objectContaining({ event: mockThreatEvent }));
    });
    (0, vitest_1.it)('fires all 5 side effects together for a single surge payload', async () => {
        const payload = { voltage: 310, current: 20, severity: 'critical', relayChannel: 2 };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        // All 5 must have been called exactly once in a single pipeline run
        (0, vitest_1.expect)(threat_events_1.insertEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(solanaQueue_1.enqueueSolanaEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(alerta_1.sendAlert).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(notify_1.notifyThreat).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(socket_1.emitToDevice).toHaveBeenCalledWith(mockDevice.id, events_1.SOCKET_EVENTS.THREAT_NEW, vitest_1.expect.anything());
    });
    (0, vitest_1.it)('still fires all 5 side effects when Alerta returns null (send failed)', async () => {
        // Alerta failing should NOT abort the rest of the pipeline
        vitest_1.vi.mocked(alerta_1.sendAlert).mockResolvedValue(null);
        const payload = { voltage: 280, current: 15, severity: 'high' };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        (0, vitest_1.expect)(threat_events_1.insertEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(solanaQueue_1.enqueueSolanaEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(alerta_1.sendAlert).toHaveBeenCalledOnce();
        // updateAlertaStatus should NOT be called when sendAlert returns null (no requestRef)
        (0, vitest_1.expect)(threat_events_1.updateAlertaStatus).not.toHaveBeenCalled();
        (0, vitest_1.expect)(notify_1.notifyThreat).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(socket_1.emitToDevice).toHaveBeenCalledWith(mockDevice.id, events_1.SOCKET_EVENTS.THREAT_NEW, vitest_1.expect.anything());
    });
    (0, vitest_1.it)('still fires core side effects when owner profile is not found', async () => {
        // No owner: FCM and notification row are skipped, but DB + Solana + Socket must still fire
        vitest_1.vi.mocked(profiles_1.getOwnerProfileForDevice).mockResolvedValue(null);
        const payload = { voltage: 280, current: 15, severity: 'high' };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        (0, vitest_1.expect)(threat_events_1.insertEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(solanaQueue_1.enqueueSolanaEvent).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(alerta_1.sendAlert).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(notify_1.notifyThreat).not.toHaveBeenCalled(); // owner null, skipped
        (0, vitest_1.expect)(socket_1.emitToDevice).toHaveBeenCalledWith(mockDevice.id, events_1.SOCKET_EVENTS.THREAT_NEW, vitest_1.expect.anything());
    });
    (0, vitest_1.it)('defaults severity to high and relayChannel to 1 when omitted from payload', async () => {
        // Minimal payload — no severity or relayChannel
        const payload = { voltage: 260, current: 12 };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        (0, vitest_1.expect)(threat_events_1.insertEvent).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            severity: 'high',
            relay_channel: 1,
        }));
    });
    (0, vitest_1.it)('emits threat:new to the specific device room, not a broadcast', async () => {
        const payload = { voltage: 280, current: 15, severity: 'high' };
        await (0, surgeHandler_1.handleSurge)(mockDevice, payload);
        // The first argument to emitToDevice must be exactly the device ID
        const [room] = vitest_1.vi.mocked(socket_1.emitToDevice).mock.calls[0];
        (0, vitest_1.expect)(room).toBe(mockDevice.id);
        // It should not be an empty string or a wildcard
        (0, vitest_1.expect)(room).not.toBe('');
        (0, vitest_1.expect)(room).not.toBe('*');
    });
});
//# sourceMappingURL=surgeHandler.integration.test.js.map