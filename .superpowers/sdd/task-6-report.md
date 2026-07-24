# Task 6: Fix Hardcoded Backend URL — Report

## Status: DONE

## Changes Made

### `frontend/next.config.ts`
- Added `const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';`
- Replaced hardcoded `http://localhost:3001` in both rewrite destinations with `${backendUrl}`

### `frontend/lib/config.ts`
- Added `export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';`
- Updated `socketUrl` to derive from `BACKEND_URL` instead of a separate `NEXT_PUBLIC_SOCKET_URL` (with `NEXT_PUBLIC_SOCKET_URL` kept as override for flexibility)

### Files NOT modified (already correct)
- `frontend/lib/socketClient.ts` — already uses `config.backend.socketUrl` (no hardcoded URL)
- `frontend/lib/api/client.ts` — already uses `config.backend.baseUrl` (no hardcoded URL)

## Build Result
Build succeeded with `npx next build` (Next.js 16.2.9 Turbopack). TypeScript compiled, 22 static pages generated.

## Commit
`77c7705` — fix: use NEXT_PUBLIC_BACKEND_URL instead of hardcoded localhost:3001
