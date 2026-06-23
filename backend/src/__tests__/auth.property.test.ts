/**
 * Property tests for Authentication middleware
 *
 * Task 3.1: Unauthenticated requests always return HTTP 401
 * Task 3.2: Sentry user context set on authenticated requests
 *
 * Validates: Property 1 (auth boundary) and Property 2 (Sentry context)
 * Requirements: 1.4, 1.5, 1.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import express, { Router, type Express } from 'express';
import http from 'node:http';

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports that use these modules.
// ---------------------------------------------------------------------------

// Mock Sentry so we can inspect setUser calls without a real DSN.
const mockSetUser = vi.fn();
const mockCaptureException = vi.fn();
vi.mock('@sentry/node', () => ({
  setUser: mockSetUser,
  captureException: mockCaptureException,
  init: vi.fn(),
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

// Mock Supabase anon client (used by auth middleware for JWT verification).
const mockGetUser = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabaseAnon: { auth: { getUser: mockGetUser } },
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({
        select: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
    }),
    auth: { admin: { signOut: vi.fn() } },
  },
}));

// Mock the profiles DB helper.
const mockGetProfileById = vi.fn();
vi.mock('../lib/db/profiles', () => ({
  getProfileById: mockGetProfileById,
  upsertProfile: vi.fn(),
  updateWalletAddress: vi.fn(),
  updateFcmToken: vi.fn(),
  getOwnerProfileForDevice: vi.fn(),
}));

// Mock config so the module loads without real env vars.
vi.mock('../config', () => ({
  config: {
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    JWT_SECRET: 'test-jwt-secret',
    SENTRY_DSN: undefined,
    NODE_ENV: 'test',
    PORT: 3001,
    MOCK_INTEGRATIONS: true,
    FRONTEND_URL: 'http://localhost:3000',
    HIVEMQ_URL: 'mqtt://localhost:1883',
    HIVEMQ_USER: 'test',
    HIVEMQ_PASS: 'test',
    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    SOLANA_KEYPAIR: 'test',
    ALERTA_API_KEY: 'test',
    ALERTA_API_SECRET: 'test',
    ALERTA_BASE_URL: 'https://api.alerta.io/v2',
    ALERTA_CHANNEL_REF: 'test',
    FCM_PROJECT_ID: 'test',
    RESEND_API_KEY: 'test',
    RESEND_FROM: 'test@test.com',
  },
}));

import { authMiddleware } from '../middleware/auth';
import type { Profile } from '../types/database';

// ---------------------------------------------------------------------------
// Lightweight HTTP test client (no supertest dependency)
// ---------------------------------------------------------------------------

interface TestResponse {
  status: number;
  body: Record<string, unknown>;
  rawBody: string;
}

/**
 * Make an HTTP request against a running http.Server.
 * Returns status code and parsed JSON body.
 */
function httpRequest(
  server: http.Server,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: string
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(data);
        } catch {
          // not JSON — leave as empty object
        }
        resolve({ status: res.statusCode ?? 0, body: parsed, rawBody: data });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Start the Express app on an ephemeral port and return the server.
 * Call server.close() in afterEach / afterAll.
 */
function startServer(app: Express): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

/** Close a server and wait for all connections to drain. */
function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

/**
 * Build a minimal Express app that protects a /protected route
 * with the authMiddleware under test.
 */
