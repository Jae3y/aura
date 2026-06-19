# AURA Frontend Design Specification (Phase 2)

## 1. Design Tokens

The visual language follows a "military command center" aesthetic, optimized for high contrast, rapid information parsing, and dark environments.

### Colors
- **Backgrounds**:
  - `bg-base`: `#000000` (Pure Black for the main app background)
  - `bg-card`: `#0A0A0A` to `#111111` (Very dark gray for raised elements)
  - `bg-card-hover`: `#1A1A1A`
- **Text**:
  - `text-primary`: `#FFFFFF`
  - `text-secondary`: `#A1A1AA` (Zinc 400)
  - `text-muted`: `#52525B` (Zinc 600)
- **Status Accents**:
  - `accent-cyan` (Nominal/Secure/Active): `#06B6D4` (Cyan 500)
  - `accent-teal` (Verified/Success): `#14B8A6` (Teal 500)
  - `accent-warning` (Warning/Info): `#F59E0B` (Amber 500)
  - `accent-danger` (Threat/Critical): `#EF4444` (Red 500)
  - `accent-purple` (Active toggles): `#8B5CF6` (Violet 500)

### Typography
- **Headings**: `font-sans` with `Orbitron` or `Syncopate` fallback. Uppercase, tracked out (`tracking-widest`).
- **Body & Metrics**: `font-mono` (e.g., JetBrains Mono) for numbers/data, and a clean sans-serif (Inter) for standard UI text.
- **Sizes**:
  - Headers: `text-2xl` to `text-3xl`, bold.
  - Subheaders: `text-sm` to `text-base`, uppercase, letter-spacing.
  - Body: `text-sm`.
  - Micro-copy: `text-xs`.

### Borders & Effects
- **Border Radius**: Sharp or slightly rounded corners (`rounded-md` or `rounded-lg` max) to maintain the technical, hardware-focused feel.
- **Glows/Shadows**: 
  - Status nodes and primary buttons have heavy drop-shadows reflecting their accent color (e.g., `shadow-[0_0_15px_rgba(6,182,212,0.5)]` for cyan active state).
  - Threat alerts use pulsing red box-shadows.
- **Lines/Dividers**: `#27272A` (Zinc 800) solid or dashed.

---

## 2. Component Inventory

| Component | Purpose | Variants / States |
| --- | --- | --- |
| `StatusOrb` | Circular visual indicator for system/device health | `secure` (cyan/teal), `threat` (red), `offline` (gray), `warning` (amber). Idle: static glow. Alert: pulsing glow. |
| `MetricCard` | Displays numerical data (presence, load, response time) | `default`, `highlighted` (shows % change indicator). |
| `CommandCenterButton` | Large, blocky action buttons for quick overrides | `cyan` (primary), `dark` (secondary), `red` (danger/kill switch). |
| `VerificationLogRow` | Row showing an event and its blockchain verification status | `verified` (green badge), `pending` (spinner), `failed` (red). |
| `RelayToggle` | Custom switch for hardware control | `active` (purple/cyan knob), `offline` (gray/disabled), `standby` (white knob, gray track). |
| `WalletCard` | Displays connected wallet info and balance | `solana-primary` (cyan accents). |
| `AuthorizedWalletRow` | List item for access control | Includes wallet address, user role badge, delete icon. |
| `PriorityAlertModal` | Full-screen or heavy modal for critical threats | Red bordered, glitch text effects, `Authorize` (red) vs `Dismiss` (dark). |
| `TopBar` | Global header | Left: Context icon/back button. Right: Notifications, System Shield. |
| `BottomNav` | Mobile tab navigation | Home, Monitor, Control, Log, Settings. Active state highlights icon and text in cyan. |
| `SystemSemanticIcon` | Filter/category icon buttons (Surge, Human, etc.) | `active` (glow border), `inactive` (dimmed). |
| `LiskAuditBadge` | Secondary badge for monthly compliance reports | `verified`, `pending`. (New component specific to reports/access). |
| `SolanaExplorerBadge`| Primary on-chain verification tag | Cyan/Teal styling, shortened signature text, external link icon. |

---

## 3. Screen-By-Screen Breakdown

- **Onboarding (`/(onboarding)/*`)**: Focus on tech-heavy presentation. Shield icon centerpiece. Solana Ledger vs Biometric selection. (Req 2)
- **Home Dashboard (`/(app)/dashboard`)**: Main hub. Status Widget is central. Stats Row below it. Command Center buttons take up middle area. On-Chain Verification list takes up the rest of the vertical space. (Req 3)
- **Threat Monitor (`/(app)/monitor`)**: Red-dominant scheme. Glitch text for "HUMAN DETECTED". Large pulsing shield in center. Countdown timer prominently placed. (Req 4)
- **Environment Control (`/(app)/control`)**: Grid layout for zones. Toggles must show clear active/inactive states. Quick overrides at the top. (Req 5)
- **Detection Map (`/(app)/detection`)**: 2D floorplan visualization. Requires custom SVG or Canvas element for the map. Red blips for presence, cyan for scanning. List of zones below. (Req 6)
- **Event Log (`/(app)/log`)**: Tabbed interface. Real-time feed lists `VerificationLogRow` components. Sticky FAB in bottom right. (Req 7)
- **Analytics & Insights (`/(app)/analytics`)**: Chart-heavy. Recharts or similar library. Cyan accents for positive/nominal charts. (Req 8)
- **Access Control (`/(app)/access`)**: Master wallet card at top. List of authorized wallets. Features the new `LiskAuditBadge` subtly at the bottom as a secondary compliance marker. (Req 9)
- **Settings (`/(app)/settings`)**: Form-heavy. Sliders, toggles, text inputs. Red danger zone for "Reset Command Center". (Req 10)
- **Voice Command Center (`/(app)/voice`)**: (Gap) Needs a central audio waveform visualizer (canvas or CSS bars) that reacts to state. Command history list below. (Req 11)
- **Monthly Reports (`/(app)/reports`)**: (Gap) List view of PDF reports. Needs the `LiskAuditBadge` prominently per report. (Req 12)

