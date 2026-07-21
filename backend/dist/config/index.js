"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), '..', '.env') });
dotenv_1.default.config({ override: true });
const rawEnv = { ...process.env };
const isProduction = rawEnv.NODE_ENV === 'production';
const devFallbacks = {
    PORT: '3001',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_KEY: 'dev-service-key',
    SUPABASE_ANON_KEY: 'dev-anon-key',
    HIVEMQ_URL: 'mqtt://localhost:1883',
    HIVEMQ_USER: 'dev-mqtt-user',
    HIVEMQ_PASS: 'dev-mqtt-pass',
    SOLANA_KEYPAIR: process.env.SOLANA_PRIVATE_KEY || 'dev-solana-keypair',
    ALERTA_API_KEY: 'dev-alerta-key',
    ALERTA_API_SECRET: 'dev-alerta-secret',
    ALERTA_CHANNEL_REF: 'TG_ALT_FILYOOMRE4MDCNI2',
    LISK_RPC_URL: process.env.EVM_RPC_URL ?? '', // allow root .env EVM_RPC_URL
    FCM_PROJECT_ID: 'dev-fcm-project',
    RESEND_API_KEY: 'dev-resend-key',
    JWT_SECRET: 'dev-jwt-secret',
    MOCK_INTEGRATIONS: process.env.SOLANA_PRIVATE_KEY ? 'false' : 'true',
};
if (!isProduction) {
    for (const [key, value] of Object.entries(devFallbacks)) {
        rawEnv[key] ||= value;
    }
}
// All backend environment variables are validated at boot. A missing or
// malformed value crashes the process immediately rather than failing later.
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(3001),
    MOCK_INTEGRATIONS: zod_1.z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_KEY: zod_1.z.string().min(1),
    SUPABASE_ANON_KEY: zod_1.z.string().min(1),
    HIVEMQ_URL: zod_1.z.string().min(1),
    HIVEMQ_USER: zod_1.z.string().min(1),
    HIVEMQ_PASS: zod_1.z.string().min(1),
    SOLANA_RPC_URL: zod_1.z.string().url().default('https://api.devnet.solana.com'),
    SOLANA_KEYPAIR: zod_1.z.string().min(1),
    LISK_RPC_URL: zod_1.z.string().url().optional(),
    LISK_PASSPHRASE: zod_1.z.string().optional(),
    ALERTA_API_KEY: zod_1.z.string().min(1),
    ALERTA_API_SECRET: zod_1.z.string().min(1),
    ALERTA_BASE_URL: zod_1.z.string().url().default('https://api.alerta.encrisoft.com/v2'),
    ALERTA_CHANNEL_REF: zod_1.z.string().min(1),
    FCM_PROJECT_ID: zod_1.z.string().min(1),
    FCM_CLIENT_EMAIL: zod_1.z.string().optional(),
    FCM_PRIVATE_KEY: zod_1.z.string().optional(),
    RESEND_API_KEY: zod_1.z.string().min(1),
    RESEND_FROM: zod_1.z.string().default('AURA <alerts@aura.app>'),
    SENTRY_DSN: zod_1.z.string().optional(),
    JWT_SECRET: zod_1.z.string().min(1),
    FRONTEND_URL: zod_1.z.string().url().default('http://localhost:3000'),
    PUBLIC_URL: zod_1.z.string().url().default('http://localhost:3001'),
    TELEGRAM_BOT_TOKEN: zod_1.z.string().optional(),
    TELEGRAM_CHAT_ID: zod_1.z.string().optional(),
});
const parsed = envSchema.safeParse(rawEnv);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
if (parsed.data.NODE_ENV === 'production' && parsed.data.MOCK_INTEGRATIONS) {
    console.error('❌ FATAL: MOCK_INTEGRATIONS=true in production. ' +
        'This would disable MQTT and allow silent integration failures. ' +
        'Set MOCK_INTEGRATIONS=false or remove it from your environment.');
    process.exit(1);
}
exports.config = parsed.data;
//# sourceMappingURL=index.js.map