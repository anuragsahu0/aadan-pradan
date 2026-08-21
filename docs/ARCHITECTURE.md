# Aadan Pradan System Architecture

## 1. High-Level Overview

**Aadan Pradan** is a mobile-first, internet-based virtual-frequency walkie-talkie platform designed for real-time, low-latency, half-duplex voice communication.

> [!IMPORTANT]
> **Virtual Frequency → Internet → Real-Time Voice Communication**
>
> Aadan Pradan does **NOT** use physical radio frequencies, analog RF hardware, Bluetooth, Wi-Fi Direct, or offline communication. The "Frequency" (e.g. `145.800`) is a **virtual simulated channel** operating over IP networks and WebRTC.

```
┌────────────────────────────────────────────────────────┐
│               Aadan Pradan Mobile App                  │
│       (Expo / React Native / Zustand / TanStack)       │
└──────────────▲──────────────────────────▲──────────────┘
               │                          │
               │ HTTP REST (Port 5000)    │ WebSocket / Socket.IO
               │ Health, Config, Auth     │ Room Signaling & Floor Control
               ▼                          ▼
┌────────────────────────────────────────────────────────┐
│               Aadan Pradan Backend Server              │
│       (Node.js / Express / Socket.IO / Prisma)         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ Prisma ORM
                           ▼
┌────────────────────────────────────────────────────────┐
│                 PostgreSQL Database                    │
│   (Users, Virtual Frequencies, Frequency Memberships)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Tenets & Constraints

1. **Virtual Frequency Terminology**:
   - The platform exclusively uses the term **Frequency** (e.g. `145.800`, `433.500`).
   - Terms like "Room", "Chat Room", or "Radio Room" are strictly avoided in user interfaces and API semantics.
2. **Channel Capacity**:
   - Each virtual frequency accommodates a maximum of **40 users**.
   - This limit is globally configurable (`MAX_USERS_PER_FREQUENCY=40`) and enforced at the database, REST, and WebSocket gateway layers.
3. **Half-Duplex Floor Control (Push-to-Talk)**:
   - Only **one active speaker** is permitted on a given virtual frequency at any moment.
   - PTT floor requests (`ptt:request`) are mediated by the server engine to prevent transmission collisions.

---

## 3. Monorepo Architecture

The repository is organized as an npm workspaces monorepo:

```
aadan-pradan/
├── apps/
│   ├── mobile/         # Expo / React Native client application
│   └── server/         # Express & Socket.IO backend application
├── packages/
│   ├── config/         # Environment variable parsing and global constants
│   ├── types/          # Shared TypeScript type definitions
│   ├── utils/          # Frequency validators, sanitizers, and loggers
│   └── shared/         # Aggregated barrel package
├── docs/               # Architecture and protocol specifications
└── README.md           # Getting started and development guide
```

---

## 4. Backend Service Layers (Clean Architecture)

```
HTTP Request / WebSocket Event
               │
               ▼
       [ Middleware Layer ] (RateLimiter, RequestLogger, Helmet, CORS, ErrorHandler)
               │
               ▼
       [ Controller / Socket Handler ] (Extracts parameters, calls services)
               │
               ▼
       [ Service Layer ] (Encapsulates business rules & floor control state)
               │
               ▼
       [ Repository Layer ] (Data access via Prisma Client)
               │
               ▼
       [ PostgreSQL Database ]
```

---

## 5. Mobile Architecture

The mobile application is architected around modular features:
- **Navigation**: Expo Router (File-based routing with typed routes).
- **State Management**: Zustand stores (`useUserStore`, `useFrequencyStore`, `useAppStore`).
- **Server Data**: TanStack React Query for cached HTTP polling and mutation.
- **Design System**: Dedicated tactile theme tokens (`src/theme/tokens.ts`) with custom LCD display elements, tactile buttons, and dark-mode optimization.
- **Secure Persistence**: `expo-secure-store` with web-safe fallback.

---

## 6. Phase Roadmap

- **Phase 1 (Current)**: Project Foundation & Production-Ready Architecture (Monorepo, Database models, Express & Socket.IO skeleton, Mobile UI foundation & Design system).
- **Phase 2**: Real-Time Socket Connection, Presence Engine, and Authentication.
- **Phase 3**: Half-Duplex Push-to-Talk (PTT) Floor Arbitration and State Synchronization.
- **Phase 4**: WebRTC Low-Latency Voice Engine & Background Audio Service.
- **Phase 5**: Production Hardening, Monitoring & Deployment.
