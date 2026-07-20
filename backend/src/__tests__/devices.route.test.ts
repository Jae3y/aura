import express from 'express';
import http from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetDevices,
  mockGetDeviceById,
  mockCreateDevice,
  mockDeleteDevice,
  mockGetDeviceByTokenAndUser,
  mockUpdateNftMintAddress,
  mockMintDeviceNFT,
  mockEnqueueSolanaEvent,
  mockEmitToDevice,
} = vi.hoisted(() => ({
  mockGetDevices: vi.fn(),
  mockGetDeviceById: vi.fn(),
  mockCreateDevice: vi.fn(),
  mockDeleteDevice: vi.fn(),
  mockGetDeviceByTokenAndUser: vi.fn(),
  mockUpdateNftMintAddress: vi.fn(),
  mockMintDeviceNFT: vi.fn(),
  mockEnqueueSolanaEvent: vi.fn(),
  mockEmitToDevice: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  Handlers: {
    requestHandler:
      () =>
      (_req: unknown, _res: unknown, next: () => void) =>
        next(),
    errorHandler:
      () =>
      (_err: unknown, _req: unknown, _res: unknown, next: () => void) =>
        next(),
  },
}));

vi.mock('../config', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret',
    FRONTEND_URL: 'http://localhost:3000',
    PUBLIC_URL: 'http://localhost:3001',
  },
}));

vi.mock('../middleware/auth', () => ({
  authMiddleware: vi.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: 'user-uuid-001', walletAddress: null, email: 'test@example.com' };
    next();
  }),
}));

