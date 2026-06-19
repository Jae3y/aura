# AURA Frontend Implementation Tasks (Phase 3)

Follow these tasks sequentially. Check off items as they are completed. Do not move to a new phase until the current one is complete.

## 1. Setup & Foundations
- [ ] Initialize Tailwind CSS configuration with custom color palette (black, cyan, teal, amber, red, purple) and typography scale.
- [ ] Set up global CSS (e.g., `globals.css`) for background color, font families (Orbitron/Syncopate, Inter), and custom scrollbars.
- [ ] Configure `framer-motion` provider if necessary and define global animation variants (e.g., page transitions).
- [ ] Set up layout shells: `TopBar`, `BottomNav` (mobile), and a container wrapper.

## 2. Shared Components (Primitives & Composites)
- [ ] Create `StatusOrb` component (idle/pulse variants).
- [ ] Create `MetricCard` component.
- [ ] Create `CommandCenterButton` component.
- [ ] Create `RelayToggle` custom switch component with framer-motion layout animations.
- [ ] Create `SolanaExplorerBadge` component.
- [ ] Create `LiskAuditBadge` secondary component for compliance representation.
- [ ] Create `PriorityAlertModal` with glitch text and red glow effects.
- [ ] Create `ToastNotification` system.
- [ ] Create generic loading `SkeletonShimmer` component.

## 3. Mobile Screen Implementation (UI Only)
*Implement static UIs matching designs. Data fetching/state integration comes later.*
- [ ] **Onboarding** (`app/(onboarding)/page.tsx`): Step indicator, shield icon, selection cards, primary button.
- [ ] **Home Dashboard** (`app/(app)/dashboard/page.tsx`): Status widget, stats row, command center buttons, verification feed.
- [ ] **Threat Monitor** (`app/(app)/monitor/page.tsx`): Alert banner, live sensor feed pulse, countdown timer, response buttons, info list.
- [ ] **Environment Control** (`app/(app)/control/page.tsx`): Quick overrides, zone control matrix grid, scheduled protocols list.
- [ ] **Detection Map** (`app/(app)/detection/page.tsx`): 2D floorplan visualization, active zones list.
- [ ] **Event Log** (`app/(app)/log/page.tsx`): Filter tabs, real-time feed list, `VerificationLogRow` integration, FAB.
- [ ] **Analytics** (`app/(app)/analytics/page.tsx`): System integrity radial chart, detection frequency area chart, load distribution bar chart.
- [ ] **Access Control** (`app/(app)/access/page.tsx`): Master wallet card, authorized wallets list, Lisk audit badge disclaimer.
- [ ] **Settings** (`app/(app)/settings/page.tsx`): Sliders, toggles, infrastructure info, reset button.
- [ ] **Voice Command** (`app/(app)/voice/page.tsx`): Waveform visualizer, recent commands list.
- [ ] **Monthly Reports** (`app/(app)/reports/page.tsx`): List of reports, PDF download buttons, `LiskAuditBadge`.

## 4. State Integration & Logic
- [ ] Setup Zustand store for global frontend UI state (e.g., currently active zone, modal open states).
- [ ] Integrate `@solana/wallet-adapter-react` to handle Phantom connection logic on Access and Onboarding screens.
- [ ] Integrate TanStack Query for fetching initial dashboard stats, logs, and analytics.
- [ ] Connect Supabase Realtime subscriptions for live threat events and update the dashboard/log feeds automatically.
- [ ] Connect Socket.io client for high-frequency live sensor telemetry (PZEM-004T readings, Presence).
- [ ] Wire up `RelayToggle` and `CommandCenterButton` components to trigger backend API actions.

## 5. Animation & Polish Pass
- [ ] Apply Framer Motion page transitions to all route changes.
- [ ] Add `whileTap` animations to all interactive elements.
- [ ] Implement the glitch CSS effect for critical threat text.
- [ ] Ensure `PriorityAlertModal` has a high-impact entry and exit animation.

## 6. Edge States
- [ ] Implement empty states for Event Log, Authorized Wallets, and Reports.
- [ ] Implement error states for failed data fetches or failed blockchain transactions.
- [ ] Wrap all major sections in Suspense boundaries using the `SkeletonShimmer` fallback.

## 7. Desktop Responsive Pass
*Do not start this until mobile implementation is fully verified.*
- [ ] Adapt layout to center content with a max-width, or convert `BottomNav` to a sidebar for desktop viewports (`md:flex-row`).
- [ ] Adjust grid column counts (e.g., Environment Control matrix) for wider screens.

## 8. Final Review
- [ ] Verify accessibility (aria-labels, contrast ratios).
- [ ] Verify all Lisk references in logic/UI have been replaced by Solana, except for the explicit secondary `LiskAuditBadge`.
