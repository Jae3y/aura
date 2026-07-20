import * as Sentry from '@sentry/node';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { defaultLimiter } from './middleware/rateLimit';

// ---------------------------------------------------------------------------
// Sentry must be initialised before anything else so it can hook the runtime.
// ---------------------------------------------------------------------------
Sentry.init({
  dsn: config.SENTRY_DSN,
  environment: config.NODE_ENV,
  tracesSampleRate: 0.1,
});

const app = express();
const server = http.createServer(app);

app.use(Sentry.Handlers.requestHandler());
app.use(helmet());
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  })
);

// Alerta webhook needs the raw body for HMAC verification.
app.use(
  '/alerta/webhook',
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(defaultLimiter);

const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', service: 'aura-backend', ts: Date.now() });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ---------------------------------------------------------------------------
// Routes (mounted as each module is implemented).
// ---------------------------------------------------------------------------
import authRouter from './routes/auth';
import devicesRouter from './routes/devices';
import controlRouter from './routes/control';
import zonesRouter from './routes/zones';
import automationsRouter from './routes/automations';
import sensorRouter from './routes/sensor';
import threatsRouter from './routes/threats';
import voiceRouter from './routes/voice';
import notificationsRouter from './routes/notifications';
import alertaRouter from './routes/alerta';
import reportsRouter from './routes/reports';
import blockchainRouter from './routes/blockchain';

app.use('/auth', authRouter);
// API-prefixed public routes must be mounted before catch-all "/" routers,
// otherwise protected routers like devicesRouter intercept /api/auth/* first.
app.use('/api/auth', authRouter);
app.use('/api/alerta', alertaRouter);
app.use('/api/blockchain', blockchainRouter);
app.use('/', devicesRouter);
app.use('/', controlRouter);
app.use('/', zonesRouter);
app.use('/', automationsRouter);
app.use('/', sensorRouter);
app.use('/', threatsRouter);
app.use('/', voiceRouter);
app.use('/', notificationsRouter);
app.use('/alerta', alertaRouter);
app.use('/', reportsRouter);
app.use('/blockchain', blockchainRouter);
app.use('/api', devicesRouter);
app.use('/api', controlRouter);
app.use('/api', zonesRouter);
app.use('/api', automationsRouter);
app.use('/api', sensorRouter);
app.use('/api', threatsRouter);
app.use('/api', voiceRouter);
app.use('/api', notificationsRouter);
app.use('/api', reportsRouter);

app.use(Sentry.Handlers.errorHandler());
app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Real-time + background services.
// ---------------------------------------------------------------------------
import { initSocket } from './socket';
import { connectMQTT } from './services/mqtt';
import { startSolanaQueue } from './blockchain/solanaQueue';
import { getWalletPublicKey, initSolanaClient, tryAutoAirdrop } from './services/solana';

initSocket(server);

// Solana queue always runs — we have valid RPC + keypair configured.
// Only MQTT is gated by MOCK_INTEGRATIONS (no local broker in dev).
startSolanaQueue();

// Initialize Solana client and ensure the wallet has Devnet SOL.
(async () => {
  try {
    initSolanaClient();
    const pubkey = getWalletPublicKey();
    // eslint-disable-next-line no-console
    console.log(`Solana wallet: ${pubkey} (${config.SOLANA_RPC_URL})`);
    // Try to airdrop if needed (non-blocking; server starts regardless).
    await tryAutoAirdrop();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Solana client init failed:', (err as Error).message);
  }
})();

if (config.MOCK_INTEGRATIONS) {
  console.warn(
    '⚠️  Mock integrations enabled — MQTT, Solana writes, and Alerta notifications are disabled. ' +
    'Do NOT run this configuration in production.'
  );
} else {
  connectMQTT().catch((err) => {
    Sentry.captureException(err);
    console.error('MQTT initial connection failed:', err);
  });
}

server.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🛡️  AURA backend listening on :${config.PORT}`);
});

export { app, server };
