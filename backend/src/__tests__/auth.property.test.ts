/**
 * Property tests for Authentication middleware
 *
 * Task 3.1: Unauthenticated requests always return HTTP 401
 * Task 3.2: Sentry user context set on authenticated requests
 *
 * Validates: Property 1 (auth boundary) and Property 2 (Sentry context)
 * Requirements: 1.4, 1.5, 1.6
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import express, { Router } from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that use these modules.
// ---------------------------------------------------------------------------

// Mock Sentry so we can inspect setUser calls without a real DSN.
const mockSetUser = vi.fn();
const mockCaptureException = vi.fn();
vi.mock('@sentry/node', () => ({
  setUser: mockSetUser,
  captureException: mockCaptureException,
  init: vi.fn(),
  Handlers: { requestHandler: () => (_req: unknown, _res: unknown, next: () => void) => next(), errorHandler: () => (_err: unknown, _req: unknown, _res: unknown, next: () => void) => next() },
}));

// Mock Supabase anon client (used by auth middleware for JWT verification).
const mockGetUser = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabaseAnon: { auth: { getUser: mockGetUser } },
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
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
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Express app that protects a single GET /protected route
 * with the authMiddleware under test.
 */
function buildApp() {
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

// Solana-style base58 address alphabet (no 0, O, I, l).
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Generates strings that look like valid Solana wallet addresses (32-44 chars base58). */
const walletAddressArb = fc
  .array(fc.integer({ min: 0, max: BASE58_CHARS.length - 1 }), {
    minLength: 32,
    maxLength: 44,
  })
  .map((indices) => indices.map((i) => BASE58_CHARS[i]).join(''));

/** Generates UUID v4 strings for user IDs. */
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
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no valid user
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no auth') });
    mockGetProfileById.mockResolvedValue(null);
  });

  it('returns 401 when no Authorization header is present — all HTTP methods', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary HTTP method
        fc.constantFrom('GET', 'POST', 'PATCH', 'DELETE'),
        async (method) => {
          const agent = request(app);
          const req =
            method === 'GET' ? agent.get('/protected') :
            method === 'POST' ? agent.post('/protected') :
            method === 'PATCH' ? agent.patch('/protected') :
            agent.delete('/protected');

          // No Authorization header at all.
          const res = await req.send({});

          expect(res.status).toBe(401);
          // Must return structured JSON error, never a data payload.
          expect(res.body).toHaveProperty('error');
          expect(res.body).not.toHaveProperty('secret');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('returns 401 for arbitrary malformed Authorization header values', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary string that is NOT a valid "Bearer <jwt>" token
        fc.oneof(
          fc.constant(''),                          // empty
          fc.constant('Basic dXNlcjpwYXNz'),        // Basic auth scheme
          fc.constant('Bearer '),                    // Bearer with no token
          fc.constant('bearer eyJhbGciOiJIUzI1NiJ9'), // lower-case scheme
          fc.string({ minLength: 1, maxLength: 64 }) // random garbage
        ),
        async (authHeader) => {
          const res = await request(app)
            .get('/protected')
            .set('Authorization', authHeader)
            .send();

          expect(res.status).toBe(401);
          expect(res.body).toHaveProperty('error');
          expect(res.body).not.toHaveProperty('secret');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('returns 401 when Supabase JWT verification fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary token strings
        fc.string({ minLength: 10, maxLength: 200 }),
        async (fakeToken) => {
          // Supabase rejects the token
          mockGetUser.mockResolvedValue({
            data: { user: null },
            error: new Error('JWT is invalid'),
          });

          const res = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${fakeToken}`)
            .send();

          expect(res.status).toBe(401);
          expect(res.body).toHaveProperty('error');
          expect(res.body).not.toHaveProperty('secret');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('returns 401 when JWT is valid but profile does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        walletAddressArb,
        async (userId, _wallet) => {
          // Supabase says JWT is valid
          mockGetUser.mockResolvedValue({
            data: { user: { id: userId, email: `${userId}@wallet.aura` } },
            error: null,
          });
          // But the profile row is missing
          mockGetProfileById.mockResolvedValue(null);

          const res = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer valid.jwt.token')
            .send();

          expect(res.status).toBe(401);
          expect(res.body).toHaveProperty('error');
          expect(res.body).not.toHaveProperty('secret');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('never leaks JWT internals in 401 responses', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc')
      .send();

    expect(res.status).toBe(401);
    const body = JSON.stringify(res.body);
    // Must not reveal token structure details
    expect(body).not.toMatch(/eyJ/);
    expect(body).not.toMatch(/signature/);
    expect(body).not.toMatch(/secret/i);
  });
});

// ===========================================================================
// Task 3.2 — Property: Sentry user context set on authenticated requests
// ===========================================================================

describe('Property 2: Sentry user context set on authenticated requests', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
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

          const agent = request(app);
          const req =
            method === 'GET' ? agent.get('/protected') :
            method === 'POST' ? agent.post('/protected') :
            method === 'PATCH' ? agent.patch('/protected') :
            agent.delete('/protected');

          const res = await req
            .set('Authorization', 'Bearer valid.jwt.token')
            .send({});

          // Request must succeed (the route returns 200)
          expect(res.status).toBe(200);

          // Sentry.setUser must have been called exactly once
          expect(mockSetUser).toHaveBeenCalledTimes(1);

          // Must include the wallet address as the username
          const [sentryUser] = mockSetUser.mock.calls[0];
          expect(sentryUser).toMatchObject({
            username: walletAddress,
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  it('sets Sentry user context with the correct walletAddress (not a different user)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(uuidArb, walletAddressArb),
        fc.tuple(uuidArb, walletAddressArb),
        async ([userId1, wallet1], [userId2, wallet2]) => {
          // Make the two users distinct
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
          mockGetUser.mockResolvedValue({
            data: { user: { id: userId1 } },
            error: null,
          });
          mockGetProfileById.mockResolvedValue(makeProfile(userId1, wallet1));
          mockSetUser.mockClear();

          await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer token.for.user1')
            .send();

          expect(mockSetUser).toHaveBeenCalledWith(
            expect.objectContaining({ username: wallet1 })
          );

          // Second request — user 2 (different wallet)
          mockGetUser.mockResolvedValue({
            data: { user: { id: userId2 } },
            error: null,
          });
          mockGetProfileById.mockResolvedValue(makeProfile(userId2, wallet2));
          mockSetUser.mockClear();

          await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer token.for.user2')
            .send();

          expect(mockSetUser).toHaveBeenCalledWith(
            expect.objectContaining({ username: wallet2 })
          );
          // Must NOT have been called with wallet1
          expect(mockSetUser).not.toHaveBeenCalledWith(
            expect.objectContaining({ username: wallet1 })
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  it('does NOT call Sentry.setUser on unauthenticated requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(undefined),                     // no header
          fc.string({ minLength: 1, maxLength: 50 }) // garbage header value
        ),
        async (authValue) => {
          mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('not auth') });
          mockSetUser.mockClear();

          const req = request(app).get('/protected');
          if (authValue !== undefined) {
            req.set('Authorization', authValue);
          }

          const res = await req.send();

          expect(res.status).toBe(401);
          // Sentry.setUser must NOT be called when auth fails
          expect(mockSetUser).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('attaches userId to Sentry context alongside walletAddress', async () => {
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

    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mockGetProfileById.mockResolvedValue(profile);

    await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid.jwt.token')
      .send();

    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
        username: walletAddress,
      })
    );
  });
});
