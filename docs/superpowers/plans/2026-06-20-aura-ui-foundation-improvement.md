# Aura UI Foundation Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Aura's existing frontend foundation so the app looks substantially more premium, exposes all relevant pages, and removes or replaces decorative-only interactions with functional UI.

**Architecture:** Improve the current Next.js app in place by strengthening the shared app shell, promoting hidden routes into real navigation, adding a dedicated profile page, and refactoring page content to rely on existing data hooks and honest states. Keep the current visual identity, but standardize composition and responsiveness with reusable shell-level UI.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Framer Motion, TanStack Query, Zustand, existing Aura API client

---

### Task 1: Upgrade The Shared App Shell

**Files:**
- Modify: `frontend/components/layout/AppShell.tsx`
- Modify: `frontend/components/layout/BottomNav.tsx`
- Modify: `frontend/components/layout/TopBar.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Add shell structure constants and responsive navigation model**

```tsx
const PRIMARY_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/control", label: "Operations" },
  { href: "/threats", label: "Threats" },
  { href: "/devices", label: "Devices" },
  { href: "/reports", label: "Reports" },
  { href: "/access", label: "Access" },
  { href: "/profile", label: "Profile" },
];

const SECONDARY_NAV = {
  "/dashboard": [
    { href: "/analytics", label: "Analytics" },
    { href: "/blockchain", label: "Blockchain" },
  ],
  "/control": [
    { href: "/control", label: "Control" },
    { href: "/voice", label: "Voice" },
    { href: "/detection", label: "Detection" },
  ],
  "/threats": [
    { href: "/threats", label: "Threats" },
    { href: "/monitor", label: "Monitor" },
    { href: "/log", label: "Event Log" },
  ],
};
```

- [ ] **Step 2: Replace the narrow mobile-only shell with a responsive frame**

```tsx
return (
  <div className="min-h-dvh bg-base text-text-primary">
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col lg:flex-row">
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-white/10">
        <DesktopPrimaryNav />
      </aside>
      <div className="flex min-h-dvh flex-1 flex-col">
        <TopBar title={title} secondaryItems={secondaryItems} />
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  </div>
);
```

- [ ] **Step 3: Update top bar to show section title, subnav, and profile/settings entry points**

```tsx
interface TopBarProps {
  title?: string;
  secondaryItems?: Array<{ href: string; label: string }>;
}
```

- [ ] **Step 4: Update bottom nav to prioritize real destinations instead of only the original five icons**

```tsx
const MOBILE_NAV = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/control", label: "Ops", icon: SlidersHorizontal },
  { href: "/threats", label: "Threats", icon: Radar },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/profile", label: "Profile", icon: User },
];
```

- [ ] **Step 5: Add shell-level CSS tokens for premium surfaces and larger-screen spacing**

```css
.panel-surface {
  background: linear-gradient(180deg, rgba(24, 24, 27, 0.92), rgba(9, 9, 11, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
}
```

- [ ] **Step 6: Run lint on touched layout files**

Run: `npm run lint -- components/layout/AppShell.tsx components/layout/BottomNav.tsx components/layout/TopBar.tsx app/layout.tsx`
Expected: `0 problems`

- [ ] **Step 7: Commit shell improvements**

```bash
git add frontend/components/layout/AppShell.tsx frontend/components/layout/BottomNav.tsx frontend/components/layout/TopBar.tsx frontend/app/layout.tsx frontend/app/globals.css
git commit -m "feat: upgrade aura app shell and navigation"
```

### Task 2: Surface Hidden Routes And Add A Real Devices Entry

**Files:**
- Create: `frontend/app/(app)/devices/page.tsx`
- Modify: `frontend/app/(app)/dashboard/page.tsx`
- Modify: `frontend/app/(app)/control/page.tsx`
- Modify: `frontend/app/(app)/analytics/page.tsx`
- Modify: `frontend/app/(app)/detection/page.tsx`
- Modify: `frontend/app/(app)/reports/page.tsx`
- Modify: `frontend/app/(app)/access/page.tsx`

- [ ] **Step 1: Create a devices index page that lists paired devices and links to device detail routes**

```tsx
const { data: devices = [], isLoading } = useDevices();

if (isLoading) return <PageState title="Loading devices" />;
if (!devices.length) return <EmptyState title="No devices yet" ctaHref="/connect" ctaLabel="Connect a system" />;
```

- [ ] **Step 2: Add direct links from dashboard cards into hidden but relevant pages**

```tsx
<Link href="/analytics">View analytics</Link>
<Link href="/threats">Open threat center</Link>
<Link href="/devices">Manage devices</Link>
```

- [ ] **Step 3: Turn the control page zone cards into real links**

```tsx
<Link href={`/zones/${primaryDevice.id}`}>View zones</Link>
<Link href={`/devices/${primaryDevice.id}`}>Open device</Link>
```

- [ ] **Step 4: Make analytics, detection, reports, and access pages include visible section-level links**

```tsx
<div className="flex flex-wrap gap-2">
  <Link href="/dashboard">Overview</Link>
  <Link href="/devices">Devices</Link>
  <Link href="/threats">Threats</Link>
</div>
```

- [ ] **Step 5: Run lint on the newly surfaced route files**

Run: `npm run lint -- app/(app)/devices/page.tsx app/(app)/dashboard/page.tsx app/(app)/control/page.tsx app/(app)/analytics/page.tsx app/(app)/detection/page.tsx app/(app)/reports/page.tsx app/(app)/access/page.tsx`
Expected: `0 problems`

- [ ] **Step 6: Commit route visibility improvements**

```bash
git add frontend/app/(app)/devices/page.tsx frontend/app/(app)/dashboard/page.tsx frontend/app/(app)/control/page.tsx frontend/app/(app)/analytics/page.tsx frontend/app/(app)/detection/page.tsx frontend/app/(app)/reports/page.tsx frontend/app/(app)/access/page.tsx
git commit -m "feat: surface aura pages through navigation"
```

### Task 3: Add A Real Profile Page And Separate It From Settings

**Files:**
- Create: `frontend/app/(app)/profile/page.tsx`
- Modify: `frontend/components/layout/BottomNav.tsx`
- Modify: `frontend/components/layout/TopBar.tsx`
- Modify: `frontend/app/(app)/settings/page.tsx`
- Modify: `frontend/lib/stores/authStore.ts`

- [ ] **Step 1: Create a profile page using the stored authenticated profile**

```tsx
const { profile, walletAddress, clearSession } = useAuthStore();

return (
  <section className="space-y-6">
    <ProfileSummaryCard profile={profile} walletAddress={walletAddress} />
    <SessionCard />
    <button onClick={() => clearSession()}>Sign out</button>
  </section>
);
```

- [ ] **Step 2: Route profile-related navigation to `/profile` instead of `/settings`**

```tsx
href={isAuthenticated ? "/profile" : "/connect"}
```

- [ ] **Step 3: Remove account identity content from settings and keep only system configuration**

```tsx
<section>
  <h2>System preferences</h2>
  <p>Notification routing, simulator settings, and device defaults.</p>
</section>
```

- [ ] **Step 4: Add any small auth-store helpers needed by the new profile surface**

```ts
get hasProfile() {
  return Boolean(get().profile?.id);
}
```

- [ ] **Step 5: Run lint on profile and settings files**

Run: `npm run lint -- app/(app)/profile/page.tsx app/(app)/settings/page.tsx components/layout/BottomNav.tsx components/layout/TopBar.tsx lib/stores/authStore.ts`
Expected: `0 problems`

- [ ] **Step 6: Commit the profile/settings split**

```bash
git add frontend/app/(app)/profile/page.tsx frontend/app/(app)/settings/page.tsx frontend/components/layout/BottomNav.tsx frontend/components/layout/TopBar.tsx frontend/lib/stores/authStore.ts
git commit -m "feat: add dedicated aura profile page"
```

### Task 4: Replace Decorative Controls With Real Page States

**Files:**
- Modify: `frontend/app/(app)/settings/page.tsx`
- Modify: `frontend/app/(app)/access/page.tsx`
- Modify: `frontend/app/(app)/voice/page.tsx`
- Modify: `frontend/app/(app)/monitor/page.tsx`
- Modify: `frontend/app/(app)/reports/page.tsx`
- Modify: `frontend/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Keep only controls that map to an API action, app state, or next-step navigation**

```tsx
const actionableControls = [
  { label: "Simulate surge", onClick: handleSimulateThreat },
  { label: "Simulate audit", onClick: handleSimulateAudit },
  { label: "View device", href: `/devices/${selectedDevice}` },
];
```

- [ ] **Step 2: Convert fake feature blocks into honest state panels**

```tsx
<StatePanel
  title="Biometric unlock"
  status="Unavailable"
  description="Local biometric unlock is not wired in this build."
/>
```

- [ ] **Step 3: Use existing hooks for real data-backed lists where available**

```tsx
const { data: notifications = [] } = useNotifications();
const { data: threats = [] } = useThreats(deviceId, 10);
const { data: reports = [] } = useReports(deviceId);
```

- [ ] **Step 4: Add empty states instead of static mock rows when there is no backing data**

```tsx
if (!reports.length) {
  return <EmptyState title="No reports yet" description="Generate one from a connected device to populate this view." />;
}
```

- [ ] **Step 5: Run lint on the functional page updates**

Run: `npm run lint -- app/(app)/settings/page.tsx app/(app)/access/page.tsx app/(app)/voice/page.tsx app/(app)/monitor/page.tsx app/(app)/reports/page.tsx app/(app)/dashboard/page.tsx`
Expected: `0 problems`

- [ ] **Step 6: Commit the functional state cleanup**

```bash
git add frontend/app/(app)/settings/page.tsx frontend/app/(app)/access/page.tsx frontend/app/(app)/voice/page.tsx frontend/app/(app)/monitor/page.tsx frontend/app/(app)/reports/page.tsx frontend/app/(app)/dashboard/page.tsx
git commit -m "feat: replace decorative aura controls with real states"
```

### Task 5: Validate The Local Experience

**Files:**
- Modify: `frontend/README.md`

- [ ] **Step 1: Run the full frontend lint pass**

Run: `npm run lint`
Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 2: Start the local app for review**

Run: `npm run dev`
Expected: `Local: http://localhost:3000`

- [ ] **Step 3: Manually verify key flows**

```txt
1. Open /dashboard and confirm top-level navigation exposes the important sections.
2. Open /profile and confirm it is reachable from navigation.
3. Open /devices and confirm device rows link to detail pages.
4. Open /settings and confirm decorative-only controls are gone or clearly unavailable.
5. Open /reports, /access, /analytics, /voice, and /threats and confirm each page has a functional purpose.
```

- [ ] **Step 4: Document the local review command in README if needed**

```md
## Local Review

Run `npm run dev` in `frontend/` and review the primary sections from the shared navigation.
```

- [ ] **Step 5: Commit final validation or docs touch-up**

```bash
git add frontend/README.md
git commit -m "docs: add local review guidance for aura ui pass"
```
