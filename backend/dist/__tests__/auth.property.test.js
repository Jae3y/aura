"use strict";
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
/**
 * Property tests for Authentication middleware
 *
 * Task 3.1: Unauthenticated requests always return HTTP 401
 * Task 3.2: Sentry user context set on authenticated requests
 *
 * Validates: Property 1 (auth boundary) and Property 2 (Sentry context)
 * Requirements: 1.4, 1.5, 1.6
 */
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
const express_1 = __importStar(require("express"));
const node_http_1 = __importDefault(require("node:http"));
const { mockSetUser, mockCaptureException, mockGetUser, mockGetProfileById } = vitest_1.vi.hoisted(() => ({
    mockSetUser: vitest_1.vi.fn(),
    mockCaptureException: vitest_1.vi.fn(),
    mockGetUser: vitest_1.vi.fn(),
    mockGetProfileById: vitest_1.vi.fn(),
}));
// ---------------------------------------------------------------------------
// Module mocks — declared before any imports that use these modules.
// ---------------------------------------------------------------------------
// Mock Sentry so we can inspect setUser calls without a real DSN.
vitest_1.vi.mock('@sentry/node', () => ({
    setUser: mockSetUser,
    captureException: mockCaptureException,
    init: vitest_1.vi.fn(),
    Handlers: {
        requestHandler: () => (_req, _res, next) => next(),
        errorHandler: () => (_err, _req, _res, next) => next(),
    },
}));
// Mock Supabase anon client (used by auth middleware for JWT verification).
vitest_1.vi.mock('../lib/supabase', () => ({
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
        auth: { admin: { signOut: vitest_1.vi.fn() } },
    },
}));
// Mock the profiles DB helper.
vitest_1.vi.mock('../lib/db/profiles', () => ({
    getProfileById: mockGetProfileById,
    upsertProfile: vitest_1.vi.fn(),
    updateWalletAddress: vitest_1.vi.fn(),
    updateFcmToken: vitest_1.vi.fn(),
    getOwnerProfileForDevice: vitest_1.vi.fn(),
}));
// Mock config so the module loads without real env vars.
vitest_1.vi.mock('../config', () => ({
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
const auth_1 = require("../middleware/auth");
/**
 * Make an HTTP request against a running http.Server.
 * Returns status code and parsed JSON body.
 */
function httpRequest(server, method, path, headers = {}, body) {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        const options = {
            hostname: '127.0.0.1',
            port: addr.port,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };
        const req = node_http_1.default.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                let parsed = {};
                try {
                    parsed = JSON.parse(data);
                }
                catch {
                    // not JSON — leave as empty object
                }
                resolve({ status: res.statusCode ?? 0, body: parsed, rawBody: data });
            });
        });
        req.on('error', reject);
        if (body)
            req.write(body);
        req.end();
    });
}
/**
 * Start the Express app on an ephemeral port and return the server.
 * Call server.close() in afterEach / afterAll.
 */
function startServer(app) {
    return new Promise((resolve, reject) => {
        const server = node_http_1.default.createServer(app);
        server.listen(0, '127.0.0.1', () => resolve(server));
        server.on('error', reject);
    });
}
/** Close a server and wait for all connections to drain. */
function closeServer(server) {
    return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}
// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------
/**
 * Build a minimal Express app that protects a /protected route
 * with the authMiddleware under test.
 */
function buildApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    const protectedRouter = (0, express_1.Router)();
    protectedRouter.use(auth_1.authMiddleware);
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
const walletAddressArb = fast_check_1.default
    .array(fast_check_1.default.integer({ min: 0, max: BASE58_CHARS.length - 1 }), {
    minLength: 32,
    maxLength: 44,
})
    .map((indices) => indices.map((i) => BASE58_CHARS[i]).join(''));
/** Arbitrary UUID string. */
const uuidArb = fast_check_1.default
    .tuple(fast_check_1.default.hexaString({ minLength: 8, maxLength: 8 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 4, maxLength: 4 }), fast_check_1.default.hexaString({ minLength: 12, maxLength: 12 }))
    .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);