function buildApp(): Express {
  const app = express();
  app.use(express.json());

  const protectedRouter = Router();
  protectedRouter.use(authMiddleware);

  protectedRouter.get('/protected', (_req, res) => {
    res.json({ secret: 'data' });
  });
  protectedRouter.post('/protected', (_req, res) => {
    res.json({ secret: 'data' });
  });
  protectedRouter.delete('/protected', (_req, res) => {
    res.json({ ok: true });
  });
  protectedRouter.patch('/protected', (_req, res) => {
    res.json({ ok: true });
  });

  app.use(protectedRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Solana base58 alphabet (excludes 0, O, I, l)
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Arbitrary Solana-style wallet address (32–44 base58 characters). */
const walletAddressArb = fc
  .array(fc.integer({ min: 0, max: BASE58_CHARS.length - 1 }), {
    minLength: 32,
    maxLength: 44,
  })
  .map((indices) => indices.map((i) => BASE58_CHARS[i]).join(''));

/** Arbitrary UUID string. */
const uuidArb = fc
  .tuple(
    fc.hexaString({ minLength: 8, maxLength: 8 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 12, maxLength: 12 })
  )
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

// ===========================================================================
// Task 3.1 — Property: unauthenticated requests always return HTTP 401
// ===========================================================================

describe('Property 1: Unauthenticated requests always return HTTP 401', () => {
  let server: http.Server;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: Supabase rejects all tokens
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no auth') });
    mockGetProfileById.mockResolvedValue(null);
    server = await startServer(buildApp());
  });

  // We close in afterEach via an async callback — vitest supports this.
  // Using a local variable keeps test isolation clean.
  it('returns 401 when no Authorization header is present — all HTTP methods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('GET', 'POST', 'PATCH', 'DELETE'),
        async (method) => {
          const res = await httpRequest(server, method, '/protected');
          expect(res.status).toBe(401);
          expect(res.body).toHaveProperty('error');
          expect(res.body).not.toHaveProperty('secret');
        }
      ),
      { numRuns: 20 }
    );
    await closeServer(server);
  });

  it('returns 401 for arbitrary malformed Authorization header values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),                               // empty string
          fc.constant('Basic dXNlcjpwYXNz'),            // Basic auth scheme
          fc.constant('Bearer '),                        // Bearer with no token
          fc.constant('bearer eyJhbGciOiJIUzI1NiJ9'),   // lower-case scheme
          fc.string({ minLength: 1, maxLength: 64 })    // random garbage
        ),
        async (authHeader) => {
          const res = await httpRequest(server, 'GET', '/protected', {
            Authorization: authHeader,
          });
          expect(res.status).toBe(401);
          expect(res.body).toHaveProperty('error');
          expect(res.body).not.toHaveProperty('secret');
        }
      ),
      { numRuns: 50 }
    );
    await closeServer(server);
  });

  it('returns 401 when Supabase JWT verification fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 200 }),
        async (fakeToken) => {
          mockGetUser.mockResolvedValue({
            data: { user: null },
            error: new Error('JWT is invalid'),
          });
          const res = await httpRequest(server, 'GET', '/protected', {
            Authorization: `Bearer ${fakeToken}`,
          });
          expect(res.status).toBe(401);
          expect(res.body).toHaveProperty('error');
          expect(res.body).not.toHaveProperty('secret');
        }
      ),
      { numRuns: 30 }
    );
    await closeServer(server);
  });

  it('returns 401 when JWT is valid but profile does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, walletAddressArb, async (userId, _wallet) => {
        mockGetUser.mockResolvedValue({
          data: { user: { id: userId, email: `${userId}@wallet.aura` } },
          error: null,
        });
        mockGetProfileById.mockResolvedValue(null);

        const res = await httpRequest(server, 'GET', '/protected', {
          Authorization: 'Bearer valid.jwt.token',
        });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
        expect(res.body).not.toHaveProperty('secret');
      }),
      { numRuns: 20 }
    );
    await closeServer(server);
  });

  it('never leaks JWT internals in 401 responses', async () => {
    const res = await httpRequest(server, 'GET', '/protected', {
      Authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc',
    });
    expect(res.status).toBe(401);
    // Must not echo back any token segment or internal details
    expect(res.rawBody).not.toMatch(/eyJ/);
    expect(res.rawBody).not.toMatch(/signature/);
    // The word "secret" must not appear in the response body
    expect(res.rawBody.toLowerCase()).not.toMatch(/\bsecret\b/);
    await closeServer(server);
  });
});

// ===========================================================================
// Task 3.2 — Property: Sentry user context set on authenticated requests
// ===========================================================================

