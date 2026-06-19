import 'dotenv/config';
import { z } from 'zod';

// All backend environment variables are validated at boot. A missing or
// malformed value crashes the process immediately rather than failing later.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

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
});

const parsed = envSchema.safeParse(process.env);

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
