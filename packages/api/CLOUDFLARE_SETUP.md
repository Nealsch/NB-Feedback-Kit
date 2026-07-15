# Cloudflare Setup Guide for NB Feedback Kit API

## Overview

The NB Feedback Kit API is a Cloudflare Worker built with Hono.js. This guide covers everything needed to deploy and configure the API on Cloudflare.

---

## Prerequisites

1. **Cloudflare Account** - Free tier is sufficient for MVP
2. **Wrangler CLI** - Already installed via package dependencies
3. **Cloudflare API Token** - For deployment authentication

---

## Initial Setup (Required Now)

### 1. Authenticate Wrangler

```bash
cd packages/api
pnpm wrangler login
```

This opens a browser for Cloudflare authentication and stores credentials locally.

### 2. Test Local Development

```bash
pnpm dev
```

The API will run locally at `http://localhost:8787`

Test the endpoints:
- `GET http://localhost:8787/` - API info
- `GET http://localhost:8787/health` - Health check

### 3. Deploy to Cloudflare (Development)

```bash
pnpm wrangler deploy --env development
```

This deploys the Worker as `nb-feedback-api-dev` to your Cloudflare account.

### 4. Deploy to Production

```bash
pnpm wrangler deploy --env production
```

This deploys the Worker as `nb-feedback-api-prod`.

---

## Current State (MVP Complete)

✅ **Implemented:**
- Hono.js app with CORS configured
- Health check endpoint (`/health`)
- API info endpoint (`/`)
- Request logging
- Global error handling
- 404 handling
- API key authentication (TASK-005)
- Per-key rate limiting via Durable Objects (TASK-005)
- GitHub integration — issue creation, releases, roadmap (TASK-006)
- Feedback submission endpoint `POST /api/feedback` (TASK-006)
- Release notes endpoint `GET /api/releases` (TASK-009)
- Roadmap endpoint `GET /api/roadmap` (TASK-011)
- **Server-mediated screenshot uploads `POST /api/uploads` (FEEDBACK-1)** — native R2 binding, multipart intake, server-enforced size/type/magic-byte validation
- **Per-device JWT authentication `POST /api/register` (FEEDBACK-2)** — exchanges the bootstrap `X-API-Key` for a short-lived HS256 JWT backed by a `DEVICES` KV record; dual-scheme auth middleware accepts both `Authorization: Bearer <jwt>` and legacy `X-API-Key`
- **Device lifecycle management (FEEDBACK-3)** — admin-guarded `POST /api/devices/:id/revoke` and `/activate` routes; revoked devices are blocked at registration and at the auth middleware; rate limiting keys by `deviceId` on the JWT path
- **Security hardening (FEEDBACK-4)** — API keys stored as SHA-256 hashes in KV (defence-in-depth against KV leaks), CORS origin allowlist via `ALLOWED_ORIGINS` (fixes the spec-invalid `origin:'*'` + `credentials:true` combination), server-side field-length caps (title/description/metadata), and HTML-escaping of all metadata fields interpolated into the GitHub issue body (defence-in-depth against client-side tampering)

---

## Required Setup Steps

The following Cloudflare resources are required for the API to function:

### Screenshot Uploads (R2) — FEEDBACK-1

The Worker accepts screenshots from mobile clients (SpherePA's
`uploadScreenshot()`) via `POST /api/uploads`. Bytes flow **through the Worker**
to a bound R2 bucket — no presigned URLs, no CORS, no client-visible cloud
config. This is the preferred path for mobile; the legacy
`POST /api/uploads/presign` endpoint remains for browser SDKs.

#### 1. Create the R2 bucket

```bash
# Development
pnpm wrangler r2 bucket create spherepa-feedback-dev

# Production
pnpm wrangler r2 bucket create spherepa-feedback-prod
```

The `R2_BUCKET` binding in `wrangler.toml` (per-environment) already points at
these names.

#### 2. Enable public read on the `feedback/` prefix

GitHub must be able to `GET` the screenshot URL to render the image inline in
the issue body. Use **either** of:

