<div align="center">

# Backend Guide

**Deploy, configure, and operate the NB Feedback Kit Cloudflare Worker.**

</div>

---

## Overview

The NB Feedback Kit backend is a **Cloudflare Worker** built with [Hono](https://hono.dev). It is the secure bridge between your app and GitHub — handling authentication, validation, rate limiting, screenshot storage, and issue creation.

```
React / React Native app
        ↓  HTTPS (API key or JWT)
NB Feedback Worker (this guide)
        ↓
   ┌────┴────┬──────────┬──────────┐
   ↓         ↓          ↓          ↓
 GitHub   Cloudflare  R2 / S3    KV
 Issues   Durable Obj  (uploads)  (keys + devices)
```

**Credentials never leave the Worker.** GitHub tokens, JWT secrets, and storage keys live only as encrypted Worker secrets.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| <img src="../assets/icons/folder-git-2.svg" width="16" /> &nbsp;**GitHub repository** | Where feedback Issues will be created |
| <img src="../assets/icons/key-round.svg" width="16" /> &nbsp;**GitHub PAT** | Token with `issues: write` and `contents: read` scopes |
| <img src="../assets/icons/cloud.svg" width="16" /> &nbsp;**Cloudflare account** | Free tier works — SQLite-backed Durable Objects are supported |
| <img src="../assets/icons/terminal.svg" width="16" /> &nbsp;**Wrangler CLI** | Installed via `pnpm` — no global install needed |
| <img src="../assets/icons/package.svg" width="16" /> &nbsp;**Node.js 18+** & **pnpm** | For building and deploying |

---

## Quick Deploy

If you just want to get live fast, follow the **[Getting Started guide](getting-started.md)**. This document is the full reference.

```bash
# From the repo root
git clone https://github.com/Nealsch/NB-Feedback-Kit.git
cd NB-Feedback-Kit
pnpm install

cd packages/api
```

All commands below run from `packages/api/`.

---

## Configuration

The Worker is configured via `wrangler.toml`. The project ships with two environments:

| Environment | Worker name | Deploy command |
|---|---|---|
| <img src="../assets/icons/terminal.svg" width="16" /> &nbsp;**Development** | `nb-feedback-api-dev` | `pnpm wrangler deploy --env development` |
| <img src="../assets/icons/rocket.svg" width="16" /> &nbsp;**Production** | `nb-feedback-api-prod` | `pnpm wrangler deploy --env production` |

> **Local dev:** Run `pnpm dev` (alias for `wrangler dev`) to start the Worker on `http://localhost:8787` with hot reload.

### Compatibility flags

```toml
name = "nb-feedback-api"
main = "src/index.ts"
compatibility_date = "2024-11-27"
compatibility_flags = ["nodejs_compat"]
```

The `nodejs_compat` flag enables Node.js APIs used by the Hono framework and the AWS SigV4 signing logic.

---

## Bindings

The Worker uses four types of Cloudflare bindings. Each must be created and referenced in `wrangler.toml`.

### 1. KV Namespaces

Two KV namespaces store application state:

| Binding | Purpose | Key format | Value |
|---|---|---|---|
| `API_KEYS` | API key → repo mapping | SHA-256 hash of the raw key | JSON: `{ github: { owner, repo }, applicationName }` |
| `DEVICES` | Device registration records | UUID v4 | JSON: `DeviceRecord` (status, rate-limit counters, timestamps) |

**Create them:**

```bash
# Development
pnpm wrangler kv namespace create API_KEYS --env development
pnpm wrangler kv namespace create DEVICES --env development

# Production
pnpm wrangler kv namespace create API_KEYS --env production
pnpm wrangler kv namespace create DEVICES --env production
```

Paste the returned namespace IDs into your `wrangler.toml`:

```toml
[[env.production.kv_namespaces]]
binding = "API_KEYS"
id = "your-prod-namespace-id"
preview_id = "your-prod-namespace-id"

[[env.production.kv_namespaces]]
binding = "DEVICES"
id = "your-prod-devices-id"
preview_id = "your-prod-devices-id"
```

> **Security:** API keys are stored as **SHA-256 hashes** in KV — never in plaintext. The raw key lives only in your app's configuration.

### 2. Durable Object — Rate Limiter

Per-key rate limiting is handled by a `RateLimiter` Durable Object, keeping state isolated from route handlers.

```toml
[[env.production.durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"

[[env.production.migrations]]
tag = "v1"
new_sqlite_classes = ["RateLimiter"]
```

> **Free plan:** Use `new_sqlite_classes` (not `new_classes`). Cloudflare's free plan requires SQLite-backed Durable Objects — legacy in-memory classes trigger error `10097`.

The `RateLimiter` class is exported from `src/index.ts` and defined in `src/rate-limiter.ts`. Wrangler requires the export in the entrypoint file.

### 3. R2 Bucket (optional — server-mediated uploads)

For **server-mediated screenshot uploads**, bind an R2 bucket directly to the Worker. The app POSTs multipart bytes; the Worker writes them via the binding — no CORS, no client-visible cloud config.

```toml
[[env.production.r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-feedback-bucket"
preview_bucket_name = "your-feedback-bucket"
```

Create the bucket:

```bash
pnpm wrangler r2 bucket create your-feedback-bucket
```

Set the public base URL (the bucket must be publicly readable for GitHub to render screenshots):

```bash
pnpm wrangler secret put R2_PUBLIC_BASE_URL --env production
# Enter: https://cdn.example.com  (custom domain) or https://pub-<hash>.r2.dev
```

### 4. Secrets

Secrets are encrypted by Cloudflare and never appear in source. Set each with `wrangler secret put`:

| Secret | Required | Purpose |
|---|:--:|---|
| `GITHUB_TOKEN` | <img src="../assets/icons/check.svg" width="14" /> | GitHub PAT — `issues: write`, `contents: read`. Creates Issues, fetches Releases/Roadmap. |
| `JWT_SECRET` | <img src="../assets/icons/check.svg" width="14" /> | HMAC-SHA256 key for device JWTs. Must be **≥ 32 characters**. |
| `ADMIN_TOKEN` | Recommended | Guards device revocation/activation routes. Routes return `503` if unset. |
| `R2_PUBLIC_BASE_URL` | If using R2 | Public URL prefix for R2 objects. |
| `S3_ACCESS_KEY_ID` | If using S3 presign | Access key for S3-compatible storage. |
| `S3_SECRET_ACCESS_KEY` | If using S3 presign | Secret key for S3-compatible storage. |
| `S3_SESSION_TOKEN` | Optional | STS temporary credentials token. |
| `S3_ALLOWED_BUCKETS` | If using S3 presign | Comma-separated allowlist of bucket names (fail-closed if unset). |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated CORS allowlist for credentialed requests. |

**Set all secrets for production:**

```bash
pnpm wrangler secret put GITHUB_TOKEN --env production
pnpm wrangler secret put JWT_SECRET --env production
pnpm wrangler secret put ADMIN_TOKEN --env production
pnpm wrangler secret put R2_PUBLIC_BASE_URL --env production
pnpm wrangler secret put ALLOWED_ORIGINS --env production
```

---

## API Endpoints

### Public routes (no auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check — returns `{ status, service, version, timestamp }`. |
| `GET` | `/` | API info — lists all endpoints. |

### Registration & device management

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/register` | `X-API-Key` | Exchange bootstrap key for a per-device JWT (1h TTL). |
| `POST` | `/api/devices/:id/revoke` | `ADMIN_TOKEN` | Revoke a device (ban). |
| `POST` | `/api/devices/:id/activate` | `ADMIN_TOKEN` | Reactivate a revoked device. |

### Authenticated routes (`/api/*`)

Requires `Authorization: Bearer <jwt>` **or** `X-API-Key` header.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/feedback` | Create a GitHub Issue from feedback. |
| `GET` | `/api/releases` | Fetch release notes from GitHub Releases. |
| `GET` | `/api/roadmap` | Fetch roadmap items from GitHub Issues (label-driven). |
| `POST` | `/api/uploads` | Server-mediated screenshot upload (R2 binding). |
| `POST` | `/api/uploads/presign` | Issue a presigned PUT URL (S3-compatible). |

---

## Authentication Model

The Worker supports a **dual auth scheme**:

```
┌─────────────────────────────────────────────────────────┐
│  1. POST /api/register  (X-API-Key: bootstrap-key)      │
│     → Worker validates key against KV (SHA-256 hash)     │
│     → Mints a per-device JWT (HS256, 1h TTL)             │
│     → Returns { token, deviceId }                        │
│                                                          │
│  2. All /api/* requests (Authorization: Bearer <jwt>)   │
│     → Worker verifies JWT signature with JWT_SECRET      │
│     → Rate-limits per deviceId via Durable Object        │
│                                                          │
│  Legacy fallback: X-API-Key still accepted on /api/*     │
└─────────────────────────────────────────────────────────┘
```

| Auth method | Header | Use case |
|---|---|---|
| <img src="../assets/icons/key-round.svg" width="16" /> &nbsp;**JWT** | `Authorization: Bearer <jwt>` | Per-device sessions — revocable, rate-limited individually. |
| <img src="../assets/icons/shield.svg" width="16" /> &nbsp;**API key** | `X-API-Key: <key>` | Legacy/server-side integrations. Still works on `/api/*`. |
| <img src="../assets/icons/lock.svg" width="16" /> &nbsp;**Admin token** | `Authorization: Bearer <token>` | Device lifecycle routes only. Separate secret (`ADMIN_TOKEN`). |

The `ADMIN_TOKEN` is **intentionally separate** from the client auth scheme — a compromised client credential cannot self-revoke or un-ban devices.

---

## Screenshot Upload Paths

The Worker supports two storage models. Choose one based on your needs:

### Option A — Server-mediated (R2 native binding)

```
App  →  POST /api/uploads (multipart)  →  Worker  →  R2_BUCKET binding
                                              ↓
                                    Returns { url, filename, contentType, size }
```

- <img src="../assets/icons/check.svg" width="14" /> &nbsp;No CORS issues (same-origin to Worker)
- <img src="../assets/icons/check.svg" width="14" /> &nbsp;Server-enforced size/type/magic-byte validation (10 MiB, PNG/JPEG/WebP/GIF)
- <img src="../assets/icons/check.svg" width="14" /> &nbsp;No client-visible cloud configuration
- <img src="../assets/icons/check.svg" width="14" /> &nbsp;Best for mobile clients

**Requires:** `R2_BUCKET` binding + `R2_PUBLIC_BASE_URL` secret.

### Option B — Presigned URLs (S3-compatible)

```
App  →  POST /api/uploads/presign  →  Worker signs URL with S3 secrets
App  ←  { uploadUrl, publicUrl }
App  →  PUT uploadUrl (direct to bucket)
```

- <img src="../assets/icons/check.svg" width="14" /> &nbsp;Works with AWS S3, Cloudflare R2 (S3 API), MinIO, Backblaze B2
- <img src="../assets/icons/check.svg" width="14" /> &nbsp;Bytes don't flow through the Worker
- <img src="../assets/icons/zap.svg" width="14" /> &nbsp;Requires CORS configuration on the bucket

**Requires:** `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ALLOWED_BUCKETS` secrets.

> **CORS:** For Option B, your bucket must allow `PUT` from your app's origin. See the [Storage Providers guide](storage-providers.md) for the exact CORS policy and a ready-to-use template.

---

## CORS Configuration

The Worker resolves CORS origins dynamically from the `ALLOWED_ORIGINS` secret:

| `ALLOWED_ORIGINS` | Behavior |
|---|---|
| Set (e.g. `https://app.example.com, https://beta.example.com`) | Credentialed requests allowed from listed origins only. |
| Unset | Falls back to `*` **without** credentials (public, unauthenticated access). |

```bash
# Set allowed origins for production
pnpm wrangler secret put ALLOWED_ORIGINS --env production
# Enter: https://app.example.com, https://beta.example.com
```

The previous `origin: '*'` + `credentials: true` combination was insecure (browsers silently reject it per the CORS spec). The dynamic resolver fixes this.

---

## API Key Registration

Each API key maps to a GitHub repository configuration. Keys are stored in the `API_KEYS` KV namespace **as SHA-256 hashes**.

### Generate and register a key

```bash
# 1. Generate a strong random key
openssl rand -hex 32
# → e.g. a1b2c3d4e5f6... (keep this — it goes in your app config)

# 2. Hash it (SHA-256)
echo -n "a1b2c3d4e5f6..." | sha256sum
# → e.g. 7f8e9d0c... (this goes in KV)

# 3. Store in KV
pnpm wrangler kv key put --binding=API_KEYS --env production \
  "7f8e9d0c..." \
  '{"github":{"owner":"your-org","repo":"your-repo"},"applicationName":"My App"}'
```

| KV key | KV value |
|---|---|
| SHA-256 hash of raw key | `{ github: { owner, repo }, applicationName }` |

The raw key is used in your app's `apiKey` config field. The Worker hashes incoming keys and looks up the hash in KV — the raw key never touches storage.

---

## Multi-Project Support

A **single Worker deployment** can serve multiple applications. Register a separate API key for each project, each mapping to a different GitHub repository:

```
KV (API_KEYS namespace)
├── <hash-of-key-app-A>  →  { github: { owner: "org", repo: "app-a" }, ... }
├── <hash-of-key-app-B>  →  { github: { owner: "org", repo: "app-b" }, ... }
└── <hash-of-key-app-C>  →  { github: { owner: "org", repo: "app-c" }, ... }
```

Each app uses its own `apiKey` and is automatically routed to the correct repository. Rate limiting, auth, and CORS are shared infrastructure — repositories and storage stay isolated.

---

## Deploy

### Deploy to development

```bash
pnpm wrangler deploy --env development
```

Worker URL: `https://nb-feedback-api-dev.<your-subdomain>.workers.dev`

### Deploy to production

```bash
pnpm wrangler deploy --env production
```

Worker URL: `https://nb-feedback-api-prod.<your-subdomain>.workers.dev`

### Verify

```bash
curl https://nb-feedback-api-prod.<your-subdomain>.workers.dev/health
# → { "status": "ok", "service": "nb-feedback-api", "version": "0.0.1", "timestamp": "..." }

curl https://nb-feedback-api-prod.<your-subdomain>.workers.dev/
# → { "name": "NB Feedback Kit API", "endpoints": { ... } }
```

---

## Local Development

```bash
# Start the Worker locally on http://localhost:8787
pnpm dev

# Run the smoke test (PowerShell)
pwsh ./smoke-feedback.ps1

# Run unit tests (Vitest with Cloudflare Workers pool)
pnpm test

# Type-check
pnpm typecheck
```

For local secrets, create a `.dev.vars` file (gitignored):

```bash
GITHUB_TOKEN=ghp_your_test_token
JWT_SECRET=your-test-secret-at-least-32-characters-long
ADMIN_TOKEN=your-test-admin-token
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Observability

### View logs

```bash
# Tail live logs from production
pnpm wrangler tail --env production

# Tail development logs
pnpm wrangler tail --env development
```

The Worker logs:
- <img src="../assets/icons/check.svg" width="14" /> &nbsp;Issue creation success (issue URL + app name)
- <img src="../assets/icons/bug.svg" width="14" /> &nbsp;GitHub API failures (error message + context)
- <img src="../assets/icons/shield.svg" width="14" /> &nbsp;Auth failures (key prefix only — never the full key)
- <img src="../assets/icons/gauge.svg" width="14" /> &nbsp;Rate-limit rejections

### Never logged

- Full API keys or JWTs
- GitHub tokens
- S3/R2 credentials
- User PII beyond the optional `userId` field

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `error 10042` on deploy | KV namespace ID is a placeholder | Run `wrangler kv namespace create` and paste the real ID. |
| `error 10097` on deploy | Durable Object uses legacy in-memory class | Use `new_sqlite_classes` (not `new_classes`) in `[[migrations]]`. |
| `502 Bad Gateway` on `/api/feedback` | `GITHUB_TOKEN` missing or lacks permissions | Run `wrangler secret put GITHUB_TOKEN` with a token that has `repo` scope. |
| `503 Service Unavailable` on `/api/devices/*` | `ADMIN_TOKEN` not set | Run `wrangler secret put ADMIN_TOKEN`. |
| `401 Unauthorized` | API key not in KV or hash mismatch | Re-register the key's SHA-256 hash in the `API_KEYS` namespace. |
| CORS errors in browser | `ALLOWED_ORIGINS` not set or app origin not listed | Set `ALLOWED_ORIGINS` to include your app's origin. |
| Screenshots don't render in issues | R2 bucket not publicly readable, or `R2_PUBLIC_BASE_URL` wrong | Configure public access on the bucket and verify the URL. |

---

## Next Steps

- <img src="../assets/icons/shield-check.svg" width="16" /> &nbsp;**[Authentication](authentication.md)** — Deep dive on device registration, JWT sessions, and revocation.
- <img src="../assets/icons/database.svg" width="16" /> &nbsp;**[Storage Providers](storage-providers.md)** — R2, S3, MinIO, and B2 configuration.
- <img src="../assets/icons/lock.svg" width="16" /> &nbsp;**[Security](security.md)** — Threat model and hardening guide.
- <img src="../assets/icons/book-open.svg" width="16" /> &nbsp;**[API Reference](api-reference.md)** — Full endpoint contracts.

---

<p align="center">
  <sub>Backend issue? <a href="https://github.com/Nealsch/NB-Feedback-Kit/issues">Open an issue</a> with your Worker name and environment.</sub>
</p>