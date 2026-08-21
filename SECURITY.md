# Aadan Pradan — Production Security Architecture & Threat Model

This document outlines the security architecture, role-based access control (RBAC), authorization policies, real-time voice defense-in-depth, protected API schemas, and incident response procedures for **Aadan Pradan**.

---

## 1. Core Security Model & Defense-in-Depth

Aadan Pradan adheres to a strict **Server-Authoritative** design principle:
1. **Zero Client Trust**: The server never trusts client-supplied user IDs, roles, membership counts, or floor ownership claims.
2. **Server-Side Floor Enforcement**: Only the server `TalkLockService` can grant, revoke, or time-out Push-to-Talk transmissions.
3. **Hard 40-User Channel Capacity**: Enforced via atomic database query transactions on virtual frequency joins.
4. **Immediate Real-Time Session Eviction**: When an account is suspended, all database sessions are revoked, active Socket.IO connections are terminated, local microphone audio tracks are closed, and PTT floor locks are immediately released.

---

## 2. Authentication & Session Management

- **Access Tokens**: Short-lived JWTs signed with `JWT_SECRET` (256-bit HMAC) carrying strictly `userId` and `sessionId`.
- **Refresh Tokens**: 64-character cryptographically secure hex strings generated via `crypto.randomBytes(32)` and hashed with SHA-256 before storage in PostgreSQL.
- **Secure Token Storage**: Client stores refresh tokens securely using `expo-secure-store` (iOS Keychain / Android Keystore / Web secure encrypted storage).
- **Session Revocation**: Logging out or suspending an account flags `Session.revokedAt = NOW()`, instantly invalidating any further access token issuance.

---

## 3. Role-Based Access Control (RBAC)

| Role | Permissions |
| :--- | :--- |
| **USER** | Join/leave virtual frequencies up to 40 users, request/release PTT floor locks, participate in WebRTC voice communication, update own profile & callsign. |
| **ADMIN** | All `USER` capabilities plus: View system metrics, search operators across the platform, suspend/unsuspend accounts, deactivate virtual frequencies, view security telemetry and immutable audit logs. |

### Admin Self-Protection
- Administrators cannot suspend their own account (`adminUserId === targetUserId` is blocked with HTTP 400 Bad Request).
- Administrative actions require explicit confirmation dialogs on the client.

---

## 4. Protected Admin API Endpoints

All admin endpoints require `Authorization: Bearer <token>` and `ADMIN` role.

| Method | Endpoint | Description | Expected Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/overview` | Platform telemetry & server health | `200 OK` / `403 Forbidden` |
| `GET` | `/api/admin/users` | Paginated user search (`q`, `role`, `status`, `page`, `limit`) | `200 OK` / `403 Forbidden` |
| `PATCH` | `/api/admin/users/:id/status` | Suspend or unsuspend account (`{ status: "ACTIVE" \| "SUSPENDED" }`) | `200 OK` / `400 Bad Request` / `403 Forbidden` |
| `GET` | `/api/admin/frequencies` | Channel monitor & active speakers | `200 OK` / `403 Forbidden` |
| `PATCH` | `/api/admin/frequencies/:code/status` | Deactivate virtual frequency | `200 OK` / `403 Forbidden` |
| `GET` | `/api/admin/audit-logs` | Immutable audit log trail | `200 OK` / `403 Forbidden` |
| `GET` | `/api/admin/security/summary` | Security event counters (failed logins, rate limits) | `200 OK` / `403 Forbidden` |

---

## 5. WebRTC Voice & Signaling Security

```text
User A (Microphone) ───[DTLS-SRTP / Opus 48kHz]───► Server Signaling Gateway / SFU ───► User B (Speaker)
                                ▲
                                │ Verified DB Membership & Floor Lock
```

- **Signaling Gateway Validation**: WebRTC offer, answer, and ICE candidate events are rejected unless the emitting socket belongs to an authenticated user with an `ACTIVE` account status who is currently registered in the database as an active member of that virtual frequency.
- **Microphone Background Safety**: React Native `AppState` listeners immediately halt local audio track transmission and release active PTT floor requests when the app enters the background or inactive state.
- **No Voice Content Storage**: Aadan Pradan does not record, buffer, or persist voice audio streams to disk.

---

## 6. Push-to-Talk (PTT) Floor Security

- **Single Speaker Lock**: Strictly one active speaker per virtual frequency enforced by server-side atomic state and locks.
- **Auto-Expiration Guard**: `MAX_TALK_DURATION_MS = 30000` (30 seconds) auto-expiration timer guarantees the channel floor cannot be locked indefinitely by a rogue client or network interruption.
- **Simultaneous Contention Resolution**: In concurrent press races, the first atomic lock claim succeeds; all other requests receive `CHANNEL_BUSY`.

---

## 7. Audit Logging & Security Telemetry

All sensitive administrative and authentication events are logged to the PostgreSQL `audit_logs` table with sanitized metadata (passwords, JWTs, and private credentials are automatically redacted):
- `LOGIN` & `LOGOUT`
- `LOGIN_FAILED`
- `USER_SUSPENDED` & `USER_UNSUSPENDED`
- `FREQUENCY_CREATED` & `FREQUENCY_DEACTIVATED`
- `ADMIN_ACTION`
- `PTT_SECURITY_EVENT`
- `RATE_LIMIT_EXCEEDED`

---

## 8. Rate Limiting & Network Protection

- **API Rate Limiting**: Express middleware protects all `/api` endpoints against brute-force attacks and abuse.
- **Strict Headers & CORS**: `helmet` headers (CSP, HSTS, frame protection, no-sniff) and explicit CORS origin whitelisting configured via `CORS_ORIGIN`.

---

## 9. Incident Response Procedure

1. **Compromised Account**:
   - Suspend user via Admin Control Center (`PATCH /api/admin/users/:id/status` -> `SUSPENDED`).
   - Automatically revokes all active database sessions and terminates Socket.IO connections.
2. **Flooded / Rogue Frequency**:
   - Deactivate frequency via Admin Control Center (`PATCH /api/admin/frequencies/:code/status` -> `isActive: false`).
   - Floor lock is released and all joined operators are disconnected from voice room.
3. **Database Backup & Recovery**:
   - PostgreSQL nightly logical dumps via `pg_dump`.
   - Redis persistence enabled via RDB snapshots and AOF for state backup.
