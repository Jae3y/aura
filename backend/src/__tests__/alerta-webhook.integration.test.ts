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

import crypto from 'crypto';
import http from 'http';
import express from 'express';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// We use vi.mock BEFORE any imports of the modules under test so Vitest can
// replace the module factory before the route file loads.
// ---------------------------------------------------------------------------

// Mock the DB helpers used by the webhook handler.
vi.mock('../lib/db/threat_events', () => ({
  findByAlertaId: vi.fn(),
  updateAlertaStatus: vi.fn(),
  insertEvent: vi.fn(),
  getEventsByDevice: vi.fn(),
  getEventById: vi.fn(),
  updateSolanaSignature: vi.fn(),
  setSolanaUnconfirmed: vi.fn(),
}));

// Mock the socket emitToDevice helper.
vi.mock('../socket', () => ({
  emitToDevice: vi.fn(),
  getIO: vi.fn(),
  initSocket: vi.fn(),
}));

// Mock Sentry so it doesn't try to connect to a real DSN.
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  Handlers: {
    requestHandler: () => (_req: any, _res: any, next: any) => next(),
    errorHandler: () => (_err: any, _req: any, _res: any, next: any) => next(_err),
  },
}));

// ---------------------------------------------------------------------------
// Import mocked modules so we can configure and inspect them.
// ---------------------------------------------------------------------------
import * as threatEventsDb from '../lib/db/threat_events';
import * as socketModule from '../socket';

