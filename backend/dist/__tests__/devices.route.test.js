"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_http_1 = __importDefault(require("node:http"));
const vitest_1 = require("vitest");
// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockGetDevices, mockGetDeviceById, mockCreateDevice, mockDeleteDevice, mockGetDeviceByTokenAndUser, mockUpdateNftMintAddress, mockMintDeviceNFT, mockEnqueueSolanaEvent, mockEmitToDevice, } = vitest_1.vi.hoisted(() => ({
    mockGetDevices: vitest_1.vi.fn(),
    mockGetDeviceById: vitest_1.vi.fn(),
    mockCreateDevice: vitest_1.vi.fn(),
    mockDeleteDevice: vitest_1.vi.fn(),
    mockGetDeviceByTokenAndUser: vitest_1.vi.fn(),
    mockUpdateNftMintAddress: vitest_1.vi.fn(),
    mockMintDeviceNFT: vitest_1.vi.fn(),
    mockEnqueueSolanaEvent: vitest_1.vi.fn(),
    mockEmitToDevice: vitest_1.vi.fn(),
}));
// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vitest_1.vi.mock('@sentry/node', () => ({
    init: vitest_1.vi.fn(),
    captureException: vitest_1.vi.fn(),
    setUser: vitest_1.vi.fn(),
    Handlers: {
        requestHandler: () => (_req, _res, next) => next(),
        errorHandler: () => (_err, _req, _res, next) => next(),
    },
}));
vitest_1.vi.mock('../config', () => ({
    config: {
        JWT_SECRET: 'test-jwt-secret',
        FRONTEND_URL: 'http://localhost:3000',
        PUBLIC_URL: 'http://localhost:3001',
    },
}));
vitest_1.vi.mock('../middleware/auth', () => ({
    authMiddleware: vitest_1.vi.fn((req, _res, next) => {
        req.user = { id: 'user-uuid-001', walletAddress: null, email: 'test@example.com' };
        next();
    }),
}));
vitest_1.vi.mock('../middleware/rateLimit', () => ({
    defaultLimiter: vitest_1.vi.fn((_req, _res, next) => next()),
    authLimiter: vitest_1.vi.fn((_req, _res, next) => next()),
}));
vitest_1.vi.mock('../lib/db/devices', () => ({
    getDevices: mockGetDevices,
    getDeviceById: mockGetDeviceById,
    createDevice: mockCreateDevice,
    deleteDevice: mockDeleteDevice,
    updateDevice: vitest_1.vi.fn(),
    getDeviceByTokenAndUser: mockGetDeviceByTokenAndUser,
    updateNftMintAddress: mockUpdateNftMintAddress,
}));
vitest_1.vi.mock('../services/nft', () => ({
    mintDeviceNFT: mockMintDeviceNFT,
}));
vitest_1.vi.mock('../blockchain/solanaQueue', () => ({
    enqueueSolanaEvent: mockEnqueueSolanaEvent,
}));
vitest_1.vi.mock('../blockchain/events', () => ({
    AURA_SOLANA_EVENTS: {
        DEVICE_MINTED: 'DEVICE_MINTED',
        SURGE_DETECTED: 'SURGE_DETECTED',
    },
}));
vitest_1.vi.mock('../socket', () => ({
    emitToDevice: mockEmitToDevice,
}));
vitest_1.vi.mock('../socket/events', () => ({
    SOCKET_EVENTS: {
        DEVICE_PAIRED: 'device:paired',
        THREAT_NEW: 'threat:new',
        ALERTA_UPDATE: 'alerta:update',
    },
}));
vitest_1.vi.mock('../lib/db/threat_events', () => ({
    insertEvent: vitest_1.vi.fn(),
    updateAlertaStatus: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../services/alerta', () => ({
    sendAlert: vitest_1.vi.fn(),
    buildSurgePayload: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../lib/db/monthly_reports', () => ({
    upsertReport: vitest_1.vi.fn(),
    getReportById: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../services/lisk', () => ({
    writeMonthlyAudit: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../services/solana', () => ({
    initSolanaClient: vitest_1.vi.fn(),
    getWalletPublicKey: vitest_1.vi.fn(),
}));
// ---------------------------------------------------------------------------
// Import router AFTER mocks
// ---------------------------------------------------------------------------
const devices_1 = __importDefault(require("../routes/devices"));
const errorHandler_1 = require("../middleware/errorHandler");
function startServer(app) {
    return new Promise((resolve, reject) => {
        const server = node_http_1.default.createServer(app);
        server.listen(0, '127.0.0.1', () => resolve(server));
        server.on('error', reject);
    });
}
function closeServer(server) {
    return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}
