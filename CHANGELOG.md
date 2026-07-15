# Changelog

All notable changes to NB Feedback Kit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-06

First public release.

### Added

- **React SDK** — headless, fully styleable components and hooks for collecting feedback in any React application.
  - `FeedbackProvider` context with configuration management.
  - `FeedbackButton` and `FeedbackModal` headless components.
  - `useFeedback`, `useSubmitFeedback`, `useReleaseNotes`, and `useRoadmap` hooks.
  - Zero built-in styles — all components accept `className` passthrough for host-app styling.
- **Cloudflare Worker API** — secure backend for feedback submission, release notes, and roadmap retrieval.
  - `POST /api/feedback` — creates GitHub Issues with `bug`, `feature`, or `feedback` labels and rendered metadata tables.
  - `GET /api/releases` — returns versioned release notes from GitHub Releases.
  - `GET /api/roadmap` — returns label-driven roadmap items from GitHub Issues.
  - `GET /health` and `GET /` — unauthenticated health and info endpoints.
- **Dual-scheme authentication** — per-device JWT (1-hour TTL, HS256, revocable) and X-API-Key, with admin routes guarded by a separate `ADMIN_TOKEN`.
- **Device registration** — API key exchanged for a per-device JWT at registration; devices are revocable and activatable via admin endpoints.
- **Rate limiting** — per-identity rate limiting via a `RateLimiter` Durable Object (SQLite-backed, 60 req/min default, sliding window, configurable per key).
- **Attachment sanitisation** — `sanitizeAttachments` validates, length-caps, and rebuilds client-supplied URLs server-side before interpolating into the GitHub issue body. Only `http`/`https` schemes allowed; max 5 attachments.
- **Storage provider abstraction** — pluggable screenshot upload with two modes:
  - **R2 native** — server-mediated uploads through the Worker with validation (size, MIME, magic bytes).
  - **S3 presign** — Worker signs short-lived PUT URLs (5-minute TTL); browser uploads directly to the bucket.
- **Storage configuration UI** — `StorageConfigPanel` component for configuring storage providers within the SDK, including a connection test probe.
- **Multi-project support** — one Worker backend can securely serve multiple applications with isolated GitHub repositories, storage configurations, and API keys.
- **Shared types package** — zero-dependency TypeScript contracts (`FeedbackPayload`, `FeedbackResponse`, `UploadedFile`, `ReleaseNote`, `RoadmapItem`, etc.) shared across SDK and API.
- **Demo application** — reference Vite + React integration in `apps/demo-app` demonstrating SDK usage.
- **Documentation** — Getting Started, Installation, Backend, React, Storage Providers, Authentication, and Security guides.
- **Community health files** — `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `ROADMAP.md`.
- **PowerShell smoke test script** — `packages/api/smoke-feedback.ps1` for end-to-end feedback flow verification.
- **MIT License** — permissive open-source licence for the entire project.

### Security

- GitHub tokens, JWT signing keys, admin tokens, and storage credentials isolated as encrypted Cloudflare Worker secrets — never exposed to clients.
- API keys stored as SHA-256 hashes in Workers KV — never in plaintext.
- All `/api/*` routes protected by authentication middleware.
- CORS dynamically resolved from `ALLOWED_ORIGINS` secret — credentialed requests only from listed origins.
- All traffic over HTTPS (Cloudflare enforces TLS 1.2+).
- Comprehensive input validation and length-capping on all client-supplied fields.

---

## Versioning Notes

- **MAJOR** versions document breaking changes with migration guidance in this changelog and in GitHub Release Notes.
- **MINOR** versions add backwards-compatible features.
- **PATCH** versions include bug fixes, documentation, and internal improvements.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full versioning policy.