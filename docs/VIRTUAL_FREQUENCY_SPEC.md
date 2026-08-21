# Virtual Frequency Specification

## 1. Concept Definition

In **Aadan Pradan**, a **Virtual Frequency** is a logical routing address that clusters active participants into a common real-time audio channel.

> **Clarification**: There is NO analog radio transmission, RF modulation, or hardware antenna requirement. All audio and control packets travel over standard TCP/IP and UDP internet connections.

---

## 2. Frequency Format & Notation

Virtual frequencies use a standardized VHF/UHF-style numerical notation:

$$\text{Format: } \text{XXX.XXX}$$

### Format Rules:
- **Whole part**: 3 decimal digits between `100` and `999`.
- **Separator**: Literal dot (`.`).
- **Fractional part**: 3 decimal digits between `000` and `999`.
- **Validation Regex**: `/^([1-9]\d{2})\.(\d{3})$/`
- **Example Codes**:
  - `145.800` (Primary General Calling)
  - `144.200` (Tactical Alpha)
  - `433.500` (Secondary Bravo)
  - `430.000` (Operations Relay)

---

## 3. Capacity & Participant Limits

| Parameter | Value | Enforcement Layer |
| :--- | :--- | :--- |
| **Max Users per Frequency** | **40** | Database schema, Socket.IO handler, UI |
| **Active Speakers** | **1** (Half-Duplex) | In-memory floor arbitration & lock manager |
| **Minimum Capacity** | 1 | Config validator |

If a 41st user attempts to join a virtual frequency, the server rejects the request with code `FREQUENCY_FULL`.

---

## 4. Normalization Rules

Inputs from users or search bars are automatically normalized:
- Input `"145.8"` $\rightarrow$ Normalized `"145.800"`
- Input `"145800"` $\rightarrow$ Normalized `"145.800"`
- Input `"433.5"` $\rightarrow$ Normalized `"433.500"`
