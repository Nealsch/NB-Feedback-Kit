<div align="center">

# Storage Providers

**Configure screenshot storage — R2 native, S3-compatible, or custom endpoint.**

</div>

---

## Overview

NB Feedback Kit is **storage-provider agnostic**. Screenshots attached to feedback can be routed to any of three provider types, all behind a single `StorageProvider` interface.

```
Feedback modal
    ↓ user selects screenshot
StorageProvider.upload()
    ↓
    ├─ R2 native    → POST /api/uploads      → Worker → R2_BUCKET binding
    ├─ S3 presign   → POST /api/uploads/presign → Worker signs SigV4 URL
    │                                       → Browser PUTs bytes directly to bucket
    └─ Custom       → POST/PUT to your endpoint → returns a URL
    ↓
UploadedFile { url, filename, contentType, size }
    ↓ attached to FeedbackPayload
POST /api/feedback → GitHub Issue (image embedded as Markdown)
```

The issue provider (GitHub) only ever receives `UploadedFile` URLs — never raw image bytes. This keeps storage providers independent of issue providers and lets you switch storage without touching the feedback flow.

---

## Provider Comparison

| | <img src="../assets/icons/database.svg" width="16" /> &nbsp;R2 Native | <img src="../assets/icons/cloud.svg" width="16" /> &nbsp;S3 Presign | <img src="../assets/icons/server.svg" width="16" /> &nbsp;Custom Endpoint | <img src="../assets/icons/x.svg" width="16" /> &nbsp;None |
|---|:--:|:--:|:--:|:--:|
| **Bytes through Worker?** | <img src="../assets/icons/check.svg" width="14" /> Yes | No | No | — |
| **Client-visible cloud config?** | No | No (only bucket + region) | No (only endpoint URL) | — |
| **CORS setup needed?** | No | <img src="../assets/icons/check.svg" width="14" /> Yes | Depends on endpoint | — |
| **Worker secrets needed?** | `R2_PUBLIC_BASE_URL` | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ALLOWED_BUCKETS` | None | None |
| **Best for** | Cloudflare-native stacks | AWS S3, R2 (S3 API), MinIO, B2 | Your own upload service | Disabling screenshots |

---

## Choosing a Provider

### When to use R2 Native

- Your backend is already on Cloudflare Workers.
- You want zero CORS configuration.
- You want server-side validation (size, type, magic bytes) before bytes reach storage.
- You're building for mobile clients where CORS is fragile.

### When to use S3 Presign

- You use AWS S3, MinIO, Backblaze B2, or R2 via its S3 API.
- You don't want bytes flowing through the Worker (lower Worker CPU, no upload-size limit).
- You're comfortable configuring CORS on the bucket.

### When to use Custom Endpoint

- You already have an upload endpoint (e.g. your own API, a Supabase Storage function, a Vercel blob handler).
- You want full control over auth, transformation, and storage destination.

### When to use None

- You don't want screenshot collection (text-only feedback).
- You're running in a restricted environment where uploads aren't possible.

---

## Provider Configuration

All providers are configured in the `FeedbackProvider`'s `storage` field, using a discriminated union on the `type` property.

### R2 Native

```tsx
<FeedbackProvider
  config={{
    // ...apiEndpoint, apiKey, etc.
    storage: {
      type: 'r2',  // server-mediated via Worker's R2_BUCKET binding
    },
  }}
>
```

**Worker requirements:**
- `R2_BUCKET` binding in `wrangler.toml`.
- `R2_PUBLIC_BASE_URL` secret (public URL prefix for objects).

See the [Backend guide](backend.md#3-r2-bucket-optional--server-mediated-uploads) for binding setup.

### S3 Presign

```tsx
<FeedbackProvider
  config={{
    // ...apiEndpoint, apiKey, etc.
    storage: {
      type: 's3',
      s3: {
        bucket: 'my-feedback-bucket',
        region: 'us-east-1',
        endpoint: 'https://s3.us-east-1.amazonaws.com',  // omit for AWS S3 standard
        keyPrefix: 'feedback/',                          // optional folder prefix
      },
    },
  }}
