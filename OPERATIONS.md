# Aadan Pradan — Production Operations & Runbook

This document details the operational guidelines, deployment procedures, database migration runbooks, Redis configuration, health monitoring, observability telemetry, and disaster recovery strategies for **Aadan Pradan**.

---

## 1. System Architecture & Component Overview

```text
                                  ┌────────────────────────┐
                                  │   Expo Mobile Client   │
                                  │ (iOS / Android / Web)  │
                                  └──────────┬─────────────┘
                                             │ HTTPS / WSS (X-Request-ID)
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Aadan Pradan Node.js Server                            │
│                                                                                 │
│   ┌────────────────────┐    ┌────────────────────┐    ┌─────────────────────┐   │
│   │ Express REST API   │    │ Socket.IO Gateway  │    │  TalkLockService    │   │
│   │ (Auth, RBAC, Admin)│    │ (Signaling/Presence│    │  (Floor Authority)  │   │
│   └─────────┬──────────┘    └─────────┬──────────┘    └──────────┬──────────┘   │
└─────────────┼─────────────────────────┼──────────────────────────┼──────────────┘
              │                         │                          │
              ▼                         ▼                          ▼
   ┌────────────────────┐    ┌────────────────────┐    ┌─────────────────────┐
   │ PostgreSQL (Prisma)│    │ Redis (Optional)   │    │ SFU / WebRTC Mesh   │
   │ (Persistent Data)  │    │ (Rate Limits/State)│    │ (Opus 48kHz Voice)  │
   └────────────────────┘    └────────────────────┘    └─────────────────────┘
```

---

## 2. Environment Setup & Configuration

Three distinct environments are supported:
- **Development**: Local development with auto-reload (`.env.example`)
- **Staging**: Pre-production testing environment (`.env.staging.example`)
- **Production**: Live production deployment (`.env.production.example`)

All secrets must be provided via environment variables (never committed to repository):

| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | HTTP & WebSocket port | `5001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://app_user:strong_password@db-host:5432/aadan_pradan_prod` |
| `JWT_SECRET` | 256-bit cryptographically secure string | *(Generated with `openssl rand -base64 32`)* |
| `CORS_ORIGIN` | Allowed web and mobile origins | `https://app.aadanpradan.io` |
| `MAX_USERS_PER_FREQUENCY` | Hard capacity limit per channel | `40` |
| `MAX_TALK_DURATION_MS` | Auto-expiration floor timer | `30000` |

---

## 3. Database Migration Runbook

Prisma is used for schema management and migrations.

### Running Migrations in Production:
```bash
# 1. Generate Prisma Client
npx prisma generate --schema=apps/server/prisma/schema.prisma

# 2. Apply pending migrations safely
npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma
```

### Zero-Downtime Migration Policy:
- Always make backward-compatible schema changes (e.g. nullable new columns, default values).
- Never rename existing columns directly; use a multi-step rollout.

---

## 4. Health Checks, Probes & Observability

### Health Probes:
1. **Liveness Probe (`GET /api/health`)**:
   - Returns `200 OK` with uptime, service version, and process status.
2. **Readiness Probe (`GET /api/health/ready`)**:
   - Verifies active database connectivity via `SELECT 1`. Returns `503 Service Unavailable` if database link is down.

### Observability & Metrics:
3. **Internal Metrics (`GET /api/admin/metrics`)**:
   - Authenticated admin endpoint providing aggregate counts: active online operators, floor locks, memory usage (RSS, heap), total audit logs.
4. **Correlation IDs (`X-Request-ID`)**:
   - Every request is tagged with an `X-Request-ID` header, propagated across logs, responses, and error reports.

---

## 5. Graceful Shutdown & Stale Data Cleanup

### Graceful Shutdown:
The application listens for `SIGTERM` and `SIGINT` signals:
1. Stops accepting new HTTP connections (`server.close()`).
2. Releases all active Push-to-Talk floor locks (`talkLockService.clear()`).
3. Disconnects active Socket.IO clients cleanly (`io.close()`).
4. Closes PostgreSQL connection pool (`prisma.$disconnect()`).
5. Process exits cleanly with code `0`.

### Data Pruning Runbook:
- Stale database sessions and inactive device tokens can be pruned via `POST /api/admin/cleanup` or periodic cron jobs.

---

## 6. Disaster Recovery & Backup Procedures

### PostgreSQL Logical Backups:
```bash
# Automated nightly backup command
pg_dump -h db-host -U app_user -d aadan_pradan_prod -F c -b -v -f /backups/aadan_pradan_$(date +%F).dump

# Restoration command
pg_restore -h db-host -U app_user -d aadan_pradan_prod -v /backups/aadan_pradan_2026-08-19.dump
```

### Redis Persistence:
- Enable both RDB snapshots (`save 60 1000`) and AOF (`appendonly yes`) for sub-second durability.

---

## 7. Incident Response & Troubleshooting Playbooks

### A. Rogue Floor Transmission / Stuck Speaker
1. The server auto-expiration timer automatically clears locks after 30 seconds (`MAX_TALK_DURATION_MS = 30000`).
2. If manual intervention is required, deactivate the channel from the Admin Control Center (`PATCH /api/admin/frequencies/:code/status`).

### B. Compromised User Account
1. Open Admin Control Center -> Users -> Locate account -> Click **SUSPEND**.
2. All database sessions, device tokens, and active socket connections are immediately revoked.
