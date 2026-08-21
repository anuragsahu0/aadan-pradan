# AADAN PRADAN

> **Internet-Based Virtual-Frequency Push-to-Talk Walkie-Talkie Platform**

---

## 1. What is Aadan Pradan?

**Aadan Pradan** is a mobile-first, internet-based, virtual-frequency walkie-talkie platform.

> [!IMPORTANT]
> **Aadan Pradan is an internet-based virtual-frequency communication application. It does NOT use physical radio frequencies, Bluetooth, Wi-Fi Direct, or offline communication.**

The core architecture operates on:

$$\text{Virtual Frequency} \longrightarrow \text{Internet (IP / WebSockets / WebRTC)} \longrightarrow \text{Real-Time Half-Duplex Voice Communication}$$

Each virtual frequency supports a hard maximum of **40 concurrent users**, with **one active speaker at a time** enforced by a server-authoritative Push-to-Talk Talk Lock engine.

---

## 2. Technology Stack

### Mobile Application (`apps/mobile`)
- **Framework**: React Native with Expo SDK 51 & Expo Router (Typed Routes)
- **Language**: TypeScript (Strict Mode)
- **Voice Engine**: WebRTC / Opus 48kHz with Echo Cancellation, Noise Suppression, and AGC
- **State Management**: Zustand
- **Data Fetching & Cache**: TanStack React Query
- **Network Client**: Axios & Socket.IO Client
- **Secure Persistence**: Expo SecureStore (Keychain / Keystore)
- **Design System**: Tactical high-contrast token design system with LCD frequency displays and tactile PTT controls

### Backend Server (`apps/server`)
- **Runtime**: Node.js & TypeScript
- **Web Framework**: Express.js
- **Real-Time Engine**: Socket.IO Gateway & WebRTC Signaling
- **Floor Authority**: Server-authoritative `TalkLockService`
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Security & RBAC**: Helmet, CORS, Argon2id, JWT, express-rate-limit, Zod
- **Structured Logging**: Pino & pino-http (Auto-sanitized secrets)

### Shared Workspace Packages (`packages/`)
- `@aadan-pradan/types`: Universal TypeScript models and Socket contracts
- `@aadan-pradan/config`: Centralized limits (`MAX_USERS_PER_FREQUENCY = 40`, `MAX_TALK_DURATION_MS = 30000`)
- `@aadan-pradan/utils`: Frequency regex validators, sanitizers, and log redactors
- `@aadan-pradan/shared`: Unified package exports

---

## 3. Key Features across All 10 Phases

1. **Authentication & Identity**: Argon2id password hashing, constant-time verification, short-lived JWTs, and SHA-256 indexed refresh tokens.
2. **Virtual Frequency System**: Channel format validation (e.g. `145.800 MHz`), atomic 40-user hard limit, and real-time room presence.
3. **WebRTC Real-Time Voice**: Low-latency half-duplex Opus voice transmission with server-authorized signaling gateway.
4. **Push-to-Talk Floor Lock**: Server-authoritative floor arbitration with 30-second auto-expiration guard and simultaneous contention resolution.
5. **Mobile Reliability & Safety**: React Native `AppLifecycleManager` guaranteeing background microphone muting, disciplined `ConnectionRecoveryManager`, and deep linking.
6. **Push Notifications**: Prisma `DeviceToken` management with contextual permission requests.
7. **Security & RBAC**: `requireAuth` and `requireAdmin` middleware, user suspension with instant session eviction, and immutable `AuditLog` records.
8. **Admin Control Center**: Responsive tactical dashboard for System Overview, User Management, Frequency Controls, Audit Logs, and Security Telemetry.

---

## 4. Local Development Setup

### Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`
- PostgreSQL (Docker or local instance)

### 1. Install Dependencies
From the monorepo root:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to root `.env`:
```bash
cp .env.example .env
```

### 3. Generate Prisma Client & Database Migration
```bash
npm run prisma:generate
```

### 4. Run the Backend Server
```bash
npm run dev:server
```
- API Base: `http://localhost:5001/api`
- Liveness Probe: `http://localhost:5001/api/health`
- Readiness Probe: `http://localhost:5001/api/health/ready`

### 5. Run the Mobile App
```bash
npm run dev:mobile
```
- Press `w` for Web preview (`http://localhost:8081`)
- Press `i` for iOS Simulator
- Press `a` for Android Emulator

---

## 5. Automated Testing & Verification

Run all test suites across the monorepo:
```bash
npm test
```

Run TypeScript strict verification across all 6 workspaces:
```bash
npm run typecheck
```

Export clean production web bundle:
```bash
cd apps/mobile && npx expo export --platform web
```

---

## 6. Documentation
- [SECURITY.md](file:///Users/anuragsahu/Desktop/AADAN%20PRADAN/SECURITY.md): Security model, threat analysis, RBAC, and incident playbooks.
- [OPERATIONS.md](file:///Users/anuragsahu/Desktop/AADAN%20PRADAN/OPERATIONS.md): Deployment, database migrations, disaster recovery, and monitoring runbooks.
- [RELEASE_CHECKLIST.md](file:///Users/anuragsahu/Desktop/AADAN%20PRADAN/RELEASE_CHECKLIST.md): 10-phase production verification checklist.
