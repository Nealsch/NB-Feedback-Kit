import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createAuthMiddleware } from './middleware/auth';
import type { FeedbackConfig } from './types';
import type { FeedbackPayload } from '@nb-feedback-kit/shared-types';
import type { ApiEnv } from './env';
import { createGitHubIssue, getReleases, getRoadmap } from './github/client';
import { resolveGitHubToken } from './github/app-auth';
import { handlePresign } from './storage/presign';
import { handleUpload } from './storage/uploads';
import { handleRegister, handleRevoke, handleActivate } from './auth/register';

// Durable Object entrypoint export.
// Required by Wrangler whenever a [[durable_objects.bindings]] entry references
// this class — otherwise deploy fails with "RateLimiter ... not exported in your
// entrypoint file". The class itself lives in ./rate-limiter.ts.
import { RateLimiter } from './rate-limiter';
export { RateLimiter };

const app = new Hono();

// FEEDBACK-4: CORS origin allowlist.
//
// The previous config combined `origin: '*'` with `credentials: true`, which
// browsers silently reject per the CORS spec (credentials require an explicit
// origin). We now resolve the origin dynamically:
//   - If `ALLOWED_ORIGINS` is set, credentialed requests are allowed only from
//     listed origins (echo-back with `credentials: true`).
//   - If unset, fall back to `*` WITHOUT credentials (public, unauthenticated).
const corsOriginResolver = (origin: string, c: Context): string => {
  // FEEDBACK-4: Guard against undefined env (e.g. in unit tests calling
  // app.fetch(req) without an env arg). In the Workers runtime env is
  // always defined, but defensive coding here prevents a 500 crash.
  const env = (c.env as unknown as ApiEnv) ?? undefined;
  const allowed = (env?.ALLOWED_ORIGINS ?? '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return '*'; // public mode — no credentials
  return allowed.includes(origin) ? origin : '';
};

app.use('*', cors({
  origin: corsOriginResolver,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
  // `credentials: true` is only valid when a specific origin is echoed back.
  // When origin resolves to '*', Hono/cors omits the credentials header.
  credentials: true,
}));

// Logger middleware for request logging
app.use('*', logger());

// Global error handler
app.onError((err, c) => {
  console.error('API Error:', err);

  return c.json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  }, 500);
});

// Public endpoints (no auth required)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'nb-feedback-api',
    version: '0.0.1',
    timestamp: new Date().toISOString(),
  });
});

// API info endpoint
app.get('/', (c) => {
  return c.json({
    name: 'NB Feedback Kit API',
    version: '0.0.1',
    endpoints: {
      health: 'GET /health',
      register: 'POST /api/register',
      feedback: 'POST /api/feedback',
      releases: 'GET /api/releases',
      roadmap: 'GET /api/roadmap',
      uploads: 'POST /api/uploads',
      presign: 'POST /api/uploads/presign',
    },
    documentation: 'https://github.com/your-org/nb-feedback-kit',
  });
});

// FEEDBACK-2: Device registration. Mounted BEFORE the `/api/*` auth middleware
// because registration uses the bootstrap X-API-Key directly (the caller is
// exchanging it for a per-device JWT). All other `/api/*` routes accept either
// `Authorization: Bearer <jwt>` (FEEDBACK-2) or `X-API-Key` (legacy FEEDBACK-1).
app.post('/api/register', handleRegister);

// FEEDBACK-3: Admin-only device lifecycle routes. Guarded by a separate
// `ADMIN_TOKEN` secret (NOT the API key or JWT scheme) so compromised client
// credentials cannot self-revoke or un-ban devices. Mounted BEFORE the regular
// `/api/*` middleware to avoid double-rate-limiting admin tooling.
app.use('/api/devices/*', createAdminGuard());
app.post('/api/devices/:id/revoke', handleRevoke);
app.post('/api/devices/:id/activate', handleActivate);

// Authenticated endpoints (require Authorization: Bearer <jwt> OR X-API-Key)
app.use('/api/*', createAuthMiddleware());

/**
 * POST /api/feedback
 * Creates a GitHub Issue from user feedback.
 * Requires: X-API-Key header, valid API key in KV store.
 * Body: FeedbackPayload (type, title, description, metadata)
 */