vi.mock('../middleware/rateLimit', () => ({
  defaultLimiter: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  authLimiter: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

vi.mock('../lib/db/devices', () => ({
  getDevices: mockGetDevices,
  getDeviceById: mockGetDeviceById,
  createDevice: mockCreateDevice,
  deleteDevice: mockDeleteDevice,
  updateDevice: vi.fn(),
  getDeviceByTokenAndUser: mockGetDeviceByTokenAndUser,
  updateNftMintAddress: mockUpdateNftMintAddress,
}));

vi.mock('../services/nft', () => ({
  mintDeviceNFT: mockMintDeviceNFT,
}));

vi.mock('../blockchain/solanaQueue', () => ({
  enqueueSolanaEvent: mockEnqueueSolanaEvent,
}));

vi.mock('../blockchain/events', () => ({
  AURA_SOLANA_EVENTS: {
    DEVICE_MINTED: 'DEVICE_MINTED',
    SURGE_DETECTED: 'SURGE_DETECTED',
  },
}));

vi.mock('../socket', () => ({
  emitToDevice: mockEmitToDevice,
}));

vi.mock('../socket/events', () => ({
  SOCKET_EVENTS: {
    DEVICE_PAIRED: 'device:paired',
    THREAT_NEW: 'threat:new',
    ALERTA_UPDATE: 'alerta:update',
  },
}));

vi.mock('../lib/db/threat_events', () => ({
  insertEvent: vi.fn(),
  updateAlertaStatus: vi.fn(),
}));

vi.mock('../services/alerta', () => ({
  sendAlert: vi.fn(),
  buildSurgePayload: vi.fn(),
}));

vi.mock('../lib/db/monthly_reports', () => ({
  upsertReport: vi.fn(),
  getReportById: vi.fn(),
}));

vi.mock('../services/lisk', () => ({
  writeMonthlyAudit: vi.fn(),
}));

vi.mock('../services/solana', () => ({
  initSolanaClient: vi.fn(),
  getWalletPublicKey: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import router AFTER mocks
// ---------------------------------------------------------------------------

import devicesRouter from '../routes/devices';
import { errorHandler } from '../middleware/errorHandler';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

interface TestResponse {
  status: number;
  body: Record<string, unknown>;
}

function startServer(app: express.Express): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

function request(
  server: http.Server,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload ? Buffer.byteLength(payload) : 0,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: data ? (JSON.parse(data) as Record<string, unknown>) : {},
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_DEVICE = {
  id: 'device-uuid-001',
  user_id: 'user-uuid-001',
  name: 'Living Room Node',
  device_token: 'tok_abcdef1234567890',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Devices CRUD routes', () => {
  let server: http.Server;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = express();
    app.use(express.json());
    app.use('/', devicesRouter);
    app.use(errorHandler);

    server = await startServer(app);
  });

  afterEach(async () => {
    await closeServer(server);
  });

  // -------------------------------------------------------------------------
  // GET /devices
  // -------------------------------------------------------------------------

  it('GET /devices returns the user\'s devices', async () => {
    mockGetDevices.mockResolvedValue([MOCK_DEVICE]);

    const response = await request(server, 'GET', '/devices');

    expect(response.status).toBe(200);
    expect(response.body.devices).toEqual([MOCK_DEVICE]);
    expect(mockGetDevices).toHaveBeenCalledWith('user-uuid-001');
  });

  it('GET /devices returns empty array when user has no devices', async () => {
    mockGetDevices.mockResolvedValue([]);

    const response = await request(server, 'GET', '/devices');

    expect(response.status).toBe(200);
    expect(response.body.devices).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // GET /devices/:id
  // -------------------------------------------------------------------------

  it('GET /devices/:id returns a single device', async () => {
    mockGetDeviceById.mockResolvedValue(MOCK_DEVICE);

    const response = await request(server, 'GET', '/devices/device-uuid-001');

    expect(response.status).toBe(200);
    expect(response.body.device).toEqual(MOCK_DEVICE);
    expect(mockGetDeviceById).toHaveBeenCalledWith('device-uuid-001');
  });

  it('GET /devices/:id returns 404 when device not found', async () => {
    mockGetDeviceById.mockResolvedValue(null);

    const response = await request(server, 'GET', '/devices/nonexistent');

    expect(response.status).toBe(404);
    expect((response.body.error as any)?.message).toMatch(/not found/i);
  });

  it('GET /devices/:id returns 403 when device belongs to another user', async () => {
    const otherDevice = { ...MOCK_DEVICE, user_id: 'other-user-uuid' };
    mockGetDeviceById.mockResolvedValue(otherDevice);

    const response = await request(server, 'GET', '/devices/device-uuid-001');

    expect(response.status).toBe(403);
    expect((response.body.error as any)?.message).toMatch(/forbidden/i);
  });

  // -------------------------------------------------------------------------
  // POST /devices
  // -------------------------------------------------------------------------

  it('POST /devices creates a new device and returns 201', async () => {
    const createInput = {
      device_token: 'tok_abcdef1234567890',
      name: 'Living Room Node',
    };

    mockGetDeviceByTokenAndUser.mockResolvedValue(null);
    mockCreateDevice.mockResolvedValue(MOCK_DEVICE);
    mockMintDeviceNFT.mockResolvedValue({ mintAddress: 'mint-addr-001' });

    const response = await request(server, 'POST', '/devices', createInput);

    expect(response.status).toBe(201);
    expect(response.body.device).toEqual(MOCK_DEVICE);
    expect(mockGetDeviceByTokenAndUser).toHaveBeenCalledWith(
      createInput.device_token,
      'user-uuid-001'
    );
    expect(mockCreateDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        device_token: createInput.device_token,
        name: createInput.name,
        user_id: 'user-uuid-001',
        is_online: true,
      })
    );
  });

  it('POST /devices returns 409 when device token is already registered for this user', async () => {
    mockGetDeviceByTokenAndUser.mockResolvedValue(MOCK_DEVICE);

    const response = await request(server, 'POST', '/devices', {
      device_token: 'tok_abcdef1234567890',
    });

    expect(response.status).toBe(409);
    expect((response.body.error as any)?.message).toMatch(/already registered/i);
    expect(mockCreateDevice).not.toHaveBeenCalled();
  });

  it('POST /devices returns error when device_token is missing', async () => {
    const response = await request(server, 'POST', '/devices', { name: 'Test' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThanOrEqual(500);
    expect((response.body.error as any)?.message).toBeDefined();
  });

  it('POST /devices returns error when device_token is too short', async () => {
    const response = await request(server, 'POST', '/devices', {
      device_token: 'short',
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThanOrEqual(500);
    expect((response.body.error as any)?.message).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // DELETE /devices/:id
  // -------------------------------------------------------------------------

  it('DELETE /devices/:id deletes the device and returns ok', async () => {
    mockGetDeviceById.mockResolvedValue(MOCK_DEVICE);
    mockDeleteDevice.mockResolvedValue(undefined);

    const response = await request(server, 'DELETE', '/devices/device-uuid-001');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(mockDeleteDevice).toHaveBeenCalledWith('device-uuid-001');
  });

  it('DELETE /devices/:id returns 404 when device not found', async () => {
    mockGetDeviceById.mockResolvedValue(null);

    const response = await request(server, 'DELETE', '/devices/nonexistent');

    expect(response.status).toBe(404);
    expect(mockDeleteDevice).not.toHaveBeenCalled();
  });

  it('DELETE /devices/:id returns 403 when device belongs to another user', async () => {
    const otherDevice = { ...MOCK_DEVICE, user_id: 'other-user-uuid' };
    mockGetDeviceById.mockResolvedValue(otherDevice);

    const response = await request(server, 'DELETE', '/devices/device-uuid-001');

    expect(response.status).toBe(403);
    expect(mockDeleteDevice).not.toHaveBeenCalled();
  });
});
