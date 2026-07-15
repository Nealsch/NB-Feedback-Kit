/**
 * Device registration & lifecycle handlers (FEEDBACK-2 + FEEDBACK-3).
 *
 * `POST /api/register` — bootstrap-only endpoint that exchanges the shared
 * static API key (still required for this one call) for a per-device identity:
 *
 *   1. Validate the bootstrap `X-API-Key` against the `API_KEYS` KV (same
 *      lookup as the legacy auth path).
 *   2. Generate a device UUID v4 (or accept an existing one for token refresh).
 *   3. Persist a device record in the `DEVICES` KV namespace so the JWT auth
 *      path can resolve { appId, github, rateLimit } without a second
 *      `API_KEYS` lookup, and so devices can later be rate-limited / revoked
 *      individually (FEEDBACK-3).
 *   4. Mint a short-lived HS256 JWT (1h) with claims `{ deviceId, appId }`.
 *   5. Return `{ deviceId, token, expiresIn }` to the client.
 *
 * After registration, the client sends `Authorization: Bearer <jwt>` on all
 * `/api/*` requests — the shared key never ships in the binary's steady-state
 * traffic. The auth middleware accepts both schemes during the transition.
 *
 * FEEDBACK-3 adds two admin-only handlers:
 *   - `POST /api/devices/:id/revoke`  — ban a device (sets `revoked: true`)
 *   - `POST /api/devices/:id/activate` — lift a ban (clears the flag)
 *
 * Revoked devices are blocked from refreshing their JWT here and receive HTTP
 * 403 from the auth middleware on every authenticated request.
 */

import type { Context } from 'hono';
import type { ApiEnv } from '../env';
import { signJWT, JWT_TTL_SECONDS } from './jwt';
import { hashApiKey } from './hash';

/** Shape of the device record persisted in the `DEVICES` KV namespace. */
export interface DeviceRecord {
  /** UUID v4 — the canonical device identifier. */
  deviceId: string;
  /** App identifier (the `name` from the bootstrap key's KV config). */
  appId: string;
  /** GitHub repo config snapshot captured at registration. */
  github: { owner: string; repo: string };
  /** Rate-limit snapshot captured at registration (requests per minute). */
  rateLimit: number;
  /** ISO timestamp of first registration. */
  createdAt: string;
  /** ISO timestamp of last token re-issue (updated on re-register). */
  lastSeenAt: string;
  /**
   * FEEDBACK-3: when `true`, the device is banned. Revoked devices receive
   * HTTP 403 from the auth middleware and are blocked from refreshing their
   * JWT (see `handleRegister`). Set via the admin `/api/devices/:id/revoke`
   * route and cleared via `/api/devices/:id/activate`.
   */
  revoked?: boolean;
  /** ISO timestamp when the device was revoked (`undefined` while active). */
  revokedAt?: string;
}

/** Success response body for `POST /api/register`. */
interface RegisterSuccessResponse {
  success: true;
  deviceId: string;
  token: string;
  /** Token lifetime in seconds (matches JWT `exp - iat`). */
  expiresIn: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
}

/** Internal shape of the bootstrap key's KV value. */
interface BootstrapKvValue {
  name: string;
  github: { owner: string; repo: string };
  rateLimit: number;
}

/**
 * Handle `POST /api/register`.
 *
 * The route is mounted BEFORE the global `/api/*` auth middleware (see
 * `index.ts`) so the bootstrap X-API-Key is read directly here, not enforced
 * by the middleware. This keeps registration self-contained.
 *
 * FEEDBACK-3: revoked devices that attempt to re-register (refresh their
 * token) are rejected with HTTP 403. This closes the loophole where a banned
 * device could obtain a fresh JWT by calling `/api/register` with its own
 * `deviceId`.
 */
