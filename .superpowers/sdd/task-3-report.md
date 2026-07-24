# Task 3: Rate-Limit the Alerta Webhook — Report

## Summary

Added a dedicated `webhookLimiter` (30 req/min per IP) for the `/alerta/webhook` endpoint.

## Changes

### `backend/src/middleware/rateLimit.ts`
- Added `webhookLimiter` export with `windowMs: 60_000` and `max: 30`, reusing the shared `common` config (standard headers, 429 error message body).

### `backend/src/index.ts`
- Updated import to include `webhookLimiter` alongside `defaultLimiter`.
- Inserted `webhookLimiter` before the `express.json()` middleware on the `/alerta/webhook` path so rate limiting is evaluated before body parsing.

## Verification

- `npx tsc --noEmit` — passed with zero errors.
- Manual review confirms limiter is applied only to `/alerta/webhook`, not to other Alerta routes.

## Commit

- `e06b867` — `fix: rate-limit Alerta webhook endpoint to 30 req/min per IP`

## Concerns

None. The implementation is straightforward and follows existing conventions.
