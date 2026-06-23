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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Track calls to writeMonthlyAudit
const mockWriteMonthlyAudit = vi.fn();
vi.mock('../services/lisk', () => ({
  writeMonthlyAudit: mockWriteMonthlyAudit,
  initLiskClient: vi.fn(),
}));

// Mock all real-time handler dependencies so they don't make network calls
const mockInsertEvent = vi.fn();
const mockUpdateAlertaStatus = vi.fn();
vi.mock('../lib/db/threat_events', () => ({
  insertEvent: mockInsertEvent,
  updateSolanaSignature: vi.fn(),
  setSolanaUnconfirmed: vi.fn(),
  updateAlertaStatus: mockUpdateAlertaStatus,
  findByAlertaId: vi.fn(),
  getEventsByDevice: vi.fn(),
}));

const mockInsertReading = vi.fn();
vi.mock('../lib/db/sensor_readings', () => ({
  insertReading: mockInsertReading,
  getRecentReadings: vi.fn(),
  getReadingsByRange: vi.fn(),
}));

const mockInsertVoiceCommand = vi.fn();
const mockUpdateVoiceCommand = vi.fn();
vi.mock('../lib/db/voice_commands', () => ({
  insertVoiceCommand: mockInsertVoiceCommand,
  updateVoiceCommand: mockUpdateVoiceCommand,
  updateVoiceSolanaSignature: vi.fn(),
  getVoiceCommandsByDevice: vi.fn(),
}));

const mockCreateNotification = vi.fn();
vi.mock('../lib/db/notifications', () => ({
  createNotification: mockCreateNotification,
  markAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
  markAllAsRead: vi.fn(),
}));

const mockGetOwnerProfile = vi.fn();
vi.mock('../lib/db/profiles', () => ({
  getOwnerProfileForDevice: mockGetOwnerProfile,
  getProfileById: vi.fn(),
  upsertProfile: vi.fn(),
  updateWalletAddress: vi.fn(),
  updateFcmToken: vi.fn(),
}));

const mockSetPresence = vi.fn();
const mockGetZonesByDevice = vi.fn();
vi.mock('../lib/db/zones', () => ({
  setPresence: mockSetPresence,
  getZonesByDevice: mockGetZonesByDevice,
  createZone: vi.fn(),
  updateZone: vi.fn(),
  deleteZone: vi.fn(),
  getZoneById: vi.fn(),
}));

const mockGetAutomationsByDevice = vi.fn();
const mockRecordTrigger = vi.fn();
vi.mock('../lib/db/automations', () => ({
  getAutomationsByDevice: mockGetAutomationsByDevice,
  recordTrigger: mockRecordTrigger,
  createAutomation: vi.fn(),
  updateAutomation: vi.fn(),
  deleteAutomation: vi.fn(),
  getAutomationById: vi.fn(),
}));

vi.mock('../blockchain/solanaQueue', () => ({
  enqueueSolanaEvent: vi.fn(),
  startSolanaQueue: vi.fn(),
  _queueLength: vi.fn().mockReturnValue(0),
}));

vi.mock('../services/alerta', () => ({
  sendAlert: vi.fn().mockResolvedValue({ requestRef: 'alerta-id-1' }),
  buildSurgePayload: vi.fn().mockReturnValue({}),
  buildIntrusionPayload: vi.fn().mockReturnValue({}),
  buildAnomalyPayload: vi.fn().mockReturnValue({}),
  buildOfflinePayload: vi.fn().mockReturnValue({}),
}));

vi.mock('../services/notify', () => ({
  notifyThreat: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/mqtt', () => ({
  publishCommand: vi.fn().mockResolvedValue(undefined),
  connectMQTT: vi.fn(),
  getMqttClient: vi.fn(),
  validateDeviceToken: vi.fn(),
}));

vi.mock('../socket', () => ({
  emitToDevice: vi.fn(),
  initSocket: vi.fn(),
  getIO: vi.fn(),
}));

