# Active Task

## Current
**Session In Progress** — 2026-07-07, 08:34 PM

Resolved the GitHub App PEM key issue that was causing the dev Worker
(`nb-feedback-api-dev`) to return HTTP 500 on all GitHub-authenticated
endpoints (`/api/feedback`, `/api/releases`, `/api/roadmap`). Two root
causes found and fixed: (1) a truncated `GITHUB_APP_PRIVATE_KEY` secret,
and (2) a PKCS#1/PKCS#8 format mismatch in `importPrivateKey()`. Deployed
the fix and verified end-to-end with a live `GET /api/releases` request
returning HTTP 200.

---

## Session Summary — 2026-07-07

### Objective
Resolve the GitHub App authentication failure on the deployed dev Worker
that caused HTTP 500 "Server configuration error: GitHub authentication not
configured" on every endpoint calling `resolveGitHubToken()`.

### Completed Today

**GitHub App PEM key fix** ✅
- **Root Cause #1 — Truncated secret:** Re-set `GITHUB_APP_PRIVATE_KEY` from
  the complete `.pem` file (1675 bytes, full `BEGIN/END RSA PRIVATE KEY`).
- **Root Cause #2 — PKCS#1/PKCS#8 mismatch:** Fixed
  `importPrivateKey()` in `packages/api/src/github/app-auth.ts` to detect
  PKCS#1 keys (`BEGIN RSA PRIVATE KEY`) and wrap them into the PKCS#8
  `SEQUENCE { algorithm, key }` ASN.1 structure before calling
  `crypto.subtle.importKey(..., 'pkcs8', ...)`.
- **Deployed:** `pnpm exec wrangler deploy --env development` —
  `nb-feedback-api-dev`, Version `bf0b16fb-6fa6-4c59-b3fd-4d6aab27ad1b`.
- **Verified:** `GET /api/releases` (with a throwaway API key in remote KV)
  returned `{"success":true,"releases":[]}` with HTTP 200. Previously this
  path returned 500. Throwaway key deleted after verification.

### Files Modified Today
```
packages/api/src/github/app-auth.ts   (PKCS#1 → PKCS#8 wrapping in importPrivateKey; exported for testability)
packages/api/src/github/app-auth.test.ts (NEW — 15 unit tests for importPrivateKey + wrapPkcs1ToPkcs8)
memory/lessons-learned.md            (2026-07-07 lesson entry)
memory/tasks/active-task.md          (this file)
```

### Verification
- Local Node repro confirmed the `DataError` before the fix.
- Live Worker endpoint returned HTTP 200 after the fix.
- No OKF impact (no API contract, docs, pricing, or auth-workflow change —
  internal crypto normalization only).

