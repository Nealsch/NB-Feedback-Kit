import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import app from './index';
import { createAuthMiddleware } from './middleware/auth';
import { hashApiKey } from './auth/hash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEnv = Record<string, any>;

// FEEDBACK-4: The auth middleware now hashes keys before KV lookup.
// Pre-compute the SHA-256 hash of the test key so the mock KV can resolve it.
const VALID_KEY = 'valid-key-123';
const VALID_KEY_HASH = await hashApiKey(VALID_KEY);

/**
 * Helper to create a mock env object with KV and DO stubs.
 */
function createMockEnv(): AnyEnv {
  return {
    API_KEYS: {
      get: async (key: string) => {
        // FEEDBACK-4: Accept both the hashed form and the raw key (migration
        // fallback path). The auth middleware tries the hash first, then raw.
        if (key === VALID_KEY_HASH || key === VALID_KEY) {
          return JSON.stringify({
            name: 'Test App',
            github: { owner: 'test-owner', repo: 'test-repo' },
            rateLimit: 30,
          });
        }
        return null;
      },
    },
    RATE_LIMITER: {
      idFromName: (_name: string) => ({ name: _name }),
      get: () => ({
        fetch: async (input: Request | string, init?: RequestInit) => {
          // Handle both (url, init) and (Request) patterns
          const req = typeof input === 'string' ? new Request(input, init) : input;
          const body = (await req.json()) as { limit: number };
          return new Response(
            JSON.stringify({ success: true, limit: body.limit, remaining: body.limit - 1 }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': String(body.limit),
                'X-RateLimit-Remaining': String(body.limit - 1),
                'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
              },
            }
          );
        },
      }),
    },
    GITHUB_TOKEN: 'mock-github-token',
  };
}

