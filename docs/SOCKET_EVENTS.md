# Socket.IO Real-Time Event Specification

## 1. Overview

Aadan Pradan utilizes Socket.IO for low-latency channel occupancy, presence tracking, and Push-to-Talk (PTT) floor arbitration.

---

## 2. Event Catalog

### Frequency Management

#### `frequency:join` (Client $\rightarrow$ Server)
Requests to join a virtual frequency room.
- **Payload**:
  ```typescript
  {
    frequencyCode: string; // e.g. "145.800"
    userId: string;
  }
  ```
- **Acknowledgment**:
  ```typescript
  {
    success: boolean;
    error?: string;
  }
  ```

#### `frequency:leave` (Client $\rightarrow$ Server)
Leaves the current virtual frequency room.
- **Payload**:
  ```typescript
  {
    frequencyCode: string;
    userId: string;
  }
  ```

#### `frequency:users` (Server $\rightarrow$ Client Broadcast)
Emitted whenever user occupancy changes in a frequency room.
- **Payload**:
  ```typescript
  {
    frequencyCode: string;
    count: number;
    maxUsers: number; // 40
    users: UserSummary[];
    activeSpeakerId: string | null;
  }
  ```

---

### Push-to-Talk (PTT) Floor Arbitration

#### `ptt:request` (Client $\rightarrow$ Server)
Sent when a user presses and holds the PTT button.
- **Payload**:
  ```typescript
  {
    frequencyCode: string;
    userId: string;
    requestedAt: number;
  }
  ```
- **Acknowledgment**:
  ```typescript
  {
    granted: boolean;
    error?: string; // "Channel busy" if another speaker is active
  }
  ```

#### `ptt:granted` (Server $\rightarrow$ Client Broadcast)
Broadcast to all listeners on the frequency indicating who holds the floor.
- **Payload**:
  ```typescript
  {
    frequencyCode: string;
    userId: string;
    grantedAt: number;
  }
  ```

#### `ptt:released` (Client $\rightarrow$ Server & Broadcast)
Sent when the transmitting user releases the PTT button. The floor becomes idle.
- **Payload**:
  ```typescript
  {
    frequencyCode: string;
    userId: string;
    releasedAt: number;
  }
  ```

---

### Presence & Signaling

#### `user:online` / `user:offline` (Server $\rightarrow$ Client)
Global user presence notifications.

#### `voice:signal` (Bidirectional)
Encapsulates WebRTC SDP offer/answer/ICE candidate packets for peer voice exchange (prepared for Phase 4).