### Next Steps
1. Provision production secrets (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`)
   before the first production deploy.
2. Continue with the next task on the project board.

---

## Session Summary — 2026-07-06

### Objective
Resolve open item #4 from the 2026-07-05 handoff: "Operators using the S3
provider must configure CORS on their bucket to allow PUT from the app's
origin. Document this in a setup guide."

### Completed Today

**S3 CORS configuration guide** ✅
- **Created:** `packages/api/S3_CORS_CONFIGURATION.md` — comprehensive operator guide covering:
  - Why CORS is required (two-step browser-direct upload flow diagram).
  - What the bucket must allow (`PUT`, `Content-Type`, app origins, expose `ETag`).
  - Provider-specific setup: AWS S3 (Console + CLI), Cloudflare R2 (Dashboard + S3 API), MinIO (env vars + `mc`), Backblaze B2.
  - Verification checklist (secrets, test connection, DevTools network trace).
  - Common failure modes table (CORS errors, 403 forbidden, broken images).
  - Public read access policy (required for issue rendering — ADR-008 trade-off).
  - Security checklist (dedicated bucket, scoped public read, minimal methods/headers).
- **Verified:** R2 CORS schema against Cloudflare skill reference (S3-compatible `CORSRules` format, not custom `Allowed` wrapper).
- **Test results:** 46/46 tests pass, 4/4 typechecks pass — no regressions (documentation-only change).

### Files Created Today
```
packages/api/S3_CORS_CONFIGURATION.md
```

### Files Modified Today
```
memory/tasks/active-task.md
memory/tasks/project-board.md
```

---

## Session Summary — 2026-07-05

### Objective
Make the feedback kit storage-provider agnostic so the app developer (client)
can configure their preferred storage provider (e.g. AWS S3) when releasing to
beta testers. The configuration must be captured by the kit at build time and
must be secure — cloud credentials must never ship in the client bundle.

### Decision
**ADR-008: Storage-Provider Agnosticism via Worker-Issued Presigned URLs.**
Added a third provider branch (`s3`) to the storage-provider discriminated
union. The SDK holds only non-secret targeting info (bucket, region, optional
endpoint, optional key prefix). The Worker signs short-lived SigV4 presigned
PUT URLs server-side; the SDK uploads bytes directly to the bucket. Zero new
npm dependencies (SigV4 implemented with the Web Crypto API).

### Completed Today

**Storage-provider agnosticism (S3-compatible)** ✅
- **API (Worker):**
  - `packages/api/src/storage/sigv4.ts` — Zero-dep SigV4 presigned-URL signer (Web Crypto API only).
  - `packages/api/src/storage/presign.ts` — `POST /api/uploads/presign` route handler (under `/api/*` auth + rate limiting). Enforces bucket allowlist (`S3_ALLOWED_BUCKETS`), length-caps inputs, server-generates object key.
  - `packages/api/src/storage/sigv4.test.ts` — 16 new tests (URL structure, determinism, signature sensitivity, URI encoding, input validation).
  - `packages/api/src/env.d.ts` — Added `S3_*` env bindings.
  - `packages/api/src/index.ts` — Mounted presign route under the authenticated `/api` Hono app.
- **SDK:**
  - `packages/react-sdk/src/storage/providers/s3.ts` — `S3StorageProvider` (calls Worker presign → PUT to bucket → returns `UploadedFile`).
  - `packages/react-sdk/src/storage/types.ts` — Added `S3Config`; extended `StorageProviderConfig` union.
  - `packages/react-sdk/src/storage/index.ts` — Added `s3` branch to `createStorageProvider` + exported `StorageHostContext`.
  - `packages/react-sdk/src/storage/test-connection.ts` — Added S3 probe (calls presign, no bytes written).
  - `packages/react-sdk/src/components/StorageConfigPanel.tsx` — Added S3 config form (bucket, region, endpoint, key prefix) with security guidance.
  - `packages/react-sdk/src/index.ts` — Exported `S3StorageProvider`, `S3Config`, `createStorageProvider`, `StorageHostContext`.
- **Shared types:** `PresignRequest` / `PresignResponse` contracts added to `packages/shared-types/src/index.ts`.
- **Documentation:**
  - `memory/project-decisions.md` — Added ADR-008 (context, alternatives, consequences, security review).
  - `resources/api-reference.md` — Documented `POST /api/uploads/presign`.

### Files Created Today
```
packages/api/src/storage/sigv4.ts
packages/api/src/storage/sigv4.test.ts
packages/api/src/storage/presign.ts
packages/react-sdk/src/storage/providers/s3.ts
```

### Files Modified Today
```
packages/shared-types/src/index.ts
packages/api/src/env.d.ts
packages/api/src/index.ts
packages/react-sdk/src/storage/types.ts
packages/react-sdk/src/storage/index.ts
packages/react-sdk/src/storage/test-connection.ts
packages/react-sdk/src/components/StorageConfigPanel.tsx
packages/react-sdk/src/index.ts
memory/project-decisions.md
resources/api-reference.md
```

### Test Results
- **Typecheck:** 4/4 packages pass (shared-types, api, react-sdk, demo-app).
- **Tests:** 46/46 pass (30 existing + 16 new SigV4 tests). No regressions.
- **New runtime dependencies:** None.

### Dependency Changes
None. Zero new packages added or updated. SigV4 signing uses the Web Crypto
API only.

## Hand-Off Notes

### Security Posture
- Cloud credentials (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) live only as
  Worker secrets. Never serialized into responses. Never shipped in the SDK
  bundle.
- Presign route inherits `/api/*` middleware (`X-API-Key` + KV lookup) and the
  `RateLimiter` Durable Object — no parallel auth system.
- Bucket allowlist (`S3_ALLOWED_BUCKETS`) defends against forged SDK config
  targeting a different bucket.
- Returned URLs pass through the existing `sanitizeAttachments` `http`/`https`
  scheme check before GitHub issue-body interpolation (unchanged).

### Known Limitations
- Bucket must be **publicly readable** for the returned `publicUrl` to render
  as a Markdown image in the GitHub issue. Documented in ADR-008. Signed GET
  URLs deferred as a future enhancement.
- SigV4 signing logic maintained in-repo. Mitigated by the dedicated test
  suite (`packages/api/src/storage/sigv4.test.ts`).
- Operators must provision the new `S3_*` Worker secrets before this provider
  works in a deployed environment.

### Open Items / Next Steps
1. **Demo app showcase** — `apps/demo-app` does not yet demonstrate the S3
   provider. Add a toggle in the demo to switch between `none` / `custom` /
   `s3` so the full flow is manually testable.
2. **Integration test for presign route** — The SigV4 signer is unit-tested,
   but the `POST /api/uploads/presign` route handler itself (auth, allowlist,
   400/403/500 paths) has no dedicated integration test yet.
3. **SDK provider test** — `S3StorageProvider` has no unit test (fetch mock).
4. ✅ **CORS configuration** — Resolved 2026-07-06. See
   `packages/api/S3_CORS_CONFIGURATION.md`.
5. **wrangler.toml** — Confirm whether the new `S3_*` secrets need to be
   declared in `wrangler.toml` for local dev (they are read via `env`).

## Last Updated
2026-07-06, 09:50 AM