describe('API Foundation Tests', () => {
  describe('GET /', () => {
    it('should return API info with 200 status', async () => {
      const req = new Request('http://localhost/');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);

      const data: any = await res.json();
      expect(data).toHaveProperty('name', 'NB Feedback Kit API');
      expect(data).toHaveProperty('version', '0.0.1');
      expect(data).toHaveProperty('endpoints');
      expect(data.endpoints).toHaveProperty('health');
      expect(data.endpoints).toHaveProperty('feedback');
    });

    it('should have correct content-type header', async () => {
      const req = new Request('http://localhost/');
      const res = await app.fetch(req);

      expect(res.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('GET /health', () => {
    it('should return health status with 200', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);

      const data: any = await res.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('service', 'nb-feedback-api');
      expect(data).toHaveProperty('version', '0.0.1');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return valid ISO timestamp', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);

      const data: any = await res.json();
      const timestamp = new Date(data.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers on GET requests', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);

      // FEEDBACK-4: When ALLOWED_ORIGINS is unset, origin resolves to '*'
      // (public mode). Browsers reject `credentials: true` with wildcard
      // origins per the CORS spec, so the credentials header is omitted.
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const req = new Request('http://localhost/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      const res = await app.fetch(req);

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    });

    it('should allow X-API-Key header in CORS', async () => {
      const req = new Request('http://localhost/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'X-API-Key',
        },
      });
      const res = await app.fetch(req);

      expect(res.headers.get('access-control-allow-headers')).toContain('X-API-Key');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const req = new Request('http://localhost/non-existent');
      const res = await app.fetch(req);

      expect(res.status).toBe(404);

      const data: any = await res.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error', 'Endpoint not found');
      expect(data).toHaveProperty('path', '/non-existent');
      expect(data).toHaveProperty('method', 'GET');
    });
  });

  describe('Error Handling', () => {
    it('should return structured error responses', async () => {
      const req = new Request('http://localhost/test-error');
      const res = await app.fetch(req);

      expect(res.status).toBe(404);

      const data: any = await res.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    it('should not expose sensitive server information', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);

      expect(res.headers.get('server')).toBeNull();
      expect(res.headers.get('x-powered-by')).toBeNull();
    });
  });

  describe('HTTP Methods', () => {
    it('should only allow GET on health endpoint', async () => {
      const req = new Request('http://localhost/health', {
        method: 'POST',
      });
      const res = await app.fetch(req);

      expect(res.status).toBe(404);
    });

    it('should handle GET requests correctly', async () => {
      const req = new Request('http://localhost/');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);
    });
  });
});

describe('API Authentication (TASK-005)', () => {
  describe('Auth endpoints require API key', () => {
    it('should return 401 when X-API-Key header is missing', async () => {
      const req = new Request('http://localhost/api/feedback', {
        method: 'POST',
      });
      const res = await app.fetch(req);

      expect(res.status).toBe(401);
    });

    it('should return 401 when X-API-Key header is missing on /api/releases', async () => {
      const req = new Request('http://localhost/api/releases');
      const res = await app.fetch(req);

      expect(res.status).toBe(401);
    });

    it('should return 401 when X-API-Key header is missing on /api/roadmap', async () => {
      const req = new Request('http://localhost/api/roadmap');
      const res = await app.fetch(req);

      expect(res.status).toBe(401);
    });
  });

  describe('Authenticated endpoints with valid key (GitHub API integration)', () => {
    it('should return 502 (GitHub API unavailable) for /api/feedback with valid auth', async () => {
      const env = createMockEnv();
      const req = new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: {
          'X-API-Key': 'valid-key-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'bug',
          title: 'Test bug report',
          description: 'This is a test bug report with sufficient length.',
          metadata: {
            application: 'Test App',
            version: '1.0.0',
            route: '/test',
            browser: 'Chrome',
            os: 'Windows',
            screenResolution: '1920x1080',
            timestamp: new Date().toISOString(),
          },
        }),
      });
      const res = await (app as any).fetch(req, env, {});

      expect(res.status).toBe(502);

      const data: any = await res.json();
      expect(data).toHaveProperty('success', false);
    });

    it('should return 502 (GitHub API unavailable) for /api/releases with valid auth', async () => {
      const env = createMockEnv();
      const req = new Request('http://localhost/api/releases', {
        headers: { 'X-API-Key': 'valid-key-123' },
      });
      const res = await (app as any).fetch(req, env, {});

      expect(res.status).toBe(502);
    });

    it('should return 502 (GitHub API unavailable) for /api/roadmap with valid auth', async () => {
      const env = createMockEnv();
      const req = new Request('http://localhost/api/roadmap', {
        headers: { 'X-API-Key': 'valid-key-123' },
      });
      const res = await (app as any).fetch(req, env, {});

      expect(res.status).toBe(502);
    });

    it('should include X-RateLimit headers on authenticated requests', async () => {
      const env = createMockEnv();
      const req = new Request('http://localhost/api/releases', {
        headers: { 'X-API-Key': 'valid-key-123' },
      });
      const res = await (app as any).fetch(req, env, {});

      expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
      expect(res.headers.get('X-RateLimit-Remaining')).not.toBeNull();
    });
  });

  describe('Auth middleware unit tests', () => {
    it('should reject requests without API key', async () => {
      const testApp = new Hono();
      testApp.use('*', createAuthMiddleware());
      testApp.get('/test', (c) => c.json({ ok: true }));

      const req = new Request('http://localhost/test');
      const res = await testApp.fetch(req);

      expect(res.status).toBe(401);

      const data: any = await res.json();
      // FEEDBACK-2: auth now accepts either Bearer JWT or X-API-Key.
      expect(data.error).toContain('Authentication required');
    });

    it('should reject requests with invalid API key', async () => {
      const testApp = new Hono();
      testApp.use('*', createAuthMiddleware());
      testApp.get('/test', (c) => c.json({ ok: true }));

      const env = {
        API_KEYS: {
          get: async () => null,
        },
        RATE_LIMITER: {
          idFromName: (_name: string) => ({ name: _name }),
          get: () => ({
            fetch: async () => new Response('ok', { status: 200 }),
          }),
        },
      };

      const req = new Request('http://localhost/test', {
        headers: { 'X-API-Key': 'invalid-key' },
      });
      const res = await (testApp as any).fetch(req, env, {});

      expect(res.status).toBe(401);

      const data: any = await res.json();
      expect(data.error).toBe('Invalid API key');
    });
  });
});

// ---------------------------------------------------------------------------
// FEEDBACK-4: Hardening — field-length caps, hashed-key auth, CORS allowlist
// ---------------------------------------------------------------------------

describe('FEEDBACK-4: Server-Side Field-Length Caps', () => {
  it('should accept a submission with a very long title (truncates silently)', async () => {
    const env = createMockEnv();
    const longTitle = 'A'.repeat(500); // exceeds MAX_TITLE_LENGTH (200)
    const req = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: {
        'X-API-Key': VALID_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'bug',
        title: longTitle,
        description: 'This is a valid description with enough characters.',
        metadata: {
          application: 'Test App',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      }),
    });
    const res = await (app as any).fetch(req, env, {});

    // Should NOT be 400 (validation failure) — truncation happens before
    // the GitHub call, which will 502 because GITHUB_TOKEN is mock.
    expect(res.status).not.toBe(400);
  });

  it('should accept a submission with a very long description (truncates silently)', async () => {
    const env = createMockEnv();
    const longDesc = 'x'.repeat(50000); // exceeds MAX_DESCRIPTION_LENGTH (10000)
    const req = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: {
        'X-API-Key': VALID_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'feature',
        title: 'Valid title',
        description: longDesc,
        metadata: {
          application: 'Test App',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      }),
    });
    const res = await (app as any).fetch(req, env, {});

    expect(res.status).not.toBe(400);
  });
});

