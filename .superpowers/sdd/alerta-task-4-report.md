# Task 4: Add Real-Time Threat Updates to Alerta Page

## Changes Made

1. **Imported `useRealtimeStore`** from `@/lib/stores/realtimeStore`
2. **Added `allThreats` merge logic** — combines REST-queried `threats` with `realtimeThreats` (Socket.io), deduplicating by `id` and sorting by `occurred_at` descending
3. **Replaced all downstream `threats` references** with `allThreats`: `filteredThreats`, status counts (`openCount`, `ackCount`, `closedCount`), `total`, `ackRate`, `sevCounts`, severity distribution, filter pills, and the "Total Events" stat card

## Note

The actual store uses `recentThreats` (an array), not `threats` (a Map) as the task description assumed. The selector was adapted accordingly.

## Build

Passed — `next build` (Next.js 16.2.9 / Turbopack) compiled and generated all 22 routes successfully.
