# Security Review — TASK-005 & TASK-006

**Date:** 2026-06-28
**Reviewer:** NB-Security-Engineer
**Scope:** API Authentication (TASK-005), GitHub Integration Layer (TASK-006), SDK-API Wiring (TASK-008)

## Architecture Overview

```
React App (client-side)
    │
    │ X-API-Key header
    ▼
NB Feedback API (Cloudflare Worker)
    │
    │ GitHub PAT (server-side secret)
    ▼
GitHub API (private repositories)
```

## Trust Boundaries

| Boundary | Description | Enforced by |
|----------|-------------|-------------|
| Browser → API | Client sends API key | Auth middleware (TASK-005) |
| API → GitHub | Server uses PAT | `GITHUB_TOKEN` secret, never exposed |
| SDK Config | API key visible in client code | Mitigated by rate limiting (ADR-004) |

## Security Findings

### ✅ PASS — Authentication

**Finding:** API key authentication is implemented correctly.

- Missing `X-API-Key` header → 401 response
- Invalid API key (not in KV) → 401 response
- KV lookup failure → 500 (no data leaked)
- API key not logged or exposed in error responses
- Repository routing is server-side only (ADR-005): client never specifies target repo

### ✅ PASS — Rate Limiting

**Finding:** Durable Object sliding window rate limiter is properly isolated.

- Each API key gets its own DO instance (per-key isolation)
- 60-second sliding window with persisted state
- Retry-After header provided on 429
- Rate limit headers returned on success (X-RateLimit-Limit, X-RateLimit-Remaining)
- Clean separation: auth middleware checks rate limit before proceeding

### ⚠️ MEDIUM — GitHub PAT Handling

**Finding:** GitHub PAT is stored as a Cloudflare Worker secret (environment variable).

- ✅ Never exposed to client-side code
- ✅ Never logged in plaintext
- ✅ Not stored in source code
- ❌ **Recommendation:** Add a startup validation that checks `GITHUB_TOKEN` is configured and responds with a clear 500 error if missing (→ already implemented in all 3 endpoints)

### ✅ PASS — Input Validation (Feedback Endpoint)

**Finding:** `POST /api/feedback` validates all required fields before processing.

- ✅ Type must be one of: `bug`, `feature`, `feedback`
- ✅ Title minimum 3 characters
- ✅ Description minimum 10 characters
- ✅ All required fields checked (`type`, `title`, `description`, `metadata`)
- ✅ Invalid JSON → 400
- ✅ Malformed/metadata-less payloads rejected before reaching GitHub API

### ✅ PASS — CORS Configuration

**Finding:** CORS is permissive (`origin: '*'`) for development.

- ✅ Explicit allow-list for methods: `GET`, `POST`, `OPTIONS`
- ✅ `X-API-Key` is included in `Access-Control-Allow-Headers`
- ⚠️ **Recommendation for production:** Restrict to specific origins

### ✅ PASS — Secret Management

**Finding:** No secrets in source code.

- API keys stored in Cloudflare KV (not in code)
- GitHub PAT stored as Worker secret (set via `wrangler secret put`)
- No hardcoded credentials in any source file
- `.env` files not committed (gitignored)
- Test files use mocks, not real secrets

### ✅ PASS — Error Handling (No Information Leakage)

**Finding:** Error responses do not leak sensitive information.

- Generic user-facing errors: "Failed to submit feedback. Please try again later."
- Technical details logged server-side only
- Stack traces not exposed in responses
- No internal paths, tokens, or config leaked

### ✅ PASS — Dependency Security

**Finding:** No new dependencies added.

- `hono` (already installed) — well-maintained, lightweight
- No `npm install` of new packages required
- Lockfile still valid (pnpm-lock.yaml)

## Threat Model

### Asset: GitHub PAT

| Vector | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Pat extraction from Worker | Low | Critical | Secret stored as Cloudflare env var, never logged, never exposed to clients |
| Compromised API key | Medium | Low | Rate limited (30 req/min), scoped to single repo, no GitHub token access |

### Asset: API Keys

| Vector | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Key extraction from client JS | High | Low | Rate limited, key only maps to repo config, no sensitive data accessible |
| Brute force key guessing | Low | Low | Rate limited per-key by DO, KV lookup is fast but DO enforces per-key window |

## Risk Summary

| Severity | Count | Details |
|----------|-------|---------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 1 | CORS `origin: '*'` for development (documented, acceptable for MVP) |
| Low | 0 | — |

## Required Actions

1. ✅ All required security controls are in place
2. ⏳ **Pre-production:** Restrict CORS origins to known application domains
3. ⏳ **Pre-production:** Create Cloudflare KV namespace (`API_KEYS`) and populate with real API keys
4. ⏳ **Pre-production:** Set `GITHUB_TOKEN` secret via `wrangler secret put`

## Final Recommendation

**PASS** ✅ — No security blockers. All findings are acceptable for MVP stage with documented pre-production requirements.