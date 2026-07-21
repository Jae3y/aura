"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Property tests: FCM/Resend fallback, surge pipeline, voice confidence
 *
 * Task 13.1: FCM failure triggers Resend fallback on critical events
 * Task 14.1: Surge pipeline fires all 5 side effects
 * Task 14.2: Voice confidence threshold enforced
 *
 * Validates: Property 9, Property 6, Property 12
 * Requirements: 4.5, 6.3, 6.4, 12.4, 12.5
 */
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
// ---------------------------------------------------------------------------
// Mocks
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
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM: 'test@aura.app',
        FCM_PROJECT_ID: 'test-project',
    },
}));
// FCM mocks
const mockSendPush = vitest_1.vi.fn();
vitest_1.vi.mock('../services/fcm', () => ({
    sendPush: mockSendPush,
    sendBulkPush: vitest_1.vi.fn(),
}));
// Email/Resend mocks
const mockSendThreatAlert = vitest_1.vi.fn();
vitest_1.vi.mock('../services/email', () => ({
    sendThreatAlert: mockSendThreatAlert,
    sendWeeklyReport: vitest_1.vi.fn(),
}));
// DB mocks
const mockInsertEvent = vitest_1.vi.fn();
const mockUpdateAlertaStatus = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/threat_events', () => ({
    insertEvent: mockInsertEvent,
    updateAlertaStatus: mockUpdateAlertaStatus,
    updateSolanaSignature: vitest_1.vi.fn(),
    setSolanaUnconfirmed: vitest_1.vi.fn(),
    findByAlertaId: vitest_1.vi.fn(),
    getEventsByDevice: vitest_1.vi.fn(),
}));
const mockInsertVoiceCommand = vitest_1.vi.fn();
const mockUpdateVoiceCommand = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/voice_commands', () => ({
    insertVoiceCommand: mockInsertVoiceCommand,
    updateVoiceCommand: mockUpdateVoiceCommand,
    updateVoiceSolanaSignature: vitest_1.vi.fn(),
    getVoiceCommandsByDevice: vitest_1.vi.fn(),
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
vitest_1.vi.mock('../lib/db/devices', () => ({
    updateDeviceStatus: vitest_1.vi.fn(),
    updateLastSeen: vitest_1.vi.fn(),
    getDeviceByToken: vitest_1.vi.fn(),
    createDevice: vitest_1.vi.fn(),
    updateDevice: vitest_1.vi.fn(),
    deleteDevice: vitest_1.vi.fn(),
    getDevices: vitest_1.vi.fn(),
    getDeviceById: vitest_1.vi.fn(),
    updateNftMintAddress: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../lib/db/automations', () => ({
    getAutomationsByDevice: vitest_1.vi.fn().mockResolvedValue([]),
    recordTrigger: vitest_1.vi.fn(),
    createAutomation: vitest_1.vi.fn(),
    updateAutomation: vitest_1.vi.fn(),
    deleteAutomation: vitest_1.vi.fn(),
    getAutomationById: vitest_1.vi.fn(),
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
    buildSurgePayload: vitest_1.vi.fn().mockReturnValue({ title: 'test', message: 'test', severity: 'High', channelRef: 'test' }),
    buildIntrusionPayload: vitest_1.vi.fn().mockReturnValue({}),
    buildAnomalyPayload: vitest_1.vi.fn().mockReturnValue({}),
    buildOfflinePayload: vitest_1.vi.fn().mockReturnValue({}),
}));
const mockPublishCommand = vitest_1.vi.fn();
vitest_1.vi.mock('../services/mqtt', () => ({
    publishCommand: mockPublishCommand,
    connectMQTT: vitest_1.vi.fn(),
    getMqttClient: vitest_1.vi.fn(),
    validateDeviceToken: vitest_1.vi.fn(),
}));
const mockEmitToDevice = vitest_1.vi.fn();
vitest_1.vi.mock('../socket', () => ({
    emitToDevice: mockEmitToDevice,
    initSocket: vitest_1.vi.fn(),
    getIO: vitest_1.vi.fn(),
}));
const notify_1 = require("../services/notify");
const surgeHandler_1 = require("../handlers/surgeHandler");
const voiceHandler_1 = require("../handlers/voiceHandler");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const uuidArb = fast_check_1.default
    .tuple(fast_check_1.default.hexaString({ minLength: 8, maxLength: 8 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 12, maxLength: 12 }))
    .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);