>
```

The `S3Config` holds **only non-secret targeting information** — bucket, region, endpoint, and key prefix. The actual cloud credentials live as Worker secrets and are used to sign short-lived presigned URLs. Nothing in the client config is secret.

**Worker requirements:**
- `S3_ACCESS_KEY_ID` secret.
- `S3_SECRET_ACCESS_KEY` secret.
- `S3_ALLOWED_BUCKETS` secret (comma-separated bucket allowlist — fail-closed if unset).
- Optional: `S3_SESSION_TOKEN` for STS temporary credentials.

**Provider endpoints:**

| Provider | `region` | `endpoint` |
|---|---|---|
| AWS S3 | `us-east-1` (etc.) | Omit (uses AWS default) |
| Cloudflare R2 | `auto` | `https://<account-id>.r2.cloudflarestorage.com` |
| MinIO | Your region | `https://minio.example.com` |
| Backblaze B2 | Your region | `https://s3.<region>.backblazeb2.com` |

### Custom Endpoint

```tsx
<FeedbackProvider
  config={{
    // ...apiEndpoint, apiKey, etc.
    storage: {
      type: 'custom',
      endpoint: {
        url: 'https://uploads.example.com/api/screenshot',
        method: 'POST',                      // default: POST
        fieldName: 'file',                   // default: file
        headers: {
          Authorization: 'Bearer your-upload-token',
        },
        responseUrlPath: 'data.url',         // default: url
      },
    },
  }}
>
```

The SDK POSTs a `multipart/form-data` request containing the file under `fieldName` plus any `headers`, and expects a JSON response whose property at `responseUrlPath` holds the uploaded file URL.

**Example response** for `responseUrlPath: 'data.url'`:

```json
{
  "data": {
    "url": "https://cdn.example.com/screenshots/abc123.png"
  }
}
```

### None

```tsx
<FeedbackProvider
  config={{
    // ...apiEndpoint, apiKey, etc.
    storage: {
      type: 'none',  // hides the screenshot picker entirely
    },
  }}
>
```

The `none` provider sets `enabled: false`, which hides the file picker from the feedback modal. Feedback is text-only.

---

## CORS Configuration (S3 Presign)

The S3 presign provider uploads **directly from the browser to your bucket** — a cross-origin request. Your bucket must publish CORS headers that allow it.

### The upload flow

```
Browser ──(1) POST /api/uploads/presign──▶ Worker  ──(signs SigV4)──▶
Browser ◀──(presigned PUT URL)──────────   Worker
Browser ──(2) PUT <bytes>────────────────▶ Your Bucket  ◀── needs CORS
```

Because step 2 is a cross-origin `PUT` with a `Content-Type` header, the browser sends a **CORS preflight** (`OPTIONS`) request. Your bucket must respond with permissive headers.

### Required CORS policy

| Element | Required Value | Why |
|---|---|---|
| **Allowed Methods** | `PUT` | The actual upload request. |
| **Allowed Origins** | `https://app.example.com` | Your host app's origin(s). Never `*` in production. |
| **Allowed Headers** | `Content-Type` | Sent on every PUT. |
| **Expose Headers** | `ETag`, `Content-Length` | Upload integrity (optional). |
| **Max Age Seconds** | `3600` | Caches preflight; reduces OPTIONS traffic. |

### AWS S3

**Console:** S3 → bucket → Permissions → Cross-origin resource sharing → Edit.

```json
[
  {
    "AllowedHeaders": ["Content-Type"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["https://app.example.com"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

**CLI:**

```bash
aws s3api put-bucket-cors \
  --bucket my-feedback-bucket \
  --cors-configuration file://cors.json
