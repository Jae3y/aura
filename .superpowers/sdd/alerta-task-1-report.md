# Task 1: Remove Mock Fallback in useThreats

## Status: DONE

## Commit
- `d0991ae` — fix: remove mock data fallback from useThreats query

## Build
- `next build` (Turbopack) compiled and built all 22 routes successfully.

## What Changed
- **`frontend/lib/queries/useThreats.ts`**: Removed `useMockData` parameter, `mockThreats` import, `config` import, try/catch mock fallback. Added `refetchInterval: 15000`. On error, React Query surfaces the error instead of silently returning mock data.
- **`frontend/components/layout/TopBar.tsx`**: Removed third `true` argument from `useThreats("1", 100, true)`.
- **`frontend/app/(app)/threats/page.tsx`**: Removed third `true` argument from `useThreats(deviceId, 100, true)`.
- **`frontend/app/(app)/monitor/page.tsx`**: Removed third `true` argument from `useThreats("1", 100, true)`.

## Concerns
None.
