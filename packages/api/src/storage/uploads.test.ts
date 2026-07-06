/**
 * Tests for `POST /api/uploads` — server-mediated R2 screenshot uploads.
 *
 * Covers the FEEDBACK-1 contract: multipart `file` field → 201 `{ success, file }`,
 * plus the security-critical validation (size cap, content-type allowlist,
 * magic-byte verification, R2 binding/config guards).
 */

import { describe, it, expect, vi } from 'vitest';
import { handleUpload, MAX_UPLOAD_BYTES } from './uploads';
import type { Context } from 'hono';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

/** Parse a Response body as JSON, typed as `any` to match index.test.ts convention. */
async function jsonData(res: Response): Promise<AnyData> {
  return res.json();
}

// --- Valid magic bytes for each supported type --------------------------------

/** Minimal valid PNG header (8-byte signature + IHDR chunk head). */
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature
  0x00, 0x00, 0x00, 0x0d, // IHDR length
  0x49, 0x48, 0x44, 0x52, // "IHDR"
]);

/** Minimal valid JPEG SOI + marker. */
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

/** Bytes that are NOT any image format (plain text). */
const TEXT_BYTES = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // "hello"

// --- Mock factories ----------------------------------------------------------

interface MockR2Bucket {
  put: ReturnType<typeof vi.fn>;
}

function createMockR2Bucket(): MockR2Bucket {
  return { put: vi.fn().mockResolvedValue(undefined) };
}

/**
 * Build a mock Hono Context carrying a multipart body and env bindings.
 * Mirrors how `index.test.ts` passes env into `app.fetch(req, env, {})`.
 */
function createMockContext(opts: {
  file?: { bytes: Uint8Array; filename: string; contentType: string } | null;
  r2Bucket?: MockR2Bucket | null;
  publicBaseUrl?: string;
  apiKey?: string;
}): { ctx: Context; r2Bucket: MockR2Bucket | null } {
  const r2Bucket = opts.r2Bucket === undefined ? createMockR2Bucket() : opts.r2Bucket;

  const ctx = {
    req: {
      parseBody: async () => {
        // Simulate Hono parseBody: returns { file: File } when a file is present.
        if (!opts.file) return {};
        if (opts.file === null) return { file: 'not-a-file' };
        const blob = new Blob([opts.file.bytes], { type: opts.file.contentType });
        const file = new File([blob], opts.file.filename, { type: opts.file.contentType });
        return { file };
      },
    },
    env: {
      R2_BUCKET: r2Bucket ?? undefined,
      R2_PUBLIC_BASE_URL: opts.publicBaseUrl,
    },
    json: (body: unknown, status: number) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  } as unknown as Context;

  return { ctx, r2Bucket };
}

