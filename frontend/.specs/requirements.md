# AURA Frontend Requirements (Phase 1)

**Project Context**: AURA is an intelligent autonomous protection system for Nigerian homes, hospitals, and industrial environments. It includes human presence detection, electrical surge protection, automated environment control, and Alerta incident monitoring.
**Stack**: Next.js + TypeScript + Tailwind CSS + shadcn/ui + Lucide + Zustand + Framer Motion + TanStack Query + React Hook Form + Zod + @solana/wallet-adapter-react + Supabase Realtime + Socket.io client.
**Target**: Mobile PWA (390px viewport) first.

*Note: All Lisk blockchain references from original designs have been updated to Solana per architectural changes. Lisk is retained only for monthly compliance audit summaries.*

---

## Design Tokens (Draft from `visily-global-ui.png`)

- **Colors**:
  - Background: Pure black (`#000000`) or very dark gray for cards (`#111111` to `#1A1A1A`).
  - Secure / Nominal: Cyan / Teal.
  - Warning: Orange / Yellow.
  - Threat / Alert / Danger: Red.
  - Info: Blue / Teal.
- **Typography**:
  - Headers: Futuristic, extended sans-serif (e.g., Orbitron, Syncopate).
  - Body: Clean, legible sans-serif (e.g., Inter, Roboto).
- **Component States**:
  - Toggles: Active (Teal/Purple), Inactive (Gray).
  - Alert Modal: Red borders, pulsing red icons, red primary buttons for high-risk actions, black secondary buttons with red text.

---

## 1. Global UI & Component System (`visily-global-ui.png`)
*Design system reference and priority alert patterns.*

**Elements & Purpose:**
- Status Matrix: Shows overall system status (SECURE, THREAT, WARNING, INFO) and Frequency Response graph.
- Verified Identities: Displays user wallet card, clearance level, and on-chain verification badge.
- Relay Hub Interface: Component cards for hardware (Perimeter, Climate, Server, Lock) with operational states and toggles.
- System Semantics: Context filters/buttons for SURGE, HUMAN, VOICE, AUTO.
- Priority Alerts Modal: High-priority threat notification with action buttons.

**Acceptance Criteria:**
- 1.1 WHEN the system state changes, the Status Matrix SHALL update its visual indicator to match the new state (Secure/Warning/Threat/Info).
- 1.2 IF a Priority Alert is triggered, THEN the system SHALL display the alert modal with red styling and action buttons.
- 1.3 WHEN the user clicks a Relay Hub toggle, the system SHALL attempt to change the state of that hardware component.

---

## 2. Onboarding (`visily-onboarding.png`)
*Route: `app/(onboarding)/*`*

**Elements & Purpose:**
- Step Indicator: Shows "SYSTEM NODE: INITIALIZE 01 / 04" and a progress bar.
- Selection Cards: Options for initialization method ("SOLANA LEDGER", "BIOMETRIC ID"). *Adapted from Lisk.*
- Primary Button: "Initialize Hardware" with a right arrow.
- Footer: "ENCRYPTED BY SOLANA BLOCKCHAIN PROTOCOL". *Adapted from Lisk.*

**Acceptance Criteria:**
- 2.1 WHEN the user accesses the onboarding flow, the system SHALL display the progress indicator at step 01/04.
- 2.2 IF the user selects the Solana Ledger option, THEN the system SHALL mark it as the selected initialization method visually.
- 2.3 WHEN the user clicks "Initialize Hardware", the system SHALL save the choice and proceed to step 2.

---

## 3. Home Dashboard (`visily-home-dashboard.png`)
*Route: `app/(app)/dashboard/page.tsx`*

**Elements & Purpose:**
- Status Widget: Circular display showing "SYSTEM STATUS NOMINAL" and "LIVE UPLINK ACTIVE".
- Stats Row: Displays current PRESENCE and electrical LOAD.
- Command Center: Quick macro actions ("Emergency Lockdown", "Operational Lights").
- On-Chain Verification List: Log of recent actions with time ago, transaction signature, and "VERIFIED" badge.
- Bottom Navigation: Home, Monitor, Control, Log, Settings.

**Acceptance Criteria:**
- 3.1 WHEN the dashboard loads, the system SHALL fetch and display current presence count and electrical load from the backend.
- 3.2 IF the user clicks an On-Chain Verification item, THEN the system SHALL open the Solana devnet explorer for that transaction signature.
- 3.3 WHEN the user clicks "Emergency Lockdown", the system SHALL trigger the lockdown protocol depending on safety settings.

---

## 4. Threat Monitor (`visily-threat-monitor.png`)
*Route: `app/(app)/monitor/page.tsx`*