// ===========================================================================
// Task 3.1 — Property: unauthenticated requests always return HTTP 401
// ===========================================================================
(0, vitest_1.describe)('Property 1: Unauthenticated requests always return HTTP 401', () => {
    let server;
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.clearAllMocks();
        // Default: Supabase rejects all tokens
        mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no auth') });
        mockGetProfileById.mockResolvedValue(null);
        server = await startServer(buildApp());
    });
    // We close in afterEach via an async callback — vitest supports this.
    // Using a local variable keeps test isolation clean.
    (0, vitest_1.it)('returns 401 when no Authorization header is present — all HTTP methods', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.constantFrom('GET', 'POST', 'PATCH', 'DELETE'), async (method) => {
            const res = await httpRequest(server, method, '/protected');
            (0, vitest_1.expect)(res.status).toBe(401);
            (0, vitest_1.expect)(res.body).toHaveProperty('error');
            (0, vitest_1.expect)(res.body).not.toHaveProperty('secret');
        }), { numRuns: 20 });
        await closeServer(server);
    });
    (0, vitest_1.it)('returns 401 for arbitrary malformed Authorization header values', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.oneof(fast_check_1.default.constant(''), // empty string
        fast_check_1.default.constant('Basic dXNlcjpwYXNz'), // Basic auth scheme
        fast_check_1.default.constant('Bearer '), // Bearer with no token
        fast_check_1.default.constant('bearer eyJhbGciOiJIUzI1NiJ9'), // lower-case scheme
        fast_check_1.default.string({ minLength: 1, maxLength: 64 }) // random garbage
        ), async (authHeader) => {
            const res = await httpRequest(server, 'GET', '/protected', {
                Authorization: authHeader,
            });
            (0, vitest_1.expect)(res.status).toBe(401);
            (0, vitest_1.expect)(res.body).toHaveProperty('error');
            (0, vitest_1.expect)(res.body).not.toHaveProperty('secret');
        }), { numRuns: 50 });
        await closeServer(server);
    });
    (0, vitest_1.it)('returns 401 when Supabase JWT verification fails', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.string({ minLength: 10, maxLength: 200 }), async (fakeToken) => {
            mockGetUser.mockResolvedValue({
                data: { user: null },
                error: new Error('JWT is invalid'),
            });
            const res = await httpRequest(server, 'GET', '/protected', {
                Authorization: `Bearer ${fakeToken}`,
            });
            (0, vitest_1.expect)(res.status).toBe(401);
            (0, vitest_1.expect)(res.body).toHaveProperty('error');
            (0, vitest_1.expect)(res.body).not.toHaveProperty('secret');
        }), { numRuns: 30 });
        await closeServer(server);
    });
    (0, vitest_1.it)('returns 401 when JWT is valid but profile does not exist', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, walletAddressArb, async (userId, _wallet) => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: userId, email: `${userId}@wallet.aura` } },
                error: null,
            });
            mockGetProfileById.mockResolvedValue(null);
            const res = await httpRequest(server, 'GET', '/protected', {
                Authorization: 'Bearer valid.jwt.token',
            });
            (0, vitest_1.expect)(res.status).toBe(401);
            (0, vitest_1.expect)(res.body).toHaveProperty('error');
            (0, vitest_1.expect)(res.body).not.toHaveProperty('secret');
        }), { numRuns: 20 });
        await closeServer(server);
    });
    (0, vitest_1.it)('never leaks JWT internals in 401 responses', async () => {
        const res = await httpRequest(server, 'GET', '/protected', {
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc',
        });
        (0, vitest_1.expect)(res.status).toBe(401);
        // Must not echo back any token segment or internal details
        (0, vitest_1.expect)(res.rawBody).not.toMatch(/eyJ/);
        (0, vitest_1.expect)(res.rawBody).not.toMatch(/signature/);
        // The word "secret" must not appear in the response body
        (0, vitest_1.expect)(res.rawBody.toLowerCase()).not.toMatch(/\bsecret\b/);
        await closeServer(server);
    });
});
// ===========================================================================
// Task 3.2 — Property: Sentry user context set on authenticated requests
// ===========================================================================
(0, vitest_1.describe)('Property 2: Sentry user context set on authenticated requests', () => {
    let server;
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.clearAllMocks();
        server = await startServer(buildApp());
    });
    (0, vitest_1.it)('calls Sentry.setUser with the walletAddress for any authenticated request', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(uuidArb, walletAddressArb, fast_check_1.default.constantFrom('GET', 'POST', 'PATCH', 'DELETE'), async (userId, walletAddress, method) => {
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
            (0, vitest_1.expect)(res.status).toBe(200);
            // Sentry.setUser must have been called exactly once per request
            (0, vitest_1.expect)(mockSetUser).toHaveBeenCalledTimes(1);
            // Must set the correct wallet address as username
            const [sentryUser] = mockSetUser.mock.calls[0];
            (0, vitest_1.expect)(sentryUser).toMatchObject({ username: walletAddress });
        }), { numRuns: 25 });
        await closeServer(server);
    });
    (0, vitest_1.it)('sets Sentry user context with the correct walletAddress (not a different user)', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.tuple(uuidArb, walletAddressArb), fast_check_1.default.tuple(uuidArb, walletAddressArb), async ([userId1, wallet1], [userId2, wallet2]) => {
            // Precondition: the two users must be distinct
            fast_check_1.default.pre(userId1 !== userId2 && wallet1 !== wallet2);
            const makeProfile = (id, wallet) => ({
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
            (0, vitest_1.expect)(mockSetUser).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ username: wallet1 }));
            // Second request — user 2
            mockGetUser.mockResolvedValue({ data: { user: { id: userId2 } }, error: null });
            mockGetProfileById.mockResolvedValue(makeProfile(userId2, wallet2));
            mockSetUser.mockClear();
            await httpRequest(server, 'GET', '/protected', {
                Authorization: 'Bearer token.for.user2',
            });
            (0, vitest_1.expect)(mockSetUser).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ username: wallet2 }));
            // Must NOT have been called with user1's wallet
            (0, vitest_1.expect)(mockSetUser).not.toHaveBeenCalledWith(vitest_1.expect.objectContaining({ username: wallet1 }));
        }), { numRuns: 20 });
        await closeServer(server);
    });
    (0, vitest_1.it)('does NOT call Sentry.setUser on unauthenticated requests', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.oneof(fast_check_1.default.constant(null), // no header
        fast_check_1.default.string({ minLength: 1, maxLength: 50 }) // garbage header value
        ), async (authValue) => {
            mockGetUser.mockResolvedValue({
                data: { user: null },
                error: new Error('not auth'),
            });
            mockSetUser.mockClear();
            const headers = authValue !== null ? { Authorization: authValue } : {};
            const res = await httpRequest(server, 'GET', '/protected', headers);
            (0, vitest_1.expect)(res.status).toBe(401);
            // Sentry.setUser must NOT be called when authentication fails
            (0, vitest_1.expect)(mockSetUser).not.toHaveBeenCalled();
        }), { numRuns: 25 });
        await closeServer(server);
    });
    (0, vitest_1.it)('attaches both userId and walletAddress to Sentry context', async () => {
        const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        const walletAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
        const profile = {
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
        (0, vitest_1.expect)(mockSetUser).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            id: userId,
            username: walletAddress,
        }));
        await closeServer(server);
    });
});
//# sourceMappingURL=auth.property.test.js.map