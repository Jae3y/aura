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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const {
  mockCaptureException,
  mockSendPush,
  mockSendThreatAlert,
  mockInsertEvent,
  mockUpdateAlertaStatus,
  mockInsertVoiceCommand,
  mockUpdateVoiceCommand,
  mockCreateNotification,
  mockGetOwnerProfile,
  mockEnqueueSolanaEvent,
  mockSendAlert,
  mockPublishCommand,
  mockEmitToDevice,
} = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
  mockSendPush: vi.fn(),
  mockSendThreatAlert: vi.fn(),
  mockInsertEvent: vi.fn(),
  mockUpdateAlertaStatus: vi.fn(),
  mockInsertVoiceCommand: vi.fn(),
  mockUpdateVoiceCommand: vi.fn(),
  mockCreateNotification: vi.fn(),
  mockGetOwnerProfile: vi.fn(),
  mockEnqueueSolanaEvent: vi.fn(),
  mockSendAlert: vi.fn(),
  mockPublishCommand: vi.fn(),
  mockEmitToDevice: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  captureException: mockCaptureException,
  init: vi.fn(),
}));

vi.mock('../config', () => ({
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
vi.mock('../services/fcm', () => ({
  sendPush: mockSendPush,
  sendBulkPush: vi.fn(),
}));

// Email/Resend mocks
vi.mock('../services/email', () => ({
  sendThreatAlert: mockSendThreatAlert,
  sendWeeklyReport: vi.fn(),
}));

// DB mocks
vi.mock('../lib/db/threat_events', () => ({
  insertEvent: mockInsertEvent,
  updateAlertaStatus: mockUpdateAlertaStatus,
  updateSolanaSignature: vi.fn(),
  setSolanaUnconfirmed: vi.fn(),
  findByAlertaId: vi.fn(),
  getEventsByDevice: vi.fn(),
}));

vi.mock('../lib/db/voice_commands', () => ({
  insertVoiceCommand: mockInsertVoiceCommand,
  updateVoiceCommand: mockUpdateVoiceCommand,
  updateVoiceSolanaSignature: vi.fn(),
  getVoiceCommandsByDevice: vi.fn(),
}));

vi.mock('../lib/db/notifications', () => ({
  createNotification: mockCreateNotification,
  markAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
  markAllAsRead: vi.fn(),
}));

vi.mock('../lib/db/profiles', () => ({
  getOwnerProfileForDevice: mockGetOwnerProfile,
  getProfileById: vi.fn(),
  upsertProfile: vi.fn(),
  updateWalletAddress: vi.fn(),
  updateFcmToken: vi.fn(),
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

vi.mock('../lib/db/automations', () => ({
  getAutomationsByDevice: vi.fn().mockResolvedValue([]),
  recordTrigger: vi.fn(),
  createAutomation: vi.fn(),
  updateAutomation: vi.fn(),
  deleteAutomation: vi.fn(),
  getAutomationById: vi.fn(),
}));

vi.mock('../blockchain/solanaQueue', () => ({
  enqueueSolanaEvent: mockEnqueueSolanaEvent,
  startSolanaQueue: vi.fn(),
  _queueLength: vi.fn().mockReturnValue(0),
}));

vi.mock('../services/alerta', () => ({
  sendAlert: mockSendAlert,
  buildSurgePayload: vi.fn().mockReturnValue({ title: 'test', message: 'test', severity: 'High', channelRef: 'test' }),
  buildIntrusionPayload: vi.fn().mockReturnValue({}),
  buildAnomalyPayload: vi.fn().mockReturnValue({}),
  buildOfflinePayload: vi.fn().mockReturnValue({}),
}));

vi.mock('../services/mqtt', () => ({
  publishCommand: mockPublishCommand,
  connectMQTT: vi.fn(),
  getMqttClient: vi.fn(),
  validateDeviceToken: vi.fn(),
}));

vi.mock('../socket', () => ({
  emitToDevice: mockEmitToDevice,
  initSocket: vi.fn(),
  getIO: vi.fn(),
}));

import type { Device, ThreatEvent, Profile, Severity } from '../types/database';
import { notifyThreat } from '../services/notify';
import { handleSurge } from '../handlers/surgeHandler';
import { handleVoice } from '../handlers/voiceHandler';

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

function makeDevice(id = 'device-test-id'): Device {
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

function makeProfile(userId: string, withFcmToken = true): Profile {
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

function makeEvent(deviceId: string, severity: Severity = 'high'): ThreatEvent {
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

describe('Property 9: FCM failure triggers Resend fallback on critical/high events only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends Resend email when FCM fails for critical severity', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (userId) => {
        vi.clearAllMocks();
        mockSendPush.mockResolvedValue(false); // FCM fails
        mockSendThreatAlert.mockResolvedValue(true); // Resend succeeds

        const device = makeDevice();
        const event = makeEvent(device.id, 'critical');
        const profile = makeProfile(userId);

        const { emailDelivered } = await notifyThreat(profile, event, device);

        // Resend fallback must fire on FCM failure for critical events
        expect(mockSendThreatAlert).toHaveBeenCalledTimes(1);
        expect(emailDelivered).toBe(true);
      }),
      { numRuns: 15 }
    );
  });

  it('sends Resend email when FCM fails for high severity', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (userId) => {
        vi.clearAllMocks();
        mockSendPush.mockResolvedValue(false);
        mockSendThreatAlert.mockResolvedValue(true);

        const device = makeDevice();
        const event = makeEvent(device.id, 'high');
        const profile = makeProfile(userId);

        const { emailDelivered } = await notifyThreat(profile, event, device);

        expect(mockSendThreatAlert).toHaveBeenCalledTimes(1);
        expect(emailDelivered).toBe(true);
      }),
      { numRuns: 15 }
    );
  });

  it('does NOT send Resend email when FCM fails for medium severity', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (userId) => {
        vi.clearAllMocks();
        mockSendPush.mockResolvedValue(false);
        mockSendThreatAlert.mockResolvedValue(true);

        const device = makeDevice();
        const event = makeEvent(device.id, 'medium');
        const profile = makeProfile(userId);

        const { emailDelivered } = await notifyThreat(profile, event, device);

        // No email for medium severity even when FCM fails
        expect(mockSendThreatAlert).not.toHaveBeenCalled();
        expect(emailDelivered).toBe(false);
      }),
      { numRuns: 15 }
    );
  });

  it('does NOT send Resend email when FCM fails for low severity', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (userId) => {
        vi.clearAllMocks();
        mockSendPush.mockResolvedValue(false);
        mockSendThreatAlert.mockResolvedValue(true);

        const device = makeDevice();
        const event = makeEvent(device.id, 'low');
        const profile = makeProfile(userId);

        const { emailDelivered } = await notifyThreat(profile, event, device);

        expect(mockSendThreatAlert).not.toHaveBeenCalled();
        expect(emailDelivered).toBe(false);
      }),
      { numRuns: 15 }
    );
  });

  it('does NOT send Resend email when FCM succeeds (even for critical)', async () => {
    mockSendPush.mockResolvedValue(true); // FCM succeeds
    mockSendThreatAlert.mockResolvedValue(true);

    const device = makeDevice();
    const event = makeEvent(device.id, 'critical');
    const profile = makeProfile('user-123');

    const { pushDelivered, emailDelivered } = await notifyThreat(profile, event, device);

    expect(pushDelivered).toBe(true);
    expect(mockSendThreatAlert).not.toHaveBeenCalled(); // no fallback when push works
    expect(emailDelivered).toBe(false);
  });

  it('no email when notification_email flag is false', async () => {
    mockSendPush.mockResolvedValue(false);
    mockSendThreatAlert.mockResolvedValue(true);

    const device = makeDevice();
    const event = makeEvent(device.id, 'critical');
    const profile = { ...makeProfile('user-456'), notification_email: false };

    const { emailDelivered } = await notifyThreat(profile, event, device);

    expect(mockSendThreatAlert).not.toHaveBeenCalled();
    expect(emailDelivered).toBe(false);
  });
});