- **R2.dev public URL (dev / quick start):** Enable via Wrangler (no dashboard
  needed) — the command prints the public URL:

  ```bash
  pnpm wrangler r2 bucket dev-url enable spherepa-feedback-dev
  # → ✨ Public access enabled at 'https://pub-<hash>.r2.dev'.

  # Query it any time:
  pnpm wrangler r2 bucket dev-url get spherepa-feedback-dev
  ```

  (Equivalent dashboard path: R2 → your bucket → Settings → Public Access.)

- **Custom domain (recommended for prod):** R2 → bucket → Settings →
  Custom Domain → add e.g. `cdn.spherepa.app`. This is more reliable for
  GitHub's image fetcher and avoids the R2.dev rate limits. Wrangler support:
  `pnpm wrangler r2 bucket domain add <bucket> <hostname>`.

> **Why only `feedback/` is public:** The upload handler writes all objects
> under the `feedback/<timestamp>-<random>.<ext>` prefix. The r2.dev URL
> exposes the **entire bucket** for read — if you later add private prefixes,
> switch to a custom domain with Cloudflare Workers/Access rules to scope
> public reads to `feedback/*`.

#### 3. Set the public base URL as a Worker var/secret

```bash
# Development (R2.dev URL)
pnpm wrangler secret put R2_PUBLIC_BASE_URL --env development
# → paste: https://pub-xxxxxxxx.r2.dev

# Production (custom domain preferred)
pnpm wrangler secret put R2_PUBLIC_BASE_URL --env production
# → paste: https://cdn.spherepa.app
```

The handler appends the server-generated object key to this base, producing the
`url` field returned to the client and embedded in the GitHub issue body.

#### 4. Verify

```bash
# After deploy, a 401 (missing API key) confirms the route exists.
curl -i -X POST https://nb-feedback-api-dev.<subdomain>.workers.dev/api/uploads
```

#### Security envelope

| Concern | Mitigation |
|---------|------------|
| Size | 10 MiB hard cap, enforced before bytes touch R2 |
| Type | Allowlist: PNG, JPEG, WebP, GIF only |
| Spoofing | Magic-byte signature check on first 8–12 bytes |
| Key traversal | Object keys are server-generated (`feedback/<timestamp>-<random>`) |
| Auth | Reuses the `/api/*` X-API-Key + rate-limit middleware |
| CORS | Not required (same-origin mobile request); legacy presign kept for browsers |

### API Authentication & Rate Limiting

#### 1. Create KV Namespace for API Keys

```bash
# Development environment
pnpm wrangler kv:namespace create "API_KEYS" --env development

# Production environment
pnpm wrangler kv:namespace create "API_KEYS" --env production
```

After creation, add the namespace IDs to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "API_KEYS"
id = "your-kv-namespace-id-from-command-output"
preview_id = "your-preview-namespace-id"
```

#### 2. Add API Keys to KV Storage

> **FEEDBACK-4 (Security Hardening):** The auth middleware now looks up API
> keys by their **SHA-256 hash**, not the raw key. This is a defence-in-depth
> measure — if the KV namespace is ever leaked or dumped, an attacker cannot
> recover the raw keys. The hash-first lookup is transparent to clients: they
> still send the raw key in the `X-API-Key` header (or the bootstrap key at
> `/api/register`); the Worker hashes it before hitting KV.
>
> To populate KV you must therefore store the **hash** as the key name. Use
> the helper script below to compute the hash before writing:

```bash
# FEEDBACK-4: Compute the SHA-256 hash of a raw key, then store the config
# under the hashed key name (not the raw key).
RAW_KEY="demo-key"
HASH=$(node -e "const {createHash}=require('crypto');console.log(createHash('sha256').update('${RAW_KEY}').digest('hex'))")
echo "Hash: $HASH"

pnpm wrangler kv:key put "$HASH" '{"repository":"owner/repo","name":"Demo App"}' \
  --binding=API_KEYS --env development
