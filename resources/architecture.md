# Architecture — NB Feedback Kit

<!--
  PURPOSE: Document the project's architecture (components, layers, data flow, deployment topology).
  POPULATE: At project start (NB-Solution-Analyst / NB-Backend-Specialist) and update as the architecture evolves.
  OWNER: Project-specific — maintained by the Architect / development team.
  NOTE: General architectural principles live in .clinerules/architecture/. This file captures THIS project's concrete architecture.
-->

## Overview

NB Feedback Kit is an **open-source, self-hostable feedback infrastructure kit** — not a hosted SaaS. It lets developers collect in-app feedback (bug reports, feature requests, screenshots) and channel it into their own GitHub repository as Issues, using their own storage and their own backend deployment.

**Architectural style:** Serverless backend (Cloudflare Worker) + embeddable client SDKs (React, React Native, vanilla JS). The kit is a **thin bridge** between a client application and GitHub — it does not replace the developer's existing tools.

**Key design principle:** Each Kit Client (developer who adopts the SDK) deploys **their own** Worker instance, provisions **their own** KV/R2/secrets, and points the SDK at **their own** endpoint. There is no shared/multi-tenant backend hosted by the Kit Developer. This is the "own your feedback" value proposition: no vendor lock-in, no per-seat pricing.

### Roles & Terminology

| Role | Who | Responsibility |
|------|-----|----------------|
| **End User** | The person filling in the feedback form in a client app | Interacts only with the app UI; never sees the Worker, GitHub, or storage |
| **Kit Client** | Any developer who adopts the SDK (e.g., NB Toolbox) | Deploys their own Worker, provisions their own KV/R2/secrets, configures the SDK's `apiEndpoint` to point at their Worker |
| **Kit Developer** | Maintainer of the `NB-Feedback-Kit` repo | Publishes the SDK packages (`core-sdk`, `react-sdk`) and the Worker source. Does NOT host a shared runtime backend. |

---

## Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Core SDK** | Framework-agnostic client library — `createFeedbackClient()`, HTTP transport, payload assembly. Ships as IIFE global build (script-tag) and ES module. | TypeScript, bundled via tsup |
| **React SDK** | React bindings for the Core SDK — `FeedbackProvider`, hooks (`useFeedback`), UI components (`FeedbackButton`, `FeedbackModal`) | React 18+, TypeScript |
| **Worker (API)** | Backend bridge — validates API keys, rate limits (Durable Object), creates GitHub Issues, reads Releases/Roadmap, handles screenshot uploads to R2 | Hono.js, Cloudflare Workers runtime |
| **Rate Limiter (Durable Object)** | Per-key / per-device rate limiting with sliding window | Cloudflare Durable Objects |
| **KV: API_KEYS** | Stores API key → repository mappings (keyed by SHA-256 hash of the raw key) | Cloudflare KV |
| **KV: DEVICES** | Stores per-device registration records (JWT claims, config snapshot, revocation status) | Cloudflare KV |
| **R2 Bucket** | Screenshot storage — server-mediated uploads under `feedback/` prefix | Cloudflare R2 (S3-compatible) |
| **Shared Types** | Shared TypeScript type definitions used by SDK + Worker | `@nb-feedback-kit/shared-types` |

---

