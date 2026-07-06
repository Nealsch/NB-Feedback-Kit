# S3-Compatible Storage: CORS Configuration Guide

This guide explains how to configure **CORS (Cross-Origin Resource Sharing)**
on your S3-compatible bucket so the NB Feedback Kit can upload screenshots
**directly from the browser**.

> **Who this is for:** Operators / developers deploying the S3 storage provider
> (AWS S3, Cloudflare R2, MinIO, or Backblaze B2). The Worker side is already
> configured — this guide covers the **bucket** side, which only you can set.

---

## Why CORS Configuration Is Required

The S3 provider uses a **two-step, browser-direct** upload flow:

1. The SDK calls the Worker's `POST /api/uploads/presign` endpoint
   (authenticated with `X-API-Key`). The Worker returns a short-lived
   **presigned PUT URL**. Cloud credentials never reach the browser.
2. The SDK then **PUTs the file bytes directly to your bucket** using that
   presigned URL — the Worker never sees the bytes.

```
Browser ──(1) POST /api/uploads/presign──▶ Worker  ──(signs SigV4)──▶
Browser ◀──(presigned PUT URL)──────────   Worker
Browser ──(2) PUT <bytes>────────────────▶ Your Bucket  ◀── THIS needs CORS
```

Because step 2 is a cross-origin request from your web app to the bucket,
**the bucket must publish CORS headers that allow it.** If you skip this,
uploads fail in the browser console with errors like:

```
Access to fetch at 'https://s3.us-east-1.amazonaws.com/...' from origin
'https://app.example.com' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## What the Bucket Must Allow

The SDK's `S3StorageProvider` issues a single `PUT` request with one
non-standard header (`Content-Type`). Because the SigV4 presigned URL only
signs the `host` header (see `packages/api/src/storage/sigv4.ts`), the browser
sends `Content-Type` as a regular header — which triggers a **CORS preflight**
(`OPTIONS`) request. Your bucket CORS policy must therefore permit:

| Element             | Required Value                                  | Why                                                       |
| ------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| **Allowed Methods** | `PUT`                                           | The actual upload request.                                |
| **Allowed Origins** | Your host app's origin(s), e.g. `https://app.example.com` | Where beta testers run the app. Never use `*` in production. |
| **Allowed Headers** | `Content-Type`                                  | Sent on every PUT (`s3.ts` line 56).                      |
| **Expose Headers**  | `ETag`, `Content-Length`                         | Useful for verifying upload integrity; optional.          |
| **Max Age Seconds** | `300`–`86400`                                   | Caches the preflight result; reduces OPTIONS traffic.     |

> **Important:** Only the origins of **host apps** that embed the SDK need to
> be allowlisted. The Worker's own origin is irrelevant to the bucket — the
> Worker does not upload bytes.

---

## Provider-Specific Configuration

Choose the section matching your bucket provider.

### 1. AWS S3

#### Option A — AWS Management Console

1. Open the **S3 console** → select your bucket.
2. Go to the **Permissions** tab.
3. Under **Cross-origin resource sharing (CORS)**, click **Edit**.
4. Paste the JSON below and **Save changes**.

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

> Replace `https://app.example.com` with your host app's origin. Add one entry
> per environment (e.g. staging + production).

#### Option B — AWS CLI

```bash
cat > cors.json <<'EOF'
[
  {
    "AllowedHeaders": ["Content-Type"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["https://app.example.com"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
EOF

aws s3api put-bucket-cors \
  --bucket my-feedback-bucket \
  --cors-configuration file://cors.json
```

> **Note:** AWS S3 now supports both the JSON format (shown above) and the
> legacy XML format. Prefer JSON.

---

### 2. Cloudflare R2

R2 uses the **S3-compatible API** with **path-style** addressing, so it reuses
the S3 CORS rule schema. CORS can be set via the dashboard or the S3 API.

#### Option A — Cloudflare Dashboard

1. Open the **Cloudflare Dashboard** → **R2 Object Storage**.
2. Click your bucket → **Settings** → **CORS Policy** → **Add CORS policy**.
3. Paste the JSON below and **Save**.

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

#### Option B — S3 API (`PutBucketCors`)

If you prefer IaC or scripting, R2's S3-compatible API accepts the standard
`PutBucketCors` call (AWS SDK or `aws s3api`). Target the R2 endpoint and use
the `CORSRules` wrapper:

```bash
aws s3api put-bucket-cors \
  --bucket my-feedback-bucket \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["https://app.example.com"],"AllowedMethods":["PUT"],"AllowedHeaders":["Content-Type"],"ExposeHeaders":["ETag","Content-Length"],"MaxAgeSeconds":3600}]}'
```

> **R2 region:** Use `auto` in the SDK's `S3Config.region`. The endpoint should
> be `https://<account-id>.r2.cloudflarestorage.com`.

---

### 3. MinIO

MinIO CORS is configured on the **MinIO Server** (not the client).

#### Option A — `minio` server environment variables

Add to your MinIO server's environment (e.g. `docker-compose.yml`):

```yaml
environment:
  MINIO_API_CORS_ALLOW_ORIGIN: "https://app.example.com"
```

