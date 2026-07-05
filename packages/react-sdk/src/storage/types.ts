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
  | { type: 'custom'; endpoint: CustomEndpointConfig };

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
