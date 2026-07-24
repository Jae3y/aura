# Task 2: Persist Solana Queue to Database — Report

## What I Implemented

Replaced the in-memory Solana queue with a Supabase-backed outbox pattern:

1. **Created `backend/src/lib/db/solana_outbox.ts`** — New DB helper with functions: `insertOutboxItem`, `getPendingItems`, `markProcessing`, `markComplete`, `markFailed`, `incrementAttempts`. Uses existing `supabaseAdmin` client.

2. **Rewrote `backend/src/blockchain/solanaQueue.ts`** — `enqueueSolanaEvent()` now persists to DB via `insertOutboxItem()`. The polling loop loads pending items from DB. On success: `markComplete()` (deletes row). On final failure after 3 attempts: `markFailed()` + `persistFailure()` + Sentry. On intermediate failure: resets to `pending` for next cycle. `_queueLength()` is now async.

3. **Updated `backend/src/__tests__\solana-queue.property.test.ts`** — Added mocks for the new `solana_outbox` module.

4. **Updated `backend/src/handlers/__tests__/surgeHandler.integration.test.ts`** — Changed `mockReturnValue(undefined)` to `mockResolvedValue(undefined)` for the now-async `enqueueSolanaEvent`.

## Test / Typecheck Results

- **`npx tsc --noEmit`**: PASS (zero errors)
- **`npm run test`**: 111 pass, 8 fail (all 8 failures are **pre-existing** — confirmed by running tests against stashed original code)

The solana-queue property tests (7 tests) all pass. The surgeHandler integration tests (10 tests) all pass.

Pre-existing failures are in `mqtt.property.test.ts`, `alerta-webhook.integration.test.ts`, `alerta.property.test.ts`, `handlers.property.test.ts`, `integration.test.ts`, and `lisk.property.test.ts` — all unrelated mock hoisting or missing export issues.

## Files Changed

| File | Action |
|------|--------|
| `backend/src/lib/db/solana_outbox.ts` | **Created** |
| `backend/src/blockchain/solanaQueue.ts` | **Rewritten** |
| `backend/src/__tests__/solana-queue.property.test.ts` | **Updated** (added outbox mocks) |
| `backend/src/handlers/__tests__/surgeHandler.integration.test.ts` | **Updated** (mockReturnValue → mockResolvedValue) |

## Concerns

None. The queue items now survive server restarts. The outbox pattern follows the same conventions as other DB helpers in `lib/db/`. The `enqueueSolanaEvent()` callers that use fire-and-forget (no await) remain safe because the internal try/catch prevents unhandled rejections.
