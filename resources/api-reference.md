# API Reference — NB Feedback Kit

## Overview

REST API served by a Cloudflare Worker (Hono). The Worker proxies feedback
submissions to GitHub Issues and exposes release-notes + roadmap read
endpoints. As of ADR-008, it also issues short-lived S3-compatible presigned
PUT URLs so the SDK can upload screenshots directly to the developer's cloud
bucket without exposing cloud credentials to beta testers.

Base URL: the deployed Worker URL (e.g. `https://feedback.example.com`).

---

## Endpoints

### Public (no auth)

| Endpoint | Method | Parameters | Returns | Description |
|----------|--------|------------|---------|-------------|
| `/health` | GET | — | `{ status, service, version, timestamp }` | Liveness probe. |
| `/` | GET | — | API metadata + endpoint list | API info. |

### Authenticated (`X-API-Key` required, rate-limited)

All `/api/*` routes pass through `createAuthMiddleware` (KV key lookup) and
the `RateLimiter` Durable Object. Clients must send `X-API-Key: <key>`.

| Endpoint | Method | Parameters | Returns | Description |
|----------|--------|------------|---------|-------------|
| `/api/feedback` | POST | `FeedbackPayload` body | `{ success, issueUrl, issueNumber, timestamp }` (201) | Creates a GitHub Issue. |
| `/api/releases` | GET | — | `{ success, releases: ReleaseNote[], timestamp }` | Fetches GitHub Releases. |
| `/api/roadmap` | GET | — | `{ success, roadmap: RoadmapItem[], timestamp }` | Fetches label-based roadmap items. |
| `/api/uploads/presign` | POST | `PresignRequest` body | `PresignResponse` (200) | Issues a short-lived S3-compatible presigned PUT URL (ADR-008). |

### `POST /api/uploads/presign` — detail

**Purpose:** Lets the SDK upload screenshots to the developer's S3-compatible
bucket (AWS S3, Cloudflare R2, MinIO, B2) without cloud credentials ever
reaching the browser. The Worker signs the URL server-side using SigV4
(Web Crypto API, zero npm deps); the SDK PUTs bytes directly to the bucket.

**Request body — `PresignRequest`:**

```json
{
  "provider": "s3",
  "filename": "screenshot.png",
  "contentType": "image/png",
  "bucket": "my-feedback-bucket",
  "region": "us-east-1",
  "endpoint": "https://abc123.r2.cloudflarestorage.com",
  "keyPrefix": "feedback/"
}
```

- `provider` — currently only `"s3"`.
- `filename` — original filename (used to build the object key; length-capped).
- `contentType` — MIME type (length-capped).
- `bucket` — **must** be in the Worker's `S3_ALLOWED_BUCKETS` allowlist.
- `region` — e.g. `us-east-1`; use `auto` for Cloudflare R2.
- `endpoint` — optional S3-compatible base URL. Omit for AWS S3 standard.
- `keyPrefix` — optional folder prefix.

**Response body — `PresignResponse`:**

```json
{
  "uploadUrl": "https://s3.us-east-1.amazonaws.com/my-feedback-bucket/feedback/...?X-Amz-Signature=...",
  "publicUrl": "https://s3.us-east-1.amazonaws.com/my-feedback-bucket/feedback/...",
  "method": "PUT",
  "expiresIn": 300
}
```

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Missing/invalid fields (filename, contentType, bucket). |
| 401 | Missing/invalid `X-API-Key` (from auth middleware). |
| 403 | Bucket not in `S3_ALLOWED_BUCKETS` allowlist. |
| 500 | Worker secrets (`S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`) not configured. |
| 429 | Rate limit exceeded (from `RateLimiter` DO). |

**Required Worker secrets:** `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`S3_ALLOWED_BUCKETS` (comma-separated).

---

## Authentication

`X-API-Key` header. The key is looked up in Cloudflare KV and maps to the
target GitHub repository + per-key rate limit. See ADR-004.

---

## Error Responses

All errors return a structured JSON body:

```json
{
  "success": false,
  "error": "Human-readable message",
  "details": "Optional implementation detail",
  "timestamp": "2026-07-05T12:00:00.000Z"
}
```

| Code | Meaning |
|------|---------|
| 400 | Validation error (missing/invalid fields). |
| 401 | Missing/invalid API key. |
| 403 | Forbidden (e.g. bucket not allowlisted). |
| 404 | Endpoint not found. |
| 429 | Rate limit exceeded. |
| 500 | Server configuration error. |
| 502 | Upstream (GitHub) failure. |

---

## Versioning

The API is versioned via the `version` field in `/health` and `/` responses.
There is currently no URL prefix versioning; backward-compatible additions
(releases, roadmap, presign) are added under `/api/*` without a breaking
change. A future `/v2/*` prefix will be introduced if a breaking change is
required.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-07-05 | Added `POST /api/uploads/presign` (ADR-008 — S3-compatible storage provider). | Cline |