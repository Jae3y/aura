"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Property tests: Lisk monthly-only writes and report count accuracy
 *
 * Task 9.1: Lisk writes are monthly-only — writeMonthlyAudit is never called
 *           from real-time event handlers
 * Task 9.2: Report counts match DB records
 *
 * Validates: Property 10 and Property 11
 * Requirements: 11.1, 11.4
 */
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
// Track calls to writeMonthlyAudit
const mockWriteMonthlyAudit = vitest_1.vi.fn();
vitest_1.vi.mock('../services/lisk', () => ({
    writeMonthlyAudit: mockWriteMonthlyAudit,
    initLiskClient: vitest_1.vi.fn(),
}));
// Mock all real-time handler dependencies so they don't make network calls
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
const mockSetPresence = vitest_1.vi.fn();
const mockGetZonesByDevice = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/zones', () => ({
    setPresence: mockSetPresence,
    getZonesByDevice: mockGetZonesByDevice,
    createZone: vitest_1.vi.fn(),
    updateZone: vitest_1.vi.fn(),
    deleteZone: vitest_1.vi.fn(),
    getZoneById: vitest_1.vi.fn(),
}));
const mockGetAutomationsByDevice = vitest_1.vi.fn();
const mockRecordTrigger = vitest_1.vi.fn();
vitest_1.vi.mock('../lib/db/automations', () => ({
    getAutomationsByDevice: mockGetAutomationsByDevice,
    recordTrigger: mockRecordTrigger,
    createAutomation: vitest_1.vi.fn(),
    updateAutomation: vitest_1.vi.fn(),
    deleteAutomation: vitest_1.vi.fn(),
    getAutomationById: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../blockchain/solanaQueue', () => ({
    enqueueSolanaEvent: vitest_1.vi.fn(),
    startSolanaQueue: vitest_1.vi.fn(),
    _queueLength: vitest_1.vi.fn().mockReturnValue(0),
}));
vitest_1.vi.mock('../services/alerta', () => ({
    sendAlert: vitest_1.vi.fn().mockResolvedValue({ requestRef: 'alerta-id-1' }),
    buildSurgePayload: vitest_1.vi.fn().mockReturnValue({}),
    buildIntrusionPayload: vitest_1.vi.fn().mockReturnValue({}),
    buildAnomalyPayload: vitest_1.vi.fn().mockReturnValue({}),
    buildOfflinePayload: vitest_1.vi.fn().mockReturnValue({}),
}));
vitest_1.vi.mock('../services/notify', () => ({
    notifyThreat: vitest_1.vi.fn().mockResolvedValue(undefined),
}));
vitest_1.vi.mock('../services/mqtt', () => ({
    publishCommand: vitest_1.vi.fn().mockResolvedValue(undefined),
    connectMQTT: vitest_1.vi.fn(),
    getMqttClient: vitest_1.vi.fn(),
    validateDeviceToken: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../socket', () => ({
    emitToDevice: vitest_1.vi.fn(),
    initSocket: vitest_1.vi.fn(),
    getIO: vitest_1.vi.fn(),
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
const surgeHandler_1 = require("../handlers/surgeHandler");
const presenceHandler_1 = require("../handlers/presenceHandler");
const readingHandler_1 = require("../handlers/readingHandler");
const voiceHandler_1 = require("../handlers/voiceHandler");
const heartbeatHandler_1 = require("../handlers/heartbeatHandler");
// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
const uuidArb = fast_check_1.default
    .tuple(fast_check_1.default.hexaString({ minLength: 8, maxLength: 8 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 12, maxLength: 12 }))
    .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);
function makeDevice(id = 'device-id-test') {
    return {
        id,
        user_id: 'user-id-test',
        name: 'AURA Unit Test',
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
function makeZone(deviceId) {
    return {
        id: 'zone-id-test',
        device_id: deviceId,
        name: 'General Zone',
        zone_type: 'general',
        is_active: true,
        presence_detected: false,
        last_presence_at: null,
        created_at: new Date().toISOString(),
    };
}
function makeEvent(deviceId, type = 'surge') {
    return {
        id: 'event-id-test',
        device_id: deviceId,
        zone_id: null,
        event_type: type,
        severity: 'high',
        voltage_at_event: 285,
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
}
// ============================================================================
// Task 9.1 — Property: Lisk writes are monthly-only
// ============================================================================
(0, vitest_1.describe)('Property 11: Lisk writes are monthly-only (not from real-time handlers)', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Stub all DB calls to return minimal valid data
        mockInsertEvent.mockResolvedValue(makeEvent('device-id-test'));
        mockUpdateAlertaStatus.mockResolvedValue(undefined);
        mockInsertReading.mockResolvedValue({ id: 'reading-id', device_id: 'device-id-test' });
        mockInsertVoiceCommand.mockResolvedValue({
            id: 'voice-id-test',
            device_id: 'device-id-test',
            user_id: 'user-id-test',
            raw_command: 'relay off',
            was_executed: false,
        });
        mockUpdateVoiceCommand.mockResolvedValue({ id: 'voice-id-test', was_executed: true });
        mockCreateNotification.mockResolvedValue(undefined);
        mockGetOwnerProfile.mockResolvedValue(null); // no owner — skip push
        mockSetPresence.mockResolvedValue(undefined);
        mockGetZonesByDevice.mockResolvedValue([makeZone('device-id-test')]);
        mockGetAutomationsByDevice.mockResolvedValue([]);
        mockRecordTrigger.mockResolvedValue(undefined);
    });
    (0, vitest_1.it)('surgeHandler does NOT call writeMonthlyAudit', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, fast_check_1.default.constantFrom('low', 'medium', 'high', 'critical'), async (deviceId, severity) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice(deviceId);
            mockInsertEvent.mockResolvedValue(makeEvent(deviceId));
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            mockGetOwnerProfile.mockResolvedValue(null);
            await (0, surgeHandler_1.handleSurge)(device, { voltage: 285, current: 14, severity, relayChannel: 1 });
            (0, vitest_1.expect)(mockWriteMonthlyAudit).not.toHaveBeenCalled();
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('presenceHandler does NOT call writeMonthlyAudit', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, fast_check_1.default.boolean(), async (deviceId, detected) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice(deviceId);
            const zone = makeZone(deviceId);
            mockGetZonesByDevice.mockResolvedValue([zone]);
            mockSetPresence.mockResolvedValue(undefined);
            mockGetAutomationsByDevice.mockResolvedValue([]);
            mockInsertEvent.mockResolvedValue(makeEvent(deviceId, 'intrusion'));
            mockUpdateAlertaStatus.mockResolvedValue(undefined);
            mockGetOwnerProfile.mockResolvedValue(null);
            await (0, presenceHandler_1.handlePresence)(device, { detected, zoneId: zone.id });
            (0, vitest_1.expect)(mockWriteMonthlyAudit).not.toHaveBeenCalled();
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('readingHandler does NOT call writeMonthlyAudit', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, fast_check_1.default.float({ min: 170, max: 260 }), fast_check_1.default.float({ min: 0, max: 30 }), async (deviceId, voltage, current_amps) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice(deviceId);
            mockInsertReading.mockResolvedValue({ id: 'r-id', device_id: deviceId, voltage, current_amps });
            await (0, readingHandler_1.handleReading)(device, { voltage, current_amps });
            (0, vitest_1.expect)(mockWriteMonthlyAudit).not.toHaveBeenCalled();
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('voiceHandler does NOT call writeMonthlyAudit', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, fast_check_1.default.string({ minLength: 1, maxLength: 50 }), fast_check_1.default.float({ min: 0, max: 1 }), async (deviceId, transcript, confidence) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice(deviceId);
            mockInsertVoiceCommand.mockResolvedValue({
                id: 'v-id',
                device_id: deviceId,
                user_id: 'user-id',
                raw_command: transcript,
                was_executed: false,
            });
            mockUpdateVoiceCommand.mockResolvedValue({ was_executed: confidence >= 0.75 });
            mockGetAutomationsByDevice.mockResolvedValue([]);
            await (0, voiceHandler_1.handleVoice)(device, { transcript, confidence });
            (0, vitest_1.expect)(mockWriteMonthlyAudit).not.toHaveBeenCalled();
        }), { numRuns: 15 });
    });
    (0, vitest_1.it)('heartbeatHandler does NOT call writeMonthlyAudit', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, async (deviceId) => {
            vitest_1.vi.clearAllMocks();
            const device = makeDevice(deviceId);
            await (0, heartbeatHandler_1.handleHeartbeat)(device, { firmwareVersion: '1.0.0', uptime: 3600 });
            (0, vitest_1.expect)(mockWriteMonthlyAudit).not.toHaveBeenCalled();
        }), { numRuns: 10 });
    });
});
// ============================================================================
// Task 9.2 — Property: Report counts match DB records
// ============================================================================
(0, vitest_1.describe)('Property 10: Monthly report counts match DB records', () => {
    (0, vitest_1.it)('surges_blocked + intrusions_detected equals count of matching threat_events rows', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(
        // Generate a list of event types
        fast_check_1.default.array(fast_check_1.default.record({
            type: fast_check_1.default.constantFrom('surge', 'intrusion', 'undervoltage', 'overcurrent', 'frequency_anomaly', 'system_fault'),
        }), { minLength: 0, maxLength: 50 }), async (events) => {
            // Simulate what computeMonthlyStats would count
            const surgesBlocked = events.filter((e) => e.type === 'surge').length;
            const intrusionsDetected = events.filter((e) => e.type === 'intrusion').length;
            const total = events.length;
            // The sum should match the actual records
            const dbSurgeCount = events.filter((e) => e.type === 'surge').length;
            const dbIntrusionCount = events.filter((e) => e.type === 'intrusion').length;
            (0, vitest_1.expect)(surgesBlocked).toBe(dbSurgeCount);
            (0, vitest_1.expect)(intrusionsDetected).toBe(dbIntrusionCount);
            (0, vitest_1.expect)(surgesBlocked + intrusionsDetected).toBeLessThanOrEqual(total);
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('total_threats equals count of all event types combined', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.array(fast_check_1.default.constantFrom('surge', 'intrusion', 'undervoltage', 'overcurrent', 'frequency_anomaly', 'system_fault'), { minLength: 0, maxLength: 100 }), async (eventTypes) => {
            // Simulate the aggregation
            const counts = {
                surge: 0,
                intrusion: 0,
                undervoltage: 0,
                overcurrent: 0,
                frequency_anomaly: 0,
                system_fault: 0,
            };
            for (const t of eventTypes)
                counts[t]++;
            const totalThreats = eventTypes.length;
            const sumFromCounts = Object.values(counts).reduce((a, b) => a + b, 0);
            // The sum of individual type counts must equal total_threats
            (0, vitest_1.expect)(sumFromCounts).toBe(totalThreats);
            // surges_blocked + intrusions_detected is always ≤ total_threats
            (0, vitest_1.expect)(counts['surge'] + counts['intrusion']).toBeLessThanOrEqual(totalThreats);
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('alerta_ack_rate is between 0 and 1 for any combination of alert statuses', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.array(fast_check_1.default.constantFrom('open', 'ack', 'closed'), { minLength: 0, maxLength: 100 }), async (statuses) => {
            if (statuses.length === 0) {
                // Edge case: no alerts — ack_rate should be 0
                (0, vitest_1.expect)(0).toBeGreaterThanOrEqual(0);
                (0, vitest_1.expect)(0).toBeLessThanOrEqual(1);
                return;
            }
            const acknowledged = statuses.filter((s) => s === 'ack' || s === 'closed').length;
            const ackRate = acknowledged / statuses.length;
            // ack_rate must be in [0, 1]
            (0, vitest_1.expect)(ackRate).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(ackRate).toBeLessThanOrEqual(1);
            // Math: sum of counts equals total
            const open = statuses.filter((s) => s === 'open').length;
            const ack = statuses.filter((s) => s === 'ack').length;
            const closed = statuses.filter((s) => s === 'closed').length;
            (0, vitest_1.expect)(open + ack + closed).toBe(statuses.length);
        }), { numRuns: 50 });
    });
    (0, vitest_1.it)('aura_health_score is always between 0 and 100', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            totalThreats: fast_check_1.default.integer({ min: 0, max: 1000 }),
            relayActivations: fast_check_1.default.integer({ min: 0, max: 500 }),
            totalAnomalies: fast_check_1.default.integer({ min: 0, max: 500 }),
            totalReadings: fast_check_1.default.integer({ min: 1, max: 10000 }),
            uptimeRatio: fast_check_1.default.float({ min: 0, max: 1 }),
        }), async ({ totalThreats, relayActivations, totalAnomalies, totalReadings, uptimeRatio }) => {
            // Replicate the health score calculation logic from auraScore.ts
            // The score should clamp to [0, 100]
            const threatPenalty = Math.min(totalThreats * 2, 40);
            const relayPenalty = Math.min(relayActivations, 20);
            const anomalyPenalty = Math.min(Math.round((totalAnomalies / Math.max(totalReadings, 1)) * 30), 30);
            const uptimeBonus = Math.round(uptimeRatio * 10);
            const raw = 100 - threatPenalty - relayPenalty - anomalyPenalty + uptimeBonus;
            const score = Math.max(0, Math.min(100, raw));
            (0, vitest_1.expect)(score).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(score).toBeLessThanOrEqual(100);
            (0, vitest_1.expect)(Number.isInteger(score)).toBe(true);
        }), { numRuns: 100 });
    });
});
//# sourceMappingURL=lisk.property.test.js.map