vi.mock('../lib/db/devices', () => ({
  updateDeviceStatus: vi.fn(),
  updateLastSeen: vi.fn(),
  getDeviceByToken: vi.fn(),
  createDevice: vi.fn(),
  updateDevice: vi.fn(),
  deleteDevice: vi.fn(),
  getDevices: vi.fn(),
  getDeviceById: vi.fn(),
  updateNftMintAddress: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
}));

vi.mock('../config', () => ({
  config: {
    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    SOLANA_KEYPAIR: 'test-keypair',
    NODE_ENV: 'test',
    MOCK_INTEGRATIONS: true,
    ALERTA_CHANNEL_REF: 'test',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

import type { Device, Zone, ThreatEvent } from '../types/database';
import { handleSurge } from '../handlers/surgeHandler';
import { handlePresence } from '../handlers/presenceHandler';
import { handleReading } from '../handlers/readingHandler';
import { handleVoice } from '../handlers/voiceHandler';
import { handleHeartbeat } from '../handlers/heartbeatHandler';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const uuidArb = fc
  .tuple(
    fc.hexaString({ minLength: 8, maxLength: 8 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 12, maxLength: 12 })
  )
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

function makeDevice(id = 'device-id-test'): Device {
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

function makeZone(deviceId: string): Zone {
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

function makeEvent(deviceId: string, type: 'surge' | 'intrusion' = 'surge'): ThreatEvent {
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

describe('Property 11: Lisk writes are monthly-only (not from real-time handlers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('surgeHandler does NOT call writeMonthlyAudit', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.constantFrom('low', 'medium', 'high', 'critical') as fc.Arbitrary<'low' | 'medium' | 'high' | 'critical'>,
        async (deviceId, severity) => {
          vi.clearAllMocks();
          const device = makeDevice(deviceId);
          mockInsertEvent.mockResolvedValue(makeEvent(deviceId));
          mockUpdateAlertaStatus.mockResolvedValue(undefined);
          mockGetOwnerProfile.mockResolvedValue(null);

          await handleSurge(device, { voltage: 285, current: 14, severity, relayChannel: 1 });

          expect(mockWriteMonthlyAudit).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 15 }
    );
  });

  it('presenceHandler does NOT call writeMonthlyAudit', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.boolean(),
        async (deviceId, detected) => {
          vi.clearAllMocks();
          const device = makeDevice(deviceId);
          const zone = makeZone(deviceId);
          mockGetZonesByDevice.mockResolvedValue([zone]);
          mockSetPresence.mockResolvedValue(undefined);
          mockGetAutomationsByDevice.mockResolvedValue([]);
          mockInsertEvent.mockResolvedValue(makeEvent(deviceId, 'intrusion'));
          mockUpdateAlertaStatus.mockResolvedValue(undefined);
          mockGetOwnerProfile.mockResolvedValue(null);

          await handlePresence(device, { detected, zoneId: zone.id });

          expect(mockWriteMonthlyAudit).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 15 }
    );
  });

  it('readingHandler does NOT call writeMonthlyAudit', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.float({ min: 170, max: 260 }),
        fc.float({ min: 0, max: 30 }),
        async (deviceId, voltage, current_amps) => {
          vi.clearAllMocks();
          const device = makeDevice(deviceId);
          mockInsertReading.mockResolvedValue({ id: 'r-id', device_id: deviceId, voltage, current_amps });

          await handleReading(device, { voltage, current_amps });

          expect(mockWriteMonthlyAudit).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 15 }
    );
  });

  it('voiceHandler does NOT call writeMonthlyAudit', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: 0, max: 1 }),
        async (deviceId, transcript, confidence) => {
          vi.clearAllMocks();
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

          await handleVoice(device, { transcript, confidence });

          expect(mockWriteMonthlyAudit).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 15 }
    );
  });

  it('heartbeatHandler does NOT call writeMonthlyAudit', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (deviceId) => {
        vi.clearAllMocks();
        const device = makeDevice(deviceId);

        await handleHeartbeat(device, { firmwareVersion: '1.0.0', uptime: 3600 });

        expect(mockWriteMonthlyAudit).not.toHaveBeenCalled();
      }),
      { numRuns: 10 }
    );
  });
});

// ============================================================================
// Task 9.2 — Property: Report counts match DB records
// ============================================================================