/** Override the mock parseBody to return a synthetic File (for size/edge tests). */
function overrideParseBody(
  ctx: Context,
  file: { size?: number; type?: string; name?: string; bytes?: Uint8Array },
): void {
  const bytes = file.bytes ?? PNG_BYTES;
  (ctx.req as unknown as { parseBody: () => Promise<{ file: File }> }).parseBody = async () => {
    // Always construct a REAL File so the handler's `instanceof File` guard
    // passes. Then, if a synthetic `size` was requested (for the 413 test),
    // shadow the Blob's computed size getter with a data property — this lets
    // us test the oversize branch without allocating 10 MiB in memory.
    const realFile = new File([new Blob([bytes])], file.name ?? 'x.png', {
      type: file.type ?? 'image/png',
    });
    if (file.size !== undefined) {
      Object.defineProperty(realFile, 'size', { value: file.size, configurable: true });
    }
    return { file: realFile };
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/uploads (FEEDBACK-1)', () => {
  describe('configuration guards', () => {
    it('returns 500 when R2_BUCKET binding is missing', async () => {
      const { ctx } = createMockContext({
        file: { bytes: PNG_BYTES, filename: 'shot.png', contentType: 'image/png' },
        r2Bucket: null,
        publicBaseUrl: 'https://cdn.example.com',
      });

      const res = await handleUpload(ctx);
      const data = await jsonData(res);

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/not configured/i);
    });

    it('returns 500 when R2_PUBLIC_BASE_URL is missing', async () => {
      const { ctx } = createMockContext({
        file: { bytes: PNG_BYTES, filename: 'shot.png', contentType: 'image/png' },
        publicBaseUrl: '',
      });

      const res = await handleUpload(ctx);
      const data = await jsonData(res);

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('request validation', () => {
    it('returns 400 when the "file" field is missing', async () => {
      const { ctx } = createMockContext({
        file: undefined,
        publicBaseUrl: 'https://cdn.example.com',
      });

      const res = await handleUpload(ctx);
      const data = await jsonData(res);

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/file/);
    });

    it('returns 400 when file is empty (0 bytes)', async () => {
      const { ctx } = createMockContext({
        file: { bytes: new Uint8Array([]), filename: 'empty.png', contentType: 'image/png' },
        publicBaseUrl: 'https://cdn.example.com',
      });
      overrideParseBody(ctx, { bytes: new Uint8Array([]), type: 'image/png', name: 'empty.png' });

      const res = await handleUpload(ctx);
      const data = await jsonData(res);

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/empty/i);
    });

    it('returns 413 when file exceeds the 10 MiB cap', async () => {
      const { ctx } = createMockContext({
        file: { bytes: PNG_BYTES, filename: 'big.png', contentType: 'image/png' },
        publicBaseUrl: 'https://cdn.example.com',
      });
      overrideParseBody(ctx, { size: MAX_UPLOAD_BYTES + 1, type: 'image/png', name: 'big.png' });

      const res = await handleUpload(ctx);
      const data = await jsonData(res);

      expect(res.status).toBe(413);
      expect(data.error).toMatch(/too large/i);
    });

    it('returns 415 for disallowed content types (e.g. application/pdf)', async () => {
      const { ctx } = createMockContext({
        file: { bytes: TEXT_BYTES, filename: 'doc.pdf', contentType: 'application/pdf' },
        publicBaseUrl: 'https://cdn.example.com',
      });

      const res = await handleUpload(ctx);
      const data = await jsonData(res);

      expect(res.status).toBe(415);
      expect(data.error).toMatch(/unsupported/i);
    });
  });

  describe('magic-byte validation', () => {
    it('returns 415 when a PNG-named file does not start with the PNG signature', async () => {
      const { ctx } = createMockContext({
        file: { bytes: TEXT_BYTES, filename: 'impostor.png', contentType: 'image/png' },
        publicBaseUrl: 'https://cdn.example.com',
      });

      const res = await handleUpload(ctx);
      const data = await jsonData(res);

      expect(res.status).toBe(415);
      expect(data.error).toMatch(/does not match/i);
    });

    it('accepts a valid PNG', async () => {
      const { ctx, r2Bucket } = createMockContext({
        file: { bytes: PNG_BYTES, filename: 'shot.png', contentType: 'image/png' },
        publicBaseUrl: 'https://cdn.example.com',
      });

      const res = await handleUpload(ctx);
      expect(res.status).toBe(201);
      expect(r2Bucket?.put).toHaveBeenCalledTimes(1);
    });

    it('accepts a valid JPEG', async () => {
      const { ctx, r2Bucket } = createMockContext({
        file: { bytes: JPEG_BYTES, filename: 'shot.jpg', contentType: 'image/jpeg' },
        publicBaseUrl: 'https://cdn.example.com',
      });

      const res = await handleUpload(ctx);
      expect(res.status).toBe(201);
      expect(r2Bucket?.put).toHaveBeenCalledTimes(1);
    });
  });

  describe('happy path', () => {
    it('writes to R2 with server-generated key and returns the public URL', async () => {
      const { ctx, r2Bucket } = createMockContext({
        file: { bytes: PNG_BYTES, filename: 'screenshot.png', contentType: 'image/png' },
        publicBaseUrl: 'https://cdn.example.com',
      });

      const res = await handleUpload(ctx);
      const data = await jsonData(res);

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);

      // R2.put called with a feedback/ key + PNG content-type.
      expect(r2Bucket?.put).toHaveBeenCalledTimes(1);
      const [key, _bytes, opts] = r2Bucket?.put.mock.calls[0] ?? [];
      expect(String(key)).toMatch(/^feedback\/\d{14}-[a-f0-9]+\.png$/);
      expect(opts).toEqual({ httpMetadata: { contentType: 'image/png' } });

      // Response contract matches SpherePA's UploadedFile shape.
      expect(data.file).toEqual({
        url: expect.stringMatching(/^https:\/\/cdn\.example\.com\/feedback\//),
        filename: 'screenshot.png',
        contentType: 'image/png',
        size: PNG_BYTES.byteLength,
      });
    });

    it('returns 500 when the R2 put fails', async () => {
      const r2Bucket = createMockR2Bucket();
      r2Bucket.put.mockRejectedValueOnce(new Error('R2 internal error'));

      const { ctx } = createMockContext({
        file: { bytes: PNG_BYTES, filename: 'shot.png', contentType: 'image/png' },
        r2Bucket,
        publicBaseUrl: 'https://cdn.example.com',
      });

      const res = await handleUpload(ctx);
      const data = await jsonData(res);

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/failed to store/i);
    });
  });
});