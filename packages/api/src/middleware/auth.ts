/**
 * Dual-scheme Authentication & Rate Limiting Middleware
 *
 * FEEDBACK-2 + FEEDBACK-3: Accepts either:
 *   1. `Authorization: Bearer <jwt>`  (FEEDBACK-2 per-device JWT — preferred)
 *   2. `X-API-Key: <bootstrap-key>`  (legacy FEEDBACK-1 static key — fallback)
 *
 * Rate limiting is **per-identity** (FEEDBACK-3): the Durable Object is keyed
 * by `deviceId` when a JWT is presented, falling back to the raw `apiKey`
 * string for legacy callers. This means a single shared static key no longer
 * gives one caller the entire 60 req/min budget once devices have migrated
 * to JWTs — each device gets its own isolated counter.
 *
 * Revocation (FEEDBACK-3): device records in the `DEVICES` KV namespace carry
 * a `revoked` flag. Revoked devices receive HTTP 403 on all authenticated
 * requests and are blocked from refreshing their JWT (see `handleRegister`).
 *
 * ADR-004: API Key Authentication with Durable Objects Rate Limiting.
 */

import { Context, MiddlewareHandler, Next } from 'hono';
import type { FeedbackConfig } from '../types';
import type { ApiEnv } from '../env';
import { verifyJWT } from '../auth/jwt';
import { hashApiKey } from '../auth/hash';

declare module 'hono' {
  interface ContextVariableMap {
    feedbackConfig: FeedbackConfig;
    apiKey: string;
    /** UUID v4 when authenticated via JWT; empty string for legacy API-key path. */
    deviceId: string;
  }
}

/** Subset of the device record we read from the `DEVICES` KV namespace. */
interface DeviceKvValue {
  deviceId: string;
  appId: string;
  github: { owner: string; repo: string };
  rateLimit: number;
  /** FEEDBACK-3: when `true`, the device is banned (403 on all requests). */
  revoked?: boolean;
}

/** Shape of the bootstrap key's KV value in `API_KEYS`. */
interface BootstrapKvValue {
  name: string;
  github: { owner: string; repo: string };
  rateLimit: number;
}

