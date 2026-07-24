# Task 2: Compute Severity Distribution from Real Data

## Status: DONE

## What Changed
Replaced hardcoded severity distribution percentages in `frontend/app/(app)/alerta/page.tsx` with computed values derived from the `threats` array via `useThreats`. The `sevDist` array now uses `reduce` to count threats by severity and calculates percentages dynamically.

## Commit
`241b402` — fix: compute severity distribution from real threat data

## Build
`npx next build` — passed (TypeScript clean, 22 routes generated)

## Concerns
None. The change is minimal and type-safe.