app.post('/api/feedback', async (c) => {
  const config = c.get('feedbackConfig') as FeedbackConfig;
  const env = c.env as unknown as ApiEnv;

  let payload: FeedbackPayload;
  try {
    payload = await c.req.json<FeedbackPayload>();
  } catch (err) {
    return c.json({
      success: false,
      error: 'Invalid JSON body',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  // Validate required fields
  if (!payload.type || !payload.title || !payload.description || !payload.metadata) {
    return c.json({
      success: false,
      error: 'Missing required fields: type, title, description, metadata',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  if (!['bug', 'feature', 'feedback'].includes(payload.type)) {
    return c.json({
      success: false,
      error: 'Invalid feedback type. Must be: bug, feature, or feedback',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  if (payload.title.trim().length < 3) {
    return c.json({
      success: false,
      error: 'Title must be at least 3 characters',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  // FEEDBACK-4: Server-side max-length caps prevent a single submission from
  // exhausting the GitHub issue body limit (65,536 chars) or the Worker's
  // subrequest body cap. Truncate rather than reject so the user never loses
  // their input.
  payload = {
    ...payload,
    title: payload.title.slice(0, MAX_TITLE_LENGTH),
    description: payload.description.slice(0, MAX_DESCRIPTION_LENGTH),
  };

  if (payload.description.trim().length < 10) {
    return c.json({
      success: false,
      error: 'Description must be at least 10 characters',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  // FEEDBACK-4: Cap metadata field lengths too — they're interpolated into
  // the issue body and a runaway field could push the body over GitHub's
  // 65,536-character limit.
  if (payload.metadata) {
    payload = { ...payload, metadata: clampMetadata(payload.metadata) };
  }

  // Sanitize & cap screenshot attachments before they reach GitHub. Never
  // trust client input — URLs and filenames are interpolated into the issue
  // body, so we rebuild the array from validated primitives.
  payload = sanitizeAttachments(payload);

  let githubToken: string;
  try {
    githubToken = await resolveGitHubToken(env, config.github);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ GitHub token resolution failed:', message);
    return c.json({
      success: false,
      error: 'Server configuration error: GitHub authentication not configured',
      timestamp: new Date().toISOString(),
    }, 500);
  }

  try {
    const result = await createGitHubIssue(githubToken, config.github, payload);

    console.log(`✅ Issue created: ${result.issueUrl} (app: ${config.applicationName})`);

    return c.json({
      success: true,
      issueUrl: result.issueUrl,
      issueNumber: result.issueNumber,
      timestamp: new Date().toISOString(),
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Failed to create GitHub issue:', message);

    return c.json({
      success: false,
      error: 'Failed to submit feedback. Please try again later.',
      details: message,
      timestamp: new Date().toISOString(),
    }, 502);
  }
});

/**
 * GET /api/releases
 * Fetches release notes from GitHub Releases.
 * Requires: X-API-Key header, valid API key in KV store.
 */
app.get('/api/releases', async (c) => {
  const config = c.get('feedbackConfig') as FeedbackConfig;
  const env = c.env as unknown as ApiEnv;

  let githubToken: string;
  try {
    githubToken = await resolveGitHubToken(env, config.github);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ GitHub token resolution failed:', message);
    return c.json({
      success: false,
      error: 'Server configuration error: GitHub authentication not configured',
      timestamp: new Date().toISOString(),
    }, 500);
  }

  try {
    const releases = await getReleases(githubToken, config.github);

    return c.json({
      success: true,
      releases,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Failed to fetch releases:', message);

    return c.json({
      success: false,
      error: 'Failed to fetch releases',
      details: message,
      timestamp: new Date().toISOString(),
    }, 502);
  }
});

/**
 * GET /api/roadmap
 * Fetches roadmap items from GitHub Issues with roadmap labels.
 * Requires: X-API-Key header, valid API key in KV store.
 */
app.get('/api/roadmap', async (c) => {
  const config = c.get('feedbackConfig') as FeedbackConfig;
  const env = c.env as unknown as ApiEnv;

  let githubToken: string;
  try {
    githubToken = await resolveGitHubToken(env, config.github);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ GitHub token resolution failed:', message);
    return c.json({
      success: false,
      error: 'Server configuration error: GitHub authentication not configured',
      timestamp: new Date().toISOString(),
    }, 500);
  }

  try {
    const items = await getRoadmap(githubToken, config.github);

    return c.json({
      success: true,
      roadmap: items,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Failed to fetch roadmap:', message);

    return c.json({
      success: false,
      error: 'Failed to fetch roadmap',
      details: message,
      timestamp: new Date().toISOString(),
    }, 502);
  }
});

/**
 * POST /api/uploads
 * Server-mediated screenshot upload via the native R2 binding. Preferred for
 * mobile clients: the app POSTs multipart/form-data (field name `file`) and
 * the Worker writes the bytes to R2, returning `{ url, filename, contentType,
 * size }`. No CORS, no client-visible cloud config, server-enforced size/type
 * caps (10 MiB, PNG/JPEG/WebP/GIF) plus magic-byte validation. Requires the
 * `R2_BUCKET` binding + `R2_PUBLIC_BASE_URL` Worker secret/env var.
 *
 * Requires: X-API-Key header (enforced by the `/api/*` auth middleware).
 */
app.post('/api/uploads', handleUpload);

/**
 * POST /api/uploads/presign
 * Issues a short-lived, S3-compatible presigned PUT URL so the SDK can
 * upload screenshots directly to the developer's cloud bucket. Cloud
 * credentials live only as Worker secrets; the client receives only the
 * signed URL and the canonical public URL.
 *
 * Requires: X-API-Key header (enforced by the `/api/*` auth middleware).
 * Body: PresignRequest (provider, filename, contentType, bucket, region, …)
 */
app.post('/api/uploads/presign', handlePresign);

/** Maximum number of screenshot attachments accepted per submission. */
const MAX_ATTACHMENTS = 5;
/** Maximum byte size reported per attachment (informational only — not enforced server-side). */
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

// FEEDBACK-4: Server-side field-length caps. These guard against a single
// submission pushing the GitHub issue body past its 65,536-character limit
// or exhausting the Worker's subrequest budget. Values are deliberately
// generous for normal use, but bounded.
/** Maximum title length (GitHub issue titles cap at 256 — we stay under). */
const MAX_TITLE_LENGTH = 200;
/** Maximum description length (stays well under the 65,536-char body limit). */
const MAX_DESCRIPTION_LENGTH = 10000;
/** Maximum length for any single metadata string field. */
const MAX_METADATA_FIELD_LENGTH = 500;

/**
 * Clamp all string fields on a {@link FeedbackMetadata} object to
 * {@link MAX_METADATA_FIELD_LENGTH}. Returns a shallow copy so the original
 * is untouched. Non-string fields are passed through.
 */
function clampMetadata(meta: FeedbackPayload['metadata']): FeedbackPayload['metadata'] {
  if (!meta || typeof meta !== 'object') return meta;
  const clamped = { ...meta };
  for (const [key, value] of Object.entries(clamped)) {
    if (typeof value === 'string') {
      (clamped as Record<string, unknown>)[key] = value.slice(0, MAX_METADATA_FIELD_LENGTH);
    }
  }
  return clamped;
}

/**
 * Validate and normalize the `attachments` field on a feedback payload.
 *
 * Drops attachments that are missing a URL, carry a disallowed scheme, or
 * exceed reasonable length caps. Caps the total count to {@link MAX_ATTACHMENTS}.
 * Returns a payload whose `attachments` (if present) is a fresh array of
 * validated, minimal {@link UploadedFile} objects — no client-supplied extra
 * properties survive.
 */
function sanitizeAttachments(payload: FeedbackPayload): FeedbackPayload {
  if (!payload.attachments || !Array.isArray(payload.attachments)) {
    // Ensure malformed non-array values are removed entirely.
    const { attachments: _dropped, ...rest } = payload;
    return rest as FeedbackPayload;
  }

  const cleaned = payload.attachments
    .filter((a): a is { url: string; filename: string; contentType: string; size: number } => {
      return (
        !!a &&
        typeof a === 'object' &&
        typeof a.url === 'string' &&
        typeof a.filename === 'string' &&
        typeof a.contentType === 'string'
      );
    })
    .filter((a) => isSafeUrl(a.url) && a.filename.length <= 256 && a.url.length <= 2048)
    .slice(0, MAX_ATTACHMENTS)
    .map((a) => ({
      url: a.url,
      filename: a.filename.slice(0, 256),
      contentType: a.contentType.slice(0, 100),
      size: typeof a.size === 'number' && a.size >= 0 && a.size <= MAX_ATTACHMENT_SIZE ? a.size : 0,
    }));

  // Preserve absence when nothing valid remains, to keep payloads minimal.
  return { ...payload, attachments: cleaned };
}

/**
 * Only http(s) URLs may be embedded in the issue body. Rejects `javascript:`,
 * `data:`, and other schemes that could be rendered by GitHub or downstream
 * Markdown renderers.
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * FEEDBACK-3: Admin guard middleware.
 *
 * Protects device lifecycle routes (`/api/devices/:id/revoke` and `/activate`)
 * with a dedicated `ADMIN_TOKEN` secret. This is intentionally separate from
 * the dual JWT/X-API-Key scheme so that compromised client credentials cannot
 * self-revoke or un-ban devices. The token is compared via a constant-time
 * equality check to resist timing attacks.
 *
 * Fail-closed: if `ADMIN_TOKEN` is unset, the routes return 503 Service
 * Unavailable (the admin must configure the secret before using them).
 */
function createAdminGuard() {
  return async (c: Context, next: Next) => {
    const env = c.env as unknown as ApiEnv;
    const authHeader = c.req.header('Authorization');

    if (!env.ADMIN_TOKEN) {
      console.error('ADMIN_TOKEN not configured');
      return c.json(
        {
          success: false,
          error: 'Admin routes disabled — ADMIN_TOKEN not set',
          timestamp: new Date().toISOString(),
        },
        503,
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        { success: false, error: 'Admin authentication required', timestamp: new Date().toISOString() },
        401,
      );
    }

    const token = authHeader.slice('Bearer '.length);
    if (!constantTimeEqual(token, env.ADMIN_TOKEN)) {
      return c.json(
        { success: false, error: 'Invalid admin token', timestamp: new Date().toISOString() },
        403,
      );
    }

    await next();
  };
}

/**
 * Constant-time string comparison to resist timing side-channels on the admin
 * token check. Returns `false` immediately when lengths differ — the length
 * leak is acceptable for a bearer token.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Endpoint not found',
    path: c.req.path,
    method: c.req.method,
  }, 404);
});

export default app;