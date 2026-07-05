/**
 * AWS Signature Version 4 (SigV4) utilities for S3-compatible presigned URLs.
 *
 * Uses the Web Crypto API only — **zero npm dependencies** — so the Worker
 * bundle stays small and the signing logic is fully unit-testable.
 *
 * Scope: supports generating presigned PUT URLs for S3-compatible stores
 * (AWS S3, Cloudflare R2, MinIO, Backblaze B2 S3 API). Only the query-string
 * signing path is implemented (presigned URLs); no full request signing.
 *
 * References:
 *   - https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
 *   - https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
 */

const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// Crypto primitives
// ---------------------------------------------------------------------------

/** Compute SHA-256 hex digest of a string. */
async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return bufferToHex(hash);
}

/**
 * Compute HMAC-SHA256 as raw bytes.
 * @param key  Raw key bytes (ArrayBuffer or Uint8Array).
 * @param data String to sign.
 */
async function hmacSha256(
  key: ArrayBuffer | Uint8Array,
  data: string
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

/** Convert an ArrayBuffer to a lowercase hex string. */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive the SigV4 signing key via the HMAC chain:
 *   kSecret → kDate → kRegion → kService → kSigning
 *
 * @param secret  AWS secret access key (without the "AWS4" prefix).
 * @param date    Short date `YYYYMMDD`.
 * @param region  e.g. `us-east-1` or `auto` for R2.
 * @param service Always `s3` for our use case.
 */
async function deriveSigningKey(
  secret: string,
  date: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kSecret = encoder.encode(`AWS4${secret}`);
  const kDate = await hmacSha256(kSecret, date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

// ---------------------------------------------------------------------------
// URI encoding
// ---------------------------------------------------------------------------

/**
 * RFC 3986 / SigV4-compliant URI-encode every byte except unreserved chars
 * (`A-Za-z0-9-._~`). When `encodeSlash` is `false`, forward slashes (`/`)
 * are preserved so path segments can be encoded individually while keeping
 * the path delimiter.
 */
function uriEncode(input: string, encodeSlash: boolean): string {
  const bytes = encoder.encode(input);
  let result = '';
  for (const byte of bytes) {
    if (
      (byte >= 0x41 && byte <= 0x5a) || // A-Z
      (byte >= 0x61 && byte <= 0x7a) || // a-z
      (byte >= 0x30 && byte <= 0x39) || // 0-9
      byte === 0x2d || // -
      byte === 0x2e || // .
      byte === 0x5f || // _
      byte === 0x7e // ~
    ) {
      result += String.fromCharCode(byte);
    } else if (byte === 0x2f && !encodeSlash) {
      result += '/';
    } else {
      result += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Presigned URL generation
// ---------------------------------------------------------------------------

/** Parameters for {@link createS3PresignedUrl}. */
export interface S3PresignParams {
  /** AWS access key ID. */
  accessKeyId: string;
  /** AWS secret access key. */
  secretAccessKey: string;
  /** Bucket name. */
  bucket: string;
  /** Full object key (e.g. `feedback/20240101-abc123.png`). */
  objectKey: string;
  /** Region (e.g. `us-east-1`). Use `auto` for Cloudflare R2. */
  region: string;
  /**
   * Optional S3-compatible base endpoint (scheme + host, no trailing slash,
   * no bucket). Omit for AWS S3 standard (uses path-style
   * `s3.<region>.amazonaws.com`).
   */
  endpoint?: string;
  /** URL expiration in seconds. AWS S3 allows up to 604800 (7 days). */
  expiresIn: number;
  /** Optional keys to be present in the X-Amz-Security-Token query param. */
  sessionToken?: string;
}

/** Result of presigning. */
export interface S3PresignResult {
  /** The presigned PUT URL the client uploads to. */
  url: string;
  /** The canonical public URL of the object (non-presigned). */
  publicUrl: string;
}

/**
 * Generate an S3-compatible presigned PUT URL using SigV4 query-string auth.
 *
 * Only the `host` header is signed (the minimum required by S3). The client
 * is free to send `Content-Type` as an unsigned header — S3 stores whatever
 * value is sent as object metadata. Payload integrity is not checked
 * (`UNSIGNED-PAYLOAD`), which is the standard for presigned uploads.
 *
 * Uses **path-style** addressing for maximum compatibility across AWS S3,
 * Cloudflare R2, MinIO, and Backblaze B2:
 *   - AWS S3:  `https://s3.<region>.amazonaws.com/<bucket>/<key>`
 *   - R2/custom: `https://<endpoint>/<bucket>/<key>`
 *
 * @throws Error if any required parameter is missing.
 */
export async function createS3PresignedUrl(
  params: S3PresignParams
): Promise<S3PresignResult> {
  const { accessKeyId, secretAccessKey, bucket, objectKey, region, expiresIn } =
    params;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3 presign requires accessKeyId and secretAccessKey.');
  }
  if (!bucket || !objectKey) {
    throw new Error('S3 presign requires bucket and objectKey.');
  }

  // Resolve host + canonical URI (path-style addressing).
  const endpointHost = params.endpoint
    ? new URL(params.endpoint).host
    : `s3.${region}.amazonaws.com`;
  const canonicalUri = `/${uriEncode(bucket, false)}/${uriEncode(objectKey, false)}`;
  const publicUrl = `https://${endpointHost}${canonicalUri}`;

  // Timestamps.
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  // Build the query parameters that go into the presigned URL.
  // These are sorted alphabetically by key (required by SigV4 canonical form).
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  };
  if (params.sessionToken) {
    queryParams['X-Amz-Security-Token'] = params.sessionToken;
  }

  // Canonical query string: keys sorted, URI-encoded.
  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map(
      (k) =>
        `${uriEncode(k, true)}=${uriEncode(queryParams[k], true)}`
    )
    .join('&');

  // Canonical headers — only `host` is signed.
  const canonicalHeaders = `host:${endpointHost}\n`;
  const signedHeaders = 'host';

  // Canonical request (payload hash = UNSIGNED-PAYLOAD for presigned uploads).
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  // String to sign.
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n');

  // Signing key + signature.
  const signingKey = await deriveSigningKey(
    secretAccessKey,
    dateStamp,
    region,
    's3'
  );
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = bufferToHex(signatureBuffer);

  // Build the final presigned URL.
  const presignedUrl = `${publicUrl}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

  return { url: presignedUrl, publicUrl };
}

/** Format a Date as SigV4 `YYYYMMDDTHHMMSSZ`. */
function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}