// ============================================================================
// Task 14.1 — Property: Surge pipeline fires all 5 side effects
// ============================================================================

describe('Property 6: Surge pipeline fires all 5 side effects for any valid payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('all 5 side effects fire for any valid surge payload', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.constantFrom('low', 'medium', 'high', 'critical') as fc.Arbitrary<Severity>,
        fc.integer({ min: 220, max: 300 }),
        fc.integer({ min: 1, max: 4 }),
        async (deviceId, severity, voltage, relayChannel) => {
          vi.clearAllMocks();
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

          await handleSurge(device, {
            voltage,
            current: 14,
            severity,
            relayChannel,
          });

          // Side effect 1: threat_events row created
          expect(mockInsertEvent).toHaveBeenCalledTimes(1);

          // Side effect 2: Solana memo enqueued
          expect(mockEnqueueSolanaEvent).toHaveBeenCalledTimes(1);

          // Side effect 3: Alerta alert sent
          expect(mockSendAlert).toHaveBeenCalledTimes(1);

          // Side effect 4: Socket.io threat:new emitted
          const threatNewCalls = mockEmitToDevice.mock.calls.filter(
            ([, evt]) => evt === 'threat:new'
          );
          expect(threatNewCalls.length).toBe(1);

          // Side effect 5: relay command published to device
          expect(mockPublishCommand).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 25 }
    );
  });

  it('Solana event name is SURGE_DETECTED for all surge payloads', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.constantFrom('low', 'medium', 'high', 'critical') as fc.Arbitrary<Severity>,
        async (deviceId, severity) => {
          vi.clearAllMocks();
          const device = makeDevice(deviceId);
          mockInsertEvent.mockResolvedValue(makeEvent(deviceId, severity));
          mockUpdateAlertaStatus.mockResolvedValue(undefined);
          mockSendAlert.mockResolvedValue({ requestRef: 'alerta-id' });
          mockPublishCommand.mockResolvedValue(undefined);
          mockGetOwnerProfile.mockResolvedValue(null);

          await handleSurge(device, { voltage: 285, current: 14, severity, relayChannel: 1 });

          const [enqueuedItem] = mockEnqueueSolanaEvent.mock.calls[0];
          expect(enqueuedItem.eventName).toBe('SURGE_DETECTED');
          expect(enqueuedItem.table).toBe('threat_events');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('relay command goes to the correct device', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (deviceId) => {
        vi.clearAllMocks();
        const device = makeDevice(deviceId);
        mockInsertEvent.mockResolvedValue(makeEvent(deviceId));
        mockUpdateAlertaStatus.mockResolvedValue(undefined);
        mockSendAlert.mockResolvedValue({ requestRef: 'alerta-id' });
        mockPublishCommand.mockResolvedValue(undefined);
        mockGetOwnerProfile.mockResolvedValue(null);

        await handleSurge(device, { voltage: 285, current: 14, severity: 'high', relayChannel: 2 });

        const [publishedDeviceId] = mockPublishCommand.mock.calls[0];
        expect(publishedDeviceId).toBe(deviceId);
      }),
      { numRuns: 20 }
    );
  });
});

