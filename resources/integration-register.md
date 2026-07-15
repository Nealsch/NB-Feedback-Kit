# Integration Register — NB Feedback Kit

<!--
  PURPOSE: Document all external integrations (third-party APIs, platform SDKs, device APIs, webhooks, message brokers).
  POPULATE: At project start (NB-Solution-Analyst) and update whenever an integration is added, changed, or removed.
  OWNER: Project-specific — maintained by the development team.
-->

## Overview

NB Feedback Kit integrates with three external systems, all configured per Kit Client deployment:

1. **GitHub API** — source of truth for feedback (Issues), release notes (Releases), and roadmap (Issues with labels)
2. **Cloudflare R2** — screenshot storage (S3-compatible, native Worker binding)
3. **Cloudflare KV** — API key validation and device registration records

**Important:** These integrations are configured by each Kit Client (the developer who adopts the SDK) — not by the Kit Developer (repo maintainer). The Kit Developer publishes the integration code; the Kit Client provides their own credentials, buckets, and namespaces. See [architecture.md](architecture.md) for the deployment topology.

---

## Integrations

### 1. GitHub API (Issues — feedback submission)

| Property | Value |
|----------|-------|
| **Purpose** | Create GitHub Issues from user-submitted feedback (bug reports, feature requests, general feedback). Each issue includes a metadata table (app name, version, user agent, timestamp) and inline screenshot links. |
| **Package / SDK** | Native `fetch()` — no GitHub SDK dependency. Worker makes REST API calls directly. |
| **Status** | Active |
| **Platform** | Server-side (Cloudflare Worker) |
| **Authentication** | Fine-grained Personal Access Token (PAT) with `Issues: Read and write` + `Metadata: Read-only` permissions. Stored as `GITHUB_TOKEN` Worker secret. Never exposed to clients. |
| **Data Accessed** | `POST /repos/{owner}/{repo}/issues` — creates issues. Repository mapping comes from the API key config in KV. |
| **Error Handling** | Worker catches GitHub API errors and returns a `502 Bad Gateway` to the client with a generic "Failed to submit feedback" message. Detailed error logged server-side only. |
| **Owner** | Kit Client (configures their own PAT + repository) |

### 2. GitHub API (Releases — release notes)

| Property | Value |
|----------|-------|
| **Purpose** | Fetch GitHub Releases to surface changelogs/release notes inside the client app via the SDK's release notes component. |
| **Package / SDK** | Native `fetch()` |
| **Status** | Active |
| **Platform** | Server-side (Cloudflare Worker) |
| **Authentication** | Same `GITHUB_TOKEN` PAT (requires `Contents: Read-only` for releases access). |
| **Data Accessed** | `GET /repos/{owner}/{repo}/releases` — fetches published releases. |
| **Error Handling** | Worker returns `502` with generic "Failed to fetch releases" message on GitHub failure. |
| **Owner** | Kit Client |

### 3. GitHub API (Issues + Labels — roadmap)

| Property | Value |
|----------|-------|
| **Purpose** | Fetch GitHub Issues labeled with roadmap labels to render a public roadmap inside the client app. |
| **Package / SDK** | Native `fetch()` |
| **Status** | Active |
| **Platform** | Server-side (Cloudflare Worker) |
| **Authentication** | Same `GITHUB_TOKEN` PAT. |
| **Data Accessed** | `GET /repos/{owner}/{repo}/issues?labels=<roadmap-labels>` — fetches issues with roadmap labels. |
| **Error Handling** | Worker returns `502` with generic "Failed to fetch roadmap" message on GitHub failure. |
| **Owner** | Kit Client |

### 4. Cloudflare R2 (screenshot storage)

| Property | Value |
|----------|-------|
| **Purpose** | Store screenshots uploaded by users alongside their feedback. Objects written under `feedback/<timestamp>-<random>.<ext>` prefix. Public read enabled so GitHub can render images inline in issue bodies. |
| **Package / SDK** | Native R2 binding (`R2_BUCKET`) — no AWS SDK required. Server-mediated upload: client POSTs multipart/form-data to Worker, Worker writes to R2. |
| **Status** | Active |
| **Platform** | Server-side (Cloudflare Worker) |
| **Authentication** | Native R2 binding — no credentials exposed to clients. Client receives only the public URL of the uploaded object. |
| **Data Accessed** | `PUT` screenshot bytes under `feedback/` prefix; public read via `R2_PUBLIC_BASE_URL` + object key. |
| **Error Handling** | Size cap (10 MiB), type allowlist (PNG/JPEG/WebP/GIF), magic-byte signature validation before write. Invalid uploads rejected with `400`. |
| **Owner** | Kit Client (creates their own bucket, sets `R2_PUBLIC_BASE_URL`) |

### 5. Cloudflare KV (API key validation)

| Property | Value |
|----------|-------|
| **Purpose** | Validate API keys sent by client SDKs. Each key maps to a GitHub repository + application name. |
| **Package / SDK** | Native KV binding (`API_KEYS`) |
| **Status** | Active |
| **Platform** | Server-side (Cloudflare Worker) |
| **Authentication** | Native KV binding — no client-side access. Keys are looked up by SHA-256 hash (FEEDBACK-4 defence-in-depth). |
| **Data Accessed** | `get(sha256(rawKey))` → `{ repository, name }` config JSON. |
| **Error Handling** | Missing/invalid key → `401 Unauthorized`. Rate limited via Durable Object. |
| **Owner** | Kit Client (creates their own KV namespace, populates with their API key hashes) |

### 6. Cloudflare KV (device registration)

| Property | Value |
|----------|-------|
| **Purpose** | Store per-device registration records for JWT-based authentication (FEEDBACK-2). Each record contains the device ID, config snapshot, registration timestamp, and revocation status. |
| **Package / SDK** | Native KV binding (`DEVICES`) |
| **Status** | Active |
| **Platform** | Server-side (Cloudflare Worker) |
| **Authentication** | Native KV binding. Records keyed by UUID `deviceId`. |
| **Data Accessed** | `put(deviceId, record)` at registration; `get(deviceId)` on every authenticated request to check revocation status. |
| **Error Handling** | Revoked devices → `403 Forbidden` at auth middleware. Missing device record → `401`. |
| **Owner** | Kit Client (creates their own KV namespace) |

---

## Integration Risk Summary

| Integration | Risk Level | Notes |
|-------------|-----------|-------|
| GitHub API (Issues/Releases/Roadmap) | **Medium** | Rate limited by GitHub (5,000 req/hour per PAT). Worker does not retry on rate limit — client receives error. PAT stored as secret (not in code). If PAT expires/revoked, feedback submission fails with 502. |
| Cloudflare R2 | **Low** | Native binding = no credential exposure. Size/type/magic-byte validation prevents abuse. Public read limited to objects under `feedback/` prefix. |
| Cloudflare KV (API_KEYS) | **Low** | Keys stored as SHA-256 hashes (FEEDBACK-4). Read-only access pattern. Eventually consistent — a newly added key may take up to 60 seconds to propagate globally. |
| Cloudflare KV (DEVICES) | **Low** | Same eventual consistency caveat. Device revocation may take up to 60 seconds to propagate globally (documented limitation). |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-07-15 | Initial population — all 6 integrations documented (GitHub Issues/Releases/Roadmap, R2, KV API_KEYS, KV DEVICES) | NB-Solution-Analyst |