describe('Property 2: Sentry user context set on authenticated requests', () => {
  let server: http.Server;

  beforeEach(async () => {
    vi.clearAllMocks();
    server = await startServer(buildApp());
  });

  it('calls Sentry.setUser with the walletAddress for any authenticated request', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        walletAddressArb,
        fc.constantFrom('GET', 'POST', 'PATCH', 'DELETE'),
        async (userId, walletAddress, method) => {
          const profile: Profile = {
            id: userId,
            full_name: null,
            email: `${walletAddress.toLowerCase()}@wallet.aura`,
            avatar_url: null,
            environment_type: 'home',
            wallet_address: walletAddress,
            lisk_wallet_address: null,
            fcm_token: null,
            notification_email: true,
            notification_push: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          mockGetUser.mockResolvedValue({
            data: { user: { id: userId, email: profile.email } },
            error: null,
          });
          mockGetProfileById.mockResolvedValue(profile);
          mockSetUser.mockClear();

          const res = await httpRequest(server, method, '/protected', {
            Authorization: 'Bearer valid.jwt.token',
          });

          // Request must succeed
          expect(res.status).toBe(200);

          // Sentry.setUser must have been called exactly once per request
          expect(mockSetUser).toHaveBeenCalledTimes(1);

          // Must set the correct wallet address as username
          const [sentryUser] = mockSetUser.mock.calls[0];
          expect(sentryUser).toMatchObject({ username: walletAddress });
        }
      ),
      { numRuns: 25 }
    );
    await closeServer(server);
  });

  it('sets Sentry user context with the correct walletAddress (not a different user)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(uuidArb, walletAddressArb),
        fc.tuple(uuidArb, walletAddressArb),
        async ([userId1, wallet1], [userId2, wallet2]) => {
          // Precondition: the two users must be distinct
          fc.pre(userId1 !== userId2 && wallet1 !== wallet2);

          const makeProfile = (id: string, wallet: string): Profile => ({
            id,
            full_name: null,
            email: `${wallet.toLowerCase()}@wallet.aura`,
            avatar_url: null,
            environment_type: 'home',
            wallet_address: wallet,
            lisk_wallet_address: null,
            fcm_token: null,
            notification_email: true,
            notification_push: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // First request — user 1
          mockGetUser.mockResolvedValue({ data: { user: { id: userId1 } }, error: null });
          mockGetProfileById.mockResolvedValue(makeProfile(userId1, wallet1));
          mockSetUser.mockClear();

          await httpRequest(server, 'GET', '/protected', {
            Authorization: 'Bearer token.for.user1',
          });

          expect(mockSetUser).toHaveBeenCalledWith(
            expect.objectContaining({ username: wallet1 })
          );

          // Second request — user 2
          mockGetUser.mockResolvedValue({ data: { user: { id: userId2 } }, error: null });
          mockGetProfileById.mockResolvedValue(makeProfile(userId2, wallet2));
          mockSetUser.mockClear();

          await httpRequest(server, 'GET', '/protected', {
            Authorization: 'Bearer token.for.user2',
          });

          expect(mockSetUser).toHaveBeenCalledWith(
            expect.objectContaining({ username: wallet2 })
          );
          // Must NOT have been called with user1's wallet
          expect(mockSetUser).not.toHaveBeenCalledWith(
            expect.objectContaining({ username: wallet1 })
          );
        }
      ),
      { numRuns: 20 }
    );
    await closeServer(server);
  });

  it('does NOT call Sentry.setUser on unauthenticated requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(null),                              // no header
          fc.string({ minLength: 1, maxLength: 50 })    // garbage header value
        ),
        async (authValue) => {
          mockGetUser.mockResolvedValue({
            data: { user: null },
            error: new Error('not auth'),
          });
          mockSetUser.mockClear();

          const headers: Record<string, string> =
            authValue !== null ? { Authorization: authValue } : {};
          const res = await httpRequest(server, 'GET', '/protected', headers);

          expect(res.status).toBe(401);
          // Sentry.setUser must NOT be called when authentication fails
          expect(mockSetUser).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 25 }
    );
    await closeServer(server);
  });

  it('attaches both userId and walletAddress to Sentry context', async () => {
    const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const walletAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

    const profile: Profile = {
      id: userId,
      full_name: 'Test User',
      email: `${walletAddress.toLowerCase()}@wallet.aura`,
      avatar_url: null,
      environment_type: 'home',
      wallet_address: walletAddress,
      lisk_wallet_address: null,
      fcm_token: null,
      notification_email: true,
      notification_push: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mockGetProfileById.mockResolvedValue(profile);

    await httpRequest(server, 'GET', '/protected', {
      Authorization: 'Bearer valid.jwt.token',
    });

    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
        username: walletAddress,
      })
    );
    await closeServer(server);
  });
});