// ============================================================================
// Task 14.2 — Property: Voice confidence threshold enforced
// ============================================================================

describe('Property 12: Voice confidence threshold enforced', () => {
  const MIN_CONFIDENCE = 0.75; // matches voiceHandler.ts

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('was_executed = false for any confidence <= threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Confidence at or below threshold (should NOT execute)
        fc.float({ min: 0, max: MIN_CONFIDENCE }),
        fc.string({ minLength: 3, maxLength: 30 }),
        async (confidence, transcript) => {
          vi.clearAllMocks();
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

          await handleVoice(device, { transcript, confidence });

          // Check that the voice command was NOT executed
          // updateVoiceCommand should be called with was_executed: false if called at all
          const updateCalls = mockUpdateVoiceCommand.mock.calls;
          if (updateCalls.length > 0) {
            const [, patch] = updateCalls[0];
            // If updateVoiceCommand was called with was_executed, it must be false
            if (patch.was_executed !== undefined) {
              expect(patch.was_executed).toBe(false);
            }
          }

          // publishCommand (relay action) must NOT be called for below-threshold
          // Note: if confidence = MIN_CONFIDENCE exactly, it should not execute (exclusive threshold)
          if (confidence < MIN_CONFIDENCE) {
            // Below threshold: definitely no relay action
            // We check that the enqueue was not called for voice commands
            // (it would only be called if was_executed = true)
            // The absence of enqueueSolanaEvent means no execution path was taken
            const voiceEnqueues = mockEnqueueSolanaEvent.mock.calls.filter(
              ([item]) => item.table === 'voice_commands'
            );
            expect(voiceEnqueues.length).toBe(0);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('was_executed = true for confidence above threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Confidence strictly above threshold
        fc.float({ min: Math.fround(MIN_CONFIDENCE + 0.01), max: Math.fround(1.0) }),
        fc.constantFrom('relay off', 'relay on'),
        async (confidence, transcript) => {
          vi.clearAllMocks();
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

          await handleVoice(device, { transcript, confidence });

          // Solana event should be enqueued for successful voice commands
          const voiceEnqueues = mockEnqueueSolanaEvent.mock.calls;
          expect(voiceEnqueues.length).toBeGreaterThan(0);

          // publishCommand must have been called (relay action)
          expect(mockPublishCommand).toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('voice command record is always inserted regardless of confidence', async () => {
    // Even rejected commands must be stored for audit (Req 6.5)
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 1 }), // any confidence
        fc.string({ minLength: 3, maxLength: 50 }),
        async (confidence, transcript) => {
          vi.clearAllMocks();
          const device = makeDevice();

          mockInsertVoiceCommand.mockResolvedValue({
            id: 'cmd-audit',
            device_id: device.id,
            user_id: device.user_id,
            raw_command: transcript,
            was_executed: false,
          });
          mockUpdateVoiceCommand.mockResolvedValue({ id: 'cmd-audit' });

          await handleVoice(device, { transcript, confidence });

          // The voice_commands row must ALWAYS be inserted, regardless of confidence
          expect(mockInsertVoiceCommand).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Solana memo NOT enqueued for below-threshold voice commands', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.0), max: Math.fround(MIN_CONFIDENCE - 0.01) }),
        async (confidence) => {
          fc.pre(confidence < MIN_CONFIDENCE);
          vi.clearAllMocks();
          const device = makeDevice();

          mockInsertVoiceCommand.mockResolvedValue({
            id: 'cmd-low',
            device_id: device.id,
            user_id: device.user_id,
            raw_command: 'relay off',
            was_executed: false,
          });
          mockUpdateVoiceCommand.mockResolvedValue({ was_executed: false });

          await handleVoice(device, { transcript: 'relay off', confidence });

          // No Solana memo for unexecuted commands
          expect(mockEnqueueSolanaEvent).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});
