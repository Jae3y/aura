// Environment configuration with validation
const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const BACKEND_URL = rawBackendUrl || 'http://localhost:3001';

export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  backend: {
    baseUrl: rawBackendUrl || '/api',
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || BACKEND_URL,
  },
  solana: {
    network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
    explorerUrl: process.env.NEXT_PUBLIC_SOLANA_EXPLORER || 'https://explorer.solana.com',
  },
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  },
  features: {
    mockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',
  },
} as const;

// Validate required environment variables
export function validateConfig() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }

  if (typeof window !== 'undefined' && !rawBackendUrl) {
    console.warn(
      '[AURA] NEXT_PUBLIC_BACKEND_URL is not set. ' +
      'Auth requests will be routed through Next.js rewrites which only work in development. ' +
      'Set this to your backend URL (e.g. https://aura-backend.onrender.com) for production.'
    );
  }
}
