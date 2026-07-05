// Shared TypeScript types for NB Feedback Kit

export type FeedbackType = 'bug' | 'feature' | 'feedback';

export interface FeedbackMetadata {
  application: string;
  version: string;
  route?: string;
  browser?: string;
  os?: string;
  screenResolution?: string;
  timestamp: string;
  userId?: string;
}

/**
 * Metadata describing a file that has been uploaded to a storage provider.
 * Used for screenshot attachments embedded into the created issue.
 */
export interface UploadedFile {
  /** Public (or signed) URL the issue provider can render. */
  url: string;
  /** Original filename of the uploaded file. */
  filename: string;
  /** MIME type, e.g. `image/png`. */
  contentType: string;
  /** File size in bytes. */
  size: number;
}

export interface FeedbackPayload {
  type: FeedbackType;
  title: string;
  description: string;
  metadata: FeedbackMetadata;
  /**
   * Screenshots uploaded via the configured storage provider.
   * Rendered as Markdown images in the issue body. Optional for backward
   * compatibility — omit when screenshot uploads are disabled or unavailable.
   */
  attachments?: UploadedFile[];
}

export interface FeedbackResponse {
  success: boolean;
  issueUrl?: string;
  issueNumber?: number;
  error?: string;
}

export interface ReleaseNote {
  version: string;
  date: string;
  body: string;
  /** Optional link to the GitHub release page. Omitted on older API responses. */
  url?: string;
}

export interface RoadmapItem {
  id: number;
  title: string;
  status: 'planned' | 'in-progress' | 'released';
  url: string;
}

// ---------------------------------------------------------------------------
// Screenshot upload — presigned-URL contract (client ↔ Worker)
// ---------------------------------------------------------------------------

/**
 * Storage providers supported by the Worker's presign endpoint.
 *
 * Add a new branch here when the Worker gains the ability to issue presigned
 * URLs for another cloud provider (e.g. `gcs`, `azure`). `s3` covers any
 * S3-compatible store (AWS S3, Cloudflare R2, MinIO, Backblaze B2 S3 API)
 * via the {@link PresignRequest.endpoint} override.
 */
export type PresignProvider = 's3';

/**
 * Request body for `POST /api/uploads/presign`.
 *
 * Sent by the SDK's cloud storage providers to obtain a short-lived upload
 * URL. The Worker validates the requested target against its allowlist and
 * signs using credentials held only as Worker secrets — the client never
 * receives the cloud credentials.
 */
export interface PresignRequest {
  /** Which provider to presign for. Currently only `'s3'`. */
  provider: PresignProvider;
  /** Original filename of the file being uploaded. */
  filename: string;
  /** MIME type of the file being uploaded (e.g. `image/png`). */
  contentType: string;
  /**
   * Target bucket name. Must be present in the Worker's
   * `S3_ALLOWED_BUCKETS` allowlist or the request is rejected (fail-closed).
   */
  bucket: string;
  /**
   * Bucket region (e.g. `us-east-1`). Use `auto` for Cloudflare R2.
   */
  region: string;
  /**
   * Optional S3-compatible base endpoint (scheme + host, no trailing slash).
   * Omit for AWS S3 standard. Set to e.g. `https://<account>.r2.cloudflarestorage.com`
   * for Cloudflare R2, or a MinIO/B2 URL for those providers.
   */
  endpoint?: string;
  /** Optional object-key prefix (folder), e.g. `feedback/`. */
  keyPrefix?: string;
}

/**
 * Response from `POST /api/uploads/presign`.
 */
export interface PresignResponse {
  /** Short-lived presigned PUT URL the client uploads bytes to. */
  uploadUrl: string;
  /**
   * Canonical object URL to embed in the issue body. The bucket must be
   * publicly readable for this to render in the GitHub issue — this is the
   * developer's responsibility (documented). The Worker does not proxy reads.
   */
  publicUrl: string;
  /** HTTP method the client must use against {@link uploadUrl}. Always `PUT`. */
  method: 'PUT';
  /** Seconds until {@link uploadUrl} expires. */
  expiresIn: number;
}