/** Reusable 401/403/500 JSON helper to keep the middleware body readable. */
function jsonError(status: number, error: string): Response {
  return new Response(
    JSON.stringify({ success: false, error, timestamp: new Date().toISOString() }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

/**
 * Creates the dual-scheme auth + rate-limit middleware.
 *
 * Resolution order:
 *   1. `Authorization: Bearer <jwt>` -> verifyJWT -> DEVICES KV -> revocation check
 *   2. `X-API-Key: <key>`            -> API_KEYS KV (legacy)
 *   3. Neither                        -> 401
 *
 * After identity is resolved, the rate-limit Durable Object is consulted using
 * the most specific key available (`deviceId` for JWTs, `apiKey` for legacy).
 */
export function createAuthMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const env = c.env as unknown as ApiEnv;
    const authHeader = c.req.header('Authorization');
    const apiKey = c.req.header('X-API-Key');

    let config: FeedbackConfig;
    let rateLimitKey: string;
    let deviceId = '';

    // --- Resolve identity + config -------------------------------------------

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // FEEDBACK-2: per-device JWT path (preferred).
      const token = authHeader.slice('Bearer '.length);

      if (!env.JWT_SECRET) {
        console.error('JWT_SECRET not configured');
        return jsonError(500, 'Internal server error');
      }

      const payload = await verifyJWT(token, env.JWT_SECRET);
      if (!payload || !payload.deviceId) {
        return jsonError(401, 'Invalid or expired token');
      }

      if (!env.DEVICES) {
        console.error('DEVICES KV namespace not bound');
        return jsonError(500, 'Internal server error');
      }

      let device: DeviceKvValue | null = null;
      try {
        const raw = await env.DEVICES.get(payload.deviceId);
        if (raw) device = JSON.parse(raw) as DeviceKvValue;
      } catch (err) {
        console.error('Failed to read device record from KV:', err);
        return jsonError(500, 'Internal server error');
      }

      if (!device) {
        return jsonError(401, 'Device not registered');
      }

      // FEEDBACK-3: Revocation gate — banned devices get 403, not 401, so the
      // client doesn't waste a re-registration attempt.
      if (device.revoked === true) {
        console.log(`[auth] Blocked revoked device: ${device.deviceId}`);
        return jsonError(403, 'Device has been revoked. Please contact support.');
      }

      config = {
        applicationName: device.appId,
        github: device.github,
        rateLimit: device.rateLimit,
      };
      rateLimitKey = device.deviceId; // FEEDBACK-3: per-device rate limiting
      deviceId = device.deviceId;
    } else if (apiKey) {
      // Legacy FEEDBACK-1: static X-API-Key path (backward compatible).
      if (!env.API_KEYS) {
        console.error('API_KEYS KV namespace not bound');
        return jsonError(500, 'Internal server error');
      }

      // FEEDBACK-4: Lookup is by SHA-256 hash of the key, not the raw value.
      // Falls back to raw-key lookup if the hash miss occurs, so deployments
      // can migrate to hashed storage without breaking existing keys.
      let keyData: BootstrapKvValue | null = null;
      try {
        const hashedKey = await hashApiKey(apiKey);
        const raw = await env.API_KEYS.get(hashedKey);
        if (raw) {
          keyData = JSON.parse(raw) as BootstrapKvValue;
        } else {
          // Migration fallback: try the raw key (pre-FEEDBACK-4 storage).
          const legacyRaw = await env.API_KEYS.get(apiKey);
          if (legacyRaw) keyData = JSON.parse(legacyRaw) as BootstrapKvValue;
        }
      } catch (err) {
        console.error('Failed to read API key from KV:', err);
        return jsonError(500, 'Internal server error');
      }

      if (!keyData) {
        return jsonError(401, 'Invalid API key');
      }

      config = {
        applicationName: keyData.name,
        github: keyData.github,
        rateLimit: keyData.rateLimit,
      };
      // Legacy path: rate limit is per-key (no deviceId available).
      rateLimitKey = apiKey;
      deviceId = '';
    } else {
      // Neither scheme provided.
      return jsonError(
        401,
        'Authentication required: provide Authorization: Bearer <jwt> or X-API-Key header',
      );
    }

    // --- Rate limit via Durable Object ---------------------------------------
    if (!env.RATE_LIMITER) {
      console.error('RATE_LIMITER Durable Object not bound');
      return jsonError(500, 'Internal server error');
    }

    // Defensive default: if the rateLimit field is missing or invalid in the
    // KV record (common during testing when entries are created manually),
    // fall back to a sane default instead of forwarding garbage to the DO.
    // The DO rejects non-numeric / < 1 limits with a 400 "Invalid limit"
    // response — which previously was mis-surfaced to the client as a 429.
    const effectiveLimit =
      typeof config.rateLimit === 'number' && config.rateLimit >= 1
        ? config.rateLimit
        : 60; // default: 60 requests per minute

    // Each identity (deviceId or apiKey) gets its own DO instance for isolated
    // rate limiting. FEEDBACK-3: migrated devices are limited individually.
    const doId = env.RATE_LIMITER.idFromName(rateLimitKey);
    const stub = env.RATE_LIMITER.get(doId);

    const rateLimitResult = await stub.fetch('http://internal/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: effectiveLimit }),
    });

    if (rateLimitResult.status === 429) {
      // Genuinely rate limited — propagate the 429 with reset metadata.
      const resetAt = rateLimitResult.headers.get('X-RateLimit-Reset') || 'unknown';
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.headers.get('Retry-After') || '60',
          resetAt,
          timestamp: new Date().toISOString(),
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!rateLimitResult.ok) {
      // The DO returned a non-2xx, non-429 status (e.g. 400 "Invalid limit",
      // 404, 405). This is a server-side config or routing issue — NOT rate
      // limiting. Previously this branch returned a misleading 429, masking
      // the real problem. Surface a 500 and log the DO's response so the
      // operator can diagnose via `wrangler tail`.
      const doBody = await rateLimitResult.text().catch(() => '');
      console.error(
        `[auth] Rate limiter DO returned unexpected status ${rateLimitResult.status}: ${doBody}`,
      );
      return jsonError(500, 'Internal server error');
    }

    // --- Attach to context for downstream handlers ---------------------------
    c.set('feedbackConfig', config);
    c.set('apiKey', apiKey ?? '');
    c.set('deviceId', deviceId);

    // Surface rate-limit info in response headers.
    c.res.headers.set('X-RateLimit-Limit', String(config.rateLimit));
    c.res.headers.set(
      'X-RateLimit-Remaining',
      rateLimitResult.headers.get('X-RateLimit-Remaining') || '0',
    );

    await next();
  };
}