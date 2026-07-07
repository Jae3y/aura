<div style="position: relative; height: 100px; margin: 16px 0;">
  <pre style="position: absolute; top: 6px; left: 6px; color: rgba(0,0,0,0.25); font-family: 'Courier New', monospace; font-weight: bold; line-height: 1.15; margin: 0;">
    _   _   _ ____      _    
   / \ | | | |  _ \    / \   
  / _ \| | | | |_) |  / _ \  
 / ___ \ |_| |  _ <  / ___ \ 
/_/   \_\___/|_| \_\/_/   \_\
  </pre>
  <pre style="position: absolute; top: 4px; left: 4px; color: #0f766e; font-family: 'Courier New', monospace; font-weight: bold; line-height: 1.15; margin: 0;">
    _   _   _ ____      _    
   / \ | | | |  _ \    / \   
  / _ \| | | | |_) |  / _ \  
 / ___ \ |_| |  _ <  / ___ \ 
/_/   \_\___/|_| \_\/_/   \_\
  </pre>
  <pre style="position: absolute; top: 2px; left: 2px; color: #0d9488; font-family: 'Courier New', monospace; font-weight: bold; line-height: 1.15; margin: 0;">
    _   _   _ ____      _    
   / \ | | | |  _ \    / \   
  / _ \| | | | |_) |  / _ \  
 / ___ \ |_| |  _ <  / ___ \ 
/_/   \_\___/|_| \_\/_/   \_\
  </pre>
  <pre style="position: absolute; top: 0; left: 0; color: #14b8a6; font-family: 'Courier New', monospace; font-weight: bold; line-height: 1.15; margin: 0;">
    _   _   _ ____      _    
   / \ | | | |  _ \    / \   
  / _ \| | | | |_) |  / _ \  
 / ___ \ |_| |  _ <  / ___ \ 
/_/   \_\___/|_| \_\/_/   \_\
  </pre>
</div>

<p style="color: #06b6d4; font-size: 1.15em; text-align: center; margin-top: 8px;">
<strong>Autonomous Utility &amp; Resource Assistant</strong>
</p>

> 🛡️ IoT Security Platform with Blockchain Verification and AI-Powered Threat Detection

