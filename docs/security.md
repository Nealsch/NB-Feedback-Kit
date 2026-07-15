<div align="center">

# Security

**Threat model, trust boundaries, and hardening for NB Feedback Kit.**

</div>

---

## Overview

Security is the default, not an add-on. NB Feedback Kit was designed around a single principle: **credentials never leave the backend, and the client is never trusted.**

```
┌────────────────────────────────────────────────────────────┐
│                      TRUST BOUNDARY                         │
│                                                             │
│   CLIENT (untrusted)          │      WORKER (trusted)       │
│                               │                             │
│   React / RN app              │   ┌──────────────────────┐ │
│   ├─ apiKey (bootstrap)       │   │ GITHUB_APP_ID        │ │
│   ├─ JWT (per-device, 1h)     │   │ GITHUB_APP_PRIVATE_… │ │
│   ├─ S3 config (non-secret)   │   │ JWT_SECRET           │ │
│   └─ public screenshot URL    │   │ ADMIN_TOKEN          │ │
│                               │   │ S3 credentials       │ │
│                               │   │ R2 bindings          │ │
│                               │   └──────────────────────┘ │
└───────────────────────────────┼─────────────────────────────┘
                                │
                    Never crosses this line
```

Everything on the right side of the boundary stays on the Worker. The client only ever receives non-secret identifiers and short-lived tokens.

---

## Threat Model

| Threat | Mitigation |
|---|---|
| **Token theft from client** | GitHub tokens and S3 credentials live only as Worker secrets. Clients hold only per-device JWTs (1h TTL, revocable). |
| **Credential exposure in app binary** | The shared API key is exchanged for a JWT at registration. The raw key ships only for the initial bootstrap call. |
| **Brute-force API keys** | Keys are stored as SHA-256 hashes. Lookup is by hash, never raw value. Rate limiting caps attempts per identity. |
| **Abuse / spam** | Per-device rate limiting via Durable Object (60 req/min default, configurable). Each device gets an isolated counter. |
| **Malicious attachment URLs** | `sanitizeAttachments` rebuilds URLs from validated primitives before interpolating into the GitHub issue body. Only `http`/`https` schemes allowed. |
| **XSS via issue body** | Client-supplied URLs are never rendered directly. They're validated, length-capped, and count-limited (max 5). |
| **Malicious admin actions** | Admin routes (`revoke`/`activate`) use a separate `ADMIN_TOKEN`, not the client auth scheme. Constant-time comparison. Fail-closed (503) if unset. |
| **Credential stuffing / replay** | JWTs expire after 1 hour. Revoked devices are blocked at the auth middleware with a 403. |
| **CORS bypass** | `ALLOWED_ORIGINS` dynamically resolves origins. Credentialed requests only from listed origins. |

---

## Trust Boundaries

### Boundary 1: Client ↔ Worker

The client is **untrusted**. All input is validated server-side before it touches GitHub or storage.

| What the client sends | What the Worker does |
|---|---|
| API key (bootstrap) | Hashes it (SHA-256), looks up the hash in KV. Raw key never stored. |
| JWT (per-device) | Verifies signature with `JWT_SECRET`, checks expiry, checks revocation flag in `DEVICES` KV. |
| Feedback payload | Validates fields, caps lengths, sanitizes attachment URLs. |
| Screenshot bytes (R2 native) | Validates size (≤10 MiB), MIME type (PNG/JPEG/WebP/GIF), and magic bytes. |
| S3 config (bucket/region) | Non-secret only. Cloud credentials live as Worker secrets. |

### Boundary 2: Worker ↔ GitHub

The Worker authenticates to GitHub via one of two supported methods:

| Method | Credentials stored | Token lifecycle |
|---|---|---|
| **GitHub App** (recommended) | `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` | Short-lived installation tokens, minted on demand (~1h TTL) |
| **Personal Access Token** (legacy) | `GITHUB_TOKEN` | Long-lived until manually rotated |

When the GitHub App credentials are present, the Worker mints a fresh installation token per invocation via the App's JWT-signed assertion. No long-lived GitHub credential is stored. If only `GITHUB_TOKEN` is set, the Worker uses it directly (backward compatibility). If neither is configured, GitHub-backed endpoints return `502`.

Required GitHub permissions (either method):

| Scope | Purpose |
|---|---|
| `issues: write` | Create feedback Issues with labels (`bug`/`feature`/`feedback`). |
| `contents: read` | Fetch Releases and roadmap data. |

Credentials are never logged, never sent to the client, and never embedded in issue bodies.

### Boundary 3: Worker ↔ Storage

For S3 presign, the Worker signs short-lived PUT URLs (5-minute TTL) using credentials that never reach the browser. For R2 native, the Worker writes directly via the `R2_BUCKET` binding — no client-visible cloud configuration at all.

---

## Secret Isolation

