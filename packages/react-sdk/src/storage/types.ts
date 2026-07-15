/**
 * Storage provider abstraction for screenshot attachments.
 *
 * Decouples screenshot upload from issue creation. The issue provider
 * (e.g. GitHub) only ever receives {@link UploadedFile} URLs, never raw
 * image data. This keeps storage providers independent of issue providers
 * and allows new providers (R2, S3, Supabase, Azure Blob, GCS, GitHub
 * Repository, ...) to be added with minimal changes.
 *
 * Design note: uploads run client-side in Sprint 1. Cloud providers added
 * in Sprint 2 will typically be Worker-proxied or presigned-URL based;
 * the interface stays the same either way.
 */

import type { UploadedFile } from '@nb-feedback-kit/shared-types';

/**
 * Discriminated union of storage provider configs.
 * Add a new branch here when introducing a new provider.
 */
export type StorageProviderConfig =
  | { type: 'none' }
  | { type: 'custom'; endpoint: CustomEndpointConfig }
  | { type: 's3'; s3: S3Config };

/**
 * Configuration for a user-supplied upload endpoint.
 *
 * The SDK POSTs (by default) a multipart/form-data request containing the
 * file under {@link fieldName} plus any {@link extraHeaders}, and expects a
 * JSON response whose property at {@link responseUrlPath} holds the uploaded
 * file URL.
 */
export interface CustomEndpointConfig {
  /** Fully-qualified URL to POST/PUT the file to. */
  url: string;
  /** HTTP method. Defaults to `POST`. */
  method?: 'POST' | 'PUT';
  /** Multipart form field name carrying the file. Defaults to `file`. */
  fieldName?: string;
  /** Extra request headers (e.g. `Authorization`, `X-Tenant`). */
  headers?: Record<string, string>;
  /**
   * Dotted path into the JSON response that resolves to the uploaded file
   * URL. e.g. `data.url` for `{ data: { url: "https://..." } }`.
   * Defaults to `url`.
   */
  responseUrlPath?: string;
}

/**
 * Configuration for S3-compatible storage providers.
 *
 * This config holds only **non-secret targeting information** — bucket,
 * region, optional endpoint, and key prefix. The actual cloud credentials
 * live only as Worker secrets and are used to sign short-lived presigned
 * PUT URLs. Nothing in this object should be treated as secret.
 *
 * Works with AWS S3, Cloudflare R2, MinIO, Backblaze B2 (S3 API), and any
 * other S3-compatible store via {@link S3Config.endpoint}.
 */
export interface S3Config {
  /** Bucket name. Must be allowlisted in the Worker's `S3_ALLOWED_BUCKETS`. */
  bucket: string;
  /** Region (e.g. `us-east-1`). Use `auto` for Cloudflare R2. */
  region: string;
  /**
   * Optional S3-compatible base endpoint (scheme + host, no trailing slash).
   * Omit for AWS S3 standard. Set for R2 (`https://<account>.r2.cloudflarestorage.com`),
   * MinIO, or Backblaze B2.
   */
  endpoint?: string;
  /** Optional object-key prefix (folder), e.g. `feedback/`. */
  keyPrefix?: string;
}

/**
 * Common interface every storage provider implements.
 *
 * Implementations must be framework-agnostic and side-effect free on
 * construction. {@link upload} should throw on failure so the caller can
 * decide whether to proceed without the attachment.
 */
export interface StorageProvider {
  /**
   * Upload a single file and return its hosted metadata.
   * @throws Error on any upload, network, or response-parsing failure.
   */
  upload(file: File): Promise<UploadedFile>;

  /**
   * Whether this provider performs real uploads. `false` for the `none`
   * provider; lets the UI hide the picker entirely.
   */
  readonly enabled: boolean;
}

/**
 * Result of a "Test Connection" probe. Returned by
 * {@link testStorageProvider}, which sends a lightweight probe to verify
 * the endpoint is reachable, CORS-configured, authenticated, and returns
 * the expected response shape — all before the user saves the config.
 */
export interface StorageTestResult {
  /** `true` when the probe completed successfully end-to-end. */
  success: boolean;
  /** Human-readable message suitable for display in the Configuration UI. */
  message: string;
  /**
   * When successful on a custom endpoint, the URL the probe resolved to.
   * Helps the user confirm the response path mapping is correct.
   */
  probeUrl?: string;
}