```

> **Backward compatibility:** The middleware also tries a raw-key lookup as a
> fallback for keys written before FEEDBACK-4, so existing deployments keep
> working during migration. Once all keys are re-stored as hashes, the raw-key
> fallback can be removed in a future release.

#### 3. Enable Durable Objects

Durable Objects are used for per-API-key rate limiting.

In `wrangler.toml`, add:

```toml
[durable_objects]
bindings = [
  { name = "RATE_LIMITER", class_name = "RateLimiter" }
]

[[migrations]]
tag = "v1"
new_classes = ["RateLimiter"]
```

No additional Cloudflare dashboard configuration needed - Durable Objects are enabled automatically.

---

### GitHub Integration

#### 1. Create GitHub Personal Access Token (PAT)

1. Go to GitHub Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens
2. Create new token with:
   - **Repository access:** Select repositories where issues will be created
   - **Permissions:**
     - Issues: Read and write
     - Metadata: Read-only
3. Copy the generated token

#### 2. Add GitHub PAT as Cloudflare Secret

```bash
# Development
pnpm wrangler secret put GITHUB_TOKEN --env development
# Paste your GitHub PAT when prompted

# Production
pnpm wrangler secret put GITHUB_TOKEN --env production
# Paste your GitHub PAT when prompted
```

Secrets are encrypted and never exposed in code or logs.

---

### Per-Device JWT Authentication — FEEDBACK-2

Mobile clients (SpherePA's `feedbackClient.ts`) register once per session,
exchanging the shared bootstrap `X-API-Key` for a short-lived HS256 JWT. This
binds rate limiting to individual devices rather than the shared key, and
allows the legacy static key to be retired once all clients have migrated.

#### 1. Generate a JWT signing secret

The secret must be at least 32 bytes of high-entropy random data. Generate one
locally and store it as a Worker secret:

```bash
# Generate 48 bytes of random data, base64-encoded
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Store it as the JWT_SECRET secret (dev + prod)
pnpm wrangler secret put JWT_SECRET --env development
# → paste the base64 string from above

pnpm wrangler secret put JWT_SECRET --env production
# → paste the same (or a different) base64 string
```

#### 2. Create the DEVICES KV namespace

Device registration records are stored in a dedicated KV namespace. Each key
is a UUID `deviceId`; the value is a JSON snapshot of the config at
registration time plus timestamps.

```bash
pnpm wrangler kv:namespace create "DEVICES" --env development
pnpm wrangler kv:namespace create "DEVICES" --env production
```

The `DEVICES` binding in `wrangler.toml` already references these namespaces
once you paste the IDs returned by the commands above.

#### 3. Verify the register endpoint

```bash
# Should return 401 (missing X-API-Key) — confirms the route is live.
curl -i -X POST https://nb-feedback-api-dev.<subdomain>.workers.dev/api/register

# Happy path (replace <bootstrap-key> with a real key from API_KEYS KV):
curl -X POST https://nb-feedback-api-dev.<subdomain>.workers.dev/api/register \
  -H "X-API-Key: <bootstrap-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
# → 201 { success: true, deviceId: "...", token: "eyJ...", expiresIn: 604800 }
```

#### Auth flow summary

```
Client                           Worker                         KV (API_KEYS / DEVICES)
  |                                |                               |
  |  POST /api/register            |                               |
  |  X-API-Key: <bootstrap>        |                               |
  |------------------------------->|                               |
  |                                |  get(sha256(bootstrap-key))   |  FEEDBACK-4
  |                                |------------------------------>|  API_KEYS
  |                                |  put(deviceId, record)        |
  |                                |------------------------------>|  DEVICES
  |  201 { token, deviceId }       |                               |
  |<-------------------------------|                               |
  |                                |                               |
  |  POST /api/feedback            |                               |
  |  Authorization: Bearer <jwt>   |                               |
  |------------------------------->|                               |
  |                                |  verifyJWT(token)             |
  |                                |  get(deviceId) → config       |
  |                                |------------------------------>|  DEVICES
  |  201 { issueUrl }              |                               |
  |<-------------------------------|                               |