function makeDevice(id = 'device-test-id') {
    return {
        id,
        user_id: 'user-test-id',
        name: 'AURA Test Unit',
        device_token: 'test-token',
        firmware_version: '1.0.0',
        environment_type: 'home',
        is_online: true,
        last_seen: new Date().toISOString(),
        voltage_threshold_min: 180,
        voltage_threshold_max: 250,
        surge_sensitivity: 'medium',
        location_label: 'Lab',
        nft_mint_address: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}
function makeProfile(userId, withFcmToken = true) {
    return {
        id: userId,
        full_name: 'Test User',
        email: 'test@wallet.aura',
        avatar_url: null,
        environment_type: 'home',
        wallet_address: 'TestWallet123',
        lisk_wallet_address: null,
        fcm_token: withFcmToken ? 'fcm-token-abc' : null,
        notification_email: true,
        notification_push: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}
function makeEvent(deviceId, severity = 'high') {
    return {
        id: 'event-test-id',
        device_id: deviceId,
        zone_id: null,
        event_type: 'surge',
        severity,
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
    };
}
// ============================================================================
// Task 13.1 — Property: FCM failure triggers Resend fallback on critical events
// ============================================================================
(0, vitest_1.describe)('Property 9: FCM failure triggers Resend fallback on critical/high events only', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('sends Resend email when FCM fails for critical severity', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, async (userId) => {
            vitest_1.vi.clearAllMocks();
            mockSendPush.mockResolvedValue(false); // FCM fails
            mockSendThreatAlert.mockResolvedValue(true); // Resend succeeds
            const device = makeDevice();
            const event = makeEvent(device.id, 'critical');
            const profile = makeProfile(userId);
            const { emailDelivered } = await (0, notify_1.notifyThreat)(profile, event, device);
            // Resend fallback must fire on FCM failure for critical events
            (0, vitest_1.expect)(mockSendThreatAlert).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(emailDelivered).toBe(true);
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('sends Resend email when FCM fails for high severity', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, async (userId) => {
            vitest_1.vi.clearAllMocks();
            mockSendPush.mockResolvedValue(false);
            mockSendThreatAlert.mockResolvedValue(true);
            const device = makeDevice();
            const event = makeEvent(device.id, 'high');
            const profile = makeProfile(userId);
            const { emailDelivered } = await (0, notify_1.notifyThreat)(profile, event, device);
            (0, vitest_1.expect)(mockSendThreatAlert).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(emailDelivered).toBe(true);
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('does NOT send Resend email when FCM fails for medium severity', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, async (userId) => {
            vitest_1.vi.clearAllMocks();
            mockSendPush.mockResolvedValue(false);
            mockSendThreatAlert.mockResolvedValue(true);
            const device = makeDevice();
            const event = makeEvent(device.id, 'medium');
            const profile = makeProfile(userId);
            const { emailDelivered } = await (0, notify_1.notifyThreat)(profile, event, device);
            // No email for medium severity even when FCM fails
            (0, vitest_1.expect)(mockSendThreatAlert).not.toHaveBeenCalled();
            (0, vitest_1.expect)(emailDelivered).toBe(false);
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('does NOT send Resend email when FCM fails for low severity', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, async (userId) => {
            vitest_1.vi.clearAllMocks();
            mockSendPush.mockResolvedValue(false);
            mockSendThreatAlert.mockResolvedValue(true);
            const device = makeDevice();
            const event = makeEvent(device.id, 'low');
            const profile = makeProfile(userId);
            const { emailDelivered } = await (0, notify_1.notifyThreat)(profile, event, device);
            (0, vitest_1.expect)(mockSendThreatAlert).not.toHaveBeenCalled();
            (0, vitest_1.expect)(emailDelivered).toBe(false);
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('does NOT send Resend email when FCM succeeds (even for critical)', async () => {
        mockSendPush.mockResolvedValue(true); // FCM succeeds
        mockSendThreatAlert.mockResolvedValue(true);
        const device = makeDevice();
        const event = makeEvent(device.id, 'critical');
        const profile = makeProfile('user-123');
        const { pushDelivered, emailDelivered } = await (0, notify_1.notifyThreat)(profile, event, device);
        (0, vitest_1.expect)(pushDelivered).toBe(true);
        (0, vitest_1.expect)(mockSendThreatAlert).not.toHaveBeenCalled(); // no fallback when push works
        (0, vitest_1.expect)(emailDelivered).toBe(false);
    });
    (0, vitest_1.it)('no email when notification_email flag is false', async () => {
        mockSendPush.mockResolvedValue(false);
        mockSendThreatAlert.mockResolvedValue(true);
        const device = makeDevice();
        const event = makeEvent(device.id, 'critical');
        const profile = { ...makeProfile('user-456'), notification_email: false };
        const { emailDelivered } = await (0, notify_1.notifyThreat)(profile, event, device);
        (0, vitest_1.expect)(mockSendThreatAlert).not.toHaveBeenCalled();
        (0, vitest_1.expect)(emailDelivered).toBe(false);
    });
});
// ============================================================================
// Task 14.1 — Property: Surge pipeline fires all 5 side effects
// ============================================================================
(0, vitest_1.describe)('Property 6: Surge pipeline fires all 5 side effects for any valid payload', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockInsertEvent.mockResolvedValue(makeEvent('device-test-id'));
        mockUpdateAlertaStatus.mockResolvedValue(undefined);
        mockCreateNotification.mockResolvedValue(undefined);
        mockEnqueueSolanaEvent.mockReturnValue(undefined);
        mockSendAlert.mockResolvedValue({ requestRef: 'alerta-ref-1', success: true });
        mockPublishCommand.mockResolvedValue(undefined);
        mockEmitToDevice.mockReturnValue(undefined);
        // No owner profile — skip FCM/notification
        mockGetOwnerProfile.mockResolvedValue(null);
    });
    (0, vitest_1.it)('all 5 side effects fire for any valid surge payload', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, fast_check_1.default.constantFrom('low', 'medium', 'high', 'critical'), fast_check_1.default.integer({ min: 220, max: 300 }), fast_check_1.default.integer({ min: 1, max: 4 }), async (deviceId, severity, voltage, relayChannel) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice(deviceId);
            const event = makeEvent(deviceId, severity);
            mockInsertEvent.mockResolvedValue(event);
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            mockCreateNotification.mockResolvedValue(undefined);
            mockEnqueueSolanaEvent.mockReturnValue(undefined);
            mockSendAlert.mockResolvedValue({ requestRef: 'alerta-id', success: true });
            mockPublishCommand.mockResolvedValue(undefined);
            mockEmitToDevice.mockReturnValue(undefined);
            mockGetOwnerProfile.mockResolvedValue(null);
            await (0, surgeHandler_1.handleSurge)(device, {
                voltage,
                current: 14,
                severity,
                relayChannel,
            });
            // Side effect 1: threat_events row created
            (0, vitest_1.expect)(mockInsertEvent).toHaveBeenCalledTimes(1);
            // Side effect 2: Solana memo enqueued
            (0, vitest_1.expect)(mockEnqueueSolanaEvent).toHaveBeenCalledTimes(1);
            // Side effect 3: Alerta alert sent
            (0, vitest_1.expect)(mockSendAlert).toHaveBeenCalledTimes(1);
            // Side effect 4: Socket.io threat:new emitted
            const threatNewCalls = mockEmitToDevice.mock.calls.filter(([, evt]) => evt === 'threat:new');
            (0, vitest_1.expect)(threatNewCalls.length).toBe(1);
            // Side effect 5: relay command published to device
            (0, vitest_1.expect)(mockPublishCommand).toHaveBeenCalledTimes(1);
        }), { numRuns: 25 });
    });
    (0, vitest_1.it)('Solana event name is SURGE_DETECTED for all surge payloads', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, fast_check_1.default.constantFrom('low', 'medium', 'high', 'critical'), async (deviceId, severity) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice(deviceId);
            mockInsertEvent.mockResolvedValue(makeEvent(deviceId, severity));
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            mockSendAlert.mockResolvedValue({ requestRef: 'alerta-id' });
            mockPublishCommand.mockResolvedValue(undefined);
            mockGetOwnerProfile.mockResolvedValue(null);
            await (0, surgeHandler_1.handleSurge)(device, { voltage: 285, current: 14, severity, relayChannel: 1 });
            const [enqueuedItem] = mockEnqueueSolanaEvent.mock.calls[0];
            (0, vitest_1.expect)(enqueuedItem.eventName).toBe('SURGE_DETECTED');
            (0, vitest_1.expect)(enqueuedItem.table).toBe('threat_events');
        }), { numRuns: 20 });
    });
    (0, vitest_1.it)('relay command goes to the correct device', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, async (deviceId) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice(deviceId);
            mockInsertEvent.mockResolvedValue(makeEvent(deviceId));
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            mockSendAlert.mockResolvedValue({ requestRef: 'alerta-id' });
            mockPublishCommand.mockResolvedValue(undefined);
            mockGetOwnerProfile.mockResolvedValue(null);
            await (0, surgeHandler_1.handleSurge)(device, { voltage: 285, current: 14, severity: 'high', relayChannel: 2 });
            const [publishedDeviceId] = mockPublishCommand.mock.calls[0];
            (0, vitest_1.expect)(publishedDeviceId).toBe(deviceId);
        }), { numRuns: 20 });
    });
});
// ============================================================================
// Task 14.2 — Property: Voice confidence threshold enforced
// ============================================================================
(0, vitest_1.describe)('Property 12: Voice confidence threshold enforced', () => {
    const MIN_CONFIDENCE = 0.75; // matches voiceHandler.ts
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockInsertVoiceCommand.mockResolvedValue({
            id: 'cmd-test-id',
            device_id: 'device-test-id',
            user_id: 'user-test-id',
            raw_command: 'relay off',
            was_executed: false,
        });
        mockUpdateVoiceCommand.mockResolvedValue({ id: 'cmd-test-id', was_executed: false });
        mockPublishCommand.mockResolvedValue(undefined);
        mockEmitToDevice.mockReturnValue(undefined);
        mockEnqueueSolanaEvent.mockReturnValue(undefined);
    });
    (0, vitest_1.it)('was_executed = false for any confidence <= threshold', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(
        // Confidence at or below threshold (should NOT execute)
        fast_check_1.default.float({ min: 0, max: MIN_CONFIDENCE }), fast_check_1.default.string({ minLength: 3, maxLength: 30 }), async (confidence, transcript) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice();
            // Stub insertVoiceCommand for this run
            const cmdId = `cmd-${confidence}`;
            mockInsertVoiceCommand.mockResolvedValue({
                id: cmdId,
                device_id: device.id,
                user_id: device.user_id,
                raw_command: transcript,
                was_executed: false,
            });
            mockUpdateVoiceCommand.mockResolvedValue({ id: cmdId, was_executed: false });
            await (0, voiceHandler_1.handleVoice)(device, { transcript, confidence });
            // Check that the voice command was NOT executed
            // updateVoiceCommand should be called with was_executed: false if called at all
            const updateCalls = mockUpdateVoiceCommand.mock.calls;
            if (updateCalls.length > 0) {
                const [, patch] = updateCalls[0];
                // If updateVoiceCommand was called with was_executed, it must be false
                if (patch.was_executed !== undefined) {
                    (0, vitest_1.expect)(patch.was_executed).toBe(false);
                }
            }
            // publishCommand (relay action) must NOT be called for below-threshold
            // Note: if confidence = MIN_CONFIDENCE exactly, it should not execute (exclusive threshold)
            if (confidence < MIN_CONFIDENCE) {
                // Below threshold: definitely no relay action
                // We check that the enqueue was not called for voice commands
                // (it would only be called if was_executed = true)
                // The absence of enqueueSolanaEvent means no execution path was taken
                const voiceEnqueues = mockEnqueueSolanaEvent.mock.calls.filter(([item]) => item.table === 'voice_commands');
                (0, vitest_1.expect)(voiceEnqueues.length).toBe(0);
            }
        }), { numRuns: 30 });
    });
    (0, vitest_1.it)('was_executed = true for confidence above threshold', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(
        // Confidence strictly above threshold
        fast_check_1.default.float({ min: MIN_CONFIDENCE + 0.01, max: 1.0 }), fast_check_1.default.constantFrom('relay off', 'relay on'), async (confidence, transcript) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice();
            const cmdId = `cmd-above-${confidence}`;
            mockInsertVoiceCommand.mockResolvedValue({
                id: cmdId,
                device_id: device.id,
                user_id: device.user_id,
                raw_command: transcript,
                was_executed: false,
            });
            mockUpdateVoiceCommand.mockResolvedValue({ id: cmdId, was_executed: true });
            mockPublishCommand.mockResolvedValue(undefined);
            await (0, voiceHandler_1.handleVoice)(device, { transcript, confidence });
            // Solana event should be enqueued for successful voice commands
            const voiceEnqueues = mockEnqueueSolanaEvent.mock.calls;
            (0, vitest_1.expect)(voiceEnqueues.length).toBeGreaterThan(0);
            // publishCommand must have been called (relay action)
            (0, vitest_1.expect)(mockPublishCommand).toHaveBeenCalled();
        }), { numRuns: 20 });
    });
    (0, vitest_1.it)('voice command record is always inserted regardless of confidence', async () => {
        // Even rejected commands must be stored for audit (Req 6.5)
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.float({ min: 0, max: 1 }), // any confidence
        fast_check_1.default.string({ minLength: 3, maxLength: 50 }), async (confidence, transcript) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice();
            mockInsertVoiceCommand.mockResolvedValue({
                id: 'cmd-audit',
                device_id: device.id,
                user_id: device.user_id,
                raw_command: transcript,
                was_executed: false,
            });
            mockUpdateVoiceCommand.mockResolvedValue({ id: 'cmd-audit' });
            await (0, voiceHandler_1.handleVoice)(device, { transcript, confidence });
            // The voice_commands row must ALWAYS be inserted, regardless of confidence
            (0, vitest_1.expect)(mockInsertVoiceCommand).toHaveBeenCalledTimes(1);
        }), { numRuns: 30 });
    });
    (0, vitest_1.it)('Solana memo NOT enqueued for below-threshold voice commands', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.float({ min: 0, max: MIN_CONFIDENCE - 0.01 }), async (confidence) => {
            fast_check_1.default.pre(confidence < MIN_CONFIDENCE);
            vitest_1.vi.clearAllMocks();
            const device = makeDevice();
            mockInsertVoiceCommand.mockResolvedValue({
                id: 'cmd-low',
                device_id: device.id,
                user_id: device.user_id,
                raw_command: 'relay off',
                was_executed: false,
            });
            mockUpdateVoiceCommand.mockResolvedValue({ was_executed: false });
            await (0, voiceHandler_1.handleVoice)(device, { transcript: 'relay off', confidence });
            // No Solana memo for unexecuted commands
            (0, vitest_1.expect)(mockEnqueueSolanaEvent).not.toHaveBeenCalled();
        }), { numRuns: 20 });
    });
});
//# sourceMappingURL=handlers.property.test.js.map