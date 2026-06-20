// Environment configuration with validation
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  backend: {
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
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
}
