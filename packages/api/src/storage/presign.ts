/**
 * `POST /api/uploads/presign` — issue a short-lived S3-compatible upload URL.
 *
 * Security model:
 *   - Authenticated via the existing `/api/*` middleware (X-API-Key + rate
 *     limit), so only authorised beta builds can request a presigned URL.
 *   - Cloud credentials (AWS access key + secret) live only as Worker secrets
 *     and never reach the client.
 *   - Bucket names are validated against an allowlist (`S3_ALLOWED_BUCKETS`)
 *     — fail-closed. Prevents a compromised key from signing uploads to
 *     arbitrary buckets.
 *   - Object keys are server-generated (random UUID + sanitised extension)
 *     so a client cannot overwrite arbitrary objects or traverse the key
 *     space. A client-supplied prefix is allowed but path-sanitised.
 *   - Presigned URLs are short-lived (default 5 minutes, capped at 15).
 */

import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { PresignRequest, PresignResponse } from '@nb-feedback-kit/shared-types';
import type { ApiEnv } from '../env';
import { createS3PresignedUrl } from './sigv4';

/** Default presigned URL lifetime (seconds). */
const DEFAULT_EXPIRES_IN = 300; // 5 minutes

/** Maximum presigned URL lifetime (seconds). */
const MAX_EXPIRES_IN = 900; // 15 minutes — well under S3's 7-day cap.

/** Maximum object-key prefix length (after sanitisation). */
const MAX_PREFIX_LENGTH = 128;

/**
 * Hono handler for `POST /api/uploads/presign`.
 *
 * Reads the {@link PresignRequest} body, validates it against Worker secrets
 * and the bucket allowlist, signs a presigned PUT URL, and returns it.
 *
 * Errors are returned as 4xx/5xx JSON with `success: false`. The handler
 * never echoes secret material.
 */