#### Option B — `mc` client (config.json)

Edit `~/.mc/config.json` for your MinIO alias, or apply via the admin API:

```bash
mc admin config set myminio api cors_allow_origin="https://app.example.com"
mc admin service restart myminio
```

> **MinIO endpoint:** Set `S3Config.endpoint` to your MinIO host, e.g.
> `https://minio.example.com`. MinIO uses path-style addressing.

---

### 4. Backblaze B2 (S3-Compatible API)

> Use the **S3-Compatible API**, not the native B2 API — the SigV4 signer
> targets the S3 protocol.

1. Open the **Backblaze B2 dashboard** → **Buckets** → your bucket.
2. Under **Bucket Settings** → **CORS** (S3-compatible), click **Edit**.
3. Paste the JSON below and **Save**.

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

> **B2 endpoint:** `https://s3.<region>.backblazeb2.com` where `<region>` is
> e.g. `us-west-004`. Set this as `S3Config.endpoint`.

---

## Verification

After applying the CORS policy, verify the full upload path end-to-end:

1. **Provision Worker secrets** (one-time, see `CLOUDFLARE_SETUP.md`):
   ```bash
   wrangler secret put S3_ACCESS_KEY_ID
   wrangler secret put S3_SECRET_ACCESS_KEY
   wrangler secret put S3_ALLOWED_BUCKETS   # comma-separated, e.g. "my-feedback-bucket"
   ```
2. **Configure the SDK** with the S3 provider via `StorageConfigPanel` (or
   directly in `FeedbackProvider`'s `storage` config).
3. **Click "Test Connection"** in `StorageConfigPanel`. This calls the presign
   endpoint and confirms the Worker secrets + bucket allowlist are correct
   (it does **not** write any bytes to the bucket).
4. **Submit real feedback with a screenshot.** Open browser DevTools → **Network**.
   You should see:
   - `POST /api/uploads/presign` → `200` (returns a presigned URL).
   - `OPTIONS <bucket>` → `200` or `204` (CORS preflight).
   - `PUT <bucket>` → `200` (the actual upload).
   - `POST /api/feedback` → `201` (creates the GitHub issue).
5. **Confirm the screenshot renders** as a Markdown image in the created
   GitHub issue. If the image is broken, the bucket is not publicly readable
   (see **Public Read Access** below).

### Common Failure Modes

| Symptom                                                      | Likely Cause                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `CORS policy: No 'Access-Control-Allow-Origin' header`       | Bucket CORS policy missing or origin not allowlisted.                        |
| `CORS policy: Method PUT not allowed`                        | `AllowedMethods` omits `PUT`.                                                |
| `CORS policy: Request header field content-type not allowed` | `AllowedHeaders` omits `Content-Type`.                                       |
| `403 Forbidden` on the `PUT`                                 | Presigned URL expired (default 5 min), or clock skew between browser & S3.   |
| `PUT` succeeds but image broken in GitHub                    | Bucket is not publicly readable (see below).                                 |
| `POST /api/uploads/presign` → `403` "Bucket is not permitted"| Bucket not in the Worker's `S3_ALLOWED_BUCKETS` allowlist.                   |
| `POST /api/uploads/presign` → `500`                          | Worker secrets `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` not provisioned.  |

---

## Public Read Access (Required for Issue Rendering)

The presigned URL is only used **once** for the upload. The URL embedded in the
GitHub issue body is the **canonical, public object URL** returned by the Worker
(`publicUrl`). For the screenshot to render as a Markdown image in GitHub:

- **The bucket (or at least the key prefix) must be publicly readable.**

This is a deliberate design trade-off documented in **ADR-008** — signed GET
URLs are deferred as a future enhancement. Recommended practice:

- Use a **dedicated bucket** for feedback screenshots (never mix with private data).
- Apply a **bucket policy** granting `s3:GetObject` to `*` on the configured
  `keyPrefix` only (e.g. `feedback/*`), keeping the rest of the bucket private.

**Example AWS S3 bucket policy (public read on a prefix):**

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

---

## Security Checklist

- [ ] CORS **AllowedOrigins** lists only your host app origins (no `*`).
- [ ] CORS **AllowedMethods** is limited to `PUT` (no `DELETE`, `GET` is not
      required because public read is handled by a bucket policy, not CORS).
- [ ] CORS **AllowedHeaders** is limited to `Content-Type`.
- [ ] Bucket is dedicated to feedback screenshots (no co-mingled private data).
- [ ] Public read is scoped to the feedback `keyPrefix` only.
- [ ] Worker secrets `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and
      `S3_ALLOWED_BUCKETS` are provisioned.
- [ ] The `S3_ALLOWED_BUCKETS` allowlist on the Worker contains only this bucket.

---

## References

- **Architecture decision:** ADR-008 in `memory/project-decisions.md`.
- **API reference:** `POST /api/uploads/presign` in `resources/api-reference.md`.
- **Worker setup:** `packages/api/CLOUDFLARE_SETUP.md`.
- **SigV4 signer source:** `packages/api/src/storage/sigv4.ts`.
- **SDK provider source:** `packages/react-sdk/src/storage/providers/s3.ts`.