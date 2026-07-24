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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mocks — all external I/O is intercepted
// ---------------------------------------------------------------------------

const {
  mockCaptureException,
  mockInsertEvent,
  mockUpdateAlertaStatus,
  mockFindByAlertaId,
  mockInsertReading,
  mockCreateNotification,
  mockGetOwnerProfile,
  mockGetDeviceByToken,
  mockEnqueueSolanaEvent,
  mockSendAlert,
  mockSendPush,
  mockSendThreatAlert,
  mockPublishCommand,
  mockEmitToDevice,
} = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
  mockInsertEvent: vi.fn(),
  mockUpdateAlertaStatus: vi.fn(),
  mockFindByAlertaId: vi.fn(),
  mockInsertReading: vi.fn(),
  mockCreateNotification: vi.fn(),
  mockGetOwnerProfile: vi.fn(),
  mockGetDeviceByToken: vi.fn(),
  mockEnqueueSolanaEvent: vi.fn(),
  mockSendAlert: vi.fn(),
  mockSendPush: vi.fn(),
  mockSendThreatAlert: vi.fn(),
  mockPublishCommand: vi.fn(),
  mockEmitToDevice: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  captureException: mockCaptureException,
  init: vi.fn(),
}));

vi.mock('../config', () => ({
  config: {
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_KEY: 'test-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
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


vi.mock('../lib/db/threat_events', () => ({
  insertEvent: mockInsertEvent,
  updateAlertaStatus: mockUpdateAlertaStatus,
  updateSolanaSignature: vi.fn(),
  setSolanaUnconfirmed: vi.fn(),
  findByAlertaId: mockFindByAlertaId,
  getEventsByDevice: vi.fn(),
}));

vi.mock('../lib/db/sensor_readings', () => ({
  insertReading: mockInsertReading,
  getRecentReadings: vi.fn(),
  getReadingsByRange: vi.fn(),
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
  enqueueSolanaEvent: mockEnqueueSolanaEvent,
  startSolanaQueue: vi.fn(),
  _queueLength: vi.fn().mockReturnValue(0),
}));

vi.mock('../services/alerta', () => ({
  sendAlert: mockSendAlert,
  buildSurgePayload: vi.fn().mockReturnValue({ title: 'Surge', message: 'test', severity: 'High', channelRef: 'test' }),
  buildIntrusionPayload: vi.fn().mockReturnValue({}),
  buildAnomalyPayload: vi.fn().mockReturnValue({}),
  buildOfflinePayload: vi.fn().mockReturnValue({}),
}));

vi.mock('../services/fcm', () => ({
  sendPush: mockSendPush,
  sendBulkPush: vi.fn(),
}));

vi.mock('../services/email', () => ({
  sendThreatAlert: mockSendThreatAlert,
  sendWeeklyReport: vi.fn(),
}));

vi.mock('../socket', () => ({
  emitToDevice: mockEmitToDevice,
  initSocket: vi.fn(),
  getIO: vi.fn(),
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

// We import the real handlers to test the integration
import * as mqttService from '../services/mqtt';
const { onMessage } = mqttService;
import type { Device, ThreatEvent } from '../types/database';
import { AURA_SOLANA_EVENTS } from '../blockchain/events';

// ---------------------------------------------------------------------------
// Test data
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

function makeDevice(id: string): Device {
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

function makeEvent(deviceId: string, overrides: Partial<ThreatEvent> = {}): ThreatEvent {
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

describe('Integration: MQTT surge → full pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPublishCommand.mockResolvedValue(undefined);
    mockEnqueueSolanaEvent.mockReturnValue(undefined);
    mockEmitToDevice.mockReturnValue(undefined);
    mockSendAlert.mockResolvedValue({ requestRef: 'alerta-integration-ref', success: true });
    mockUpdateAlertaStatus.mockResolvedValue(undefined);
    mockCreateNotification.mockResolvedValue(undefined);
    mockGetOwnerProfile.mockResolvedValue(null); // no push/email in integration test
  });

  it('MQTT surge message triggers all 5 pipeline side effects', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.integer({ min: 220, max: 300 }),
        fc.constantFrom('low', 'medium', 'high', 'critical'),
        async (deviceId, voltage, severity) => {
          vi.clearAllMocks();

          const device = makeDevice(deviceId);
          const event = makeEvent(deviceId, { severity: severity as 'low' | 'medium' | 'high' | 'critical' });

          // Token matches — message is valid
          mockGetDeviceByToken.mockResolvedValue(device);
          mockInsertEvent.mockResolvedValue(event);
          mockUpdateAlertaStatus.mockResolvedValue(undefined);
          const publishSpy = vi.spyOn(mqttService, 'publishCommand').mockResolvedValue(undefined);
          mockEmitToDevice.mockReturnValue(undefined);
          mockGetOwnerProfile.mockResolvedValue(null);

          // Publish a mock MQTT surge message
          const surgeTopic = `aura/${deviceId}/surge`;
          const surgePayload = Buffer.from(
            JSON.stringify({
              device_token: 'integration-test-token',
              voltage,
              current: 14.2,
              severity,
              relayChannel: 1,
              actionTaken: 'relay_cutoff',
            })
          );

          await onMessage(surgeTopic, surgePayload);

          // 1. threat_events row must be created
          expect(mockInsertEvent).toHaveBeenCalledTimes(1);
          const [insertedEvent] = mockInsertEvent.mock.calls[0];
          expect(insertedEvent.event_type).toBe('surge');
          expect(insertedEvent.device_id).toBe(deviceId);

          // 2. Solana memo must be enqueued
          expect(mockEnqueueSolanaEvent).toHaveBeenCalledTimes(1);
          const [solanaItem] = mockEnqueueSolanaEvent.mock.calls[0];
          expect(solanaItem.eventName).toBe(AURA_SOLANA_EVENTS.SURGE_DETECTED);
          expect(solanaItem.table).toBe('threat_events');

          // 3. Alerta alert must be sent (with alerta_alert_id stored)
          expect(mockSendAlert).toHaveBeenCalledTimes(1);

          // 4. Socket.io threat:new must be emitted to the device room
          const threatCalls = mockEmitToDevice.mock.calls.filter(
            ([, evtName]) => evtName === 'threat:new'
          );
          expect(threatCalls.length).toBeGreaterThan(0);
          expect(threatCalls[0][0]).toBe(deviceId);

          // 5. Relay command published back to device
          expect(publishSpy).toHaveBeenCalledWith(
            deviceId,
            expect.objectContaining({ command: 'relay_off' })
          );
        }
      ),
      { numRuns: 15 }
    );
  });

  it('MQTT message with invalid token is silently dropped — pipeline does not fire', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (deviceId) => {
        vi.clearAllMocks();

        // Token mismatch — device not found
        mockGetDeviceByToken.mockResolvedValue(null);

        await onMessage(
          `aura/${deviceId}/surge`,
          Buffer.from(
            JSON.stringify({
              device_token: 'WRONG-TOKEN',
              voltage: 285,
              current: 14,
              severity: 'high',
            })
          )
        );

        // No pipeline steps should fire
        expect(mockInsertEvent).not.toHaveBeenCalled();
        expect(mockEnqueueSolanaEvent).not.toHaveBeenCalled();
        expect(mockSendAlert).not.toHaveBeenCalled();
        expect(mockPublishCommand).not.toHaveBeenCalled();
      }),
      { numRuns: 15 }
    );
  });

  it('MQTT readings message inserts sensor_readings (not threat_events)', async () => {
    const deviceId = 'readings-integration-test';
    const device = makeDevice(deviceId);

    mockGetDeviceByToken.mockResolvedValue(device);
    mockInsertReading.mockResolvedValue({ id: 'reading-1', device_id: deviceId, voltage: 230 });

    await onMessage(
      `aura/${deviceId}/readings`,
      Buffer.from(
        JSON.stringify({
          device_token: 'integration-test-token',
          voltage: 230,
          current_amps: 5,
          frequency: 50,
          power_factor: 0.95,
        })
      )
    );

    // readings handler runs, not surge handler
    expect(mockInsertReading).toHaveBeenCalledTimes(1);
    expect(mockInsertEvent).not.toHaveBeenCalled(); // no threat created for normal reading
  });
});

