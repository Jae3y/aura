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
exports.server = exports.app = void 0;
const Sentry = __importStar(require("@sentry/node"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimit_1 = require("./middleware/rateLimit");
// ---------------------------------------------------------------------------
// Sentry must be initialised before anything else so it can hook the runtime.
// ---------------------------------------------------------------------------
Sentry.init({
    dsn: config_1.config.SENTRY_DSN,
    environment: config_1.config.NODE_ENV,
    tracesSampleRate: 0.1,
});
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
app.use(Sentry.Handlers.requestHandler());
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.FRONTEND_URL,
    credentials: true,
}));
// Alerta webhook needs the raw body for HMAC verification.
app.use('/alerta/webhook', rateLimit_1.webhookLimiter, express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express_1.default.json({ limit: '2mb' }));
app.use(rateLimit_1.defaultLimiter);
const healthHandler = (_req, res) => {
    res.json({ status: 'ok', service: 'aura-backend', ts: Date.now() });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
// ---------------------------------------------------------------------------
// Routes (mounted as each module is implemented).
// ---------------------------------------------------------------------------
const auth_1 = __importDefault(require("./routes/auth"));
const devices_1 = __importDefault(require("./routes/devices"));
const control_1 = __importDefault(require("./routes/control"));
const zones_1 = __importDefault(require("./routes/zones"));
const automations_1 = __importDefault(require("./routes/automations"));
const sensor_1 = __importDefault(require("./routes/sensor"));
const threats_1 = __importDefault(require("./routes/threats"));
const voice_1 = __importDefault(require("./routes/voice"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const alerta_1 = __importDefault(require("./routes/alerta"));
const reports_1 = __importDefault(require("./routes/reports"));
const blockchain_1 = __importDefault(require("./routes/blockchain"));
app.use('/auth', auth_1.default);
// API-prefixed public routes must be mounted before catch-all "/" routers,
// otherwise protected routers like devicesRouter intercept /api/auth/* first.
app.use('/api/auth', auth_1.default);
app.use('/api/alerta', alerta_1.default);
app.use('/api/blockchain', blockchain_1.default);
app.use('/', devices_1.default);
app.use('/', control_1.default);
app.use('/', zones_1.default);
app.use('/', automations_1.default);
app.use('/', sensor_1.default);
app.use('/', threats_1.default);
app.use('/', voice_1.default);
app.use('/', notifications_1.default);
app.use('/alerta', alerta_1.default);
app.use('/', reports_1.default);
app.use('/blockchain', blockchain_1.default);
app.use('/api', devices_1.default);
app.use('/api', control_1.default);
app.use('/api', zones_1.default);
app.use('/api', automations_1.default);
app.use('/api', sensor_1.default);
app.use('/api', threats_1.default);
app.use('/api', voice_1.default);
app.use('/api', notifications_1.default);
app.use('/api', reports_1.default);
app.use(Sentry.Handlers.errorHandler());
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// ---------------------------------------------------------------------------
// Real-time + background services.
// ---------------------------------------------------------------------------
const socket_1 = require("./socket");
const mqtt_1 = require("./services/mqtt");
const solanaQueue_1 = require("./blockchain/solanaQueue");
const solana_1 = require("./services/solana");
(0, socket_1.initSocket)(server);
// Solana queue always runs — we have valid RPC + keypair configured.
// Only MQTT is gated by MOCK_INTEGRATIONS (no local broker in dev).
(0, solanaQueue_1.startSolanaQueue)();
// Initialize Solana client and ensure the wallet has Devnet SOL.
(async () => {
    try {
        (0, solana_1.initSolanaClient)();
        const pubkey = (0, solana_1.getWalletPublicKey)();
        // eslint-disable-next-line no-console
        console.log(`Solana wallet: ${pubkey} (${config_1.config.SOLANA_RPC_URL})`);
        // Try to airdrop if needed (non-blocking; server starts regardless).
        await (0, solana_1.tryAutoAirdrop)();
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Solana client init failed:', err.message);
    }
})();
if (config_1.config.MOCK_INTEGRATIONS) {
    console.warn('⚠️  Mock integrations enabled — MQTT, Solana writes, and Alerta notifications are disabled. ' +
        'Do NOT run this configuration in production.');
}
else {
    (0, mqtt_1.connectMQTT)().catch((err) => {
        Sentry.captureException(err);
        console.error('MQTT initial connection failed:', err);
    });
}
server.listen(config_1.config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🛡️  AURA backend listening on :${config_1.config.PORT}`);
});
//# sourceMappingURL=index.js.map