**Elements & Purpose:**
- Alert Banner: Glitch text "HUMAN DETECTED" and location.
- Visual Feed: Pulsing red shield icon representing "LIVE SENSOR FEED".
- Auto-Response Protocol: Countdown timer.
- Escalation Progress: Progress bar showing "SOLANA VERIFICATION PENDING". *Adapted from Lisk.*
- Response Options: Action buttons for "EXTERNAL SIREN" and "FLOODLIGHTS".
- Info List: Read-only data for Identity, Confidence, and Verify Chain (Solana ID).

**Acceptance Criteria:**
- 4.1 WHEN a threat is detected, the system SHALL display the threat type and location prominently in the alert banner.
- 4.2 IF the Auto-Response Protocol is active, THEN the system SHALL display a live countdown timer ticking down to automatic escalation.
- 4.3 WHEN the user clicks a response option like "EXTERNAL SIREN", the system SHALL immediately send the activation command to the respective relay.

---

## 5. Environment Control (`visily-environment-control.png`)
*Route: `app/(app)/control/page.tsx`*

**Elements & Purpose:**
- Quick Overrides: "KILL SWITCH" (red), "VENTILATION" (cyan).
- Zone Control Matrix: Grid of cards for different zones (LIVING ROOM, SERVER ROOM) with hardware toggles.
- Scheduled Protocols: List of active automated routines.
- Footer Note: Disclaimer logging relay interactions to the Solana blockchain. *Adapted from Lisk.*

**Acceptance Criteria:**
- 5.1 WHEN the control page loads, the system SHALL display all configured zones and their active hardware units.
- 5.2 IF the user toggles a hardware unit, THEN the system SHALL send the relay command to the backend and log the action to the Solana blockchain.
- 5.3 WHEN the user clicks "KILL SWITCH", the system SHALL initiate an immediate power cut protocol.

---

## 6. Detection Map (`visily-detection-map.png`)
*Route: `app/(app)/detection/page.tsx`*

**Elements & Purpose:**
- Header: "< SPATIAL VIEW", Notification/Shield icons.
- Summary Panel: "TOTAL PRESENCE 03 SUBJECTS", "SCANNING", "2 ALERTS".
- Live Floorplan: 2D map showing sectors with blips (red for alert, teal for normal). "LIVE FEED" and "Link Verified" badges.
- Active Zones List: Cards for zones (e.g., "MAIN LIVING HALL" - OCCUPIED).
- Zone Metrics: Signal strength, Battery, Presence count, "Blockchain Verified Event" -> LOGS link.
- Footer Banner: "VERIFIED TRANSACTION ID ... SOLANA". *Adapted from Lisk.*

**Acceptance Criteria:**
- 6.1 WHEN the spatial view loads, the system SHALL render the 2D live floorplan with current sector statuses.
- 6.2 IF a zone transitions to an alert state, THEN the system SHALL update the floorplan sector color to red and show a red presence blip.
- 6.3 WHEN the user clicks "LOGS >", the system SHALL navigate to the Event Log pre-filtered for that zone's events.

---

## 7. Event Log (`visily-blockchain-event-log.png`)
*Route: `app/(app)/log/page.tsx`*

**Elements & Purpose:**
- Header: "EVENT LOG", Icons.
- Banner: "CHAIN STATUS: OPERATIONAL" indicating Solana Devnet health. *Adapted from Lisk.*
- Tabs: ALL LOGS, SECURITY, AUTOMATION, SYSTEM.
- Real-Time Feed: Scrollable list of event cards.
- Event Card: Icon, Title (e.g. "Front Perimeter Breach"), timestamp, description, Solana signature, "VIEW PROOF v", "SOLANA VERIFIED" badge. *Adapted from Lisk.*
- Bottom loader: "SYNCING HISTORICAL BLOCKS..."
- FAB: Shield icon floating action button.

**Acceptance Criteria:**
- 7.1 WHEN the user selects a filter tab, the system SHALL filter the event feed to match the selected category.
- 7.2 WHEN a new event occurs, the system SHALL prepend the event card to the Real-Time Feed automatically.
- 7.3 IF the user clicks "VIEW PROOF", THEN the system SHALL expand the card to show detailed on-chain proof data.

---

## 8. Analytics & Insights (`visily-analytics-&-insights.png`)
*Route: `app/(app)/analytics/page.tsx`*

**Elements & Purpose:**
- System Integrity: "94% SYSTEM HEALTH" radial chart, "0.8s RESPONSE", "12 SURGES PREV."
- Weekly Activity: Area chart showing "Detection Frequency" over Mon-Sun.
- Metrics Cards: "1.4s Avg. Response", "3.2/wk Surge Frequency".
- Electrical Load Distribution: Bar chart over Mon-Sun.
- Footer note: "99.9% Solana Verified", "VIEW LOG >". *Adapted from Lisk.*
- Device Status: List of devices with uptime and health percentage.

