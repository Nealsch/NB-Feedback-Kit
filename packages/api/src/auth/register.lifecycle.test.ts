/**
 * FEEDBACK-3 tests: device lifecycle (revoke / activate) + JWT auth path.
 *
 * These tests exercise the new revocation flow end-to-end through Hono's
 * request machinery, using the same in-memory KV mock pattern as
 * `register.test.ts`. They cover:
 *
 *   - `POST /api/devices/:id/revoke`  — happy path, 404, idempotent, invalid id
 *   - `POST /api/devices/:id/activate` — happy path, 404, idempotent, invalid id
 *   - Revoked device is blocked from re-registration (handleRegister 403)
 *   - Revoked device is blocked by the auth middleware (Bearer JWT path 403)
 *   - Per-device rate limiting: JWT path keys the DO by deviceId, not apiKey
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { handleRegister, handleRevoke, handleActivate } from './register';
import { createAuthMiddleware } from '../middleware/auth';
import { signJWT } from './jwt';
import type { ApiEnv } from '../env';

const SECRET = 'test-secret-at-least-32-bytes-long-for-hmac-sha256!!';
const BOOTSTRAP_KEY = 'spherepa-test-key-123';
const DEVICE_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const KV_CONFIG = JSON.stringify({
  name: 'SpherePA',
  github: { owner: 'Nealsch', repo: 'spherepa' },
  rateLimit: 30,
});

/** In-memory KV mock shared across a single test app so handlers + auth see the same store. */
function makeKv(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    /** Test-only helper to inspect the store directly. */
    _store: store,
  };
}

/** Mock RATE_LIMITER DO that always allows (returns 200). */
function makeRateLimiter() {
  return {
    idFromName: (name: string) => ({ name }),
    get: () => ({
      fetch: async (input: Request | string, init?: RequestInit) => {
        const req = typeof input === 'string' ? new Request(input, init) : input;
        const body = (await req.json().catch(() => ({}))) as { limit?: number };
        const limit = body.limit ?? 60;
        return new Response(
          JSON.stringify({ success: true, remaining: limit - 1 }),
          {
            status: 200,
            headers: {
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(limit - 1),
              'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
            },
          },
        );
      },
    }),
  };
}

function makeEnv(devicesKv?: ReturnType<typeof makeKv>): ApiEnv {
  return {
    API_KEYS: makeKv({ [BOOTSTRAP_KEY]: KV_CONFIG }) as unknown as ApiEnv['API_KEYS'],
    DEVICES: (devicesKv ?? makeKv()) as unknown as ApiEnv['DEVICES'],
    RATE_LIMITER: makeRateLimiter() as unknown as ApiEnv['RATE_LIMITER'],
    JWT_SECRET: SECRET,
  } as unknown as ApiEnv;
}

/**
 * Build a Hono app with register + auth + revoke/activate routes wired
 * exactly like index.ts.
 *
 * CRITICAL: The admin route handlers (`handleRevoke` / `handleActivate`) are
 * registered BEFORE the `createAuthMiddleware()` glob so that they are
 * terminal — the auth middleware never runs for `/api/devices/*` routes.
 * (In the real Worker, an `createAdminGuard()` sits in front of them instead.)
 */
function makeApp(env: ApiEnv) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.env = env;
    await next();
  });
  app.post('/api/register', handleRegister);
  // Admin routes registered BEFORE the auth middleware so they're terminal.
  app.post('/api/devices/:id/revoke', handleRevoke);
  app.post('/api/devices/:id/activate', handleActivate);
  // Auth middleware applies only to routes registered AFTER this point.
  app.use('/api/*', createAuthMiddleware());
  app.get('/api/protected', (c) => c.json({ ok: true }));
  return app;
}

// ---------------------------------------------------------------------------
// POST /api/devices/:id/revoke
// ---------------------------------------------------------------------------

