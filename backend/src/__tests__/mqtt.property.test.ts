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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mocks — all DB helpers tracked so we can assert they're NOT called.
// ---------------------------------------------------------------------------

const {
  mockInsertEvent,
  mockUpdateAlertaStatus,
  mockInsertReading,
  mockInsertVoiceCommand,
  mockUpdateVoiceCommand,
  mockGetDeviceByToken,
} = vi.hoisted(() => ({
  mockInsertEvent: vi.fn(),
  mockUpdateAlertaStatus: vi.fn(),
  mockInsertReading: vi.fn(),
  mockInsertVoiceCommand: vi.fn(),
  mockUpdateVoiceCommand: vi.fn(),
  mockGetDeviceByToken: vi.fn(),
}));

vi.mock('../lib/db/threat_events', () => ({
  insertEvent: mockInsertEvent,
  updateSolanaSignature: vi.fn(),
  setSolanaUnconfirmed: vi.fn(),
  updateAlertaStatus: mockUpdateAlertaStatus,
  findByAlertaId: vi.fn(),
  getEventsByDevice: vi.fn(),
}));

vi.mock('../lib/db/sensor_readings', () => ({
  insertReading: mockInsertReading,
  getRecentReadings: vi.fn(),
  getReadingsByRange: vi.fn(),
}));

vi.mock('../lib/db/voice_commands', () => ({
  insertVoiceCommand: mockInsertVoiceCommand,
  updateVoiceCommand: mockUpdateVoiceCommand,
  updateVoiceSolanaSignature: vi.fn(),
  getVoiceCommandsByDevice: vi.fn(),
}));

// Track calls to validateDeviceToken
vi.mock('../lib/db/devices', () => ({
  getDeviceByToken: mockGetDeviceByToken,
  createDevice: vi.fn(),
  updateDevice: vi.fn(),
  deleteDevice: vi.fn(),
  getDevices: vi.fn(),
  getDeviceById: vi.fn(),
  updateDeviceStatus: vi.fn(),
  updateLastSeen: vi.fn(),
  updateNftMintAddress: vi.fn(),
}));

vi.mock('../blockchain/solanaQueue', () => ({
  enqueueSolanaEvent: vi.fn(),
  startSolanaQueue: vi.fn(),
  _queueLength: vi.fn().mockReturnValue(0),
}));

vi.mock('../services/alerta', () => ({
  sendAlert: vi.fn().mockResolvedValue({ requestRef: 'alerta-id' }),
  buildSurgePayload: vi.fn().mockReturnValue({}),
  buildIntrusionPayload: vi.fn().mockReturnValue({}),
  buildAnomalyPayload: vi.fn().mockReturnValue({}),
  buildOfflinePayload: vi.fn().mockReturnValue({}),
}));

vi.mock('../services/notify', () => ({
  notifyThreat: vi.fn().mockResolvedValue(undefined),
  notifyOffline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/db/notifications', () => ({
  createNotification: vi.fn(),
  markAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
  markAllAsRead: vi.fn(),
}));

vi.mock('../lib/db/profiles', () => ({
  getOwnerProfileForDevice: vi.fn().mockResolvedValue(null),
  getProfileById: vi.fn(),
  upsertProfile: vi.fn(),
  updateWalletAddress: vi.fn(),
  updateFcmToken: vi.fn(),
}));

vi.mock('../lib/db/zones', () => ({
  setPresence: vi.fn(),
  getZonesByDevice: vi.fn().mockResolvedValue([]),
  createZone: vi.fn(),
  updateZone: vi.fn(),
  deleteZone: vi.fn(),
  getZoneById: vi.fn(),
}));

vi.mock('../lib/db/automations', () => ({
  getAutomationsByDevice: vi.fn().mockResolvedValue([]),
  recordTrigger: vi.fn(),
  createAutomation: vi.fn(),
  updateAutomation: vi.fn(),
  deleteAutomation: vi.fn(),
  getAutomationById: vi.fn(),
}));

