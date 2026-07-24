# Task 4: Frontend Dynamic Imports for Heavy Dependencies

**Status:** DONE  
**Commit:** `b7ebf73` perf: lazy-load blockchain and dashboard pages for smaller initial bundle

## Summary

Extracted page content from two heavy-route pages into separate `_content.tsx` files and replaced the original `page.tsx` files with `next/dynamic` wrappers using `{ ssr: false }`. Both pages now lazy-load their entire content tree (Framer Motion, GSAP, Solana web3, Spline 3D dependencies) only when the route is visited.

## Files Changed

| File | Action |
|------|--------|
| `frontend/app/(app)/blockchain/_content.tsx` | Created — full page content moved here |
| `frontend/app/(app)/blockchain/page.tsx` | Replaced with dynamic import wrapper |
| `frontend/app/(app)/dashboard/_content.tsx` | Created — full page content moved here |
| `frontend/app/(app)/dashboard/page.tsx` | Replaced with dynamic import wrapper |

## Build Verification

- **Command:** `npx next build` (Turbopack, Next.js 16.2.9)
- **Result:** Compiled successfully in 19.1s, TypeScript passed, all 22 static pages generated without errors
- `/blockchain` and `/dashboard` both appear as static routes (correct — the dynamic import is client-side only)

## What This Achieves

- Blockchain page imports: framer-motion, solana hooks, lucide-react icons — all now deferred to route visit
- Dashboard page imports: framer-motion, GSAP-based components (ParticleField, HexGrid, AnimatedCounter, StatusOrb, etc.) — all deferred
- Initial bundle no longer includes these heavy dependency trees for users who don't visit these routes
- Both pages show a styled spinner during loading

## Self-Review

- Content files are byte-identical to originals (no logic changes)
- Dynamic wrappers use `ssr: false` correctly for client-only components
- Loading spinners match the project's design system (accent-cyan, font-mono, tracking-widest)
- No concerns — clean extraction with zero behavioral change