describe('FEEDBACK-3: handleRevoke', () => {
  it('revokes an active device (200) and sets revokedAt', async () => {
    const devicesKv = makeKv({
      [DEVICE_ID]: JSON.stringify({
        deviceId: DEVICE_ID,
        appId: 'SpherePA',
        github: { owner: 'Nealsch', repo: 'spherepa' },
        rateLimit: 30,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastSeenAt: '2025-01-01T00:00:00.000Z',
      }),
    });
    const env = makeEnv(devicesKv);
    const app = makeApp(env);

    const res = await app.request(`http://test/api/devices/${DEVICE_ID}/revoke`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; revokedAt: string };
    expect(json.success).toBe(true);
    expect(json.revokedAt).toBeDefined();

    // Verify the flag persisted.
    const stored = JSON.parse(devicesKv._store.get(DEVICE_ID)!);
    expect(stored.revoked).toBe(true);
    expect(stored.revokedAt).toBe(json.revokedAt);
  });

  it('returns 404 for an unknown device', async () => {
    const env = makeEnv();
    const app = makeApp(env);

    const res = await app.request(`http://test/api/devices/${DEVICE_ID}/revoke`, {
      method: 'POST',
    });

    expect(res.status).toBe(404);
  });

  it('is idempotent — revoking an already-revoked device returns 200', async () => {
    const devicesKv = makeKv({
      [DEVICE_ID]: JSON.stringify({
        deviceId: DEVICE_ID,
        appId: 'SpherePA',
        github: { owner: 'Nealsch', repo: 'spherepa' },
        rateLimit: 30,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastSeenAt: '2025-01-01T00:00:00.000Z',
        revoked: true,
        revokedAt: '2025-01-02T00:00:00.000Z',
      }),
    });
    const env = makeEnv(devicesKv);
    const app = makeApp(env);

    const res = await app.request(`http://test/api/devices/${DEVICE_ID}/revoke`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; message: string };
    expect(json.message).toContain('Already revoked');
  });

  it('rejects a malformed device id (400)', async () => {
    const env = makeEnv();
    const app = makeApp(env);

    const res = await app.request('http://test/api/devices/not-a-uuid/revoke', {
      method: 'POST',
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/devices/:id/activate
// ---------------------------------------------------------------------------

describe('FEEDBACK-3: handleActivate', () => {
  it('reactivates a revoked device (200) and clears revokedAt', async () => {
    const devicesKv = makeKv({
      [DEVICE_ID]: JSON.stringify({
        deviceId: DEVICE_ID,
        appId: 'SpherePA',
        github: { owner: 'Nealsch', repo: 'spherepa' },
        rateLimit: 30,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastSeenAt: '2025-01-01T00:00:00.000Z',
        revoked: true,
        revokedAt: '2025-01-02T00:00:00.000Z',
      }),
    });
    const env = makeEnv(devicesKv);
    const app = makeApp(env);

    const res = await app.request(`http://test/api/devices/${DEVICE_ID}/activate`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean };
    expect(json.success).toBe(true);

    // Verify the flag was cleared.
    const stored = JSON.parse(devicesKv._store.get(DEVICE_ID)!);
    expect(stored.revoked).toBe(false);
    expect(stored.revokedAt).toBeUndefined();
  });

  it('returns 404 for an unknown device', async () => {
    const env = makeEnv();
    const app = makeApp(env);

    const res = await app.request(`http://test/api/devices/${DEVICE_ID}/activate`, {
      method: 'POST',
    });

    expect(res.status).toBe(404);
  });

  it('is idempotent — activating an already-active device returns 200', async () => {
    const devicesKv = makeKv({
      [DEVICE_ID]: JSON.stringify({
        deviceId: DEVICE_ID,
        appId: 'SpherePA',
        github: { owner: 'Nealsch', repo: 'spherepa' },
        rateLimit: 30,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastSeenAt: '2025-01-01T00:00:00.000Z',
      }),
    });
    const env = makeEnv(devicesKv);
    const app = makeApp(env);

    const res = await app.request(`http://test/api/devices/${DEVICE_ID}/activate`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; message: string };
    expect(json.message).toContain('Already active');
  });

  it('rejects a malformed device id (400)', async () => {
    const env = makeEnv();
    const app = makeApp(env);

    const res = await app.request('http://test/api/devices/not-a-uuid/activate', {
      method: 'POST',
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Revocation enforcement: register + auth middleware
// ---------------------------------------------------------------------------

describe('FEEDBACK-3: revocation enforcement', () => {
  it('blocks a revoked device from re-registering (POST /api/register → 403)', async () => {
    const devicesKv = makeKv({
      [DEVICE_ID]: JSON.stringify({
        deviceId: DEVICE_ID,
        appId: 'SpherePA',
        github: { owner: 'Nealsch', repo: 'spherepa' },
        rateLimit: 30,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastSeenAt: '2025-01-01T00:00:00.000Z',
        revoked: true,
        revokedAt: '2025-01-02T00:00:00.000Z',
      }),
    });
    const env = makeEnv(devicesKv);
    const app = makeApp(env);

    const res = await app.request('http://test/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BOOTSTRAP_KEY,
      },
      body: JSON.stringify({ deviceId: DEVICE_ID }),
    });

    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('revoked');
  });

  it('blocks a revoked device at the auth middleware (Bearer JWT → 403)', async () => {
    const devicesKv = makeKv({
      [DEVICE_ID]: JSON.stringify({
        deviceId: DEVICE_ID,
        appId: 'SpherePA',
        github: { owner: 'Nealsch', repo: 'spherepa' },
        rateLimit: 30,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastSeenAt: '2025-01-01T00:00:00.000Z',
        revoked: true,
        revokedAt: '2025-01-02T00:00:00.000Z',
      }),
    });
    const env = makeEnv(devicesKv);
    const app = makeApp(env);

    // Mint a valid JWT — the signature will verify, but the revocation flag
    // should still block the request.
    const token = await signJWT({ deviceId: DEVICE_ID, appId: 'SpherePA' }, SECRET);

    const res = await app.request('http://test/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('revoked');
  });

  it('admits an active device with a valid Bearer JWT (200)', async () => {
    const devicesKv = makeKv({
      [DEVICE_ID]: JSON.stringify({
        deviceId: DEVICE_ID,
        appId: 'SpherePA',
        github: { owner: 'Nealsch', repo: 'spherepa' },
        rateLimit: 30,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastSeenAt: '2025-01-01T00:00:00.000Z',
      }),
    });
    const env = makeEnv(devicesKv);
    const app = makeApp(env);

    const token = await signJWT({ deviceId: DEVICE_ID, appId: 'SpherePA' }, SECRET);

    const res = await app.request('http://test/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it('rejects a Bearer JWT for a device not in DEVICES KV (401)', async () => {
    const env = makeEnv(); // empty DEVICES
    const app = makeApp(env);

    const token = await signJWT({ deviceId: DEVICE_ID, appId: 'SpherePA' }, SECRET);

    const res = await app.request('http://test/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Per-device rate limiting
// ---------------------------------------------------------------------------

describe('FEEDBACK-3: per-device rate limiting', () => {
  it('keys the rate-limit DO by deviceId on the JWT path', async () => {
    // Use a spy DO that records the key it was invoked with.
    const seenKeys: string[] = [];
    const rateLimiter = {
      idFromName: (name: string) => {
        seenKeys.push(name);
        return { name };
      },
      get: () => ({
        fetch: async () =>
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'X-RateLimit-Remaining': '29' },
          }),
      }),
    };

    const env = {
      API_KEYS: makeKv({ [BOOTSTRAP_KEY]: KV_CONFIG }),
      DEVICES: makeKv({
        [DEVICE_ID]: JSON.stringify({
          deviceId: DEVICE_ID,
          appId: 'SpherePA',
          github: { owner: 'Nealsch', repo: 'spherepa' },
          rateLimit: 30,
          createdAt: '2025-01-01T00:00:00.000Z',
          lastSeenAt: '2025-01-01T00:00:00.000Z',
        }),
      }),
      RATE_LIMITER: rateLimiter,
      JWT_SECRET: SECRET,
    } as unknown as ApiEnv;

    const app = makeApp(env);
    const token = await signJWT({ deviceId: DEVICE_ID, appId: 'SpherePA' }, SECRET);

    await app.request('http://test/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(seenKeys).toContain(DEVICE_ID);
    // The bootstrap key must NOT leak into the rate-limit key on the JWT path.
    expect(seenKeys).not.toContain(BOOTSTRAP_KEY);
  });

  it('keys the rate-limit DO by apiKey on the legacy path', async () => {
    const seenKeys: string[] = [];
    const rateLimiter = {
      idFromName: (name: string) => {
        seenKeys.push(name);
        return { name };
      },
      get: () => ({
        fetch: async () =>
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'X-RateLimit-Remaining': '29' },
          }),
      }),
    };

    const env = {
      API_KEYS: makeKv({ [BOOTSTRAP_KEY]: KV_CONFIG }),
      DEVICES: makeKv(),
      RATE_LIMITER: rateLimiter,
      JWT_SECRET: SECRET,
    } as unknown as ApiEnv;

    const app = makeApp(env);

    await app.request('http://test/api/protected', {
      headers: { 'X-API-Key': BOOTSTRAP_KEY },
    });

    expect(seenKeys).toContain(BOOTSTRAP_KEY);
  });
});