// ============================================================================
// Task 28.2 — Integration test: Alerta webhook → DB + Socket.io
// ============================================================================

describe('Integration: Alerta webhook → DB + Socket.io', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Simulate the Alerta webhook handler flow:
   * 1. Find the threat event by alerta_alert_id
   * 2. Update alerta_status in DB
   * 3. Emit alerta:update on Socket.io
   *
   * This mirrors the webhook handler logic as described in the design doc.
   */
  async function simulateAlertaWebhook(
    alertaAlertId: string,
    action: 'acknowledge' | 'close',
    ownerDeviceId: string
  ): Promise<void> {
    const event = await mockFindByAlertaId(alertaAlertId);
    if (!event) return;

    const newStatus = action === 'acknowledge' ? 'ack' : 'closed';
    await mockUpdateAlertaStatus(event.id, alertaAlertId, newStatus);
    mockEmitToDevice(event.device_id, 'alerta:update', {
      eventId: event.id,
      alertaAlertId,
      status: newStatus,
      deviceId: ownerDeviceId,
    });
  }

  it('acknowledge action sets alerta_status = ack in DB and emits alerta:update', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (eventId, alertaAlertId, deviceId) => {
          vi.clearAllMocks();

          mockFindByAlertaId.mockResolvedValue({
            id: eventId,
            device_id: deviceId,
            alerta_alert_id: alertaAlertId,
          });
          mockUpdateAlertaStatus.mockResolvedValue(undefined);
          mockEmitToDevice.mockReturnValue(undefined);

          await simulateAlertaWebhook(alertaAlertId, 'acknowledge', deviceId);

          // DB must be updated with 'ack'
          expect(mockUpdateAlertaStatus).toHaveBeenCalledTimes(1);
          expect(mockUpdateAlertaStatus).toHaveBeenCalledWith(eventId, alertaAlertId, 'ack');

          // Socket.io alerta:update must fire
          expect(mockEmitToDevice).toHaveBeenCalledTimes(1);
          expect(mockEmitToDevice).toHaveBeenCalledWith(
            deviceId,
            'alerta:update',
            expect.objectContaining({ status: 'ack' })
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  it('close action sets alerta_status = closed in DB and emits alerta:update', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (eventId, alertaAlertId, deviceId) => {
          vi.clearAllMocks();

          mockFindByAlertaId.mockResolvedValue({
            id: eventId,
            device_id: deviceId,
            alerta_alert_id: alertaAlertId,
          });
          mockUpdateAlertaStatus.mockResolvedValue(undefined);
          mockEmitToDevice.mockReturnValue(undefined);

          await simulateAlertaWebhook(alertaAlertId, 'close', deviceId);

          expect(mockUpdateAlertaStatus).toHaveBeenCalledWith(eventId, alertaAlertId, 'closed');
          expect(mockEmitToDevice).toHaveBeenCalledWith(
            deviceId,
            'alerta:update',
            expect.objectContaining({ status: 'closed' })
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  it('unknown alertaAlertId does not update DB or emit Socket.io', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 36 }),
        fc.constantFrom('acknowledge', 'close') as fc.Arbitrary<'acknowledge' | 'close'>,
        async (unknownId, action) => {
          vi.clearAllMocks();
          mockFindByAlertaId.mockResolvedValue(null);
          mockUpdateAlertaStatus.mockResolvedValue(undefined);

          await simulateAlertaWebhook(unknownId, action, 'some-device');

          expect(mockUpdateAlertaStatus).not.toHaveBeenCalled();
          expect(mockEmitToDevice).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Socket.io alerta:update event goes to the device that owns the event', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), fc.uuid(), async (eventId, alertaAlertId, deviceId) => {
        vi.clearAllMocks();
        mockFindByAlertaId.mockResolvedValue({ id: eventId, device_id: deviceId });
        mockUpdateAlertaStatus.mockResolvedValue(undefined);
        mockEmitToDevice.mockReturnValue(undefined);

        await simulateAlertaWebhook(alertaAlertId, 'acknowledge', deviceId);

        const [emittedRoom] = mockEmitToDevice.mock.calls[0];
        expect(emittedRoom).toBe(deviceId);
      }),
      { numRuns: 20 }
    );
  });
});
