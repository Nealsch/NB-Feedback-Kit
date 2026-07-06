<div align="center">

# Authentication

**Device registration, JWT lifecycle, and revocation for NB Feedback Kit.**

</div>

---

## Overview

NB Feedback Kit uses a **device-based authentication model**. Instead of shipping a shared API key in every request (and every app binary), clients exchange that key once for a per-device JWT. The JWT is short-lived, individually revocable, and rate-limited per device.

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LIFECYCLE                  │
│                                                             │
│  1. Bootstrap          2. Register          3. Authenticate │
│  ─────────────────    ─────────────────    ──────────────── │
│  App ships with a     POST /api/register    Authorization:   │
│  shared API key       with X-API-Key        Bearer <jwt>     │
│                       ↓                                      │
│                       Worker validates key                   │
│                       ↓                                      │
│                       Generates deviceId (UUID v4)           │
│                       ↓                                      │
│                       Persists record in DEVICES KV          │
│                       ↓                                      │
│                       Signs JWT (1h TTL)                     │
│                       ↓                                      │
│                       Returns { deviceId, token, expiresIn } │
│                                                             │
│  4. Refresh            5. Revoke (admin)    6. Activate      │
│  ──────────────        ──────────────────   ──────────────   │
│  POST /api/register    POST /api/devices/   POST /api/       │
│  with existing         :id/revoke           devices/:id/     │
│  deviceId              (ADMIN_TOKEN)        activate         │
│                                              (ADMIN_TOKEN)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Device-Based Auth?

Traditional SDKs ship a shared API key in the app binary. This has three problems:

| Problem | Consequence |
|---|---|
| **Key extraction** | Anyone with the binary has the key. One extraction compromises all users. |
| **No per-user limits** | All clients share one rate-limit bucket. A single abuser exhausts the budget for everyone. |
| **No revocation** | You can't ban one user without rotating the key for everyone. |

Device-based auth solves all three:

| Feature | How |
|---|---|
| **No shared key in steady-state** | The bootstrap key is used once at registration, then exchanged for a per-device JWT. |
| **Per-device rate limiting** | Each device gets its own Durable Object counter. |
| **Individual revocation** | Admin routes can ban a single device without affecting others. |

---

## The Bootstrap Key

Every deployment starts with a **bootstrap API key** stored in the `API_KEYS` KV namespace. This key is the entry point — it's the only credential the client needs to begin.

### Key storage

Bootstrap keys are stored as **SHA-256 hashes**, never plaintext:

```
API_KEYS KV:
  sha256("your-secret-key-here") → { name, github: { owner, repo }, rateLimit }
```

The Worker hashes incoming keys and looks up the hash. A migration fallback supports deployments that haven't re-keyed yet (raw-key lookup).

### Key configuration

Each bootstrap key maps to:

| Field | Description |
|---|---|
| `name` | Application identifier (becomes the JWT `appId` claim). |
| `github.owner` | GitHub repository owner for issue creation. |
| `github.repo` | GitHub repository name. |
| `rateLimit` | Per-device requests per minute (default: 60). |

---

## Registration

### `POST /api/register`

Exchanges the bootstrap API key for a per-device JWT. This is the **only** endpoint that accepts the raw `X-API-Key` without going through the dual-scheme auth middleware.