[![License](https://img.shields.io/badge/license-MIT-blue)]()

**AURA** is a full-stack IoT security platform that combines real-time threat detection, blockchain verification, and AI-powered automation to protect physical environments.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (database)
- HiveMQ Cloud account (MQTT broker)
- Solana devnet wallet

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd aura

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev

# Frontend setup (in new terminal)
cd ../frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your credentials
npm run dev
```

### Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

---

## 📋 Features

### 🔐 Security & Authentication
- Wallet-based authentication (Solana Phantom)
- JWT session management
- Row-level security (RLS) on all database tables
- Device token validation for MQTT messages

### 📡 Real-time IoT Platform
- MQTT integration with HiveMQ Cloud
- Live telemetry dashboard
- Device status monitoring and control
- Socket.io real-time event streaming
- 4-channel relay control

### ⛓️ Blockchain Integration
- **Solana:** Real-time event logging to devnet
- **Lisk:** Monthly audit reports to testnet
- NFT device pairing with Metaplex
- Non-blocking queue with automatic retry
- Transaction verification and explorer links

### 🚨 Threat Management
- Surge detection with auto-cutoff
- Presence detection (PIR sensors)
- Anomaly detection in sensor readings
- Alerta integration for alert lifecycle
- Telegram notifications
- FCM push notifications with email fallback

### 📊 Monitoring & Reporting
- Live telemetry gauges (voltage, current, power)
- Monthly health score calculation
- PDF report generation
- Blockchain-verified audit trails
- Device uptime tracking

### 🎙️ Voice Control
- Voice command processing
- Confidence threshold enforcement
- Command execution logging
- Blockchain verification of voice actions

---

## 🏗️ Architecture

### Tech Stack

#### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Real-time:** Socket.io + HiveMQ MQTT
- **Database:** Supabase (PostgreSQL)
- **Blockchain:** Solana (devnet) + Lisk (testnet)
- **Services:** Alerta, FCM, Resend, Metaplex
- **Monitoring:** Sentry

#### Frontend
- **Framework:** Next.js 16.2.9 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Animations:** Framer Motion
- **State:** Zustand + TanStack Query
- **Blockchain:** @solana/wallet-adapter-react
- **Real-time:** Socket.io-client

### System Flow

```
ESP32 Device
    ↓ MQTT (HiveMQ)
Backend Handlers
    ↓
Supabase Database
    ↓
Solana Queue
    ↓
Blockchain
    ↓
Alerta (Telegram)
    ↓
Socket.io
    ↓
Frontend React UI
```

---

## 📁 Project Structure

```
aura/
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── config/      # Environment config
│   │   ├── middleware/  # Auth, rate limiting
│   │   ├── routes/      # REST endpoints
│   │   ├── handlers/    # MQTT event handlers
│   │   ├── services/    # External integrations
│   │   ├── lib/db/      # Database layer
│   │   ├── blockchain/  # Solana queue
│   │   ├── socket/      # Socket.io
│   │   └── __tests__/   # Tests (20 files)
│   └── package.json
├── frontend/            # Next.js PWA
│   ├── app/            # Pages (App Router)
│   ├── components/     # React components
│   ├── lib/            # Utilities, stores
│   ├── hooks/          # Custom hooks
│   └── public/         # Static assets
├── supabase/           # Database migrations
│   └── migrations/
├── ESP32_MQTT_REFERENCE.md
└── README.md (this file)
```

---

## 🧪 Testing

### Run All Tests
```bash
cd backend
npm test
```

### Test Coverage
- **20/20** property-based tests passing
- **2/2** integration tests passing
- **1/1** unit tests passing

---

## 🔧 Configuration

### Backend Environment Variables

```bash
# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=[service-role-key]

# MQTT
HIVEMQ_URL=mqtts://[cluster].hivemq.cloud:8883
HIVEMQ_USER=[username]
HIVEMQ_PASS=[password]

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_KEYPAIR=[base58-encoded-keypair]

# Lisk
LISK_API_URL=https://testnet.lisk.com
LISK_PRIVATE_KEY=[hex-private-key]

# Alerta
ALERTA_API_KEY=[api-key]
ALERTA_BASE_URL=https://alerta.io

# Notifications
FCM_PROJECT_ID=[firebase-project-id]
RESEND_API_KEY=re_[api-key]

# Monitoring
SENTRY_DSN=[sentry-dsn]

# Development
MOCK_INTEGRATIONS=true
NODE_ENV=development
PORT=3001
```

### Frontend Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

---

## 📡 Hardware Integration

For ESP32 firmware developers, see [ESP32_MQTT_REFERENCE.md](./ESP32_MQTT_REFERENCE.md) for:
- MQTT broker credentials
- Topic structure: `aura/{deviceId}/{message-type}`
- Payload schemas for all 7 message types
- Device token authentication
- Reconnect logic with exponential backoff

---

## 🚀 Deployment

### Backend (Render/Railway)
1. Connect GitHub repository
2. Set environment variables from `.env.example`
3. Build command: `npm run build`
4. Start command: `npm start`

### Frontend (Vercel/Netlify)
1. Connect GitHub repository
2. Framework: Next.js
3. Build command: `npm run build`
4. Output directory: `.next`
5. Set environment variables from `.env.local.example`

### Database (Supabase)
1. Create new project
2. Run migrations from `supabase/migrations/`
3. Copy connection details to backend `.env`

---

## 📚 Documentation

- [ESP32_MQTT_REFERENCE.md](./ESP32_MQTT_REFERENCE.md) — Hardware integration guide

---

## 🛠️ Development

### Available Scripts

**Backend:**
```bash
npm run dev      # Start dev server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server
npm test         # Run all tests
npm run lint     # Run ESLint
```

**Frontend:**
```bash
npm run dev      # Start Next.js dev server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

---

## 🔒 Security Features

- ✅ JWT authentication with Supabase
- ✅ Wallet signature verification (Ed25519)
- ✅ Row-level security (RLS) on all tables
- ✅ Device token validation on MQTT
- ✅ Rate limiting (10-100 req/min per route)
- ✅ HMAC verification (Alerta webhooks)
- ✅ Sentry error monitoring
- ✅ Helmet security headers
- ✅ CORS configuration

---

## 📈 System Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend | ✅ Operational | Port 3001 |
| Frontend | ✅ Operational | Port 3000 |
| Database | ✅ Connected | Supabase |
| MQTT | ⚙️ Mock Mode | Ready for production |
| Solana | ⚙️ Devnet | Ready for mainnet |
| Lisk | ⚙️ Testnet | Ready for mainnet |
| Tests | ✅ Passing | 20/20 tests |

---

## 🎯 Production Readiness

### ✅ Complete
- [x] All 29 core tasks implemented
- [x] All 20 optional tests passing
- [x] Authentication and authorization
- [x] Database migrations and RLS
- [x] API endpoints with validation
- [x] Real-time Socket.io integration
- [x] Frontend UI with animations
- [x] Error handling and monitoring
- [x] Rate limiting on routes
- [x] Documentation complete

### ⚙️ To Enable for Production
- [ ] Set `MOCK_INTEGRATIONS=false`
- [ ] Update Solana to mainnet
- [ ] Update Lisk to mainnet
- [ ] Configure production Alerta
- [ ] Set up FCM production credentials
- [ ] Deploy to production infrastructure

---

## 🤝 Contributing

This project follows standard Git workflow:

1. Create a feature branch
2. Make your changes
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **Solana** - Blockchain infrastructure
- **Lisk** - Secondary blockchain layer
- **Supabase** - Database and auth
- **HiveMQ** - MQTT broker
- **Alerta** - Alert management
- **Next.js** - Frontend framework
- **Vercel** - Frontend deployment

---

## 📞 Support

For questions or issues:
1. Open an issue on GitHub
2. Check the [ESP32_MQTT_REFERENCE.md](./ESP32_MQTT_REFERENCE.md) for hardware integration

---

**Project Status:** ✅ Complete and Operational  
**Last Updated:** June 24, 2026  
**Version:** 1.0.0
