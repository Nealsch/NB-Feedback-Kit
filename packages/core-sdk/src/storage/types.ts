/**
 * Storage provider abstraction for screenshot attachments.
 *
 * Copied verbatim (with doc tidy-up) from the React SDK so the core SDK is fully
 * self-contained and framework-agnostic. The interface and configs are identical,
 * so a consumer can move storage config between the React SDK and the core SDK
 * without changes.
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
 * Configuration for S3-compatible storage providers (AWS S3, Cloudflare R2,
 * MinIO, Backblaze B2). Holds only non-secret targeting information.
 */
export interface S3Config {
  /** Bucket name. Must be allowlisted in the Worker's `S3_ALLOWED_BUCKETS`. */
  bucket: string;
  /** Region (e.g. `us-east-1`). Use `auto` for Cloudflare R2. */
  region: string;
  /**
   * Optional S3-compatible base endpoint (scheme + host, no trailing slash).
   * Omit for AWS S3 standard.
   */
  endpoint?: string;
  /** Optional object-key prefix (folder), e.g. `feedback/`. */
  keyPrefix?: string;
}

/**
 * Common interface every storage provider implements.
 *
 * Implementations must be framework-agnostic and side-effect free on
 * construction.
 */
export interface StorageProvider {
  /**
   * Upload a single file and return its hosted metadata.
   * @throws Error on any upload, network, or response-parsing failure.
   */
  upload(file: File): Promise<UploadedFile>;

  /**
   * Whether this provider performs real uploads. `false` for the `none`
   * provider; lets the caller decide whether to offer a file picker.
   */
  readonly enabled: boolean;
}

/**
 * Result of a "Test Connection" probe.
 */
export interface StorageTestResult {
  /** `true` when the probe completed successfully end-to-end. */
  success: boolean;
  /** Human-readable message suitable for display. */
  message: string;
  /**
   * When successful on a custom endpoint, the URL the probe resolved to.
   */
  probeUrl?: string;
}