```

The auth middleware accepts **both** schemes during the migration window:
`Authorization: Bearer <jwt>` (FEEDBACK-2) and `X-API-Key` (legacy FEEDBACK-1).
Once all clients register on launch, the static key can be rotated/revoked.

---

### Device Lifecycle Management (Revoke / Activate) — FEEDBACK-3

Admins can ban (revoke) or restore (activate) individual devices without
touching the shared bootstrap key. This is the primary abuse-response lever:
once a `deviceId` is revoked, its JWT is immediately rejected at the auth
middleware (403) and re-registration is blocked (403).

The lifecycle routes are guarded by a **dedicated `ADMIN_TOKEN` secret**, not
the API key or JWT scheme, so a compromised client credential cannot
self-revoke or un-ban devices.

#### 1. Set the `ADMIN_TOKEN` secret

Generate a high-entropy token and store it as a Worker secret:

```bash
# Generate 32 bytes of random data, base64-encoded
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Store it as ADMIN_TOKEN (dev + prod)
pnpm wrangler secret put ADMIN_TOKEN --env development
# → paste the base64 string from above

pnpm wrangler secret put ADMIN_TOKEN --env production
# → paste the same (or a different) base64 string
```

> **Fail-closed:** If `ADMIN_TOKEN` is unset, the lifecycle routes return
> `503 Service Unavailable` (they are inert until the admin configures the
> secret).

#### 2. Revoke a device

```bash
curl -X POST https://nb-feedback-api-dev.<subdomain>.workers.dev/api/devices/<deviceId>/revoke \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# → 200 { success: true, revokedAt: "..." }
```

Effects:
- Sets `revoked: true` + `revokedAt` on the device record in `DEVICES` KV.
- The auth middleware immediately rejects the device's JWT with `403` on every
  subsequent request (`/api/feedback`, `/api/releases`, …).
- `POST /api/register` returns `403` if the revoked `deviceId` is supplied in
  the body (no silent re-activation).

The operation is **idempotent**: revoking an already-revoked device returns
`200` with an `Already revoked` message.

#### 3. Activate (restore) a device

```bash
curl -X POST https://nb-feedback-api-dev.<subdomain>.workers.dev/api/devices/<deviceId>/activate \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# → 200 { success: true }
```

Clears the `revoked` flag and `revokedAt` timestamp. The device's existing JWT
works again immediately — **no re-registration required**. Idempotent: activating
an already-active device returns `200` with an `Already active` message.

#### 4. Error responses

| Status | Condition |
|--------|-----------|
| `400` | Malformed `deviceId` (not a UUID) |
| `401` | Missing or malformed `Authorization: Bearer` header |
| `403` | `ADMIN_TOKEN` mismatch |
| `404` | `deviceId` not found in `DEVICES` KV |
| `503` | `ADMIN_TOKEN` secret not configured |

#### Auth path summary (with revocation)

```
Client                       Worker                                    KV (DEVICES)
  |                            |                                          |
  |  POST /api/feedback        |                                          |
  |  Authorization: Bearer JWT |                                          |
  |--------------------------->|                                          |
  |                            |  verifyJWT(token) → { deviceId }         |
  |                            |  get(deviceId) → record                 |
  |                            |----------------------------------------->|
  |                            |  if (record.revoked) return 403         |
  |                            |  rate-limit by deviceId                 |
  |  201 { issueUrl }          |                                          |
  |<---------------------------|                                          |
