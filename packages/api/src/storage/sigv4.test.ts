/**
 * Tests for the SigV4 presigned-URL signer.
 *
 * The signer is security-critical: a malformed signature either rejects
 * legitimate uploads or — worse — could leak credentials via the URL. These
 * tests pin down:
 *   1. URL structure (host, path-style addressing, required query params).
 *   2. Determinism for identical inputs (regression guard).
 *   3. Mutations that MUST change the signature (secret, bucket, key, region).
 *   4. Fail-fast on missing required params.
 *   5. Path-style addressing for both AWS S3 and custom endpoints (R2/MinIO).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createS3PresignedUrl } from './sigv4';

// Fixed timestamp so signatures are deterministic across test runs.
// 2024-01-15T12:30:45.000Z → amzDate 20240115T123045Z, dateStamp 20240115.
const FIXED_NOW = new Date('2024-01-15T12:30:45.000Z');

const BASE_PARAMS = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  bucket: 'examplebucket',
  objectKey: 'feedback/test.png',
  region: 'us-east-1',
  expiresIn: 600,
} as const;

describe('createS3PresignedUrl', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: FIXED_NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('URL structure', () => {
    it('uses path-style addressing for AWS S3', async () => {
      const { url, publicUrl } = await createS3PresignedUrl(BASE_PARAMS);

      // Public URL (non-presigned) — path-style.
      expect(publicUrl).toBe(
        'https://s3.us-east-1.amazonaws.com/examplebucket/feedback/test.png'
      );

      // Presigned URL is the public URL plus query string.
      expect(url.startsWith(publicUrl + '?')).toBe(true);
    });

    it('uses a custom endpoint host when provided (R2/MinIO/B2)', async () => {
      const { url, publicUrl } = await createS3PresignedUrl({
        ...BASE_PARAMS,
        endpoint: 'https://abc123.r2.cloudflarestorage.com',
      });

      expect(publicUrl).toBe(
        'https://abc123.r2.cloudflarestorage.com/examplebucket/feedback/test.png'
      );
      expect(url.startsWith(publicUrl + '?')).toBe(true);
    });

    it('includes all required SigV4 query parameters', async () => {
      const { url } = await createS3PresignedUrl(BASE_PARAMS);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
      expect(parsed.searchParams.get('X-Amz-Credential')).toBe(
        'AKIAIOSFODNN7EXAMPLE/20240115/us-east-1/s3/aws4_request'
      );
      expect(parsed.searchParams.get('X-Amz-Date')).toBe('20240115T123045Z');
      expect(parsed.searchParams.get('X-Amz-Expires')).toBe('600');
      expect(parsed.searchParams.get('X-Amz-SignedHeaders')).toBe('host');
      expect(parsed.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('includes the session token when provided', async () => {
      const { url } = await createS3PresignedUrl({
        ...BASE_PARAMS,
        sessionToken: 'temporary-session-token',
      });
      expect(new URL(url).searchParams.get('X-Amz-Security-Token')).toBe(
        'temporary-session-token'
      );
    });

    it('omits the session token when not provided', async () => {
      const { url } = await createS3PresignedUrl(BASE_PARAMS);
      expect(new URL(url).searchParams.get('X-Amz-Security-Token')).toBeNull();
    });
  });

  describe('determinism and signature sensitivity', () => {
    it('produces identical signatures for identical inputs', async () => {
      const a = await createS3PresignedUrl(BASE_PARAMS);
      const b = await createS3PresignedUrl(BASE_PARAMS);
      expect(a.url).toBe(b.url);
    });

    it('changes the signature when the secret changes', async () => {
      const a = await createS3PresignedUrl(BASE_PARAMS);
      const b = await createS3PresignedUrl({
        ...BASE_PARAMS,
        secretAccessKey: 'different-secret-value',
      });
      const sigA = new URL(a.url).searchParams.get('X-Amz-Signature');
      const sigB = new URL(b.url).searchParams.get('X-Amz-Signature');
      expect(sigA).not.toBe(sigB);
    });

    it('changes the signature when the object key changes', async () => {
      const a = await createS3PresignedUrl(BASE_PARAMS);
      const b = await createS3PresignedUrl({
        ...BASE_PARAMS,
        objectKey: 'feedback/other.png',
      });
      const sigA = new URL(a.url).searchParams.get('X-Amz-Signature');
      const sigB = new URL(b.url).searchParams.get('X-Amz-Signature');
      expect(sigA).not.toBe(sigB);
    });

    it('changes the signature when the bucket changes', async () => {
      const a = await createS3PresignedUrl(BASE_PARAMS);
      const b = await createS3PresignedUrl({ ...BASE_PARAMS, bucket: 'otherbucket' });
      const sigA = new URL(a.url).searchParams.get('X-Amz-Signature');
      const sigB = new URL(b.url).searchParams.get('X-Amz-Signature');
      expect(sigA).not.toBe(sigB);
    });

    it('changes the signature when the region changes', async () => {
      const a = await createS3PresignedUrl(BASE_PARAMS);
      const b = await createS3PresignedUrl({ ...BASE_PARAMS, region: 'eu-west-1' });
      const sigA = new URL(a.url).searchParams.get('X-Amz-Signature');
      const sigB = new URL(b.url).searchParams.get('X-Amz-Signature');
      expect(sigA).not.toBe(sigB);
    });
  });

  describe('URI encoding', () => {
    it('preserves forward slashes in the object key', async () => {
      const { publicUrl } = await createS3PresignedUrl({
        ...BASE_PARAMS,
        objectKey: 'feedback/sub/folder/file.png',
      });
      expect(publicUrl).toContain('examplebucket/feedback/sub/folder/file.png');
    });

    it('encodes special characters in the object key', async () => {
      const { publicUrl } = await createS3PresignedUrl({
        ...BASE_PARAMS,
        objectKey: 'feedback/my file (1).png',
      });
      // Spaces → %20, parens → %28/%29, slashes preserved.
      expect(publicUrl).toContain('feedback/my%20file%20%281%29.png');
    });
  });

  describe('input validation', () => {
    it('throws when accessKeyId is missing', async () => {
      await expect(
        createS3PresignedUrl({ ...BASE_PARAMS, accessKeyId: '' })
      ).rejects.toThrow(/accessKeyId and secretAccessKey/);
    });

    it('throws when secretAccessKey is missing', async () => {
      await expect(
        createS3PresignedUrl({ ...BASE_PARAMS, secretAccessKey: '' })
      ).rejects.toThrow(/accessKeyId and secretAccessKey/);
    });

    it('throws when bucket is missing', async () => {
      await expect(
        createS3PresignedUrl({ ...BASE_PARAMS, bucket: '' })
      ).rejects.toThrow(/bucket and objectKey/);
    });

    it('throws when objectKey is missing', async () => {
      await expect(
        createS3PresignedUrl({ ...BASE_PARAMS, objectKey: '' })
      ).rejects.toThrow(/bucket and objectKey/);
    });
  });
});