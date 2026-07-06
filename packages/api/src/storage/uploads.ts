/**
 * `POST /api/uploads` — server-mediated screenshot upload via native R2 binding.
 *
 * Security model (mobile-first):
 *   - Authenticated via the existing `/api/*` middleware (X-API-Key + rate
 *     limit), so only authorised beta builds can upload.
 *   - Bytes flow **through the Worker** to the R2 bucket via its native
 *     binding — never via presigned URLs. Cloud credentials never leave the
 *     Worker, and the bucket is not directly addressable from clients.
 *   - No CORS is required: the request is same-origin (app → Worker), and R2
 *     is only reachable through this handler. Native HTTP clients ignore CORS
 *     anyway, but this also keeps the web target simple.
 *   - Server-enforced limits: max 10 MiB per file, image MIME types only,
 *     and **magic-byte** validation so a renamed payload cannot bypass the
 *     content-type check.
 *   - Object keys are server-generated (timestamp + random hex) so a client
 *     cannot overwrite arbitrary objects or traverse the key space. The
 *     client-supplied filename is kept only as a label (alt text) and is
 *     sanitised + length-capped.
 *
 * Contract (matches SpherePA's `feedbackClient.uploadScreenshot`):
 *   Request:  multipart/form-data, field name `file`
 *   Response: 201 { success: true, file: UploadedFile }
 *             400/413/415 on validation failure
 */

import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiEnv } from '../env';

/** Maximum upload size (bytes). Aligns with SpherePA's MAX_ATTACHMENT_SIZE. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB

/** MIME types accepted for screenshot uploads. */
export const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

/** Maximum preserved filename length (alt text in the GitHub issue body). */
const MAX_FILENAME_LENGTH = 256;

/**
 * Hono handler for `POST /api/uploads`.
 *
 * Reads a single `file` field from multipart/form-data, validates it, writes
 * the bytes to the bound R2 bucket, and returns the public URL + metadata.
 */