```

---

### CORS Origin Allowlist — FEEDBACK-4

**Before FEEDBACK-4** the Worker combined `origin: '*'` with
`credentials: true`, which the CORS spec forbids — browsers silently strip the
`Access-Control-Allow-Credentials` header when the allowed origin is a
wildcard, breaking credentialed feedback submissions from web clients.

**After FEEDBACK-4** the origin is resolved dynamically per request:

- If `ALLOWED_ORIGINS` is **set**, the request's `Origin` header is echoed
  back only when it appears in the list (comma- or space-separated). Unknown
  origins receive an empty `Access-Control-Allow-Origin` and the request is
  rejected by the browser.
- If `ALLOWED_ORIGINS` is **unset**, the Worker falls back to `*` **without**
  credentials — public, unauthenticated mode for local development and
  quick-starts.

#### 1. Set `ALLOWED_ORIGINS` (production)

```bash
# List every origin that should be allowed to submit feedback from the web.
# Separate with commas and/or whitespace.
pnpm wrangler secret put ALLOWED_ORIGINS --env production
# → paste: https://spherepa.app,https://staging.spherepa.app

# Development (optional — unset falls back to wildcard mode)
pnpm wrangler secret put ALLOWED_ORIGINS --env development
# → paste: http://localhost:8081,http://localhost:19006
```

> **Mobile clients are unaffected.** React Native does not enforce CORS, so
> SpherePA's `feedbackClient.ts` works regardless of this setting. The
> allowlist only governs browser/WebView origin checks.

---

## Deployment Workflow

### Development Workflow

1. Make changes to `src/index.ts`
2. Test locally: `pnpm dev`
3. Deploy to dev: `pnpm wrangler deploy --env development`
4. Test at: `https://nb-feedback-api-dev.[your-subdomain].workers.dev`

### Production Deployment

1. Ensure all tests pass
2. Deploy: `pnpm wrangler deploy --env production`
3. Monitor logs: `pnpm wrangler tail --env production`
4. Deployed at: `https://nb-feedback-api-prod.[your-subdomain].workers.dev`

---

## Environment Variables & Bindings

| Binding | Type | Purpose | Task |
|---------|------|---------|------|
| `API_KEYS` | KV Namespace | Store API key → repository mappings (keyed by SHA-256 hash as of FEEDBACK-4) | TASK-005 |
| `RATE_LIMITER` | Durable Object | Per-key / per-device rate limiting | TASK-005 |
| `GITHUB_TOKEN` | Secret | GitHub API authentication | TASK-006 |
| `R2_BUCKET` | R2 Bucket | Screenshot storage (server-mediated uploads) | FEEDBACK-1 |
| `R2_PUBLIC_BASE_URL` | Secret / Var | Public base URL for R2 objects (GitHub rendering) | FEEDBACK-1 |
| `DEVICES` | KV Namespace | Per-device registration records (JWT claims, config snapshot) | FEEDBACK-2 |
| `JWT_SECRET` | Secret | HMAC-SHA256 signing key for device JWTs (≥ 32 bytes) | FEEDBACK-2 |
| `ADMIN_TOKEN` | Secret | Bearer token guarding `/api/devices/:id/{revoke,activate}` (FEEDBACK-3) | FEEDBACK-3 |
| `ALLOWED_ORIGINS` | Var / Secret | Comma/space-separated list of allowed CORS origins. If unset, CORS falls back to `*` without credentials (public mode). | FEEDBACK-4 |

---

## Monitoring & Debugging

### View Logs

```bash
# Real-time logs
pnpm wrangler tail --env production

# Filter by status
pnpm wrangler tail --env production --status error
```

### Check Analytics

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select `nb-feedback-api-prod`
4. View metrics: requests, errors, CPU time, duration

---

## Cost Estimates

### Cloudflare Workers (Free Tier)

- **Requests:** 100,000/day free
- **CPU Time:** 10ms per request
- **Storage:** KV reads/writes included
- **Durable Objects:** 1 million requests/month free

For typical usage (small-medium projects):
- **Expected cost:** $0/month (within free tier)
- **Scale:** Can handle ~3,000 feedback submissions/day

### Paid Tier (if needed)

- Workers: $5/month for 10M requests
- KV: $0.50 per million reads
- Durable Objects: $0.15 per million requests after free tier

---

## Security Considerations

1. **API Keys in KV**
   - Never commit API keys to Git
   - Use Wrangler CLI to populate KV
   - **FEEDBACK-4:** Store keys under their SHA-256 hash, not the raw key —
     defence-in-depth against KV leaks
   - Rotate keys if compromised