```

### Cloudflare R2

R2 uses the S3-compatible API with path-style addressing, so it reuses the S3 CORS schema.

**Dashboard:** R2 Object Storage → bucket → Settings → CORS Policy → Add.

```json
[
  {
    "AllowedOrigins": ["https://app.example.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

### MinIO

Configure on the MinIO server, not the client:

```bash
mc admin config set myminio api cors_allow_origin="https://app.example.com"
mc admin service restart myminio
```

### Backblaze B2

Use the **S3-Compatible API** (not native B2). Dashboard → Buckets → bucket → CORS (S3-compatible) → Edit:

```json
[
  {
    "allowedHeaders": ["Content-Type"],
    "allowedMethods": ["PUT"],
    "allowedOrigins": ["https://app.example.com"],
    "exposeHeader": ["ETag", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
```

> **Endpoint:** `https://s3.<region>.backblazeb2.com` (e.g. `us-west-004`).

---

## Public Read Access (Required)

The presigned PUT URL is used **once** for the upload. The URL embedded in the GitHub issue body is the **canonical, public object URL** (`publicUrl`). For screenshots to render as Markdown images in GitHub Issues:

**The bucket — or at least the key prefix — must be publicly readable.**

### Recommended setup

Use a **dedicated bucket** for feedback screenshots (never co-mingle with private data), and scope public read to the `keyPrefix` only.

**AWS S3 bucket policy (public read on a prefix):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadFeedbackScreenshots",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-feedback-bucket/feedback/*"
    }
  ]
}
```

**Cloudflare R2:** Enable public access on the bucket, either via the R2.dev subdomain or a custom domain. Set `R2_PUBLIC_BASE_URL` to match.

---

## Validation & Limits

### Server-side validation (R2 native)

When using the R2 native binding, the Worker validates before writing:

| Check | Limit |
|---|---|
| Max file size | 10 MiB |
| Allowed MIME types | `image/png`, `image/jpeg`, `image/webp`, `image/gif` |
| Magic bytes | Verified against declared MIME type |

### Presigned URL lifetime (S3)

Presigned PUT URLs expire after **5 minutes**. If the user's connection is slow or paused, the upload may fail with `403 Forbidden`. The SDK surfaces this as a user-facing error.

---

## Testing Your Configuration

### 1. Test Connection probe

The `StorageConfigPanel` includes a **"Test Connection"** button. It sends a lightweight probe to verify:
- The Worker can reach the bucket.
- CORS is configured correctly.
- Auth credentials are valid.
- The response shape matches `responseUrlPath`.

It does **not** write any bytes to the bucket.

### 2. End-to-end verification

Submit real feedback with a screenshot and watch the Network tab:

| Request | Expected status | What it confirms |
|---|---|---|
| `POST /api/uploads/presign` | `200` | Worker secrets + bucket allowlist correct |
| `OPTIONS <bucket>` | `200` / `204` | CORS preflight succeeded |
| `PUT <bucket>` | `200` | Actual upload succeeded |
| `POST /api/feedback` | `201` | GitHub Issue created |

Then confirm the screenshot renders as a Markdown image in the created GitHub Issue. If the image is broken, the bucket is not publicly readable.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `CORS policy: No 'Access-Control-Allow-Origin' header` | Bucket CORS policy missing or origin not allowlisted | Add your app origin to CORS AllowedOrigins. |
| `CORS policy: Method PUT not allowed` | CORS AllowedMethods omits `PUT` | Add `PUT` to AllowedMethods. |
| `CORS policy: Request header field content-type not allowed` | CORS AllowedHeaders omits `Content-Type` | Add `Content-Type` to AllowedHeaders. |
| `403 Forbidden` on the `PUT` | Presigned URL expired (>5 min) or clock skew | Re-initiate the upload. Check browser clock. |
| `PUT` succeeds but image broken in GitHub | Bucket not publicly readable | Apply a public-read bucket policy on the `keyPrefix`. |
| `POST /api/uploads/presign` → `403` "Bucket is not permitted" | Bucket not in `S3_ALLOWED_BUCKETS` | Add bucket to the Worker's allowlist secret. |
| `POST /api/uploads/presign` → `500` | `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` missing | Set both secrets via `wrangler secret put`. |

---

## Security Checklist

- [ ] CORS **AllowedOrigins** lists only your host app origins (no `*`).
- [ ] CORS **AllowedMethods** is limited to `PUT`.
- [ ] CORS **AllowedHeaders** is limited to `Content-Type`.
- [ ] Bucket is dedicated to feedback screenshots (no co-mingled private data).
- [ ] Public read is scoped to the feedback `keyPrefix` only.
- [ ] Worker secrets `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_ALLOWED_BUCKETS` are provisioned.
- [ ] `S3_ALLOWED_BUCKETS` contains only this bucket.

---

## Next Steps

- <img src="../assets/icons/server.svg" width="16" /> &nbsp;**[Backend guide](backend.md)** — Worker secrets and R2 binding setup.
- <img src="../assets/icons/shield-check.svg" width="16" /> &nbsp;**[Authentication](authentication.md)** — Device auth and JWT sessions.
- <img src="../assets/icons/lock.svg" width="16" /> &nbsp;**[Security](security.md)** — Threat model and hardening guide.

---

<p align="center">
  <sub>Storage question? <a href="https://github.com/Nealsch/NB-Feedback-Kit/issues">Open an issue</a> with your provider and bucket setup.</sub>
</p>