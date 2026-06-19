# AURA Frontend Setup Guide

## Installation

The frontend uses several large dependencies (Solana wallet adapters) that may take time to install. Run:

```bash
npm install
```

If you encounter peer dependency conflicts, the `.npmrc` file is configured with `legacy-peer-deps=true` to handle this.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (default: http://localhost:3001)
- `NEXT_PUBLIC_SOCKET_URL` - Socket.io server URL (default: http://localhost:3001)

Optional variables:
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking DSN
- `NEXT_PUBLIC_SOLANA_NETWORK` - Solana network (default: devnet)

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Root redirect page
│   ├── connect/           # Wallet authentication
│   ├── dashboard/         # Main command center
│   ├── devices/           # Device management
│   ├── threats/           # Threat events
│   ├── zones/             # Zone management
│   ├── reports/           # Monthly reports
│   ├── blockchain/        # Blockchain explorer
│   └── settings/          # User settings
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── blockchain/       # Blockchain components
│   ├── alerta/           # Alerta components
│   └── providers/        # Context providers
├── lib/                   # Utilities and services
│   ├── config.ts         # Environment configuration
│   ├── supabase.ts       # Supabase client
│   ├── socketClient.ts   # Socket.io client
│   ├── utils.ts          # Helper functions
│   ├── toast.ts          # Toast notifications
│   ├── queries/          # TanStack Query hooks
│   ├── stores/           # Zustand stores
│   └── types/            # TypeScript types
├── public/               # Static assets
│   └── manifest.json     # PWA manifest
└── sentry.*.config.ts    # Sentry configuration
```

## Key Features Implemented

### Task 19 Scaffold
- ✅ Next.js 16 with App Router
- ✅ TypeScript configuration
- ✅ Tailwind CSS v4
- ✅ All required dependencies in package.json
- ✅ PWA manifest with standalone mode
- ✅ Provider setup (QueryProvider, WalletProvider, ErrorBoundary)
- ✅ Sentry configuration (client, server, edge)
- ✅ Environment configuration with validation
- ✅ Supabase client setup
- ✅ Database types structure
- ✅ Utility functions (formatting, clipboard, colors)
- ✅ Toast notification system
- ✅ Root layout with dark mode and military aesthetic
- ✅ `.env.example` with all required variables
- ✅ `.npmrc` for dependency resolution

## Notes

- The app uses a military-aesthetic dark theme (black background, green accents)
- Wallet authentication is required - users will be redirected to `/connect` if not authenticated
- Real-time updates via Socket.io for threat events, sensor readings, and device status
- Blockchain verification for all critical events on Solana devnet
- PWA-ready with offline support (once service worker is added)

## Next Steps

After dependencies install successfully, continue with:
- Task 20: Wallet authentication and WalletGuard
- Task 21: Realtime store and Socket.io client
- Task 22: TanStack Query hooks
- Task 23: Dashboard components
- Task 24: Blockchain frontend components
- Task 25: Alerta frontend components