2. **GitHub PAT**
   - Store as Cloudflare Secret (encrypted)
   - Use fine-grained tokens with minimal permissions
   - Monitor GitHub token usage in security settings

3. **CORS Configuration**
   - **FEEDBACK-4:** Resolved dynamically via `ALLOWED_ORIGINS` — credentialed
     requests require an explicit origin match. Unset → `*` without credentials.
   - Previously `origin: '*'` + `credentials: true` (spec-invalid, silently
     broken in browsers).

4. **Rate Limiting**
   - Implemented in TASK-005
   - Prevents abuse and controls costs

5. **Input Sanitization (FEEDBACK-4)**
   - Title / description / metadata fields are length-capped server-side to
     stay under GitHub's issue-body limit (65,536 chars).
   - All metadata fields interpolated into the issue body are HTML-escaped as
     defence-in-depth against client-side tampering (the description is left
     unescaped because it is legitimate Markdown).
   - Screenshot attachment arrays are rebuilt from validated primitives
     (scheme-restricted URLs, length-capped filenames) before reaching GitHub.

---

## Troubleshooting

### "Wrangler: Not authenticated"

```bash
pnpm wrangler login
```

### "KV namespace not found"

Ensure namespaces are created and IDs added to `wrangler.toml`:

```bash
pnpm wrangler kv:namespace list
```

### "Deployment fails"

Check `wrangler.toml` syntax and ensure all bindings are configured:

```bash
pnpm wrangler deploy --dry-run --env development
```

### "Worker responds with 500 errors"

View real-time logs:

```bash
pnpm wrangler tail --env development --status error
```

### "Auth fails after FEEDBACK-4 hash migration"

The middleware tries the hashed key first, then falls back to the raw key. If
a client stops working after re-storing its key as a hash, verify:

1. The hash is lowercase hex SHA-256 of the **exact** raw key the client sends.
2. The config JSON is stored under the hash key name, not the raw key.

```bash
# Recompute the hash and confirm the KV key exists:
RAW_KEY="demo-key"
HASH=$(node -e "const {createHash}=require('crypto');console.log(createHash('sha256').update('${RAW_KEY}').digest('hex'))")
pnpm wrangler kv:key get "$HASH" --binding=API_KEYS --env development
```

---

## Next Steps

1. ✅ **All MVP tasks complete** (TASK-001 through TASK-013)
2. ✅ **FEEDBACK-1:** `POST /api/uploads` (R2) implemented + tested
3. ✅ **FEEDBACK-2:** `POST /api/register` (per-device JWT) implemented + tested
4. ✅ **FEEDBACK-3:** Device lifecycle (`/revoke` + `/activate`) implemented + tested
5. ✅ **FEEDBACK-4:** Security hardening (key hashing, CORS allowlist, input caps, HTML-escape) implemented + tested
6. ✅ **Dev deployment complete** — `https://nb-feedback-api-dev.sysadmin-d79.workers.dev` is live with all secrets (`GITHUB_TOKEN`, `JWT_SECRET`, `ADMIN_TOKEN`, `ALLOWED_ORIGINS`, `R2_PUBLIC_BASE_URL`), KV namespaces (`API_KEYS` with hashed key, `DEVICES`), and R2 bucket (`spherepa-feedback-dev`) configured with r2.dev public access enabled at `https://pub-cf33f186a8a94eada11f879bfd80eabf.r2.dev`. Verified end-to-end via smoke test: screenshot upload → public R2 GET 200 → feedback with attachment → GitHub issue #6 created (image renders inline). SpherePA EAS env vars (`SPHEREPA_FEEDBACK_API_URL`, `SPHEREPA_FEEDBACK_API_KEY`) set for the `development` profile.
7. ⏳ **Production:** Enable R2 public access + set `R2_PUBLIC_BASE_URL`, then `pnpm wrangler deploy --env production` with prod secrets.

---

## Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Hono.js Documentation](https://hono.dev/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)