vi.mock('../socket', () => ({
  emitToDevice: vi.fn(),
  initSocket: vi.fn(),
  getIO: vi.fn(),
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

import { onMessage, validateDeviceToken } from '../services/mqtt';

// ---------------------------------------------------------------------------
// Helpers
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

/** Arbitrary printable ASCII token string */
const tokenArb = fc.string({ minLength: 8, maxLength: 64 });

/** All AURA MQTT topic suffixes that trigger DB writes */
const topicSuffixArb = fc.constantFrom('readings', 'surge', 'presence', 'voice', 'heartbeat', 'status');

/** Build a valid AURA MQTT topic for a given deviceId and suffix */
function makeTopic(deviceId: string, suffix: string): string {
  return `aura/${deviceId}/${suffix}`;
}

/** Build a MQTT message with a token that does NOT match the stored one */
function makePayloadWithWrongToken(suffix: string, wrongToken: string): Buffer {
  const base: Record<string, unknown> = { device_token: wrongToken };

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

describe('Property 4: Invalid device tokens silently drop MQTT messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Token mismatch: validateDeviceToken returns null (no matching row)
    mockGetDeviceByToken.mockResolvedValue(null);
  });

  it('no threat_events row created when device_token does not match', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        tokenArb,
        async (deviceId, wrongToken) => {
          vi.clearAllMocks();
          mockGetDeviceByToken.mockResolvedValue(null); // token mismatch

          await onMessage(
            makeTopic(deviceId, 'surge'),
            makePayloadWithWrongToken('surge', wrongToken)
          );

          expect(mockInsertEvent).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('no sensor_readings row created when device_token does not match', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        tokenArb,
        async (deviceId, wrongToken) => {
          vi.clearAllMocks();
          mockGetDeviceByToken.mockResolvedValue(null);

          await onMessage(
            makeTopic(deviceId, 'readings'),
            makePayloadWithWrongToken('readings', wrongToken)
          );

          expect(mockInsertReading).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('no voice_commands row created when device_token does not match', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        tokenArb,
        async (deviceId, wrongToken) => {
          vi.clearAllMocks();
          mockGetDeviceByToken.mockResolvedValue(null);

          await onMessage(
            makeTopic(deviceId, 'voice'),
            makePayloadWithWrongToken('voice', wrongToken)
          );

          expect(mockInsertVoiceCommand).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('no DB writes of any kind on ANY topic suffix when token is invalid', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        tokenArb,
        topicSuffixArb,
        async (deviceId, wrongToken, suffix) => {
          vi.clearAllMocks();
          mockGetDeviceByToken.mockResolvedValue(null);

          await onMessage(
            makeTopic(deviceId, suffix),
            makePayloadWithWrongToken(suffix, wrongToken)
          );

          // None of the write helpers should have been called
          expect(mockInsertEvent).not.toHaveBeenCalled();
          expect(mockInsertReading).not.toHaveBeenCalled();
          expect(mockInsertVoiceCommand).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('valid token allows messages to be processed (control: DB writes happen)', async () => {
    // This is the positive case — confirms valid tokens are NOT silently dropped.
    const deviceId = 'valid-device-uuid-1234';
    const validToken = 'valid-device-token-abc';

    const device = {
      id: deviceId,
      user_id: 'user-id',
      name: 'AURA Unit',
      device_token: validToken,
      firmware_version: '1.0.0',
      environment_type: 'home' as const,
      is_online: true,
      last_seen: new Date().toISOString(),
      voltage_threshold_min: 180,
      voltage_threshold_max: 250,
      surge_sensitivity: 'medium' as const,
      location_label: 'Lab',
      nft_mint_address: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Token matches — handler should run
    mockGetDeviceByToken.mockResolvedValue(device);
    mockInsertReading.mockResolvedValue({ id: 'reading-id', device_id: deviceId, voltage: 230 });

    await onMessage(
      makeTopic(deviceId, 'readings'),
      Buffer.from(JSON.stringify({
        device_token: validToken,
        voltage: 230,
        current_amps: 5,
        frequency: 50,
        power_factor: 0.95,
      }))
    );

    // With a valid token, the reading IS inserted
    expect(mockInsertReading).toHaveBeenCalledTimes(1);
  });

  it('validateDeviceToken returns null for any mismatched token (unit)', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        tokenArb,
        tokenArb,
        async (deviceId, storedToken, providedToken) => {
          // Only test the mismatch case
          fc.pre(storedToken !== providedToken);

          vi.clearAllMocks();
          mockGetDeviceByToken.mockResolvedValue(null); // DB query returns nothing

          const result = await validateDeviceToken(deviceId, providedToken);

          expect(result).toBeNull();
          // The DB lookup must have been attempted
          expect(mockGetDeviceByToken).toHaveBeenCalledWith(deviceId, providedToken);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('malformed JSON payload is silently dropped regardless of token', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.string({ minLength: 0, maxLength: 100 }).filter((s) => {
          // Ensure the string is not valid JSON
          try {
            JSON.parse(s);
            return false;
          } catch {
            return true;
          }
        }),
        async (deviceId, garbage) => {
          vi.clearAllMocks();
          mockGetDeviceByToken.mockResolvedValue({ id: deviceId }); // even with valid-looking token

          await onMessage(`aura/${deviceId}/surge`, Buffer.from(garbage));

          // Malformed JSON — dropped before any DB write
          expect(mockInsertEvent).not.toHaveBeenCalled();
          expect(mockInsertReading).not.toHaveBeenCalled();
          expect(mockInsertVoiceCommand).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});