All sensitive values are encrypted Cloudflare Worker secrets, set via `wrangler secret put`:

| Secret | Scope | Stored as |
|---|---|---|
| `GITHUB_APP_ID` | GitHub App numeric ID (recommended) | Worker secret (encrypted at rest) |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App PEM private key (recommended) | Worker secret (encrypted at rest) |
| `GITHUB_TOKEN` | GitHub PAT (legacy fallback) | Worker secret (encrypted at rest) |
| `JWT_SECRET` | HMAC-SHA256 signing key | Worker secret (≥32 chars required) |
| `ADMIN_TOKEN` | Admin route guard | Worker secret (separate from client auth) |
| `S3_ACCESS_KEY_ID` | S3 access key | Worker secret |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | Worker secret |
| `S3_SESSION_TOKEN` | STS temp credentials (optional) | Worker secret |
| `R2_PUBLIC_BASE_URL` | R2 public URL prefix | Worker secret |
| `ALLOWED_ORIGINS` | CORS allowlist | Worker secret |

**Never logged:** full API keys, JWTs, GitHub tokens, S3/R2 credentials. Auth failures log only the key prefix.

---

## Authentication

### Dual-scheme auth

```
Request arrives at /api/*
        ↓
┌───────┴───────┐
│ Has Bearer?   │─── Yes ──→ verifyJWT(token, JWT_SECRET)
└───────┬───────┘                ↓
        │ No              Signature valid? Expiry ok?
        │                        ↓
        ↓                  Look up deviceId in DEVICES KV
┌───────┴───────┐                ↓
│ Has X-API-Key?│─── Yes ──→ Revoked? → 403
└───────┬───────┘                ↓
        │ No              Set rateLimitKey = deviceId
        ↓
    401 Unauthorized
```

### JWT structure

| Claim | Type | Description |
|---|---|---|
| `deviceId` | string (UUID v4) | Per-device identifier generated at registration. |
| `appId` | string | Application name resolved from the bootstrap key's KV config. |
| `iat` | number (Unix seconds) | Issued-at timestamp. |
| `exp` | number (Unix seconds) | Expiry timestamp (`iat + 3600`). |

**Algorithm:** HS256 (HMAC-SHA256) via the Web Crypto API — zero-dependency, native to Cloudflare Workers.

**TTL:** 1 hour (3600 seconds).

**Clock-skew tolerance:** 5 seconds on verification.

### API key storage

API keys are stored in the `API_KEYS` KV namespace **as SHA-256 hashes** — never in plaintext. The raw key lives only in your app's configuration. The Worker hashes incoming keys and looks up the hash in KV.

### Admin token separation

Admin routes (`POST /api/devices/:id/revoke` and `/api/devices/:id/activate`) are guarded by a dedicated `ADMIN_TOKEN` — **not** the client auth scheme. This is intentional:

- A compromised client credential **cannot** self-revoke or un-ban devices.
- Comparison uses `constantTimeEqual` (timing-safe).
- **Fail-closed:** if `ADMIN_TOKEN` is unset, the routes return `503 Service Unavailable`.

---

## Rate Limiting

### How it works

Per-identity rate limiting is handled by a `RateLimiter` Durable Object, keeping state isolated from route handlers.

```
Request → Auth middleware resolves identity
              ↓
         rateLimitKey = deviceId (JWT) or apiKey (legacy)
              ↓
         RATE_LIMITER.idFromName(rateLimitKey) → unique DO instance
              ↓
         DO.fetch('/check', { limit }) → 200 (allowed) or 429 (exceeded)
```

### Configuration

| Parameter | Value | Source |
|---|---|---|
| **Window** | 60 seconds (sliding) | `RateLimiter.WINDOW_MS` |
| **Default limit** | 60 req/min | Configured per-key in KV (`rateLimit` field) |
| **Keying** | Per-device (JWT) or per-key (legacy) | `rateLimitKey` in auth middleware |
| **Persistence** | SQLite-backed Durable Object | `new_sqlite_classes` in `wrangler.toml` |

### Response headers