export async function handleUpload(c: Context): Promise<Response> {
  const env = c.env as unknown as ApiEnv;

  // ---- Binding + public-URL config -----------------------------------------
  if (!env.R2_BUCKET) {
    console.error('R2_BUCKET binding not configured on the Worker.');
    return uploadError(
      c,
      500,
      'Screenshot uploads are not configured on the server.',
    );
  }
  const publicBase = (env.R2_PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
  if (!publicBase) {
    console.error('R2_PUBLIC_BASE_URL not configured on the Worker.');
    return uploadError(
      c,
      500,
      'Screenshot uploads are not configured on the server.',
    );
  }

  // ---- Parse multipart body -------------------------------------------------
  // `parseBody` returns `Record<string, Field | File>`. For a single file
  // upload the `file` field is a `File`. Guard against array-shaped values
  // (sent when the same field name appears more than once) and plain text.
  let file: File;
  try {
    const body = await c.req.parseBody();
    const candidate = body['file'];
    if (Array.isArray(candidate)) {
      return uploadError(c, 400, 'Only one file may be uploaded at a time.');
    }
    if (!(candidate instanceof File)) {
      return uploadError(
        c,
        400,
        'Missing "file" field. Expected multipart/form-data with a file field named "file".',
      );
    }
    file = candidate;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Malformed request body.';
    return uploadError(c, 400, `Could not read upload: ${message}`);
  }

  // ---- Size cap -------------------------------------------------------------
  if (file.size <= 0) {
    return uploadError(c, 400, 'Uploaded file is empty.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return uploadError(
      c,
      413,
      `Screenshot is too large. Maximum size is ${MAX_UPLOAD_BYTES} bytes (10 MiB).`,
    );
  }

  // ---- Content-type allowlist ----------------------------------------------
  const contentType = (file.type || '').toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return uploadError(
      c,
      415,
      `Unsupported file type "${contentType || 'unknown'}". Allowed: PNG, JPEG, WebP, GIF.`,
    );
  }

  // ---- Read bytes + magic-byte validation ----------------------------------
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidMagicBytes(bytes, contentType)) {
    return uploadError(
      c,
      415,
      'File content does not match its declared type. Possible extension spoofing.',
    );
  }

  // ---- Build a server-controlled object key --------------------------------
  const ext = extensionForContentType(contentType);
  const objectKey = `feedback/${timeSortableId()}-${randomId(10)}.${ext}`;

  // ---- Write to R2 ----------------------------------------------------------
  try {
    await env.R2_BUCKET.put(objectKey, bytes, {
      httpMetadata: { contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'R2 put failed.';
    console.error('R2 upload failure:', message);
    return uploadError(c, 500, 'Failed to store screenshot.');
  }

  // ---- Response (contract: { success, file }) ------------------------------
  const filename = sanitiseFilename(file.name) || `screenshot.${ext}`;
  const publicUrl = `${publicBase}/${objectKey}`;

  console.log(`✅ Screenshot uploaded: ${objectKey} (${bytes.byteLength} bytes, ${contentType})`);

  return c.json(
    {
      success: true,
      file: {
        url: publicUrl,
        filename,
        contentType,
        size: bytes.byteLength,
      },
    },
    201,
  );
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Verify the leading bytes of `data` against the known signature for the
 * declared `contentType`. Defence against extension/MIME spoofing — a payload
 * that claims to be a PNG but actually carries, say, an HTML document is
 * rejected before it touches the bucket.
 */
function hasValidMagicBytes(data: Uint8Array, contentType: string): boolean {
  switch (contentType) {
    case 'image/png':
      // 89 50 4E 47 0D 0A 1A 0A
      return (
        data.length >= 8 &&
        data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 &&
        data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a
      );
    case 'image/jpeg':
      // FF D8 FF
      return (
        data.length >= 3 &&
        data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
      );
    case 'image/gif':
      // "GIF87a" or "GIF89a"
      if (data.length < 6) return false;
      const gifHeader = [0x47, 0x49, 0x46, 0x38]; // G I F 8
      for (let i = 0; i < gifHeader.length; i++) {
        if (data[i] !== gifHeader[i]) return false;
      }
      return data[4] === 0x37 || data[4] === 0x39 ? data[5] === 0x61 : false;
    case 'image/webp':
      // "RIFF" .... "WEBP"
      if (data.length < 12) return false;
      const riff = [0x52, 0x49, 0x46, 0x46]; // R I F F
      const webp = [0x57, 0x45, 0x42, 0x50]; // W E B P
      for (let i = 0; i < riff.length; i++) {
        if (data[i] !== riff[i]) return false;
      }
      for (let i = 0; i < webp.length; i++) {
        if (data[8 + i] !== webp[i]) return false;
      }
      return true;
    default:
      return false;
  }
}

/** Map an allowed content type to a lowercased extension (no leading dot). */
function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

/**
 * Reduce a client-supplied filename to a safe, bounded label. Strips path
 * separators and control chars, keeps the basename, and caps the length so it
 * is safe to interpolate as alt text in the GitHub issue body.
 */
function sanitiseFilename(name: string): string {
  // Basename only — drop any directory components.
  const base = name.split(/[/\\]/).pop() ?? name;
  // Keep printable, non-control ASCII + common safe symbols.
  const cleaned = base.replace(/[\x00-\x1f<>:"/\\|?*]/g, '').trim();
  return cleaned.slice(0, MAX_FILENAME_LENGTH);
}

/**
 * Lexicographically-sortable, millisecond-precision id (14 digits) so uploaded
 * objects are naturally ordered by upload time. Mirrors `presign.ts`.
 */
function timeSortableId(): string {
  return Date.now().toString().padStart(14, '0');
}

/** Cryptographically-random hex id of the given byte length. */
function randomId(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Render a uniform upload error response. */
function uploadError(
  c: Context,
  status: ContentfulStatusCode,
  message: string,
): Response {
  return c.json(
    { success: false, error: message, timestamp: new Date().toISOString() },
    status,
  );
}