```bash
curl -X POST https://your-worker.workers.dev/api/register \
  -H "X-API-Key: your-bootstrap-key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (201 Created):**

```json
{
  "success": true,
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

### What happens during registration

1. **Validate the bootstrap key** — hash it (SHA-256), look up the hash in `API_KEYS` KV. Fall back to raw-key lookup for migrations.
2. **Generate or reuse a device ID** — UUID v4 via `crypto.randomUUID()`. If the client sends an existing `deviceId` in the body, it's reused (token refresh).
3. **Check revocation** — if an existing `deviceId` is revoked, registration is rejected with `403`.
4. **Persist the device record** — stored in the `DEVICES` KV namespace so the JWT auth path can resolve config and check revocation status.
5. **Mint the JWT** — HS256-signed with `JWT_SECRET`, 1-hour TTL.

### Device record

Stored in the `DEVICES` KV namespace:

```typescript
{
  deviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  appId: "my-app",
  github: { owner: "my-org", repo: "feedback" },
  rateLimit: 60,
  createdAt: "2026-07-06T22:00:00.000Z",
  lastSeenAt: "2026-07-06T22:00:00.000Z",
  revoked: false  // absent or false = active; true = banned
}
```

The record snapshots the GitHub config and rate limit at registration time. On re-registration (token refresh), the snapshot is updated so config changes propagate without re-bootstrapping.

---

## The JWT

### Structure

Standard compact JWT: `header.payload.signature`

**Header:**
```json
{ "alg": "HS256", "typ": "JWT" }
```

**Payload:**

| Claim | Type | Description |
|---|---|---|
| `deviceId` | string (UUID v4) | Per-device identifier. |
| `appId` | string | Application name from the bootstrap key. |
| `iat` | number (Unix seconds) | Issued-at timestamp. |
| `exp` | number (Unix seconds) | Expiry timestamp (`iat + 3600`). |

### Properties

| Property | Value |
|---|---|
| **Algorithm** | HS256 (HMAC-SHA256) via Web Crypto API |
| **Signing key** | `JWT_SECRET` Worker secret (≥32 chars recommended) |
| **TTL** | 1 hour (3600 seconds) |
| **Clock-skew tolerance** | 5 seconds on verification |
| **Dependencies** | Zero — uses native `crypto.subtle`, no `jsonwebtoken` or `jose` |

### Verification

The auth middleware verifies every `Authorization: Bearer <jwt>` request:

1. Split token into 3 parts. Reject if malformed.
2. Verify HMAC-SHA256 signature against `JWT_SECRET`.
3. Decode payload and check `exp` (with 5s skew tolerance).
4. Look up `deviceId` in `DEVICES` KV.
5. Check `revoked` flag — banned devices get `403`.

---

## Token Refresh

JWTs expire after 1 hour. Clients refresh by calling `POST /api/register` again with their existing `deviceId`:

```bash
curl -X POST https://your-worker.workers.dev/api/register \
  -H "X-API-Key: your-bootstrap-key" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'
```

The Worker:
1. Validates the bootstrap key (still required for refresh).
2. Checks if the device is revoked → `403` if banned.
3. Updates `lastSeenAt` and refreshes the config snapshot.
4. Mints a new JWT with a fresh `exp`.

> **Note:** The bootstrap key is required even for refresh. This ensures only legitimate clients can refresh tokens — a stolen JWT alone cannot be renewed indefinitely.

---

## Revocation

### `POST /api/devices/:id/revoke`

Bans a device. **Admin-only** — guarded by `ADMIN_TOKEN`, not the client auth scheme.

```bash
curl -X POST https://your-worker.workers.dev/api/devices/a1b2c3d4-e5f6-7890-abcd-ef1234567890/revoke \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "revokedAt": "2026-07-06T22:30:00.000Z"
}
```

**Idempotent:** If the device is already revoked, returns `200` with `"Already revoked"`.

**Effect:**
- The device's current JWT is immediately invalid (auth middleware checks `revoked` on every request → `403`).
- The device **cannot refresh** its JWT (registration rejects revoked devices → `403`).
- The device's rate-limit counter persists but is moot (all requests blocked).

### `POST /api/devices/:id/activate`

Restores a banned device.

```bash
curl -X POST https://your-worker.workers.dev/api/devices/a1b2c3d4-e5f6-7890-abcd-ef1234567890/activate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Idempotent:** If the device is already active, returns `200` with `"Already active"`.

**Effect:** Clears the `revoked` flag and `revokedAt` timestamp. The device can now register for a fresh JWT and make authenticated requests.

---

## Admin Token

Admin routes use a **dedicated secret** (`ADMIN_TOKEN`), completely separate from the client auth scheme. This separation is intentional and critical:

| Concern | Mitigation |
|---|---|
| **Compromised client credential** | Cannot self-revoke or un-ban — admin routes ignore JWTs and API keys entirely. |
| **Timing attacks** | Comparison uses `constantTimeEqual` (constant-time string comparison). |
| **Unconfigured admin** | If `ADMIN_TOKEN` is unset, routes return `503 Service Unavailable` (fail-closed). |
| **Route ordering** | Admin routes are registered **before** the global `/api/*` auth middleware, making them terminal — the middleware never runs for these paths. |

### Setting the admin token

```bash
wrangler secret put ADMIN_TOKEN
# Enter a strong random string (e.g., openssl rand -hex 32)
```

---

## Auth Middleware Resolution

All `/api/*` routes (except `/api/register` and admin routes) pass through the dual-scheme auth middleware:

```
Request arrives at /api/*
        ↓
┌───────┴────────┐
│ Authorization: │─── Yes ──→ verifyJWT()
│ Bearer <jwt>?  │              ↓
└───────┬────────┘      Signature valid + not expired?
        │ No                      ↓
        ↓                  DEVICES KV lookup
┌───────┴────────┐              ↓
│ X-API-Key      │─── Yes ──→ Revoked? → 403
│ header?        │              ↓
└───────┬────────┘      Resolve config + rateLimitKey = deviceId
        │ No
        ↓
    401 Unauthorized
```

| Scheme | Header | Use Case |
|---|---|---|
| **JWT (preferred)** | `Authorization: Bearer <jwt>` | Registered devices. Per-device rate limiting. Revocable. |
| **API Key (legacy)** | `X-API-Key: <key>` | Backward compatibility. Per-key rate limiting. Not individually revocable. |

Both paths resolve to a `FeedbackConfig` (application name, GitHub repo, rate limit) that's attached to the request context for downstream handlers.

---

## Rate Limiting Per Identity

Rate limiting is **per-identity**, not per-key:

| Auth Path | Rate-Limit Key | Granularity |
|---|---|---|
| JWT | `deviceId` | Per-device — each device gets its own 60 req/min budget. |
| API Key (legacy) | raw `apiKey` | Per-key — all clients sharing a key share one budget. |

This means once devices migrate to JWTs, a single shared static key no longer gives one caller the entire rate-limit budget.

See [Security > Rate Limiting](security.md#rate-limiting) for implementation details.

---

## SDK Integration

The React SDK handles registration and token management automatically via `FeedbackProvider`. You typically don't call these endpoints directly.

```tsx
<FeedbackProvider
  config={{
    apiKey: 'your-bootstrap-key',  // exchanged for JWT on first call
    apiEndpoint: 'https://your-worker.workers.dev',
    // ...storage config
  }}
>
```

The SDK:
1. Calls `POST /api/register` on first use (or when the JWT expires).
2. Stores the JWT and `deviceId` (in memory or localStorage, depending on config).
3. Sends `Authorization: Bearer <jwt>` on all subsequent `/api/*` requests.
4. Automatically refreshes the JWT when it expires.

For direct API usage (mobile, server-to-server, custom clients), implement the same flow:

```typescript
// 1. Register
const res = await fetch(`${API_ENDPOINT}/api/register`, {
  method: 'POST',
  headers: {
    'X-API-Key': BOOTSTRAP_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({}),  // empty body = new device
});
const { token, deviceId, expiresIn } = await res.json();

// 2. Store token + deviceId
// 3. Use token for all subsequent requests
await fetch(`${API_ENDPOINT}/api/feedback`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(feedbackPayload),
});

// 4. Refresh before expiry (or on 401)
```

---

## API Reference

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/register` | `POST` | `X-API-Key` | Exchange bootstrap key for device JWT. |
| `/api/devices/:id/revoke` | `POST` | `ADMIN_TOKEN` | Ban a device. |
| `/api/devices/:id/activate` | `POST` | `ADMIN_TOKEN` | Restore a banned device. |
| `/api/feedback` | `POST` | JWT or `X-API-Key` | Submit feedback (creates GitHub Issue). |
| `/api/releases` | `GET` | JWT or `X-API-Key` | Fetch release notes. |
| `/api/roadmap` | `GET` | JWT or `X-API-Key` | Fetch roadmap items. |
| `/api/uploads/presign` | `POST` | JWT or `X-API-Key` | Get presigned S3 PUT URL. |
| `/api/uploads` | `POST` | JWT or `X-API-Key` | Upload screenshot (R2 native). |

---

## Security Considerations

- **Bootstrap key exposure:** The bootstrap key ships in the app binary. It can only be used to *register* devices — not to read feedback, access GitHub, or bypass rate limits. Rotate it if compromised.
- **JWT theft:** JWTs expire after 1 hour. If a JWT is stolen, the attacker has a short window. Revoking the device immediately invalidates the JWT.
- **Admin token isolation:** The `ADMIN_TOKEN` has no relationship to client credentials. A client compromise cannot escalate to admin actions.
- **No refresh without bootstrap:** Token refresh requires the bootstrap key. A stolen JWT alone cannot be renewed indefinitely.

See [Security](security.md) for the full threat model and hardening checklist.

---

## Next Steps

- <img src="../assets/icons/shield-check.svg" width="16" /> &nbsp;**[Security](security.md)** — Threat model, trust boundaries, and production hardening.
- <img src="../assets/icons/server.svg" width="16" /> &nbsp;**[Backend](backend.md)** — Worker deployment, KV namespaces, and secret configuration.
- <img src="../assets/icons/database.svg" width="16" /> &nbsp;**[Storage Providers](storage-providers.md)** — Screenshot upload configuration.

---

<p align="center">
  <sub>Auth question? <a href="https://github.com/Nealsch/NB-Feedback-Kit/discussions">Start a discussion</a>.</sub>
</p>