// Import the router AFTER mocks are in place.
import alertaRouter from '../routes/alerta';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

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
  alerta_status: 'open' as const,
  event_type: 'surge' as const,
  severity: 'high' as const,
  occurred_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Build the Express app under test
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();

  // Mirror exactly what src/index.ts does: capture raw body on the webhook
  // path so HMAC can be verified.
  app.use(
    '/alerta/webhook',
    express.json({
      verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/alerta', alertaRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the HMAC-SHA256 signature for a body string. */
function sign(body: string, secret = TEST_ALERTA_API_KEY): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * POST /alerta/webhook using Node's built-in http module (no supertest
 * dependency required — vitest can run this natively).
 */
function postWebhook(
  server: http.Server,
  payload: object,
  options: { withSignature?: boolean; badSignature?: boolean } = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const addr = server.address() as { port: number };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(bodyStr)),
    };

    if (options.withSignature) {
      headers['x-alerta-signature'] = sign(bodyStr);
    } else if (options.badSignature) {
      headers['x-alerta-signature'] = 'sha256=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb';
    }

    const req = http.request(
      { hostname: '127.0.0.1', port: addr.port, path: '/alerta/webhook', method: 'POST', headers },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode ?? 0, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration: POST /alerta/webhook → DB + Socket.io (Property 8)', () => {
  let server: http.Server;

  beforeAll(() => {
    const app = buildApp();
    server = http.createServer(app);
    return new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  afterAll(() => {
    return new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: findByAlertaId returns the mock threat event.
    vi.mocked(threatEventsDb.findByAlertaId).mockResolvedValue(MOCK_THREAT_EVENT as any);
    // updateAlertaStatus resolves without errors.
    vi.mocked(threatEventsDb.updateAlertaStatus).mockResolvedValue(undefined);
    // emitToDevice is a no-op.
    vi.mocked(socketModule.emitToDevice).mockImplementation(() => {});
  });

  // -------------------------------------------------------------------------
  // 1. acknowledge action → alerta_status = 'ack'
  // -------------------------------------------------------------------------
  it('acknowledge payload: updates alerta_status to "ack" and emits alerta:update', async () => {
    const payload = { action: 'acknowledge', alertId: 'ALT-5555' };
    const { status, body } = await postWebhook(server, payload);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.alertaStatus).toBe('ack');
    expect(body.threatId).toBe(MOCK_THREAT_EVENT.id);

    // DB: findByAlertaId called with the correct alertId.
    expect(threatEventsDb.findByAlertaId).toHaveBeenCalledOnce();
    expect(threatEventsDb.findByAlertaId).toHaveBeenCalledWith('ALT-5555');

    // DB: updateAlertaStatus called exactly once with correct args.
    expect(threatEventsDb.updateAlertaStatus).toHaveBeenCalledOnce();
    expect(threatEventsDb.updateAlertaStatus).toHaveBeenCalledWith(
      MOCK_THREAT_EVENT.id,
      'ALT-5555',
      'ack'
    );

    // Socket.io: emitToDevice called with device_id, 'alerta:update', and correct payload.
    expect(socketModule.emitToDevice).toHaveBeenCalledOnce();
    expect(socketModule.emitToDevice).toHaveBeenCalledWith(
      MOCK_THREAT_EVENT.device_id,
      'alerta:update',
      expect.objectContaining({
        threatId: MOCK_THREAT_EVENT.id,
        alertId: 'ALT-5555',
        alertaStatus: 'ack',
      })
    );
  });

  // -------------------------------------------------------------------------
  // 2. close action → alerta_status = 'closed'
  // -------------------------------------------------------------------------
  it('close payload: updates alerta_status to "closed" and emits alerta:update', async () => {
    const payload = { action: 'close', alertId: 'ALT-5555' };
    const { status, body } = await postWebhook(server, payload);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.alertaStatus).toBe('closed');

    expect(threatEventsDb.updateAlertaStatus).toHaveBeenCalledOnce();
    expect(threatEventsDb.updateAlertaStatus).toHaveBeenCalledWith(
      MOCK_THREAT_EVENT.id,
      'ALT-5555',
      'closed'
    );

    expect(socketModule.emitToDevice).toHaveBeenCalledOnce();
    const emitCall = vi.mocked(socketModule.emitToDevice).mock.calls[0];
    expect(emitCall[2]).toMatchObject({ alertaStatus: 'closed' });
  });

  // -------------------------------------------------------------------------
  // 3. HMAC signature verification — valid signature passes
  // -------------------------------------------------------------------------
  it('accepts request with valid HMAC signature', async () => {
    const payload = { action: 'acknowledge', alertId: 'ALT-5555' };
    const { status } = await postWebhook(server, payload, { withSignature: true });
    expect(status).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 4. HMAC signature verification — bad signature is rejected with 401
  // -------------------------------------------------------------------------
  it('rejects request with invalid HMAC signature (401)', async () => {
    const payload = { action: 'acknowledge', alertId: 'ALT-5555' };
    const { status, body } = await postWebhook(server, payload, { badSignature: true });

    expect(status).toBe(401);
    expect(body.error?.message).toMatch(/signature/i);

    // No DB or socket side effects on rejection.
    expect(threatEventsDb.updateAlertaStatus).not.toHaveBeenCalled();
    expect(socketModule.emitToDevice).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 5. Missing alertId → 400
  // -------------------------------------------------------------------------
  it('returns 400 when alertId is missing', async () => {
    const payload = { action: 'acknowledge' }; // no alertId
    const { status, body } = await postWebhook(server, payload);

    expect(status).toBe(400);
    expect(body.error?.message).toMatch(/alertId/i);
    expect(threatEventsDb.updateAlertaStatus).not.toHaveBeenCalled();
    expect(socketModule.emitToDevice).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. Unknown alertId → 404 (alert not found in DB)
  // -------------------------------------------------------------------------
  it('returns 404 when alertId is not found in DB', async () => {
    vi.mocked(threatEventsDb.findByAlertaId).mockResolvedValue(null);

    const payload = { action: 'acknowledge', alertId: 'ALT-NONEXISTENT' };
    const { status, body } = await postWebhook(server, payload);

    expect(status).toBe(404);
    expect(body.error?.message).toMatch(/not found/i);
    expect(threatEventsDb.updateAlertaStatus).not.toHaveBeenCalled();
    expect(socketModule.emitToDevice).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 7. Unknown action → 200 OK, no side effects (Property 8: only one row)
  // -------------------------------------------------------------------------
  it('returns 200 for unknown action without any DB writes', async () => {
    const payload = { action: 'escalate', alertId: 'ALT-5555' };
    const { status, body } = await postWebhook(server, payload);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    // No DB writes for unknown action.
    expect(threatEventsDb.findByAlertaId).not.toHaveBeenCalled();
    expect(threatEventsDb.updateAlertaStatus).not.toHaveBeenCalled();
    expect(socketModule.emitToDevice).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 8. Exactly ONE row updated — second call is independent (Property 8)
  // -------------------------------------------------------------------------
  it('each webhook call updates exactly one row (no cross-row contamination)', async () => {
    const secondEvent = { ...MOCK_THREAT_EVENT, id: 'threat-uuid-002', device_id: 'device-uuid-xyz' };

    // First call: event A.
    vi.mocked(threatEventsDb.findByAlertaId).mockResolvedValueOnce(MOCK_THREAT_EVENT as any);
    await postWebhook(server, { action: 'acknowledge', alertId: 'ALT-5555' });

    // Second call: event B.
    vi.mocked(threatEventsDb.findByAlertaId).mockResolvedValueOnce(secondEvent as any);
    await postWebhook(server, { action: 'close', alertId: 'ALT-6666' });

    // updateAlertaStatus called exactly once per request, for the right row.
    expect(threatEventsDb.updateAlertaStatus).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = vi.mocked(threatEventsDb.updateAlertaStatus).mock.calls;
    expect(firstCall[0]).toBe('threat-uuid-001');   // event A id
    expect(secondCall[0]).toBe('threat-uuid-002');  // event B id

    // Socket.io emits to the correct device rooms.
    const socketCalls = vi.mocked(socketModule.emitToDevice).mock.calls;
    expect(socketCalls[0][0]).toBe('device-uuid-abc');
    expect(socketCalls[1][0]).toBe('device-uuid-xyz');
  });
});