## Layer Breakdown

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT APP (Kit Client's application)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  UI Layer (React components / vanilla JS widget)  │  │
│  │    FeedbackButton, FeedbackModal, FeedbackProvider│  │
│  └──────────────────────┬────────────────────────────┘  │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  SDK Layer (Core SDK)                             │  │
│  │    createFeedbackClient(), HTTP transport,        │  │
│  │    payload assembly, screenshot capture           │  │
│  └──────────────────────┬────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTPS (apiEndpoint)
                          ▼
┌─────────────────────────────────────────────────────────┐
│  WORKER (Kit Client's Cloudflare Worker deployment)     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  API Layer (Hono routes)                          │  │
│  │    /api/register, /api/feedback, /api/uploads,    │  │
│  │    /api/releases, /api/roadmap, /api/devices/*    │  │
│  └──────────────────────┬────────────────────────────┘  │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  Auth & Validation Layer                          │  │
│  │    API key lookup (KV, SHA-256 hash),             │  │
│  │    JWT verification, device revocation check,     │  │
│  │    input validation, field-length caps            │  │
│  └──────────────────────┬────────────────────────────┘  │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  Rate Limiting Layer (Durable Object)             │  │
│  │    Per-key / per-device sliding window            │  │
│  └──────────────────────┬────────────────────────────┘  │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  Integration Layer                                │  │
│  │    GitHub API client (issues, releases, labels),  │  │
│  │    R2 storage client (screenshot upload)          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Dependency direction:** UI → SDK → Worker → GitHub/R2/KV. Lower layers never depend on higher layers. The SDK never contains GitHub tokens or storage credentials — those live only in the Worker.

---

## Data Flow

### Feedback Submission (happy path)

```
End User          Client App SDK                Worker                    GitHub API          R2
  │                   │                          │                          │                 │
  │  Fill form        │                          │                          │                 │
  │  + screenshot     │                          │                          │                 │
  │─────────────────▶│                          │                          │                 │
  │                   │  POST /api/uploads       │                          │                 │
  │                   │  (screenshot bytes)      │                          │                 │
  │                   │─────────────────────────▶│                          │                 │
  │                   │                          │  Validate type/size      │                 │
  │                   │                          │  Magic-byte check        │                 │
  │                   │                          │  PUT feedback/<key>      │                 │
  │                   │                          │──────────────────────────────────────────▶│
  │                   │                          │  Return public URL       │                 │
  │                   │  { url, filename }       │◀──────────────────────────────────────────│
  │                   │◀─────────────────────────│                          │                 │
  │                   │                          │                          │                 │
  │                   │  POST /api/feedback      │                          │                 │
  │                   │  (title, desc, metadata) │                          │                 │
  │                   │─────────────────────────▶│                          │                 │
  │                   │                          │  Validate API key (KV)   │                 │
  │                   │                          │  Rate limit check (DO)   │                 │
  │                   │                          │  Clamp field lengths     │                 │
  │                   │                          │  Sanitize attachments    │                 │
  │                   │                          │  POST /repos/.../issues  │                 │
  │                   │                          │─────────────────────────▶│                 │
  │                   │                          │  201 { issueUrl }        │                 │
  │                   │                          │◀─────────────────────────│                 │
  │                   │  201 { issueUrl,         │                          │                 │
  │                   │         issueNumber }    │                          │                 │
  │                   │◀─────────────────────────│                          │                 │
  │  "Thank you!"     │                          │                          │                 │
  │◀─────────────────│                          │                          │                 │
```

### Device Registration (FEEDBACK-2)

```
Client SDK                     Worker                         KV (API_KEYS / DEVICES)
  │                              │                               │
  │  POST /api/register          │                               │
  │  X-API-Key: <bootstrap>      │                               │
  │─────────────────────────────▶│                               │
  │                              │  get(sha256(bootstrap-key))   │  FEEDBACK-4 hash lookup
  │                              │──────────────────────────────▶│  API_KEYS
  │                              │  Generate deviceId (UUID)     │
  │                              │  Sign HS256 JWT (deviceId)    │
  │                              │  put(deviceId, record)        │
  │                              │──────────────────────────────▶│  DEVICES
  │  201 { token, deviceId }     │                               │
  │◀─────────────────────────────│                               │
```

### Release Notes & Roadmap (feedback loop)

```
Client SDK                     Worker                         GitHub API
  │                              │                               │
  │  GET /api/releases           │                               │
  │  Authorization: Bearer <jwt> │                               │
  │─────────────────────────────▶│                               │
  │                              │  Verify JWT → deviceId        │
  │                              │  Check DEVICES (not revoked)  │
  │                              │  GET /repos/.../releases      │
  │                              │──────────────────────────────▶│
  │                              │  200 [ releases ]             │
  │  200 { releases: [...] }     │◀──────────────────────────────│
  │◀─────────────────────────────│                               │
```

---

## Data Storage

| Store | Purpose | Technology | Per-Client? |
|-------|---------|------------|-------------|
| **API_KEYS (KV)** | API key → repository mappings. Keys are SHA-256 hashes of raw keys (FEEDBACK-4 defence-in-depth). | Cloudflare KV | Yes — each Kit Client provisions their own namespace |
| **DEVICES (KV)** | Per-device registration records — JWT claims, config snapshot, revocation status. Keyed by UUID `deviceId`. | Cloudflare KV | Yes — each Kit Client provisions their own namespace |
| **R2 Bucket** | Screenshot storage. Objects written under `feedback/<timestamp>-<random>.<ext>` prefix. Public read enabled for GitHub rendering. | Cloudflare R2 | Yes — each Kit Client provisions their own bucket |
| **GitHub Issues** | The actual feedback data (title, description, metadata, screenshot links) | GitHub Issues API | Yes — each Kit Client points at their own repository |

**No persistent database.** All state is in Cloudflare KV (eventually consistent) and GitHub Issues (source of truth for feedback content). Screenshots are immutable objects in R2.

---

## External Integrations

See [integration-register.md](integration-register.md) for detailed integration documentation.

| Integration | Purpose | Auth Method |
|-------------|---------|-------------|
| **GitHub API (Issues)** | Create feedback issues with metadata table + inline screenshots | Fine-grained PAT (`GITHUB_TOKEN`) stored as Worker secret |
| **GitHub API (Releases)** | Fetch release notes for in-app changelog | Same PAT |
| **GitHub API (Issues + Labels)** | Fetch roadmap items by label | Same PAT |
| **Cloudflare R2** | Screenshot storage | Native R2 binding (`R2_BUCKET`) — no client-visible credentials |
| **Cloudflare KV** | API key validation + device registration records | Native KV bindings (`API_KEYS`, `DEVICES`) |

---

## Deployment Topology

### Kit Developer (repo maintainer)

The Kit Developer publishes:
1. **npm packages:** `@nb-feedback-kit/core-sdk`, `@nb-feedback-kit/react-sdk`, `@nb-feedback-kit/shared-types`
2. **Worker source:** `packages/api/` — copy-pasteable Hono + Wrangler config

The Kit Developer does **not** host a runtime backend. Each consumer deploys their own.

### Kit Client (per-developer, isolated)

Each developer who adopts the kit:

1. Installs the SDK (`npm install @nb-feedback-kit/core-sdk` or `react-sdk`)
2. Deploys the Worker to their own Cloudflare account
3. Provisions their own KV namespaces (`API_KEYS`, `DEVICES`) and R2 bucket
4. Sets their own secrets (`GITHUB_TOKEN`, `JWT_SECRET`, `ADMIN_TOKEN`, `ALLOWED_ORIGINS`, `R2_PUBLIC_BASE_URL`)
5. Deploys to their own `*.workers.dev` subdomain or custom domain (e.g., `feedback.myapp.com`)
6. Points the SDK's `apiEndpoint` at their Worker URL

```
┌─────────────────────────────────────────────────────────────────────┐
│            KIT CLIENT DEPLOYMENT (per-developer, isolated)           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  CLIENT APP (e.g., nbtoolbox.com, spherepa.app)              │  │
│  │  Browser loads SDK → FeedbackClient → POST /api/feedback     │  │
│  └──────────────────────────────────┬──────────────────────────┘  │
│                                     │ HTTPS                        │
│                                     ▼                              │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  CLOUDFLARE EDGE (Client's Cloudflare account)                │ │
│  │  feedback.<client-domain> → Worker (nb-feedback-api)          │ │
│  │    • Validates API key (KV)    • Rate limits (Durable Object) │ │
│  │    • Size/type checks          • Creates JWTs                 │ │
│  │    • Creates GitHub Issues     • Uploads screenshots to R2    │ │
│  └─────────────────┬─────────────────────────────────┬───────────┘ │
│                    │                                 │             │
│         ┌──────────▼──────────┐          ┌───────────▼───────────┐ │
│         │  KV: API_KEYS       │          │  R2 Bucket            │ │
│         │  KV: DEVICES        │          │  (screenshots)        │ │
│         └─────────────────────┘          └───────────┬───────────┘ │
│                                                       │ public read │
│  ┌────────────────────────────────────────────────────┼───────────┐ │
│  │  CLIENT'S GITHUB REPO (e.g., github.com/org/app)   │           │ │
│  │  Worker creates issues with metadata + screenshots │◀──────────┘ │
│  │  Worker reads releases + labels for roadmap        │             │
│  └────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

**Isolation guarantee:** Each Kit Client has their own Worker, KV, R2, and GitHub connection. Feedback from App A goes to Client A's GitHub repo. No shared state between clients. The Kit Developer has zero runtime involvement.

---

## Multi-Project Support

A single Worker deployment can serve multiple applications via the API key mapping in KV. Each API key maps to a different GitHub repository and (optionally) storage prefix:

```
API_KEY "app-a-key-hash" → { repository: "org/app-a", name: "App A" }
API_KEY "app-b-key-hash" → { repository: "org/app-b", name: "App B" }
```

This allows one deployment to serve multiple projects while keeping GitHub Issues isolated per repository. See [Multi-Project Architecture](../README.md#multi-project-support).

---

## Security Model

| Concern | Mitigation |
|---------|------------|
| **Token exposure** | GitHub PAT and storage credentials live only in the Worker (as secrets). Clients never receive them. |
| **API key in client code** | Public by design — validated server-side + rate limited. Stored as SHA-256 hash in KV (FEEDBACK-4). |
| **Screenshot spoofing** | Magic-byte validation + size cap + server-generated object keys. Client cannot control the R2 path. |
| **Device abuse** | Per-device JWT (FEEDBACK-2) + revocation (FEEDBACK-3). Compromised devices can be banned individually. |
| **Input injection** | Server-side field-length caps + HTML-escaping of metadata fields interpolated into issue body. |
| **CORS** | Dynamic origin allowlist via `ALLOWED_ORIGINS` (FEEDBACK-4). Fixes spec-invalid `origin:'*'` + `credentials:true`. |

See [Security documentation](../docs/security.md) for the full threat model.

---

## Key Architectural Decisions

| Decision | Rationale | Reference |
|----------|-----------|-----------|
| **Serverless Worker (not a traditional server)** | Zero cold-start cost, scales to zero, free tier covers MVP volume, no VPS to maintain | — |
| **Client-side SDK (not a hosted widget)** | "Own your feedback" — no vendor lock-in, no third-party scripts loading on client sites | — |
| **KV for API keys + devices (not a database)** | Eventually consistent is acceptable for this use case; KV is cheaper and simpler than D1/SQL | — |
| **R2 for screenshots (not S3)** | Native Worker binding = zero egress fees; server-mediated upload = no CORS/presign complexity for mobile | FEEDBACK-1 |
| **Per-device JWT (not just API key)** | Enables per-device rate limiting + revocation; allows retiring the shared bootstrap key post-migration | FEEDBACK-2 |
| **SHA-256 hashed API keys in KV** | Defence-in-depth — if KV namespace is leaked, raw keys cannot be recovered | FEEDBACK-4 |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-07-15 | Initial population — full architecture documented (components, data flow, deployment topology, security model, multi-project support) | NB-Solution-Analyst |