Every authenticated response includes:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 2026-07-06T22:05:00.000Z
```

When exceeded (`429`):

```
Retry-After: 45
```

---

## Attachment Sanitization

Client-supplied attachment URLs are **never** interpolated into the GitHub issue body without validation. The `sanitizeAttachments` function runs before any GitHub API call.

### What it does

| Check | Rule |
|---|---|
| **Scheme validation** | Only `http` and `https` URLs allowed. Parsed via `new URL()` — rejects `javascript:`, `data:`, `file:`, etc. |
| **Count cap** | Maximum 5 attachments per submission. Extra entries dropped. |
| **Filename length** | Capped to 256 characters. |
| **Content-Type length** | Capped to 100 characters. |
| **URL length** | Capped to 2048 characters. |
| **Size validation** | Must be a number between 0 and 10 MiB (10,485,760 bytes). Otherwise set to 0. |

### Why it matters

Without sanitization, a malicious client could inject a `javascript:` URL into the issue body, potentially triggering XSS when the issue is viewed in GitHub. The `new URL()` parse + protocol check is the defense.

---

## Input Validation

All client-supplied fields are validated and length-capped before processing:

| Field | Cap |
|---|---|
| `title` | `MAX_TITLE_LENGTH` |
| `description` | `MAX_DESCRIPTION_LENGTH` |
| Metadata values | `MAX_METADATA_FIELD_LENGTH` |
| Attachments | Max 5, each validated per above |

---

## CORS

The Worker resolves CORS origins dynamically from the `ALLOWED_ORIGINS` secret:

| Configuration | Behavior |
|---|---|
| `ALLOWED_ORIGINS` set | Credentialed requests (`credentials: true`) allowed from listed origins only. |
| `ALLOWED_ORIGINS` unset | Falls back to `*` **without** credentials (public, unauthenticated access). |

```bash
# Set for production (comma-separated)
wrangler secret put ALLOWED_ORIGINS --env production
# Enter: https://app.example.com, https://beta.example.com
```

> The `origin: '*'` + `credentials: true` combination is rejected by browsers per the CORS spec. The dynamic resolver fixes this.

---

## Storage Security

### R2 native uploads

- Bytes flow through the Worker (server-mediated).
- Server-side validation: size (≤10 MiB), MIME type (PNG/JPEG/WebP/GIF), magic bytes.
- No client-visible cloud configuration.
- No CORS issues (same-origin to Worker).

### S3 presigned uploads

- Worker signs short-lived PUT URLs (5-minute TTL) using `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY`.
- Credentials never reach the browser.
- `S3_ALLOWED_BUCKETS` enforces a fail-closed allowlist — if unset, all presign requests return `403`.
- Browser uploads directly to the bucket (CORS required on the bucket side).

See the [Storage Providers guide](storage-providers.md) for CORS policies and public-read configuration.

---

## Hardening Checklist

### Secrets

- [ ] GitHub authentication configured — either:
  - **GitHub App (recommended):** `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` set, App installed on the target repo with `issues: write` + `contents: read`.
  - **PAT (legacy):** `GITHUB_TOKEN` set with scoped permissions (`issues: write`, `contents: read`).
- [ ] `JWT_SECRET` is ≥32 characters (use `openssl rand -hex 32`).
- [ ] `ADMIN_TOKEN` set — admin routes return 503 without it.
- [ ] `ALLOWED_ORIGINS` set to your specific app origins (not `*`).
- [ ] All secrets set via `wrangler secret put`, not in `wrangler.toml`.

### API keys

- [ ] Keys stored as SHA-256 hashes in `API_KEYS` KV (not plaintext).
- [ ] Each key maps to a specific GitHub repo (no wildcard mappings).
- [ ] Different keys for different environments (dev vs. prod).

### Storage

- [ ] Dedicated bucket for feedback screenshots (no co-mingled private data).
- [ ] Public read scoped to the feedback `keyPrefix` only.
- [ ] `S3_ALLOWED_BUCKETS` contains only the feedback bucket.
- [ ] CORS `AllowedOrigins` lists only your app origins (no `*`).
- [ ] CORS `AllowedMethods` limited to `PUT`.

### Rate limiting

- [ ] `rateLimit` field set per API key in KV (default 60 req/min).
- [ ] `RATE_LIMITER` Durable Object bound and migrated (`new_sqlite_classes`).

### Network

- [ ] All traffic over HTTPS (Cloudflare enforces TLS 1.2+).
- [ ] `ALLOWED_ORIGINS` restricts credentialed cross-origin requests.

### GitHub

- [ ] GitHub authentication uses minimal required permissions (`issues: write`, `contents: read`).
- [ ] Prefer GitHub App over PAT — App mints short-lived installation tokens (no long-lived credential to leak).
- [ ] If using a PAT, it is fine-grained and scoped to specific repos.
- [ ] Issue labels (`bug`/`feature`/`feedback`) exist in the target repo.

---

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Report privately per the instructions in [`SECURITY.md`](../SECURITY.md).

---

## Next Steps

- <img src="../assets/icons/shield-check.svg" width="16" /> &nbsp;**[Authentication](authentication.md)** — Device registration, JWT lifecycle, and revocation in depth.
- <img src="../assets/icons/server.svg" width="16" /> &nbsp;**[Backend](backend.md)** — Worker deployment and secret configuration.
- <img src="../assets/icons/database.svg" width="16" /> &nbsp;**[Storage Providers](storage-providers.md)** — CORS policies and bucket hardening.

---

<p align="center">
  <sub>Found a security gap? <a href="https://github.com/Nealsch/NB-Feedback-Kit/security/advisories/new">Report it privately</a>.</sub>
</p>