---

## 4. Motion Spec (Framer Motion)

- **StatusOrb Alert Pulse**: `animate={{ boxShadow: ["0 0 0px #ef4444", "0 0 20px #ef4444", "0 0 0px #ef4444"] }}` repeating.
- **PriorityAlertModal**: Entry `initial={{ opacity: 0, scale: 0.95, y: 20 }}` -> `animate={{ opacity: 1, scale: 1, y: 0 }}`. Exit `opacity: 0, scale: 1.05`.
- **Page Transitions**: Simple fade and slight slide up: `initial={{ opacity: 0, y: 10 }}` -> `animate={{ opacity: 1, y: 0 }}`.
- **Button Press Feedback**: `whileTap={{ scale: 0.97 }}`.
- **RelayToggle**: Smooth layout animation for the switch knob using `layout` prop.
- **Live Waveform Bars (Voice)**: `animate={{ height: [10, 40, 15, 30] }}` randomized loop when actively listening.
- **Toast/Notification**: Slide in from top or bottom edge with a spring physics bounce.
- **Skeleton Shimmer**: CSS animation `animate-pulse` or a moving linear gradient.

---

## 5. Responsive Behavior

The primary target is the **390px mobile viewport**. 
- **Mobile First**: All layouts use vertical stacking (`flex-col`), tight padding (`p-4`), and full-width buttons. The BottomNav is fixed at the bottom.
- **Desktop Web (Secondary)**: 
  - Expand to a max-width container (`max-w-md mx-auto`) for the direct mobile-app feel, OR
  - Convert `BottomNav` to a persistent left-hand sidebar (`w-64`). 
  - Change grid columns: e.g., Environment Control matrix goes from `grid-cols-1` to `grid-cols-2` or `grid-cols-3`.
  - Analytics charts expand full width of their container.

---

## 6. Improvement Notes (Beyond PNGs)

- **Accessibility**: Increased contrast on `text-muted` elements to meet WCAG AA standards. Added `aria-label` to all icon-only buttons (like the event log FAB).
- **Loading States**: Added skeleton UI states for the Dashboard stats, Event Log feed, and Analytics charts while TanStack Query fetches data.
- **Empty States**: Designed empty states for the Event Log ("No events recorded") and Authorized Wallets ("No additional wallets authorized") with dimmed icons and subtle text.
- **Interactive Feedback**: Added Framer Motion `whileTap` states to every interactive element.
- **Glitch Effect**: The static red "HUMAN DETECTED" text is enhanced with a CSS keyframe glitch animation to emphasize urgency.

---

## 7. Blockchain Adaptation Log

- **Global**: All visual references to "LISK VERIFIED" changed to "SOLANA VERIFIED" (or standard verified badge with Solana devnet icon).
- **Onboarding**: "LISK LEDGER" option replaced with "SOLANA LEDGER". Footer "ENCRYPTED BY LISK..." changed to "ENCRYPTED BY SOLANA...".
- **Home Dashboard**: "Lisk ID: 0x..." changed to Solana transaction signatures. Links point to `explorer.solana.com/?cluster=devnet`.
- **Threat Monitor**: "LISK VERIFICATION PENDING" changed to "SOLANA VERIFICATION PENDING". "Verify Chain" points to Solana.
- **Environment Control**: Footer disclaimer updated to state relay interactions are logged on the Solana blockchain.
- **Detection Map**: Footer verified transaction banner updated to Solana.
- **Event Log**: Banner text "Lisk Mainnet" updated to "Solana Devnet". Verified tags updated.
- **Analytics**: Footer "99.9% Lisk Verified" updated to "99.9% Solana Verified".
- **Access & Wallet**: 
  - "LISK MAINNET ONLINE" -> "SOLANA DEVNET ONLINE".
  - Wallet balances converted from LSK to SOL. Address formats assumed SOL base58 format.
  - Authorized Wallets display SOL addresses instead of Lisk addresses.
  - Disclaimer card updated to reference Solana smart contracts/programs.
  - **CRITICAL ADDITION**: Added a secondary `LiskAuditBadge` at the bottom of the Access page to represent the monthly compliance audit integration.
- **Reports (Gap)**: Features the `LiskAuditBadge` for each successfully confirmed monthly report.
