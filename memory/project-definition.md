# NB Feedback Kit — Project Definition

> **Status:** Living document. This is the authoritative high-level description of the
> NB Feedback Kit system. Update whenever architecture, endpoints, auth model, or
> bindings change.

---

## Overview

NB Feedback Kit is a reusable feedback, roadmap, and release-management system
designed for React and React Native applications. It lets any app install a
single SDK / client and gain:

- In-app user feedback collection
- GitHub Issue creation (with optional screenshot)
- Product roadmap display
- Release notes display
- Per-device authentication + rate limiting
- Admin device revocation (abuse response)
- Multi-project support (one API backs many apps)

The goal: **build once, reuse across all future projects**.

---

## Current State (as of 2026-07-06)

### Implemented ✅

- **Backend API** (`packages/api`) — Cloudflare Worker + Hono.js + TypeScript
- **Frontend SDK (React)** — `packages/react-sdk` (planned; see Future)
- **Mobile client (React Native)** — SpherePA's `src/services/feedbackClient.ts`
  consumes the API directly (no SDK package, by design — zero new deps)
- **Shared types** — `packages/shared-types`

#### API endpoints (all under the Worker root)

| Method | Path | Auth | Purpose | Task |
|--------|------|------|---------|------|
| `GET` | `/` | none | API info | TASK-001 |
| `GET` | `/health` | none | Health check | TASK-001 |
| `POST` | `/api/feedback` | Bearer JWT *or* `X-API-Key` | Create GitHub issue | TASK-006 |
| `GET` | `/api/releases` | Bearer JWT *or* `X-API-Key` | GitHub releases | TASK-009 |
| `GET` | `/api/roadmap` | Bearer JWT *or* `X-API-Key` | Roadmap from labelled issues | TASK-011 |
| `POST` | `/api/uploads` | Bearer JWT *or* `X-API-Key` | R2 server-mediated screenshot upload (mobile-preferred) | FEEDBACK-1 |
| `POST` | `/api/uploads/presign` | Bearer JWT *or* `X-API-Key` | Legacy browser presigned-PUT flow | FEEDBACK-1 |
| `POST` | `/api/register` | `X-API-Key` (bootstrap) | Exchange bootstrap key for per-device JWT | FEEDBACK-2 |
| `POST` | `/api/devices/:id/revoke` | `ADMIN_TOKEN` (Bearer) | Ban a device | FEEDBACK-3 |
| `POST` | `/api/devices/:id/activate` | `ADMIN_TOKEN` (Bearer) | Restore a banned device | FEEDBACK-3 |

#### Auth model (dual-scheme, migration-safe)

```
Client                       Worker                                      KV
  |                            |                                          |
  |  POST /api/register        |                                          |
  |  X-API-Key: <bootstrap>    |                                          |
  |--------------------------->|  get(key) → config     ───────────────►  API_KEYS
  |                            |  put(deviceId, record) ───────────────►  DEVICES
  |  201 { token, deviceId }   |                                          |
  |<---------------------------|                                          |
  |                            |                                          |
  |  POST /api/feedback        |                                          |
  |  Authorization: Bearer JWT |                                          |
  |--------------------------->|  verifyJWT → { deviceId }                |
  |                            |  get(deviceId) → record ──────────────►  DEVICES
  |                            |  if (revoked) return 403                |
  |                            |  rate-limit by deviceId (DO)            |
  |  201 { issueUrl }          |                                          |
  |<---------------------------|                                          |
```

- **Bearer JWT** (FEEDBACK-2) — preferred path. Per-device rate limiting,
  revocable. HS256, 7-day TTL, 5s clock-skew tolerance. Zero-dependency
  (`src/auth/jwt.ts`, Web Crypto API).
- **`X-API-Key`** (legacy) — retained so old binaries keep working after a
  Worker upgrade. Per-key rate limiting. Can be rotated/revoked once all
  clients register on launch.
- **`ADMIN_TOKEN`** (FEEDBACK-3) — separate secret guarding device lifecycle
  routes. Fail-closed: returns `503` if unset.

### Pending ⏳

- **React SDK package** (`packages/react-sdk`) — web integration component

---

## Tech Stack

- **Runtime:** Cloudflare Workers (edge)
- **Framework:** Hono.js `^4.6.14`
- **Language:** TypeScript `^5.7.2`
- **Testing:** Vitest `^4.1.9` + `@cloudflare/vitest-pool-workers`
- **Tooling:** Wrangler `^4.101.0`
- **Package manager:** pnpm (workspace monorepo)
- **Storage:** Cloudflare KV, Durable Objects, R2
- **CI secrets:** `GITHUB_TOKEN`, `JWT_SECRET`, `ADMIN_TOKEN`, `R2_PUBLIC_BASE_URL`, `ALLOWED_ORIGINS`

---

## Architecture

```text
React / React Native App
        │
        ▼
NB Feedback SDK  (web)  |  feedbackClient.ts  (mobile — SpherePA)
        │
        ▼
NB Feedback API  (Cloudflare Worker + Hono)
        │
        ├──► KV (API_KEYS)     — bootstrap key → repo mapping
        ├──► KV (DEVICES)      — per-device records + revocation flag
        ├──► Durable Object    — per-device / per-key rate limiting
        ├──► R2 (R2_BUCKET)    — screenshot storage (server-mediated)
        │
        ▼
GitHub API  (issues, releases, roadmap)  →  Private GitHub Repository
```

