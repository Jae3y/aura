import express from 'express';
import http from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateUser,
  mockUpdateUserById,
  mockSignInWithPassword,
  mockGetProfileById,
  mockGetProfileByWalletAddress,
  mockUpsertProfile,
} = vi.hoisted(() => ({
  mockCreateUser: vi.fn(),
  mockUpdateUserById: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockGetProfileById: vi.fn(),
  mockGetProfileByWalletAddress: vi.fn(),
  mockUpsertProfile: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
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
  },
}));

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: mockCreateUser,
        updateUserById: mockUpdateUserById,
      },
    },
  },
  supabaseAnon: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      getUser: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock('../lib/db/profiles', () => ({
  getProfileById: mockGetProfileById,
  getProfileByWalletAddress: mockGetProfileByWalletAddress,
  upsertProfile: mockUpsertProfile,
  updateFcmToken: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  authMiddleware: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

vi.mock('../middleware/rateLimit', () => ({
  authLimiter: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

vi.mock('tweetnacl', () => ({
  default: {
    sign: {
      detached: {
        verify: vi.fn(() => true),
      },
    },
  },
}));

vi.mock('@solana/web3.js', () => ({
  PublicKey: class {
    constructor(_address: string) {}

    toBytes() {
      return new Uint8Array(32);
    }
  },
}));

import authRouter from '../routes/auth';
import { errorHandler } from '../middleware/errorHandler';

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

describe('POST /auth/login', () => {
  let server: http.Server;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
    app.use(errorHandler);

    server = await startServer(app);
  });

  afterEach(async () => {
    await closeServer(server);
  });

  it('recovers an existing wallet user when the derived password has changed', async () => {
    const walletAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
    const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const session = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_at: 1234567890,
    };
    const profile = {
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

    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: new Error('User already registered'),
    });
    mockSignInWithPassword
      .mockResolvedValueOnce({
        data: { session: null, user: null },
        error: new Error('Invalid login credentials'),
      })
      .mockResolvedValueOnce({
        data: { session, user: { id: userId, email: profile.email } },
        error: null,
      });
    mockUpdateUserById.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mockGetProfileByWalletAddress.mockResolvedValue(profile);
    mockUpsertProfile.mockResolvedValue(profile);
    mockGetProfileById.mockResolvedValue(profile);

    const response = await request(server, 'POST', '/auth/login', {
      walletAddress,
      signature: '3Y1Lxw',
      message: 'Sign this message to authenticate with AURA',
    });

    expect(response.status).toBe(200);
    expect(mockUpdateUserById).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        password: expect.any(String),
      })
    );
    expect(response.body).toMatchObject({
      session,
      user: { id: userId, email: profile.email },
      profile: { id: userId, wallet_address: walletAddress },
    });
  });
});
