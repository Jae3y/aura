"use strict";
/**
 * Integration test: Alerta webhook → DB + Socket.io
 *
 * Validates: Property 8
 * "For any valid webhook payload, exactly one threat_events.alerta_status is
 * updated; no other rows modified. Socket.io alerta:update is emitted to the
 * device owner's room."
 *
 * Strategy:
 *  - Build a lightweight Express app mounting the /alerta router directly.
 *  - Mock the DB layer (findByAlertaId, updateAlertaStatus) and the Socket.io
 *    emitToDevice helper so no real network calls are made.
 *  - Generate a valid HMAC-SHA256 signature using a deterministic test secret
 *    so the signature path is exercised end-to-end.
 *  - Run three scenarios: acknowledge → 'ack', close → 'closed', bad sig → 401.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const vitest_1 = require("vitest");
// ---------------------------------------------------------------------------
// We use vi.mock BEFORE any imports of the modules under test so Vitest can
// replace the module factory before the route file loads.
// ---------------------------------------------------------------------------
// Mock the DB helpers used by the webhook handler.
vitest_1.vi.mock('../lib/db/threat_events', () => ({
    findByAlertaId: vitest_1.vi.fn(),
    updateAlertaStatus: vitest_1.vi.fn(),
    insertEvent: vitest_1.vi.fn(),
    getEventsByDevice: vitest_1.vi.fn(),
    getEventById: vitest_1.vi.fn(),
    updateSolanaSignature: vitest_1.vi.fn(),
    setSolanaUnconfirmed: vitest_1.vi.fn(),
}));
// Mock the socket emitToDevice helper.
vitest_1.vi.mock('../socket', () => ({
    emitToDevice: vitest_1.vi.fn(),
    getIO: vitest_1.vi.fn(),
    initSocket: vitest_1.vi.fn(),
}));
// Mock Sentry so it doesn't try to connect to a real DSN.
vitest_1.vi.mock('@sentry/node', () => ({
    init: vitest_1.vi.fn(),
    captureException: vitest_1.vi.fn(),
    setUser: vitest_1.vi.fn(),
    Handlers: {
        requestHandler: () => (_req, _res, next) => next(),
        errorHandler: () => (_err, _req, _res, next) => next(_err),
    },
}));
// ---------------------------------------------------------------------------
// Import mocked modules so we can configure and inspect them.
// ---------------------------------------------------------------------------
const threatEventsDb = __importStar(require("../lib/db/threat_events"));
const socketModule = __importStar(require("../socket"));
// Import the router AFTER mocks are in place.
const alerta_1 = __importDefault(require("../routes/alerta"));
const errorHandler_1 = require("../middleware/errorHandler");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// Must match the dev fallback in config/index.ts so HMAC verification
// uses the same secret that the config module already loaded.
const TEST_ALERTA_API_KEY = 'dev-alerta-key';
/** Matches the threat event the webhook is referencing */
const MOCK_THREAT_EVENT = {
    id: 'threat-uuid-001',
    device_id: 'device-uuid-abc',
    alerta_alert_id: 'ALT-5555',
    alerta_status: 'open',
    event_type: 'surge',
    severity: 'high',
    occurred_at: new Date().toISOString(),
};
// ---------------------------------------------------------------------------
// Build the Express app under test
// ---------------------------------------------------------------------------
function buildApp() {
    const app = (0, express_1.default)();
    // Mirror exactly what src/index.ts does: capture raw body on the webhook
    // path so HMAC can be verified.
    app.use('/alerta/webhook', express_1.default.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use('/alerta', alerta_1.default);
    app.use(errorHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Compute the HMAC-SHA256 signature for a body string. */
function sign(body, secret = TEST_ALERTA_API_KEY) {
    return 'sha256=' + crypto_1.default.createHmac('sha256', secret).update(body).digest('hex');
}
/**
 * POST /alerta/webhook using Node's built-in http module (no supertest
 * dependency required — vitest can run this natively).
 */
function postWebhook(server, payload, options = {}) {
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(payload);
        const addr = server.address();
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': String(Buffer.byteLength(bodyStr)),
        };
        if (options.withSignature) {
            headers['x-alerta-signature'] = sign(bodyStr);
        }
        else if (options.badSignature) {
            headers['x-alerta-signature'] = 'sha256=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb';
        }
        const req = http_1.default.request({ hostname: '127.0.0.1', port: addr.port, path: '/alerta/webhook', method: 'POST', headers }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
                }
                catch {
                    resolve({ status: res.statusCode ?? 0, body: data });
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(0, vitest_1.describe)('Integration: POST /alerta/webhook → DB + Socket.io (Property 8)', () => {
    let server;
    (0, vitest_1.beforeAll)(() => {
        const app = buildApp();
        server = http_1.default.createServer(app);
        return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    });
    (0, vitest_1.afterAll)(() => {
        return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    });
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Default: findByAlertaId returns the mock threat event.
        vitest_1.vi.mocked(threatEventsDb.findByAlertaId).mockResolvedValue(MOCK_THREAT_EVENT);
        // updateAlertaStatus resolves without errors.
        vitest_1.vi.mocked(threatEventsDb.updateAlertaStatus).mockResolvedValue(undefined);
        // emitToDevice is a no-op.
        vitest_1.vi.mocked(socketModule.emitToDevice).mockImplementation(() => { });
    });
    // -------------------------------------------------------------------------
    // 1. acknowledge action → alerta_status = 'ack'
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('acknowledge payload: updates alerta_status to "ack" and emits alerta:update', async () => {
        const payload = { action: 'acknowledge', alertId: 'ALT-5555' };
        const { status, body } = await postWebhook(server, payload);
        (0, vitest_1.expect)(status).toBe(200);
        (0, vitest_1.expect)(body.ok).toBe(true);
        (0, vitest_1.expect)(body.alertaStatus).toBe('ack');
        (0, vitest_1.expect)(body.threatId).toBe(MOCK_THREAT_EVENT.id);
        // DB: findByAlertaId called with the correct alertId.
        (0, vitest_1.expect)(threatEventsDb.findByAlertaId).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(threatEventsDb.findByAlertaId).toHaveBeenCalledWith('ALT-5555');
        // DB: updateAlertaStatus called exactly once with correct args.
        (0, vitest_1.expect)(threatEventsDb.updateAlertaStatus).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(threatEventsDb.updateAlertaStatus).toHaveBeenCalledWith(MOCK_THREAT_EVENT.id, 'ALT-5555', 'ack');
        // Socket.io: emitToDevice called with device_id, 'alerta:update', and correct payload.
        (0, vitest_1.expect)(socketModule.emitToDevice).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(socketModule.emitToDevice).toHaveBeenCalledWith(MOCK_THREAT_EVENT.device_id, 'alerta:update', vitest_1.expect.objectContaining({
            threatId: MOCK_THREAT_EVENT.id,
            alertId: 'ALT-5555',
            alertaStatus: 'ack',
        }));
    });
    // -------------------------------------------------------------------------
    // 2. close action → alerta_status = 'closed'
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('close payload: updates alerta_status to "closed" and emits alerta:update', async () => {
        const payload = { action: 'close', alertId: 'ALT-5555' };
        const { status, body } = await postWebhook(server, payload);
        (0, vitest_1.expect)(status).toBe(200);
        (0, vitest_1.expect)(body.ok).toBe(true);
        (0, vitest_1.expect)(body.alertaStatus).toBe('closed');
        (0, vitest_1.expect)(threatEventsDb.updateAlertaStatus).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(threatEventsDb.updateAlertaStatus).toHaveBeenCalledWith(MOCK_THREAT_EVENT.id, 'ALT-5555', 'closed');
        (0, vitest_1.expect)(socketModule.emitToDevice).toHaveBeenCalledOnce();
        const emitCall = vitest_1.vi.mocked(socketModule.emitToDevice).mock.calls[0];
        (0, vitest_1.expect)(emitCall[2]).toMatchObject({ alertaStatus: 'closed' });
    });
    // -------------------------------------------------------------------------
    // 3. HMAC signature verification — valid signature passes
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('accepts request with valid HMAC signature', async () => {
        const payload = { action: 'acknowledge', alertId: 'ALT-5555' };
        const { status } = await postWebhook(server, payload, { withSignature: true });
        (0, vitest_1.expect)(status).toBe(200);
    });
    // -------------------------------------------------------------------------
    // 4. HMAC signature verification — bad signature is rejected with 401
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('rejects request with invalid HMAC signature (401)', async () => {
        const payload = { action: 'acknowledge', alertId: 'ALT-5555' };
        const { status, body } = await postWebhook(server, payload, { badSignature: true });
        (0, vitest_1.expect)(status).toBe(401);
        (0, vitest_1.expect)(body.error?.message).toMatch(/signature/i);
        // No DB or socket side effects on rejection.
        (0, vitest_1.expect)(threatEventsDb.updateAlertaStatus).not.toHaveBeenCalled();
        (0, vitest_1.expect)(socketModule.emitToDevice).not.toHaveBeenCalled();
    });
    // -------------------------------------------------------------------------
    // 5. Missing alertId → 400
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('returns 400 when alertId is missing', async () => {
        const payload = { action: 'acknowledge' }; // no alertId
        const { status, body } = await postWebhook(server, payload);
        (0, vitest_1.expect)(status).toBe(400);
        (0, vitest_1.expect)(body.error?.message).toMatch(/alertId/i);
        (0, vitest_1.expect)(threatEventsDb.updateAlertaStatus).not.toHaveBeenCalled();
        (0, vitest_1.expect)(socketModule.emitToDevice).not.toHaveBeenCalled();
    });
    // -------------------------------------------------------------------------
    // 6. Unknown alertId → 404 (alert not found in DB)
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('returns 404 when alertId is not found in DB', async () => {
        vitest_1.vi.mocked(threatEventsDb.findByAlertaId).mockResolvedValue(null);
        const payload = { action: 'acknowledge', alertId: 'ALT-NONEXISTENT' };
        const { status, body } = await postWebhook(server, payload);
        (0, vitest_1.expect)(status).toBe(404);
        (0, vitest_1.expect)(body.error?.message).toMatch(/not found/i);
        (0, vitest_1.expect)(threatEventsDb.updateAlertaStatus).not.toHaveBeenCalled();
        (0, vitest_1.expect)(socketModule.emitToDevice).not.toHaveBeenCalled();
    });
    // -------------------------------------------------------------------------
    // 7. Unknown action → 200 OK, no side effects (Property 8: only one row)
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('returns 200 for unknown action without any DB writes', async () => {
        const payload = { action: 'escalate', alertId: 'ALT-5555' };
        const { status, body } = await postWebhook(server, payload);
        (0, vitest_1.expect)(status).toBe(200);
        (0, vitest_1.expect)(body.ok).toBe(true);
        // No DB writes for unknown action.
        (0, vitest_1.expect)(threatEventsDb.findByAlertaId).not.toHaveBeenCalled();
        (0, vitest_1.expect)(threatEventsDb.updateAlertaStatus).not.toHaveBeenCalled();
        (0, vitest_1.expect)(socketModule.emitToDevice).not.toHaveBeenCalled();
    });
    // -------------------------------------------------------------------------
    // 8. Exactly ONE row updated — second call is independent (Property 8)
    // -------------------------------------------------------------------------
    (0, vitest_1.it)('each webhook call updates exactly one row (no cross-row contamination)', async () => {
        const secondEvent = { ...MOCK_THREAT_EVENT, id: 'threat-uuid-002', device_id: 'device-uuid-xyz' };
        // First call: event A.
        vitest_1.vi.mocked(threatEventsDb.findByAlertaId).mockResolvedValueOnce(MOCK_THREAT_EVENT);
        await postWebhook(server, { action: 'acknowledge', alertId: 'ALT-5555' });
        // Second call: event B.
        vitest_1.vi.mocked(threatEventsDb.findByAlertaId).mockResolvedValueOnce(secondEvent);
        await postWebhook(server, { action: 'close', alertId: 'ALT-6666' });
        // updateAlertaStatus called exactly once per request, for the right row.
        (0, vitest_1.expect)(threatEventsDb.updateAlertaStatus).toHaveBeenCalledTimes(2);
        const [firstCall, secondCall] = vitest_1.vi.mocked(threatEventsDb.updateAlertaStatus).mock.calls;
        (0, vitest_1.expect)(firstCall[0]).toBe('threat-uuid-001'); // event A id
        (0, vitest_1.expect)(secondCall[0]).toBe('threat-uuid-002'); // event B id
        // Socket.io emits to the correct device rooms.
        const socketCalls = vitest_1.vi.mocked(socketModule.emitToDevice).mock.calls;
        (0, vitest_1.expect)(socketCalls[0][0]).toBe('device-uuid-abc');
        (0, vitest_1.expect)(socketCalls[1][0]).toBe('device-uuid-xyz');
    });
});
//# sourceMappingURL=alerta-webhook.integration.test.js.map