export async function handlePresign(c: Context): Promise<Response> {
  const env = c.env as unknown as ApiEnv;

  // ---- Parse + validate body ------------------------------------------------
  let body: PresignRequest;
  try {
    body = await c.req.json<PresignRequest>();
  } catch {
    return presignError(c, 400, 'Invalid JSON body.');
  }

  const validation = validatePresignRequest(body);
  if (validation) {
    return presignError(c, 400, validation);
  }

  // ---- Resolve Worker-held credentials + allowlist --------------------------
  const accessKeyId = env.S3_ACCESS_KEY_ID;
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    console.error('S3 credentials not configured on the Worker.');
    return presignError(
      c,
      500,
      'Screenshot uploads are not configured on the server.'
    );
  }

  const allowedBuckets = parseAllowedBuckets(env.S3_ALLOWED_BUCKETS);
  if (allowedBuckets.size === 0) {
    console.error('S3_ALLOWED_BUCKETS not configured on the Worker.');
    return presignError(
      c,
      500,
      'Screenshot uploads are not configured on the server.'
    );
  }
  if (!allowedBuckets.has(body.bucket)) {
    // Fail-closed: never reveal the allowlist contents.
    return presignError(c, 403, 'Bucket is not permitted for uploads.');
  }

  // ---- Build a server-controlled object key ---------------------------------
  const objectKey = buildObjectKey(body);

  // ---- Sign -----------------------------------------------------------------
  let presigned;
  try {
    presigned = await createS3PresignedUrl({
      accessKeyId,
      secretAccessKey,
      bucket: body.bucket,
      objectKey,
      region: body.region,
      endpoint: body.endpoint,
      expiresIn: DEFAULT_EXPIRES_IN,
      sessionToken: env.S3_SESSION_TOKEN,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signing failed.';
    console.error('Presign failure:', message);
    return presignError(c, 500, 'Failed to issue upload URL.');
  }

  const response: PresignResponse = {
    uploadUrl: presigned.url,
    publicUrl: presigned.publicUrl,
    method: 'PUT',
    expiresIn: DEFAULT_EXPIRES_IN,
  };

  return c.json({ success: true, ...response }, 200);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate the non-secret parts of a {@link PresignRequest}.
 * @returns An error message string, or `null` if valid.
 */
function validatePresignRequest(body: PresignRequest): string | null {
  if (!body || typeof body !== 'object') {
    return 'Request body is required.';
  }
  if (body.provider !== 's3') {
    return `Unsupported provider "${body.provider}". Only "s3" is supported.`;
  }
  if (!body.filename || typeof body.filename !== 'string') {
    return 'filename is required.';
  }
  if (!body.contentType || typeof body.contentType !== 'string') {
    return 'contentType is required.';
  }
  if (!/^[a-zA-Z0-9.][a-zA-Z0-9._-]{0,255}$/.test(body.bucket)) {
    return 'Invalid bucket name.';
  }
  if (!body.region || typeof body.region !== 'string') {
    return 'region is required.';
  }
  if (body.endpoint !== undefined) {
    try {
      const u = new URL(body.endpoint);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        return 'endpoint must use http or https.';
      }
    } catch {
      return 'endpoint is not a valid URL.';
    }
  }
  if (
    body.keyPrefix !== undefined &&
    (typeof body.keyPrefix !== 'string' || body.keyPrefix.length > MAX_PREFIX_LENGTH)
  ) {
    return 'keyPrefix must be a string of at most 128 characters.';
  }
  return null;
}

/**
 * Build a server-controlled object key. The client chooses only the prefix
 * (sanitised) and the extension (derived from the filename); everything else
 * is generated by the Worker to prevent overwrites and key traversal.
 *
 * Output shape: `<prefix?><ulid-like-timestamp>-<random>.<ext>`
 */
function buildObjectKey(body: PresignRequest): string {
  const prefix = sanitisePrefix(body.keyPrefix);
  const ext = safeExtension(body.filename) || guessExtFromContentType(body.contentType);
  const id = `${timeSortableId()}-${randomId(10)}`;
  const suffix = ext ? `${id}.${ext}` : id;
  return prefix ? `${prefix}${suffix}` : suffix;
}

/**
 * Sanitise a user-supplied key prefix. Strips leading/trailing slashes,
 * collapses repeats, rejects `..`, and allows only a conservative charset.
 */
function sanitisePrefix(prefix?: string): string {
  if (!prefix) return '';
  const trimmed = prefix.replace(/^\/+|\/+$/g, '').trim();
  if (!trimmed) return '';
  // Conservative allowlist: alphanumerics, dash, underscore, dot, slash.
  const safe = trimmed
    .split('/')
    .map((seg) => seg.replace(/[^a-zA-Z0-9._-]/g, ''))
    .filter(Boolean)
    .join('/');
  if (!safe) return '';
  // Reject any ".." segment outright (defence-in-depth even after the strip).
  if (safe.split('/').includes('..')) return '';
  return safe.endsWith('/') ? safe.slice(0, MAX_PREFIX_LENGTH) : `${safe.slice(0, MAX_PREFIX_LENGTH)}/`;
}

/** Extract a lowercased extension from a filename, with a charset guard. */
function safeExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return '';
  const ext = filename.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,10}$/.test(ext) ? ext : '';
}

/** Map common content types to extensions when the filename has none. */
function guessExtFromContentType(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return '';
  }
}

/**
 * Millisecond-precision, lexicographically-sortable id (14 digits),
 * so uploaded objects are naturally ordered by upload time.
 */
function timeSortableId(): string {
  const ms = Date.now();
  return ms.toString().padStart(14, '0');
}

/** Cryptographically-random hex id of the given byte length. */
function randomId(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse the `S3_ALLOWED_BUCKETS` secret. Accepts comma- or whitespace-
 * separated bucket names. Returns an empty set if unset or empty.
 */
function parseAllowedBuckets(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/** Render a uniform presign error response. */
function presignError(
  c: Context,
  status: ContentfulStatusCode,
  message: string
): Response {
  return c.json(
    { success: false, error: message, timestamp: new Date().toISOString() },
    status
  );
}

// Expose constants for tests / documentation.
export { DEFAULT_EXPIRES_IN, MAX_EXPIRES_IN };