# AURA (Autonomous Utility & Response Assistant) — Audience & Presentation Guide

Welcome to AURA, an intelligent, autonomous environment protection system designed to secure and safeguard homes, hospitals, and industrial setups in Nigeria. This guide is written for beginners, judges, and presentation audiences to understand the core mission of AURA, how it works, and how to navigate the command center.

---

## 1. What is AURA?
AURA stands for **Autonomous Utility & Response Assistant**. It is a mobile-first, installable **Progressive Web App (PWA)** that acts as the primary cockpit or command center for a physical hardware gateway deployed on-premises.

### The Problem in Nigeria:
1. **Grid Instability**: Rapid voltage fluctuations (undervoltage and overvoltage surges) damage expensive equipment and cause hospital electrical faults.
2. **Security & Physical Breaches**: Insecure boundaries and unauthorized intrusions require immediate, automated local responses and transparent logs.

### The AURA Solution:
AURA acts as an autonomous guardian:
- It monitors real-time power metrics (voltage, current, frequency).
- It uses human presence sensors to detect physical activity in designated zones.
- It executes local safety protocols (e.g., cutting off relays to save equipment or activating external sirens/lights).
- It posts security logs to the blockchain to make them tamper-proof.

---

## 2. Core Features Explained

### 🔌 Intelligent Surge Protection
AURA connects to a power monitoring unit (such as a PZEM-004T sensor). When voltage surges past safe limits (e.g., above 250V or below 180V), AURA automatically cuts off power to the affected channel in milliseconds to prevent fire or damage.

### 🚶 Zone Presence Detection
AURA divides your premises into virtual **Zones** (like the *Living Room*, *Server Room*, or *Front Gate*). If a presence sensor detects motion in a restricted zone:
- The system status transitions from **Nominal** (nominal/secure) to **Threat** (alert).
- Pre-configured actions are run automatically (e.g., turning on spotlights, sounding sirens, or initiating a lock down).

### 🚨 Alerta Incident Escalation
Critical threats (breaches, high voltage anomalies) are synchronized with **Alerta**, a centralized alert management server. Alerta immediately routes these alerts to off-site security coordinators or alerts you directly on messaging channels like **Telegram**.

### ⛓️ Double-Chain Blockchain Auditing
Every important action (relay overrides, surges, intrusions) is written to a blockchain ledger. This creates an audit log that cannot be deleted or altered by a malicious hacker or employee:
1. **Solana (Primary Ledger)**: Every real-time sensor alert or control action is instantly registered as a transaction on the Solana Devnet. You can click on the "Verified" badge next to any log in the app to view the proof directly on the Solana block explorer.
2. **Lisk (Compliance Audit)**: Every month, the system compiles a summary of threats, health scores, and power statistics, generating a monthly compliance report signed and submitted to Lisk.

---

## 3. How to Navigate the Command Center

### 📱 1. Installation (PWA)
AURA is built as a Progressive Web App. You can install it on your Android or iOS device:
- **iOS**: Tap the "Share" button in Safari and select "Add to Home Screen".
- **Android**: Tap the install prompt or click the three dots in Chrome and select "Install App".
It launches in standalone full-screen mode, bypassing browser address bars for a native app feel.

### 🛡️ 2. Overview (Dashboard)
The central hub showing:
- **System Orb**: A pulsing indicator (Teal for nominal/secure, Red for lockdown/threat).
- **Live Stats**: Real-time human count on the premises and live power usage.
- **Quick Controls**: Access to emergency lockdowns and light overrides.
- **On-Chain Verification Feed**: Recent blockchain proofs syncing live.

### 📡 3. Operations (Controls)
This screen allows you to override hardware components manually. Toggle active relays or trigger the **Emergency Kill Switch** to cut off all systems instantly.

### 🚨 4. Alerta Center
The interface where security teams can view and filter all active incidents, acknowledging warnings and closing resolved alerts.

### ⛓️ 5. Event Log
A scrollable, real-time chronicle of every event logged by the system, complete with transaction hashes and explorer links.

### ⚙️ 6. Settings & Simulator Suite
Here, you can adjust motion sensitivity thresholds, toggle testnet configurations, and use the **System Simulator** to test the entire pipeline (surge alerts, Telegram integrations, and blockchain writes) without needing physical hardware!
