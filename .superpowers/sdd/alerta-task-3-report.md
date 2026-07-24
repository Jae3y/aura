# Task 3: Remove Hardcoded Stats and Wire Up Buttons — Report

- **Status:** DONE
- **Commit:** `77e89ab` — fix: remove hardcoded stats, wire up acknowledge/resolve buttons
- **Build:** Passes cleanly (Next.js 16.2.9, 0 errors)

## Changes Made

1. **Removed DELIVERY_CHANNELS fakery** — stripped `status` and `latency` fields; all channels now render as static green "Active" with no fake latency numbers.
2. **Removed hardcoded stat trends** — replaced "Resolved Today" (with `|| 12` fallback) and "Avg Response" ("2:34") with real data ("Resolved" → `closedCount`, "Total Events" → `threats.length`). Removed the `trend`/`trendUp` div and unused `TrendingUp`/`TrendingDown` imports.
3. **Wired up Acknowledge/Resolve buttons** — imported `useUpdateThreat` from `@/lib/queries/useThreats`, added `updateThreat` mutation, and replaced static buttons with functional ones that call `updateThreat` with the correct `alerta_status` values (`'ack'` / `'closed'`). Buttons disable and show past-tense labels when the status is already set.

## Concerns

None.