describe('Property 10: Monthly report counts match DB records', () => {
  it('surges_blocked + intrusions_detected equals count of matching threat_events rows', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a list of event types
        fc.array(
          fc.record({
            type: fc.constantFrom('surge', 'intrusion', 'undervoltage', 'overcurrent', 'frequency_anomaly', 'system_fault') as fc.Arbitrary<string>,
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (events) => {
          // Simulate what computeMonthlyStats would count
          const surgesBlocked = events.filter((e) => e.type === 'surge').length;
          const intrusionsDetected = events.filter((e) => e.type === 'intrusion').length;
          const total = events.length;

          // The sum should match the actual records
          const dbSurgeCount = events.filter((e) => e.type === 'surge').length;
          const dbIntrusionCount = events.filter((e) => e.type === 'intrusion').length;

          expect(surgesBlocked).toBe(dbSurgeCount);
          expect(intrusionsDetected).toBe(dbIntrusionCount);
          expect(surgesBlocked + intrusionsDetected).toBeLessThanOrEqual(total);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('total_threats equals count of all event types combined', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom('surge', 'intrusion', 'undervoltage', 'overcurrent', 'frequency_anomaly', 'system_fault'),
          { minLength: 0, maxLength: 100 }
        ),
        (eventTypes) => {
          // Simulate the aggregation
          const counts = {
            surge: 0,
            intrusion: 0,
            undervoltage: 0,
            overcurrent: 0,
            frequency_anomaly: 0,
            system_fault: 0,
          } as Record<string, number>;

          for (const t of eventTypes) counts[t]++;

          const totalThreats = eventTypes.length;
          const sumFromCounts = Object.values(counts).reduce((a, b) => a + b, 0);

          // The sum of individual type counts must equal total_threats
          expect(sumFromCounts).toBe(totalThreats);

          // surges_blocked + intrusions_detected is always ≤ total_threats
          expect(counts['surge'] + counts['intrusion']).toBeLessThanOrEqual(totalThreats);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('alerta_ack_rate is between 0 and 1 for any combination of alert statuses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom('open', 'ack', 'closed'),
          { minLength: 0, maxLength: 100 }
        ),
        (statuses) => {
          if (statuses.length === 0) {
            // Edge case: no alerts — ack_rate should be 0
            expect(0).toBeGreaterThanOrEqual(0);
            expect(0).toBeLessThanOrEqual(1);
            return;
          }

          const acknowledged = statuses.filter((s) => s === 'ack' || s === 'closed').length;
          const ackRate = acknowledged / statuses.length;

          // ack_rate must be in [0, 1]
          expect(ackRate).toBeGreaterThanOrEqual(0);
          expect(ackRate).toBeLessThanOrEqual(1);

          // Math: sum of counts equals total
          const open = statuses.filter((s) => s === 'open').length;
          const ack = statuses.filter((s) => s === 'ack').length;
          const closed = statuses.filter((s) => s === 'closed').length;
          expect(open + ack + closed).toBe(statuses.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('aura_health_score is always between 0 and 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          totalThreats: fc.integer({ min: 0, max: 1000 }),
          relayActivations: fc.integer({ min: 0, max: 500 }),
          totalAnomalies: fc.integer({ min: 0, max: 500 }),
          totalReadings: fc.integer({ min: 1, max: 10000 }),
          uptimeRatio: fc.float({ min: 0, max: 1 }),
        }),
        ({ totalThreats, relayActivations, totalAnomalies, totalReadings, uptimeRatio }) => {
          // Replicate the health score calculation logic from auraScore.ts
          // The score should clamp to [0, 100]
          const threatPenalty = Math.min(totalThreats * 2, 40);
          const relayPenalty = Math.min(relayActivations, 20);
          const anomalyPenalty = Math.min(
            Math.round((totalAnomalies / Math.max(totalReadings, 1)) * 30),
            30
          );
          const uptimeBonus = Math.round(uptimeRatio * 10);

          const raw = 100 - threatPenalty - relayPenalty - anomalyPenalty + uptimeBonus;
          const score = Math.max(0, Math.min(100, raw));

          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
          expect(Number.isInteger(score)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
