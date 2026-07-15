/**
 * JWT (JSON Web Token) sign + verify using the Web Crypto API.
 *
 * Zero-dependency HS256 implementation — uses `crypto.subtle`, which is native
 * to the Cloudflare Workers runtime (and modern Node/browser test envs). No
 * `jsonwebtoken` or `jose` package needed.
 *
 * FEEDBACK-2: Anonymous device registration. The Worker mints short-lived
 * signed JWTs (1h) after device registration so the shared static API key
 * never ships in app binaries. Claims: `deviceId`, `appId`, `iat`, `exp`.
 */

/** Claims encoded into the JWT payload. */
export interface JwtPayload {
  /** Device identifier (UUID v4), generated at registration. */
  deviceId: string;
  /** Application identifier resolved from the bootstrap API key's KV config. */
  appId: string;
  /** Issued-at (Unix seconds). */
  iat: number;
  /** Expiry (Unix seconds). */
  exp: number;
}

/** JWT lifetime in seconds (1 hour). */
export const JWT_TTL_SECONDS = 60 * 60;

// ---------------------------------------------------------------------------
// Base64url helpers (Web Crypto produces ArrayBuffer; JWT uses base64url)
// ---------------------------------------------------------------------------

/** Encode bytes to a base64url string (no padding). */
function base64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.byteLength; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a base64url string to a Uint8Array. */
function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 key management (cached per Worker isolate)
// ---------------------------------------------------------------------------

let cachedKey: CryptoKey | null = null;
let cachedSecret = '';

/** Import (and cache) the HMAC-SHA256 signing key from the secret string. */
async function getSigningKey(secret: string): Promise<CryptoKey> {
  if (cachedKey && cachedSecret === secret) return cachedKey;
  const encoder = new TextEncoder();
  cachedKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  cachedSecret = secret;
  return cachedKey;
}

// ---------------------------------------------------------------------------
// Sign + Verify
// ---------------------------------------------------------------------------

/**
 * Sign a JWT for the given device + app.
 *
 * @returns A compact JWT string `header.payload.signature`.
 * @throws If `secret` is empty (programming error — should be caught earlier).
 */
export async function signJWT(
  payload: { deviceId: string; appId: string },
  secret: string,
  ttlSeconds: number = JWT_TTL_SECONDS,
): Promise<string> {
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    deviceId: payload.deviceId,
    appId: payload.appId,
    iat: now,
    exp: now + ttlSeconds,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();

  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  const signatureB64 = base64urlEncode(signature);

  return `${signingInput}.${signatureB64}`;
}

/**
 * Verify a JWT's signature and expiry.
 *
 * @returns The decoded payload on success, or `null` if the signature is
 *          invalid, the token is expired, or the secret is missing.
 */
export async function verifyJWT(token: string, secret: string): Promise<JwtPayload | null> {
  if (!secret) {
    console.error('JWT_SECRET is not configured');
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  try {
    const key = await getSigningKey(secret);
    const signature = base64urlDecode(signatureB64);
    const encoder = new TextEncoder();

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(signingInput),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as JwtPayload;

    // Check expiry (with a 5-second clock-skew tolerance).
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp + 5 < now) return null;

    return payload;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}