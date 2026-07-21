"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_http_1 = __importDefault(require("node:http"));
const vitest_1 = require("vitest");
const { mockCreateUser, mockUpdateUserById, mockSignInWithPassword, mockGetProfileById, mockGetProfileByWalletAddress, mockUpsertProfile, } = vitest_1.vi.hoisted(() => ({
    mockCreateUser: vitest_1.vi.fn(),
    mockUpdateUserById: vitest_1.vi.fn(),
    mockSignInWithPassword: vitest_1.vi.fn(),
    mockGetProfileById: vitest_1.vi.fn(),
    mockGetProfileByWalletAddress: vitest_1.vi.fn(),
    mockUpsertProfile: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('@sentry/node', () => ({
    captureException: vitest_1.vi.fn(),
    init: vitest_1.vi.fn(),
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
    },
}));
vitest_1.vi.mock('../lib/supabase', () => ({
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
            getUser: vitest_1.vi.fn(),
            refreshSession: vitest_1.vi.fn(),
        },
    },
}));
vitest_1.vi.mock('../lib/db/profiles', () => ({
    getProfileById: mockGetProfileById,
    getProfileByWalletAddress: mockGetProfileByWalletAddress,
    upsertProfile: mockUpsertProfile,
    updateFcmToken: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../middleware/auth', () => ({
    authMiddleware: vitest_1.vi.fn((_req, _res, next) => next()),
}));
vitest_1.vi.mock('../middleware/rateLimit', () => ({
    authLimiter: vitest_1.vi.fn((_req, _res, next) => next()),
}));
vitest_1.vi.mock('tweetnacl', () => ({
    default: {
        sign: {
            detached: {
                verify: vitest_1.vi.fn(() => true),
            },
        },
    },
}));
vitest_1.vi.mock('@solana/web3.js', () => ({
    PublicKey: class {
        constructor(_address) { }
        toBytes() {
            return new Uint8Array(32);
        }
    },
}));
const auth_1 = __importDefault(require("../routes/auth"));
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
(0, vitest_1.describe)('POST /auth/login', () => {
    let server;
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.clearAllMocks();
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/auth', auth_1.default);
        app.use(errorHandler_1.errorHandler);
        server = await startServer(app);
    });
    (0, vitest_1.afterEach)(async () => {
        await closeServer(server);
    });
    (0, vitest_1.it)('recovers an existing wallet user when the derived password has changed', async () => {
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
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(mockUpdateUserById).toHaveBeenCalledWith(userId, vitest_1.expect.objectContaining({
            password: vitest_1.expect.any(String),
        }));
        (0, vitest_1.expect)(response.body).toMatchObject({
            session,
            user: { id: userId, email: profile.email },
            profile: { id: userId, wallet_address: walletAddress },
        });
    });
});
//# sourceMappingURL=auth.route.test.js.map