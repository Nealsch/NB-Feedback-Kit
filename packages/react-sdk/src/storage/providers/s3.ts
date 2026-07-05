/**
 * S3-compatible storage provider — uploads screenshots to AWS S3, Cloudflare
 * R2, MinIO, Backblaze B2, or any S3-compatible bucket.
 *
 * Security model: **no cloud credentials live in the client bundle.** The
 * provider holds only non-secret targeting info (bucket, region, endpoint,
 * prefix). On each upload it calls the Worker's `POST /api/uploads/presign`
 * endpoint (authenticated with the host app's `X-API-Key`) to obtain a
 * short-lived presigned PUT URL, then PUTs the file bytes **directly** to
 * the cloud bucket. The Worker never sees the file bytes and the client
 * never sees the cloud credentials.
 */

import type { PresignRequest, PresignResponse, UploadedFile } from '@nb-feedback-kit/shared-types';
import type { S3Config, StorageProvider, StorageTestResult } from '../types';

/** Constructor options for {@link S3StorageProvider}. */
export interface S3StorageProviderOptions {
  /** Targeting info (bucket, region, endpoint, prefix). No secrets. */
  config: S3Config;
  /** Fully-qualified Worker base URL, e.g. `https://feedback.example.com`. */
  apiEndpoint: string;
  /** The host app's feedback API key (sent as `X-API-Key`). */
  apiKey: string;
}

/**
 * Storage provider that uploads to S3-compatible buckets via Worker-issued
 * presigned URLs.
 *
 * Implements the {@link StorageProvider} contract. The SDK's factory
 * (`createStorageProvider`) instantiates this when `config.type === 's3'`.
 */
export class S3StorageProvider implements StorageProvider {
  readonly enabled = true;

  private readonly s3Config: S3Config;
  private readonly apiEndpoint: string;
  private readonly apiKey: string;

  constructor(opts: S3StorageProviderOptions) {
    this.s3Config = opts.config;
    this.apiEndpoint = opts.apiEndpoint.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
  }

  async upload(file: File): Promise<UploadedFile> {
    // 1. Ask the Worker for a short-lived presigned PUT URL.
    const presign = await this.requestPresign(file);

    // 2. PUT the file bytes directly to the cloud bucket.
    const putResponse = await fetch(presign.uploadUrl, {
      method: presign.method,
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!putResponse.ok) {
      const detail = await putResponse.text().catch(() => '');
      throw new Error(
        `S3 upload failed (${putResponse.status} ${putResponse.statusText}). ${detail}`.trim()
      );
    }

    // 3. Return metadata for the issue body. The public URL is the canonical
    //    object URL returned by the Worker — the bucket must be publicly
    //    readable for it to render in the GitHub issue (documented).
    return {
      url: presign.publicUrl,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    };
  }

  /**
   * Probe whether the presign → upload path is healthy end-to-end.
   *
   * Performs only the presign request (no bytes are written to the bucket).
   * This is enough to validate that the Worker secrets are configured, the
   * bucket is allowlisted, and the API key has permission — without leaving
   * a test object behind.
   */
  async testConnection(): Promise<StorageTestResult> {
    const probe: PresignRequest = {
      provider: 's3',
      filename: 'connection-test.png',
      contentType: 'image/png',
      bucket: this.s3Config.bucket,
      region: this.s3Config.region,
      endpoint: this.s3Config.endpoint,
      keyPrefix: this.s3Config.keyPrefix,
    };

    try {
      const res = await fetch(`${this.apiEndpoint}/api/uploads/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(probe),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          (body && typeof body === 'object' && 'error' in body && String((body as Record<string, unknown>).error)) ||
          `Presign failed (${res.status} ${res.statusText}).`;
        return { success: false, message };
      }

      const data = (await res.json()) as Partial<PresignResponse> & { success?: boolean };
      if (!data.uploadUrl) {
        return { success: false, message: 'Worker response missing uploadUrl.' };
      }

      return {
        success: true,
        message: 'Worker authorised presign for the configured bucket.',
        probeUrl: data.uploadUrl,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error during presign.';
      return { success: false, message };
    }
  }

  /**
   * Call the Worker presign endpoint and unwrap the response.
   * @throws Error on non-2xx or malformed responses.
   */
  private async requestPresign(file: File): Promise<PresignResponse> {
    const body: PresignRequest = {
      provider: 's3',
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      bucket: this.s3Config.bucket,
      region: this.s3Config.region,
      endpoint: this.s3Config.endpoint,
      keyPrefix: this.s3Config.keyPrefix,
    };

    const res = await fetch(`${this.apiEndpoint}/api/uploads/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const message =
        (errBody && typeof errBody === 'object' && 'error' in errBody && String((errBody as Record<string, unknown>).error)) ||
        `Presign request failed (${res.status} ${res.statusText}).`;
      throw new Error(message);
    }

    const data = (await res.json()) as Partial<PresignResponse>;
    if (!data.uploadUrl || !data.publicUrl) {
      throw new Error('Worker presign response missing uploadUrl or publicUrl.');
    }

    return {
      uploadUrl: data.uploadUrl,
      publicUrl: data.publicUrl,
      method: 'PUT',
      expiresIn: data.expiresIn ?? 300,
    };
  }
}