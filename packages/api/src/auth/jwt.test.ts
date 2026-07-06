/**
 * Unit tests for the zero-dependency HS256 JWT module (FEEDBACK-2).
 *
 * Uses Node's Web Crypto API (available in Node ≥ 20 and the Workers runtime).
 * `@cloudflare/vitest-pool-workers` config in vitest.config.ts provides
 * `crypto.subtle`, `btoa`, `atob`, `TextEncoder`, `TextDecoder` natively.
 */

import { describe, it, expect } from 'vitest';
import { signJWT, verifyJWT, JWT_TTL_SECONDS, type JwtPayload } from './jwt';

/** Web-API base64url decode (avoids Node-only `Buffer` in the Workers pool). */
function decodeB64url(b64url: string): string {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  return atob(padded);
}

const SECRET = 'test-secret-at-least-32-bytes-long-for-hmac-sha256!!';
const DIFFERENT_SECRET = 'a-completely-different-secret-32-bytes-long!!!';

describe('jwt.signJWT', () => {
  it('signs a JWT with the correct structure (header.payload.signature)', async () => {
    const token = await signJWT({ deviceId: 'dev-123', appId: 'SpherePA' }, SECRET);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('includes deviceId, appId, iat, and exp in the payload', async () => {
    const token = await signJWT({ deviceId: 'dev-456', appId: 'MyApp' }, SECRET);
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(decodeB64url(payloadB64)) as JwtPayload;

    expect(payload.deviceId).toBe('dev-456');
    expect(payload.appId).toBe('MyApp');
    expect(payload.iat).toBeTypeOf('number');
    expect(payload.exp).toBeTypeOf('number');
    expect(payload.exp - payload.iat).toBe(JWT_TTL_SECONDS);
  });

  it('uses HS256 algorithm in the header', async () => {
    const token = await signJWT({ deviceId: 'x', appId: 'y' }, SECRET);
    const [headerB64] = token.split('.');
    const header = JSON.parse(decodeB64url(headerB64));
    expect(header.alg).toBe('HS256');
    expect(header.typ).toBe('JWT');
  });

  it('throws when the secret is empty', async () => {
    await expect(signJWT({ deviceId: 'x', appId: 'y' }, '')).rejects.toThrow(
      'JWT_SECRET is not configured',
    );
  });

  it('supports custom TTL', async () => {
    const token = await signJWT({ deviceId: 'd', appId: 'a' }, SECRET, 300);
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(decodeB64url(payloadB64)) as JwtPayload;
    expect(payload.exp - payload.iat).toBe(300);
  });
});

describe('jwt.verifyJWT', () => {
  it('verifies a valid token and returns the payload', async () => {
    const token = await signJWT({ deviceId: 'dev-789', appId: 'TestApp' }, SECRET);
    const payload = await verifyJWT(token, SECRET);

    expect(payload).not.toBeNull();
    expect(payload!.deviceId).toBe('dev-789');
    expect(payload!.appId).toBe('TestApp');
  });

  it('returns null for a token signed with a different secret', async () => {
    const token = await signJWT({ deviceId: 'd', appId: 'a' }, SECRET);
    const payload = await verifyJWT(token, DIFFERENT_SECRET);
    expect(payload).toBeNull();
  });

  it('returns null for a tampered payload', async () => {
    const token = await signJWT({ deviceId: 'original', appId: 'a' }, SECRET);
    const [headerB64, payloadB64, signatureB64] = token.split('.');

    // Decode payload, change deviceId, re-encode (signature won't match).
    const payload = JSON.parse(decodeB64url(payloadB64)) as { deviceId: string };
    payload.deviceId = 'tampered';
    const tamperedPayloadB64 = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const tamperedToken = `${headerB64}.${tamperedPayloadB64}.${signatureB64}`;

    const result = await verifyJWT(tamperedToken, SECRET);
    expect(result).toBeNull();
  });

  it('returns null for a malformed token (wrong number of parts)', async () => {
    expect(await verifyJWT('not.a.jwt.too-many-parts', SECRET)).toBeNull();
    expect(await verifyJWT('onlyonepart', SECRET)).toBeNull();
    expect(await verifyJWT('', SECRET)).toBeNull();
  });

  it('returns null for an expired token', async () => {
    // Sign with TTL of -100 (already expired 100 seconds ago).
    const token = await signJWT({ deviceId: 'd', appId: 'a' }, SECRET, -100);
    const payload = await verifyJWT(token, SECRET);
    expect(payload).toBeNull();
  });

  it('returns null when the secret is empty', async () => {
    const token = await signJWT({ deviceId: 'd', appId: 'a' }, SECRET);
    expect(await verifyJWT(token, '')).toBeNull();
  });

  it('accepts a token within the clock-skew tolerance (5s before expiry)', async () => {
    // TTL of -3 seconds — within the 5-second tolerance window.
    const token = await signJWT({ deviceId: 'd', appId: 'a' }, SECRET, -3);
    const payload = await verifyJWT(token, SECRET);
    // Should still be valid (within tolerance).
    expect(payload).not.toBeNull();
    expect(payload!.deviceId).toBe('d');
  });
});

describe('jwt round-trip', () => {
  it('sign → verify → payload matches for many iterations', async () => {
    for (let i = 0; i < 20; i++) {
      const deviceId = `device-${i}-${Math.random().toString(36).slice(2)}`;
      const token = await signJWT({ deviceId, appId: 'StressApp' }, SECRET);
      const payload = await verifyJWT(token, SECRET);
      expect(payload).not.toBeNull();
      expect(payload!.deviceId).toBe(deviceId);
      expect(payload!.appId).toBe('StressApp');
    }
  });
});