describe('FEEDBACK-4: Hashed API Key Authentication', () => {
  it('should authenticate via the SHA-256 hash of the key (preferred path)', async () => {
    const testApp = new Hono();
    testApp.use('*', createAuthMiddleware());
    testApp.get('/test', (c) => c.json({ ok: true }));

    const env = {
      API_KEYS: {
        // Only the hash is stored — the raw key should NOT resolve.
        get: async (key: string) => {
          if (key === VALID_KEY_HASH) {
            return JSON.stringify({
              name: 'Test App',
              github: { owner: 'test-owner', repo: 'test-repo' },
              rateLimit: 30,
            });
          }
          return null;
        },
      },
      RATE_LIMITER: {
        idFromName: (_name: string) => ({ name: _name }),
        get: () => ({
          fetch: async (_input: Request | string, init?: RequestInit) => {
            const body = init?.body ? JSON.parse(init.body as string) : { limit: 30 };
            return new Response(
              JSON.stringify({ success: true, remaining: body.limit - 1 }),
              {
                status: 200,
                headers: {
                  'X-RateLimit-Limit': String(body.limit),
                  'X-RateLimit-Remaining': String(body.limit - 1),
                },
              },
            );
          },
        }),
      },
    };

    const req = new Request('http://localhost/test', {
      headers: { 'X-API-Key': VALID_KEY },
    });
    const res = await (testApp as any).fetch(req, env, {});

    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.ok).toBe(true);
  });

  it('should fall back to raw-key lookup for pre-FEEDBACK-4 deployments', async () => {
    const testApp = new Hono();
    testApp.use('*', createAuthMiddleware());
    testApp.get('/test', (c) => c.json({ ok: true }));

    const env = {
      API_KEYS: {
        // Only the raw key is stored — no hash (legacy deployment).
        get: async (key: string) => {
          if (key === VALID_KEY) {
            return JSON.stringify({
              name: 'Legacy App',
              github: { owner: 'legacy-owner', repo: 'legacy-repo' },
              rateLimit: 10,
            });
          }
          return null;
        },
      },
      RATE_LIMITER: {
        idFromName: (_name: string) => ({ name: _name }),
        get: () => ({
          fetch: async () =>
            new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'X-RateLimit-Remaining': '9' },
            }),
        }),
      },
    };

    const req = new Request('http://localhost/test', {
      headers: { 'X-API-Key': VALID_KEY },
    });
    const res = await (testApp as any).fetch(req, env, {});

    expect(res.status).toBe(200);
  });
});

describe('FEEDBACK-4: CORS Origin Allowlist', () => {
  it('should echo the origin when it is in ALLOWED_ORIGINS', async () => {
    const env: AnyEnv = {
      ...createMockEnv(),
      ALLOWED_ORIGINS: 'https://app.example.com, https://beta.example.com',
    };
    const req = new Request('http://localhost/health', {
      headers: { Origin: 'https://app.example.com' },
    });
    const res = await (app as any).fetch(req, env, {});

    expect(res.headers.get('access-control-allow-origin')).toBe(
      'https://app.example.com',
    );
  });

  it('should reject an origin not in ALLOWED_ORIGINS (empty echo)', async () => {
    const env: AnyEnv = {
      ...createMockEnv(),
      ALLOWED_ORIGINS: 'https://app.example.com',
    };
    const req = new Request('http://localhost/health', {
      headers: { Origin: 'https://evil.example.com' },
    });
    const res = await (app as any).fetch(req, env, {});

    // Hono/cors returns an empty string for non-allowed origins, which
    // means the header is either absent or empty.
    const origin = res.headers.get('access-control-allow-origin');
    expect(origin === null || origin === '').toBe(true);
  });

  it('should fall back to wildcard when ALLOWED_ORIGINS is unset', async () => {
    const env = createMockEnv(); // no ALLOWED_ORIGINS
    const req = new Request('http://localhost/health', {
      headers: { Origin: 'https://anything.com' },
    });
    const res = await (app as any).fetch(req, env, {});

    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