export async function handleRegister(c: Context): Promise<Response> {
  const env = c.env as unknown as ApiEnv;
  const bootstrapKey = c.req.header('X-API-Key');

  // --- 1. Validate the bootstrap API key ------------------------------------
  if (!bootstrapKey) {
    return c.json(errorBody('Missing X-API-Key header'), 401);
  }
  if (!env.API_KEYS) {
    console.error('API_KEYS KV namespace not bound');
    return c.json(errorBody('Internal server error'), 500);
  }

  let kvConfig: BootstrapKvValue | null = null;
  try {
    // FEEDBACK-4: Lookup is by SHA-256 hash of the key, with a migration
    // fallback to the raw key for deployments that haven't re-keyed yet.
    const hashedKey = await hashApiKey(bootstrapKey);
    const raw = await env.API_KEYS.get(hashedKey);
    if (raw) {
      kvConfig = JSON.parse(raw) as BootstrapKvValue;
    } else {
      const legacyRaw = await env.API_KEYS.get(bootstrapKey);
      if (legacyRaw) kvConfig = JSON.parse(legacyRaw) as BootstrapKvValue;
    }
  } catch (err) {
    console.error('Failed to read bootstrap key from KV:', err);
    return c.json(errorBody('Internal server error'), 500);
  }

  if (!kvConfig || !kvConfig.name) {
    return c.json(errorBody('Invalid API key'), 401);
  }

  // --- 2. Ensure the JWT secret is configured -------------------------------
  if (!env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return c.json(errorBody('Internal server error'), 500);
  }

  // --- 3. Generate (or re-use) the device identity --------------------------
  // The client MAY send an existing `deviceId` in the JSON body to re-register
  // (refresh a token). If absent, the Worker generates a new UUID v4.
  let deviceId: string;
  let body: { deviceId?: string } | null = null;
  try {
    body = (await c.req.json()) as { deviceId?: string };
  } catch {
    body = null;
  }

  if (body?.deviceId && isValidUuid(body.deviceId)) {
    deviceId = body.deviceId;
  } else {
    deviceId = generateUuidV4();
  }

  // --- 3b. FEEDBACK-3: Reject re-registration of revoked devices ------------
  // If the client is refreshing (sending an existing deviceId), load the
  // current record and refuse if it has been revoked. A new device has no
  // record yet, so this check is a no-op for first-time registrations.
  if (env.DEVICES && body?.deviceId && isValidUuid(body.deviceId)) {
    const existingRaw = await env.DEVICES.get(deviceId).catch(() => null);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as DeviceRecord;
      if (existing.revoked === true) {
        console.log(`[register] Blocked re-registration of revoked device: ${deviceId}`);
        return c.json(errorBody('Device has been revoked. Please contact support.'), 403);
      }
    }
  }

  // --- 4. Persist the device record in KV -----------------------------------
  if (env.DEVICES) {
    const now = new Date().toISOString();
    const existingRaw = await env.DEVICES.get(deviceId).catch(() => null);
    const record: DeviceRecord = existingRaw
      ? {
          ...(JSON.parse(existingRaw) as DeviceRecord),
          // Refresh the config snapshot on every re-register so github/rateLimit
          // updates propagate without requiring the client to re-bootstrap.
          github: kvConfig.github,
          rateLimit: kvConfig.rateLimit,
          lastSeenAt: now,
        }
      : {
          deviceId,
          appId: kvConfig.name,
          github: kvConfig.github,
          rateLimit: kvConfig.rateLimit,
          createdAt: now,
          lastSeenAt: now,
        };

    try {
      await env.DEVICES.put(deviceId, JSON.stringify(record));
    } catch (err) {
      console.error('Failed to persist device record:', err);
      // Non-fatal: the JWT is still valid; revocation just won't work yet.
    }
    console.log(`[register] Device registered: ${deviceId} (app: ${kvConfig.name})`);
  } else {
    console.warn('DEVICES KV namespace not bound — device record not persisted');
  }

  // --- 5. Mint the JWT ------------------------------------------------------
  const token = await signJWT({ deviceId, appId: kvConfig.name }, env.JWT_SECRET);

  return c.json(
    {
      success: true,
      deviceId,
      token,
      expiresIn: JWT_TTL_SECONDS,
    } satisfies RegisterSuccessResponse,
    201,
  );
}

// ---------------------------------------------------------------------------
// FEEDBACK-3: Device lifecycle handlers (revoke / activate)
// ---------------------------------------------------------------------------

