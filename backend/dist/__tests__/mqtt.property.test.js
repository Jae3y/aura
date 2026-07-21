"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Property test: Invalid device tokens silently drop messages
 *
 * Task 10.1: For any MQTT payload with a mismatched device_token,
 *             assert no threat_events, sensor_readings, or voice_commands
 *             rows are created.
 *
 * Validates: Property 4
 * Requirements: 13.1, 13.2
 */
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
// ---------------------------------------------------------------------------
// Mocks — all DB helpers tracked so we can assert they're NOT called.
// ---------------------------------------------------------------------------
const mockInsertEvent = vitest_1.vi.fn();
const mockUpdateAlertaStatus = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/threat_events', () => ({
    insertEvent: mockInsertEvent,
    updateSolanaSignature: vitest_1.vi.fn(),
    setSolanaUnconfirmed: vitest_1.vi.fn(),
    updateAlertaStatus: mockUpdateAlertaStatus,
    findByAlertaId: vitest_1.vi.fn(),
    getEventsByDevice: vitest_1.vi.fn(),
}));
const mockInsertReading = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/sensor_readings', () => ({
    insertReading: mockInsertReading,
    getRecentReadings: vitest_1.vi.fn(),
    getReadingsByRange: vitest_1.vi.fn(),
}));
const mockInsertVoiceCommand = vitest_1.vi.fn();
const mockUpdateVoiceCommand = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/voice_commands', () => ({
    insertVoiceCommand: mockInsertVoiceCommand,
    updateVoiceCommand: mockUpdateVoiceCommand,
    updateVoiceSolanaSignature: vitest_1.vi.fn(),
    getVoiceCommandsByDevice: vitest_1.vi.fn(),
}));
// Track calls to validateDeviceToken
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
vitest_1.vi.mock('../blockchain/solanaQueue', () => ({
    enqueueSolanaEvent: vitest_1.vi.fn(),
    startSolanaQueue: vitest_1.vi.fn(),
    _queueLength: vitest_1.vi.fn().mockReturnValue(0),
}));
vitest_1.vi.mock('../services/alerta', () => ({
    sendAlert: vitest_1.vi.fn().mockResolvedValue({ requestRef: 'alerta-id' }),
    buildSurgePayload: vitest_1.vi.fn().mockReturnValue({}),
    buildIntrusionPayload: vitest_1.vi.fn().mockReturnValue({}),
    buildAnomalyPayload: vitest_1.vi.fn().mockReturnValue({}),
    buildOfflinePayload: vitest_1.vi.fn().mockReturnValue({}),
}));
vitest_1.vi.mock('../services/notify', () => ({
    notifyThreat: vitest_1.vi.fn().mockResolvedValue(undefined),
    notifyOffline: vitest_1.vi.fn().mockResolvedValue(undefined),
}));
vitest_1.vi.mock('../lib/db/notifications', () => ({
    createNotification: vitest_1.vi.fn(),
    markAsRead: vitest_1.vi.fn(),
    getUnreadCount: vitest_1.vi.fn(),
    markAllAsRead: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../lib/db/profiles', () => ({
    getOwnerProfileForDevice: vitest_1.vi.fn().mockResolvedValue(null),
    getProfileById: vitest_1.vi.fn(),
    upsertProfile: vitest_1.vi.fn(),
    updateWalletAddress: vitest_1.vi.fn(),
    updateFcmToken: vitest_1.vi.fn(),
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
vitest_1.vi.mock('../socket', () => ({
    emitToDevice: vitest_1.vi.fn(),
    initSocket: vitest_1.vi.fn(),
    getIO: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../services/mqtt', () => ({
    publishCommand: vitest_1.vi.fn().mockResolvedValue(undefined),
    connectMQTT: vitest_1.vi.fn(),
    getMqttClient: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('@sentry/node', () => ({
    captureException: vitest_1.vi.fn(),
    init: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../config', () => ({
    config: {
        SOLANA_RPC_URL: 'https://api.devnet.solana.com',
        SOLANA_KEYPAIR: 'test-keypair',
        NODE_ENV: 'test',
        MOCK_INTEGRATIONS: true,
        ALERTA_CHANNEL_REF: 'test',
        FRONTEND_URL: 'http://localhost:3000',
    },
}));
const mqtt_1 = require("../services/mqtt");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const uuidArb = fast_check_1.default
    .tuple(fast_check_1.default.hexaString({ minLength: 8, maxLength: 8 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 12, maxLength: 12 }))
    .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);
/** Arbitrary printable ASCII token string */
const tokenArb = fast_check_1.default.string({ minLength: 8, maxLength: 64 });
/** All AURA MQTT topic suffixes that trigger DB writes */
const topicSuffixArb = fast_check_1.default.constantFrom('readings', 'surge', 'presence', 'voice', 'heartbeat', 'status');
/** Build a valid AURA MQTT topic for a given deviceId and suffix */
function makeTopic(deviceId, suffix) {
    return `aura/${deviceId}/${suffix}`;
}
/** Build a MQTT message with a token that does NOT match the stored one */
function makePayloadWithWrongToken(suffix, wrongToken) {
    const base = { device_token: wrongToken };
    switch (suffix) {
        case 'surge':
            return Buffer.from(JSON.stringify({ ...base, voltage: 285, current: 14, severity: 'high', relayChannel: 1 }));
        case 'presence':
            return Buffer.from(JSON.stringify({ ...base, detected: true, zoneId: 'zone-1' }));
        case 'voice':
            return Buffer.from(JSON.stringify({ ...base, transcript: 'relay off', confidence: 0.9 }));
        case 'readings':
            return Buffer.from(JSON.stringify({ ...base, voltage: 230, current_amps: 5, frequency: 50 }));
        case 'heartbeat':
        case 'status':
            return Buffer.from(JSON.stringify({ ...base, firmwareVersion: '1.0.0', uptime: 3600 }));
        default:
            return Buffer.from(JSON.stringify(base));
    }
}
// ============================================================================
// Task 10.1 — Property: Invalid device tokens silently drop messages
// ============================================================================
(0, vitest_1.describe)('Property 4: Invalid device tokens silently drop MQTT messages', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Token mismatch: validateDeviceToken returns null (no matching row)
        mockGetDeviceByToken.mockResolvedValue(null);
    });
    (0, vitest_1.it)('no threat_events row created when device_token does not match', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, tokenArb, async (deviceId, wrongToken) => {
            vitest_1.vi.clearAllMocks();
            mockGetDeviceByToken.mockResolvedValue(null); // token mismatch
            await (0, mqtt_1.onMessage)(makeTopic(deviceId, 'surge'), makePayloadWithWrongToken('surge', wrongToken));
            (0, vitest_1.expect)(mockInsertEvent).not.toHaveBeenCalled();
        }), { numRuns: 25 });
    });
    (0, vitest_1.it)('no sensor_readings row created when device_token does not match', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, tokenArb, async (deviceId, wrongToken) => {
            vitest_1.vi.clearAllMocks();
            mockGetDeviceByToken.mockResolvedValue(null);
            await (0, mqtt_1.onMessage)(makeTopic(deviceId, 'readings'), makePayloadWithWrongToken('readings', wrongToken));
            (0, vitest_1.expect)(mockInsertReading).not.toHaveBeenCalled();
        }), { numRuns: 25 });
    });
    (0, vitest_1.it)('no voice_commands row created when device_token does not match', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, tokenArb, async (deviceId, wrongToken) => {
            vitest_1.vi.clearAllMocks();
            mockGetDeviceByToken.mockResolvedValue(null);
            await (0, mqtt_1.onMessage)(makeTopic(deviceId, 'voice'), makePayloadWithWrongToken('voice', wrongToken));
            (0, vitest_1.expect)(mockInsertVoiceCommand).not.toHaveBeenCalled();
        }), { numRuns: 25 });
    });
    (0, vitest_1.it)('no DB writes of any kind on ANY topic suffix when token is invalid', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, tokenArb, topicSuffixArb, async (deviceId, wrongToken, suffix) => {
            vitest_1.vi.clearAllMocks();
            mockGetDeviceByToken.mockResolvedValue(null);
            await (0, mqtt_1.onMessage)(makeTopic(deviceId, suffix), makePayloadWithWrongToken(suffix, wrongToken));
            // None of the write helpers should have been called
            (0, vitest_1.expect)(mockInsertEvent).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockInsertReading).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockInsertVoiceCommand).not.toHaveBeenCalled();
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('valid token allows messages to be processed (control: DB writes happen)', async () => {
        // This is the positive case — confirms valid tokens are NOT silently dropped.
        const deviceId = 'valid-device-uuid-1234';
        const validToken = 'valid-device-token-abc';
        const device = {
            id: deviceId,
            user_id: 'user-id',
            name: 'AURA Unit',
            device_token: validToken,
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
        // Token matches — handler should run
        mockGetDeviceByToken.mockResolvedValue(device);
        mockInsertReading.mockResolvedValue({ id: 'reading-id', device_id: deviceId, voltage: 230 });
        await (0, mqtt_1.onMessage)(makeTopic(deviceId, 'readings'), Buffer.from(JSON.stringify({
            device_token: validToken,
            voltage: 230,
            current_amps: 5,
            frequency: 50,
            power_factor: 0.95,
        })));
        // With a valid token, the reading IS inserted
        (0, vitest_1.expect)(mockInsertReading).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('validateDeviceToken returns null for any mismatched token (unit)', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, tokenArb, tokenArb, async (deviceId, storedToken, providedToken) => {
            // Only test the mismatch case
            fast_check_1.default.pre(storedToken !== providedToken);
            vitest_1.vi.clearAllMocks();
            mockGetDeviceByToken.mockResolvedValue(null); // DB query returns nothing
            const result = await (0, mqtt_1.validateDeviceToken)(deviceId, providedToken);
            (0, vitest_1.expect)(result).toBeNull();
            // The DB lookup must have been attempted
            (0, vitest_1.expect)(mockGetDeviceByToken).toHaveBeenCalledWith(deviceId, providedToken);
        }), { numRuns: 30 });
    });
    (0, vitest_1.it)('malformed JSON payload is silently dropped regardless of token', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, fast_check_1.default.string({ minLength: 0, maxLength: 100 }).filter((s) => {
            // Ensure the string is not valid JSON
            try {
                JSON.parse(s);
                return false;
            }
            catch {
                return true;
            }
        }), async (deviceId, garbage) => {
            vitest_1.vi.clearAllMocks();
            mockGetDeviceByToken.mockResolvedValue({ id: deviceId }); // even with valid-looking token
            await (0, mqtt_1.onMessage)(`aura/${deviceId}/surge`, Buffer.from(garbage));
            // Malformed JSON — dropped before any DB write
            (0, vitest_1.expect)(mockInsertEvent).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockInsertReading).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockInsertVoiceCommand).not.toHaveBeenCalled();
        }), { numRuns: 20 });
    });
});
//# sourceMappingURL=mqtt.property.test.js.map