function request(server, method, path, body) {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        const payload = body ? JSON.stringify(body) : undefined;
        const req = node_http_1.default.request({
            hostname: '127.0.0.1',
            port: addr.port,
            method,
            path,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload ? Buffer.byteLength(payload) : 0,
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode ?? 0,
                    body: data ? JSON.parse(data) : {},
                });
            });
        });
        req.on('error', reject);
        if (payload)
            req.write(payload);
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
(0, vitest_1.describe)('Devices CRUD routes', () => {
    let server;
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.clearAllMocks();
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/', devices_1.default);
        app.use(errorHandler_1.errorHandler);
        server = await startServer(app);
    });
    (0, vitest_1.afterEach)(async () => {
        await closeServer(server);
    });
    // -------------------------------------------------------------------------
    // GET /devices
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('GET /devices returns the user\'s devices', async () => {
        mockGetDevices.mockResolvedValue([MOCK_DEVICE]);
        const response = await request(server, 'GET', '/devices');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.devices).toEqual([MOCK_DEVICE]);
        (0, vitest_1.expect)(mockGetDevices).toHaveBeenCalledWith('user-uuid-001');
    });
    (0, vitest_1.it)('GET /devices returns empty array when user has no devices', async () => {
        mockGetDevices.mockResolvedValue([]);
        const response = await request(server, 'GET', '/devices');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.devices).toEqual([]);
    });
    // -------------------------------------------------------------------------
    // GET /devices/:id
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('GET /devices/:id returns a single device', async () => {
        mockGetDeviceById.mockResolvedValue(MOCK_DEVICE);
        const response = await request(server, 'GET', '/devices/device-uuid-001');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.device).toEqual(MOCK_DEVICE);
        (0, vitest_1.expect)(mockGetDeviceById).toHaveBeenCalledWith('device-uuid-001');
    });
    (0, vitest_1.it)('GET /devices/:id returns 404 when device not found', async () => {
        mockGetDeviceById.mockResolvedValue(null);
        const response = await request(server, 'GET', '/devices/nonexistent');
        (0, vitest_1.expect)(response.status).toBe(404);
        (0, vitest_1.expect)(response.body.error?.message).toMatch(/not found/i);
    });
    (0, vitest_1.it)('GET /devices/:id returns 403 when device belongs to another user', async () => {
        const otherDevice = { ...MOCK_DEVICE, user_id: 'other-user-uuid' };
        mockGetDeviceById.mockResolvedValue(otherDevice);
        const response = await request(server, 'GET', '/devices/device-uuid-001');
        (0, vitest_1.expect)(response.status).toBe(403);
        (0, vitest_1.expect)(response.body.error?.message).toMatch(/forbidden/i);
    });
    // -------------------------------------------------------------------------
    // POST /devices
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('POST /devices creates a new device and returns 201', async () => {
        const createInput = {
            device_token: 'tok_abcdef1234567890',
            name: 'Living Room Node',
        };
        mockGetDeviceByTokenAndUser.mockResolvedValue(null);
        mockCreateDevice.mockResolvedValue(MOCK_DEVICE);
        mockMintDeviceNFT.mockResolvedValue({ mintAddress: 'mint-addr-001' });
        const response = await request(server, 'POST', '/devices', createInput);
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(response.body.device).toEqual(MOCK_DEVICE);
        (0, vitest_1.expect)(mockGetDeviceByTokenAndUser).toHaveBeenCalledWith(createInput.device_token, 'user-uuid-001');
        (0, vitest_1.expect)(mockCreateDevice).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            device_token: createInput.device_token,
            name: createInput.name,
            user_id: 'user-uuid-001',
            is_online: true,
        }));
    });
    (0, vitest_1.it)('POST /devices returns 409 when device token is already registered for this user', async () => {
        mockGetDeviceByTokenAndUser.mockResolvedValue(MOCK_DEVICE);
        const response = await request(server, 'POST', '/devices', {
            device_token: 'tok_abcdef1234567890',
        });
        (0, vitest_1.expect)(response.status).toBe(409);
        (0, vitest_1.expect)(response.body.error?.message).toMatch(/already registered/i);
        (0, vitest_1.expect)(mockCreateDevice).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('POST /devices returns error when device_token is missing', async () => {
        const response = await request(server, 'POST', '/devices', { name: 'Test' });
        (0, vitest_1.expect)(response.status).toBeGreaterThanOrEqual(400);
        (0, vitest_1.expect)(response.status).toBeLessThanOrEqual(500);
        (0, vitest_1.expect)(response.body.error?.message).toBeDefined();
    });
    (0, vitest_1.it)('POST /devices returns error when device_token is too short', async () => {
        const response = await request(server, 'POST', '/devices', {
            device_token: 'short',
        });
        (0, vitest_1.expect)(response.status).toBeGreaterThanOrEqual(400);
        (0, vitest_1.expect)(response.status).toBeLessThanOrEqual(500);
        (0, vitest_1.expect)(response.body.error?.message).toBeDefined();
    });
    // -------------------------------------------------------------------------
    // DELETE /devices/:id
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('DELETE /devices/:id deletes the device and returns ok', async () => {
        mockGetDeviceById.mockResolvedValue(MOCK_DEVICE);
        mockDeleteDevice.mockResolvedValue(undefined);
        const response = await request(server, 'DELETE', '/devices/device-uuid-001');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.ok).toBe(true);
        (0, vitest_1.expect)(mockDeleteDevice).toHaveBeenCalledWith('device-uuid-001');
    });
    (0, vitest_1.it)('DELETE /devices/:id returns 404 when device not found', async () => {
        mockGetDeviceById.mockResolvedValue(null);
        const response = await request(server, 'DELETE', '/devices/nonexistent');
        (0, vitest_1.expect)(response.status).toBe(404);
        (0, vitest_1.expect)(mockDeleteDevice).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('DELETE /devices/:id returns 403 when device belongs to another user', async () => {
        const otherDevice = { ...MOCK_DEVICE, user_id: 'other-user-uuid' };
        mockGetDeviceById.mockResolvedValue(otherDevice);
        const response = await request(server, 'DELETE', '/devices/device-uuid-001');
        (0, vitest_1.expect)(response.status).toBe(403);
        (0, vitest_1.expect)(mockDeleteDevice).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=devices.route.test.js.map