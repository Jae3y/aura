import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });
dotenv.config({ override: true });

const rawEnv: Record<string, string | undefined> = { ...process.env };
const isProduction = rawEnv.NODE_ENV === 'production';
const devFallbacks: Record<string, string> = {
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
  LISK_RPC_URL: process.env.EVM_RPC_URL ?? '',   // allow root .env EVM_RPC_URL
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
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  MOCK_INTEGRATIONS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),

  HIVEMQ_URL: z.string().min(1),
  HIVEMQ_USER: z.string().min(1),
  HIVEMQ_PASS: z.string().min(1),

  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
  SOLANA_KEYPAIR: z.string().min(1),

  LISK_RPC_URL: z.string().url().optional(),
  LISK_PASSPHRASE: z.string().optional(),

  ALERTA_API_KEY: z.string().min(1),
  ALERTA_API_SECRET: z.string().min(1),
  ALERTA_BASE_URL: z.string().url().default('https://api.alerta.encrisoft.com/v2'),
  ALERTA_CHANNEL_REF: z.string().min(1),

  FCM_PROJECT_ID: z.string().min(1),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM: z.string().default('AURA <alerts@aura.app>'),

  SENTRY_DSN: z.string().optional(),
  JWT_SECRET: z.string().min(1),

  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  PUBLIC_URL: z.string().url().default('http://localhost:3001'),
});

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    '❌ Invalid environment configuration:',
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const config = parsed.data;
export type AppConfig = typeof config;