**Why Worker-mediated:** the GitHub PAT and all cloud config stay server-side.
Clients never see credentials. The mobile upload path is same-origin (no CORS
needed); the legacy presign path remains for browsers.

---

## Bindings Inventory

| Binding | Type | Purpose | Required by |
|---------|------|---------|-------------|
| `API_KEYS` | KV Namespace | `apiKey → { repository, name }` mapping | TASK-005 |
| `DEVICES` | KV Namespace | Per-device registration record (config snapshot, `revoked`, timestamps) | FEEDBACK-2 |
| `RATE_LIMITER` | Durable Object | Per-key (legacy) / per-device (JWT) rate limiting | TASK-005, FEEDBACK-3 |
| `R2_BUCKET` | R2 Bucket | Screenshot storage (`feedback/` prefix) | FEEDBACK-1 |
| `GITHUB_TOKEN` | Secret | GitHub PAT (issues + releases read) | TASK-006 |
| `JWT_SECRET` | Secret | HS256 signing key for device JWTs (≥ 32 bytes) | FEEDBACK-2 |
| `ADMIN_TOKEN` | Secret | Bearer guard for `/api/devices/:id/{revoke,activate}` | FEEDBACK-3 |
| `R2_PUBLIC_BASE_URL` | Secret / Var | Public base URL for R2 objects (GitHub image rendering) | FEEDBACK-1 |
| `ALLOWED_ORIGINS` | Var / Secret | Comma/space-separated CORS origin allowlist (unset → `*` without credentials) | FEEDBACK-4 |

---

## Monorepo Structure

```text
NB-Feedback-Kit
│
├── packages
│   ├── api              ← Cloudflare Worker (Hono + TS)
│   │   ├── src
│   │   │   ├── index.ts             ← app, routes, middleware wiring
│   │   │   ├── auth
│   │   │   │   ├── jwt.ts           ← HS256 sign/verify (Web Crypto)
│   │   │   │   └── register.ts      ← handleRegister + handleRevoke + handleActivate
│   │   │   ├── middleware
│   │   │   │   └── auth.ts          ← dual-scheme auth (Bearer JWT | X-API-Key)
│   │   │   ├── github
│   │   │   │   └── client.ts        ← GitHub REST wrapper
│   │   │   ├── rate-limiter.ts      ← Durable Object (per-device/per-key)
│   │   │   └── storage
│   │   │       └── uploads.ts       ← R2 server-mediated upload handler
│   │   ├── wrangler.toml
│   │   ├── CLOUDFLARE_SETUP.md      ← deployment + binding setup guide
│   │   └── api-key-value.json       ← local-dev bootstrap key (gitignored in prod)
│   │
│   ├── react-sdk        ← (planned) web FeedbackProvider + components
│   └── shared-types     ← request/response TypeScript types
│
├── docs
├── examples
└── memory
    └── project-definition.md   ← this file
```

> **Note:** SpherePA (sibling repo) consumes the API via
> `src/services/feedbackClient.ts` rather than a published SDK package, to
> avoid adding a runtime dependency to the mobile app.

---

## Security Model

### Principle

Never expose GitHub tokens or cloud credentials to clients. All sensitive
operations are Worker-mediated.

### Bootstrap → per-device flow

1. Each app binary ships with one shared `X-API-Key` (bootstrap).
2. On first API call, the mobile client `POST /api/register`s and receives a
   short-lived JWT bound to a UUID `deviceId`.
3. Subsequent calls use `Authorization: Bearer <jwt>`.
4. Rate limiting keys by `deviceId` on the JWT path (FEEDBACK-3).
5. A compromised device can be banned via `POST /api/devices/:id/revoke`
   without rotating the bootstrap key for everyone.
6. Once all clients register on launch, the bootstrap key can be retired.

### Revocation enforcement (FEEDBACK-3)

- `handleRegister` returns `403` if a revoked `deviceId` attempts re-registration.
- `createAuthMiddleware` returns `403` on any Bearer-JWT request from a revoked
  device.
- Lifecycle routes are guarded by a dedicated `ADMIN_TOKEN` secret (fail-closed
  `503` if unset) so a compromised client credential cannot self-revoke.

### Security hardening (FEEDBACK-4)

- **Key hashing:** API keys are looked up in `API_KEYS` KV by their SHA-256
  hash, not the raw key — defence-in-depth against KV namespace leaks. The
  middleware tries the hash first, then falls back to the raw key for backward
  compatibility with pre-FEEDBACK-4 deployments.
- **CORS origin allowlist:** The Worker resolves `Access-Control-Allow-Origin`
  dynamically per request from the `ALLOWED_ORIGINS` var/secret. Unset → `*`
  **without** credentials (public mode). This fixes the previous spec-invalid
  `origin:'*'` + `credentials:true` combination that browsers silently broke.
