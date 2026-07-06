/**
 * Unit tests for the device registration handler (FEEDBACK-2).
 *
 * Uses Hono's built-in test app to exercise the handler end-to-end without
 * a real Workers runtime. KV namespaces are mocked with an in-memory Map.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { handleRegister } from './register';
import { verifyJWT } from './jwt';
import type { ApiEnv } from '../env';

const SECRET = 'test-secret-at-least-32-bytes-long-for-hmac-sha256!!';
const BOOTSTRAP_KEY = 'spherepa-test-key-123';
const KV_CONFIG = JSON.stringify({
  name: 'SpherePA',
  github: { owner: 'Nealsch', repo: 'spherepa' },
  rateLimit: 30,
});

/** Minimal in-memory KV mock. */
function makeKv(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function makeEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
  return {
    API_KEYS: makeKv({ [BOOTSTRAP_KEY]: KV_CONFIG }) as unknown as ApiEnv['API_KEYS'],
    DEVICES: makeKv() as unknown as ApiEnv['DEVICES'],
    JWT_SECRET: SECRET,
    ...overrides,
  } as unknown as ApiEnv;
}

function makeApp(env: ApiEnv) {
  const app = new Hono();
  app.post('/api/register', (c) => handleRegister(c));
  // @ts-expect-error — inject env for the test
  app.env = env;
  // Wrap to set env on context
  return new Hono().route(
    '/',
    new Proxy(app, {
      get(target, prop) {
        // @ts-expect-error
        const orig = target[prop];
        if (typeof orig === 'function') {
          // @ts-expect-error
          return (...args) => orig.apply(target, [{ ...args[0], env }]);
        }
        return orig;
      },
    }),
  );
}

// Simpler: just build request manually and call the handler with a constructed context.
async function callRegister(env: ApiEnv, headers: Record<string, string>, body: unknown) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.env = env;
    await next();
  });
  app.post('/api/register', handleRegister);
  return app.request('http://test/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('register.handleRegister — happy path', () => {
  it('returns 201 with deviceId + JWT for valid bootstrap key', async () => {
    const env = makeEnv();
    const res = await callRegister(env, { 'X-API-Key': BOOTSTRAP_KEY }, null);

    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      success: boolean;
      deviceId: string;
      token: string;
      expiresIn: number;
    };
    expect(json.success).toBe(true);
    expect(json.deviceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(json.token.split('.')).toHaveLength(3);
    expect(json.expiresIn).toBeGreaterThan(0);

    // The JWT should verify with the secret.
    const payload = await verifyJWT(json.token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.deviceId).toBe(json.deviceId);
    expect(payload!.appId).toBe('SpherePA');
  });

  it('persists the device record in DEVICES KV with config snapshot', async () => {
    const devicesKv = makeKv();
    const env = makeEnv({
      DEVICES: devicesKv as unknown as ApiEnv['DEVICES'],
    });
    const res = await callRegister(env, { 'X-API-Key': BOOTSTRAP_KEY }, null);
    const json = (await res.json()) as { deviceId: string };

    const stored = await devicesKv.get(json.deviceId);
    expect(stored).not.toBeNull();
    const record = JSON.parse(stored!);
    expect(record.appId).toBe('SpherePA');
    expect(record.github).toEqual({ owner: 'Nealsch', repo: 'spherepa' });
    expect(record.rateLimit).toBe(30);
    expect(record.createdAt).toBeDefined();
    expect(record.lastSeenAt).toBeDefined();
  });

  it('accepts an existing deviceId in the body (token refresh)', async () => {
    const env = makeEnv();
    const existingId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const res = await callRegister(env, { 'X-API-Key': BOOTSTRAP_KEY }, { deviceId: existingId });
    const json = (await res.json()) as { deviceId: string };
    expect(json.deviceId).toBe(existingId);
  });
});

describe('register.handleRegister — failure cases', () => {
  it('returns 401 when X-API-Key is missing', async () => {
    const res = await callRegister(makeEnv(), {}, null);
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('Missing');
  });

  it('returns 401 for an invalid bootstrap key', async () => {
    const res = await callRegister(makeEnv(), { 'X-API-Key': 'wrong-key' }, null);
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('Invalid');
  });

  it('returns 500 when JWT_SECRET is not configured', async () => {
    const env = makeEnv({ JWT_SECRET: '' as unknown as string });
    const res = await callRegister(env, { 'X-API-Key': BOOTSTRAP_KEY }, null);
    expect(res.status).toBe(500);
  });
});

describe('register.isValidUuid', () => {
  it('validates a well-formed UUID', async () => {
    const { isValidUuid } = await import('./register');
    expect(isValidUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(true);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('')).toBe(false);
  });
});