/**
 * Handle `POST /api/devices/:id/revoke`.
 *
 * Marks a device as revoked in the `DEVICES` KV. The next authenticated
 * request from that device (and any attempt to refresh its JWT) will be
 * rejected with HTTP 403. This is an admin-only route protected by the
 * `ADMIN_TOKEN` secret.
 *
 * Returns 200 with the updated record on success, 404 if the device was never
 * registered, and 409 if the device is already revoked (idempotent no-op).
 */
export async function handleRevoke(c: Context): Promise<Response> {
  const env = c.env as unknown as ApiEnv;
  const deviceId = c.req.param('id');

  if (!deviceId || !isValidUuid(deviceId)) {
    return c.json(errorBody('Invalid device id'), 400);
  }
  if (!env.DEVICES) {
    console.error('DEVICES KV namespace not bound');
    return c.json(errorBody('Internal server error'), 500);
  }

  let record: DeviceRecord | null = null;
  try {
    const raw = await env.DEVICES.get(deviceId);
    if (raw) record = JSON.parse(raw) as DeviceRecord;
  } catch (err) {
    console.error('Failed to read device record:', err);
    return c.json(errorBody('Internal server error'), 500);
  }

  if (!record) {
    return c.json(errorBody('Device not found'), 404);
  }
  if (record.revoked === true) {
    return c.json({ success: true, deviceId, message: 'Already revoked' }, 200);
  }

  record.revoked = true;
  record.revokedAt = new Date().toISOString();
  try {
    await env.DEVICES.put(deviceId, JSON.stringify(record));
  } catch (err) {
    console.error('Failed to persist revocation:', err);
    return c.json(errorBody('Internal server error'), 500);
  }

  console.log(`[revoke] Device revoked: ${deviceId}`);
  return c.json({ success: true, deviceId, revokedAt: record.revokedAt }, 200);
}

/**
 * Handle `POST /api/devices/:id/activate`.
 *
 * Clears the revocation flag, restoring the device's ability to authenticate
 * and refresh tokens. Admin-only route protected by the `ADMIN_TOKEN` secret.
 *
 * Returns 200 on success, 404 if the device was never registered, and 200
 * with a message if the device was already active (idempotent).
 */
export async function handleActivate(c: Context): Promise<Response> {
  const env = c.env as unknown as ApiEnv;
  const deviceId = c.req.param('id');

  if (!deviceId || !isValidUuid(deviceId)) {
    return c.json(errorBody('Invalid device id'), 400);
  }
  if (!env.DEVICES) {
    console.error('DEVICES KV namespace not bound');
    return c.json(errorBody('Internal server error'), 500);
  }

  let record: DeviceRecord | null = null;
  try {
    const raw = await env.DEVICES.get(deviceId);
    if (raw) record = JSON.parse(raw) as DeviceRecord;
  } catch (err) {
    console.error('Failed to read device record:', err);
    return c.json(errorBody('Internal server error'), 500);
  }

  if (!record) {
    return c.json(errorBody('Device not found'), 404);
  }
  if (record.revoked !== true) {
    return c.json({ success: true, deviceId, message: 'Already active' }, 200);
  }

  record.revoked = false;
  delete record.revokedAt;
  try {
    await env.DEVICES.put(deviceId, JSON.stringify(record));
  } catch (err) {
    console.error('Failed to persist activation:', err);
    return c.json(errorBody('Internal server error'), 500);
  }

  console.log(`[activate] Device reactivated: ${deviceId}`);
  return c.json({ success: true, deviceId }, 200);
}

// ---------------------------------------------------------------------------
// Helpers (exported for unit testing)
// ---------------------------------------------------------------------------

function errorBody(error: string): ErrorResponse {
  return { success: false, error, timestamp: new Date().toISOString() };
}

/** RFC 4122 v4 UUID format check (lenient — validates shape, not version bits). */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Generate a RFC 4122 v4 UUID using `crypto.randomUUID()` (native to the
 * Workers runtime and Node ≥ 19). Falls back to a `getRandomValues` shim for
 * older test environments.
 */
export function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: manual v4 from random bytes.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}