- **Field-length caps:** Title, description, and metadata fields are
  length-capped server-side to stay under GitHub's 65,536-char issue-body limit.
- **Metadata HTML-escaping:** All metadata fields interpolated into the issue
  body are HTML-escaped as defence-in-depth against client-side tampering. The
  description is left unescaped because it is legitimate Markdown.
- **Attachment validation:** Screenshot attachment arrays are rebuilt from
  validated primitives (scheme-restricted URLs, length-capped filenames)
  before reaching GitHub.

### Upload security envelope (FEEDBACK-1)

| Concern | Mitigation |
|---------|------------|
| Size | 10 MiB hard cap, enforced before bytes touch R2 |
| Type | Allowlist: PNG, JPEG, WebP, GIF only |
| Spoofing | Magic-byte signature check on first 8–12 bytes |
| Key traversal | Object keys are server-generated (`feedback/<timestamp>-<random>`) |

---

## Testing

- **Runner:** Vitest + `@cloudflare/vitest-pool-workers` (simulated KV / DO / R2).
- **Current suite:** 114 tests across 8 files, all passing (2026-07-06).
- **Coverage focus:** JWT sign/verify round-trip + tamper/expiry, registration
  happy path + 401, revocation lifecycle (revoke/activate/idempotency/404/400),
  revocation enforcement at register + auth middleware, per-device rate-limit
  keying, R2 upload validation (size/type/magic-bytes), GitHub integration
  error mapping (502 on bad credentials).

---

## Configuration (consumer side)

### Web (planned SDK)

```tsx
<FeedbackProvider
    config={{
        applicationName: "Student Manager",
        version: "1.0.0",
        targetRepository: "student-manager",
        apiEndpoint: "https://nb-feedback-api-prod.<subdomain>.workers.dev"
    }}
>
    <App />
</FeedbackProvider>
```

### Mobile (SpherePA pattern — direct client)

```ts
// app.config.ts extra.feedback: { apiKey, apiUrl }
// src/services/feedbackClient.ts lazily registers on first API call,
// caches the JWT + deviceId in module memory for the session.
```

The mobile client intentionally avoids `expo-secure-store` (zero-dep policy);
credentials live in module memory for the session and re-mint on each launch.

---

## GitHub Integration

### Issue title formats

```text
[BUG] Search not working
[FEATURE] Add CSV export
[FEEDBACK] Dashboard suggestions
```

### Labels

| Feedback type | Labels |
|---------------|--------|
| Bug | `bug`, `beta-feedback` |
| Feature Request | `feature-request`, `beta-feedback` |
| General Feedback | `feedback`, `beta-feedback` |

### Roadmap labels

`planned` · `in-progress` · `testing` · `released`

### Repository routing (server-side, per API key)

```json
{
  "spherepa":  { "owner": "Nealsch", "repo": "spherepa" },
  "student-manager": { "owner": "nealbresler", "repo": "student-manager" }
}
```

---

## Success Criteria

The project is considered successful when:

1. A React / React Native app can integrate feedback in under 10 minutes.
2. Feedback can be submitted without exposing GitHub credentials.
3. Feedback automatically creates GitHub Issues (with optional screenshot).
4. Release notes can be displayed from GitHub Releases.
5. Multiple applications share the same backend API.
6. Per-device auth + rate limiting prevents one leak from blowing the budget.
7. Admins can revoke a single abusive device without rotating keys for everyone.
8. All GitHub repositories remain private.
9. The system is reusable across future projects without modification.

---

## Future Enhancements

- **React SDK package** — formal `packages/react-sdk` with `FeedbackProvider`,
  `FeedbackButton`, `FeedbackModal`, `ReleaseNotesModal`.
- **Feature voting** — `POST /vote`, `GET /features`.
- **User feedback portal** — view submitted feedback, track status, roadmap,
  release history.
- **AI categorisation** — auto-classify (Bug / Feature / UX / Enhancement).
- **AI deduplication** — detect duplicate feedback before creating new issues.

---

## Decision Log Summary

See `memory/project-decisions.md` for full records. Key decisions:

- **Worker + Hono over Express/FaaS** — edge-deployed, KV/DO/R2 native, free
  tier covers MVP volume.
- **Dual-scheme auth** — Bearer JWT (FEEDBACK-2) preferred; `X-API-Key`
  retained for migration so a Worker upgrade never breaks old binaries.
- **In-memory JWT cache on mobile** — avoids `expo-secure-store` dependency;
  JWT TTL (7 days) + bootstrap-key requirement keep it secure.
- **`ADMIN_TOKEN` separate from API key / JWT** — a compromised client
  credential cannot self-revoke or un-ban devices.
- **Server-mediated R2 uploads for mobile** — no CORS, no presigned URLs, all
  cloud config server-side, server-enforced size/type/magic-byte caps.
- **SHA-256 key hashing (FEEDBACK-4)** — API keys are stored in KV under their
  hash, not the raw key. Defence-in-depth against KV leaks; the raw-key
  fallback is kept temporarily for migration safety.

---

*This document is maintained by the NB-Project-Admin skill. Update on
architecture, endpoint, binding, or auth-model changes.*