**Acceptance Criteria:**
- 8.1 WHEN the analytics page loads, the system SHALL fetch and render the health score, detection frequency area chart, and load distribution bar chart.
- 8.2 IF the user clicks a device in the Device Status list, THEN the system SHALL navigate to the specific device details view.

---

## 9. Access Control (`visily-access-&-wallet.png`)
*Route: `app/(app)/access/page.tsx`*

**Elements & Purpose:**
- Network Status: "SOLANA DEVNET ONLINE". *Adapted from Lisk.*
- Primary Admin Node: "Master Wallet" card displaying SOL address, SOL balance, "Sync Balance", "Disconnect".
- Authorized Wallets: List of users and their SOL addresses, with delete icons.
- Add Button: "+ AUTHORIZE NEW WALLET".
- Disclaimer Card: "Blockchain Verified ... logged as smart contract events on the Solana blockchain ... POWERED BY SOLANA". *Adapted from Lisk.*
- Lisk Audit Badge: A secondary badge indicating Lisk compliance integration for monthly audits. *(New addition)*

**Acceptance Criteria:**
- 9.1 WHEN the access control page loads, the system SHALL display the connected Phantom wallet address and current SOL balance.
- 9.2 IF the user clicks "Disconnect", THEN the system SHALL terminate the wallet session and redirect to the connection screen.
- 9.3 WHEN the user clicks to delete an authorized wallet, the system SHALL prompt for confirmation and remove the wallet upon approval.
- 9.4 THE system SHALL display a secondary "Lisk Audit" badge to represent the monthly compliance integration.

---

## 10. Settings (`visily-settings.png`)
*Route: `app/(app)/settings/page.tsx`*

**Elements & Purpose:**
- Detection Engine: "MOTION SENSITIVITY" slider, "ALERT THRESHOLD" slider. "ENGINE MODE: AGGRESSIVE" indicator.
- Access & Security: "BIOMETRIC UNLOCK" toggle, "CRITICAL ALERTS" toggle.
- Solana Network: "DEVNET CONNECTION" indicator. "TESTNET MODE" toggle. "Rotate Wallet Keys" button. *Adapted from Lisk.*
- Core Infrastructure: Firmware Version, Hardware ID, View Pairing Guide.
- Reset Button: "Reset Command Center" (red text).

**Acceptance Criteria:**
- 10.1 WHEN the user adjusts a slider, the system SHALL update the threshold and save the new setting.
- 10.2 IF the user toggles Biometric Unlock, THEN the system SHALL prompt for biometric verification to confirm the change.
- 10.3 WHEN the user clicks "Reset Command Center", the system SHALL display a high-friction confirmation modal before wiping local configuration.

---

## 11. Voice Command Center (Gap Screen)
*Route: `app/(app)/voice/page.tsx`*

**Elements & Purpose:**
- Active listening visualizer (waveform/bars) matching the command center aesthetic.
- Recent commands list showing parsed intents, confidence scores, and Solana verification badge.

**Acceptance Criteria:**
- 11.1 WHEN the voice page is active, the system SHALL display a visual waveform corresponding to detected audio activity.
- 11.2 IF a voice command is parsed and executed, THEN the system SHALL append it to the recent commands list with its confidence score and Solana verification badge.

---

## 12. Monthly Reports (Gap Screen)
*Route: `app/(app)/reports/page.tsx`*

**Elements & Purpose:**
- List of monthly compliance reports.
- PDF export buttons.
- Secondary Lisk Audit badge representing the monthly sync.

**Acceptance Criteria:**
- 12.1 WHEN the reports page loads, the system SHALL display a list of generated monthly reports.
- 12.2 IF the user clicks download, THEN the system SHALL initiate the PDF download for that report.
- 12.3 THE system SHALL display the secondary Lisk Audit badge on confirmed monthly reports.

---

## 13. Global Gap Components
**Elements & Purpose:**
- Empty/Error/Loading: Skeleton shimmer, error fallback components.
- Toast/Notification component.
- Full-screen Alert transitions (entry/exit animations).

**Acceptance Criteria:**
- 13.1 WHEN data is fetching, the system SHALL display skeleton shimmers matching the target component's layout.
- 13.2 IF a global alert is triggered, THEN the system SHALL animate the alert modal entry using Framer Motion with an urgent pulse effect.
- 13.3 WHEN a background action completes, the system SHALL display a toast notification that dismisses automatically after 3 seconds.
