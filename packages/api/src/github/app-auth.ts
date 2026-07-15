/**
 * GitHub App Authentication
 *
 * Generates installation access tokens for a GitHub App, enabling API access
 * without long-lived PATs. The App JWT (RS256) is signed with the App's
 * private key using the Web Crypto API (zero-dependency), then exchanged for
 * a short-lived (1h) installation token scoped to a specific repo.
 *
 * Resolution order (per request):
 *   1. If `GITHUB_APP_ID` + `GITHUB_APP_PRIVATE_KEY` are configured → App auth
 *   2. Else if `GITHUB_TOKEN` is configured → PAT (legacy fallback)
 *
 * Installation tokens are cached per-installation-id in the Worker isolate
 * with a safety margin to avoid handing expired tokens to the GitHub client.
 */

import type { ApiEnv } from '../env';
import type { GithubRepoConfig } from '../types';

/** Clock skew safety margin (seconds) — refresh token before it actually expires. */
const TOKEN_REFRESH_MARGIN_SECONDS = 60;

// ---------------------------------------------------------------------------
// In-memory installation-token cache (per Worker isolate)
//
// BUG FIX: The cache was previously keyed by a single global installationId,
// meaning once ANY request resolved the installation for one repo (e.g.
// spherepa-beta-feedback), all subsequent requests for a DIFFERENT repo
// (e.g. freetoolworks) reused that installation's token — which lacks
// access to the other repo, causing GitHub API 404s on issue creation.
//
// The cache is now keyed by `owner/repo` so each repo gets its own
// installation ID + token.
// ---------------------------------------------------------------------------

interface CachedToken {
  token: string;
  /** Unix epoch seconds when this token expires (minus the safety margin). */
  expiresAt: number;
}

interface CachedInstallation {
  installationId: number;
  token: CachedToken;
}

/** Per-repo cache: key is `${owner}/${repo}`. */
const repoTokenCache = new Map<string, CachedInstallation>();

// ---------------------------------------------------------------------------
// Base64url helpers (shared with jwt.ts — duplicated to keep module self-contained)
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

// ---------------------------------------------------------------------------
// RS256 JWT signing via Web Crypto API
// ---------------------------------------------------------------------------

/**
 * Wrap a PKCS#1 RSA private key (DER bytes) in a PKCS#8 PrivateKeyInfo
 * structure so it can be imported by the Web Crypto API.
 *
 * GitHub App private keys are always PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`).
 * The Web Crypto API only supports PKCS#8 for private key import, so we must
 * construct the PKCS#8 wrapper (a fixed ASN.1 envelope around the raw key).
 *
 * Structure:
 *   SEQUENCE {
 *     INTEGER 0                              -- version
 *     SEQUENCE { OID rsaEncryption, NULL }   -- algorithm identifier
 *     OCTET STRING { <PKCS#1 key bytes> }
 *   }
 */
export function wrapPkcs1ToPkcs8(pkcs1Der: Uint8Array): Uint8Array {
  // AlgorithmIdentifier for RSA (constant 15 bytes):
  //   SEQUENCE { OID 1.2.840.113549.1.1.1 (rsaEncryption), NULL }
  const algId = new Uint8Array([
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00,
  ]);

  // version INTEGER (0): 02 01 00
  const version = new Uint8Array([0x02, 0x01, 0x00]);

  // OCTET STRING header (tag 04, 2-byte length for keys > 127 bytes)
  const octetHeader = new Uint8Array([0x04, 0x82, 0, 0]);
  octetHeader[2] = (pkcs1Der.length >> 8) & 0xff;
  octetHeader[3] = pkcs1Der.length & 0xff;

  // Inner content length: version + algId + octetHeader + key bytes
  const innerLength =
    version.length + algId.length + octetHeader.length + pkcs1Der.length;

  // Outer SEQUENCE header (tag 30, 2-byte length)
  const outerHeader = new Uint8Array([0x30, 0x82, 0, 0]);
  outerHeader[2] = (innerLength >> 8) & 0xff;
  outerHeader[3] = innerLength & 0xff;

  // Assemble the full PKCS#8 DER
  const result = new Uint8Array(outerHeader.length + innerLength);
  let offset = 0;
  result.set(outerHeader, offset); offset += outerHeader.length;
  result.set(version, offset); offset += version.length;
  result.set(algId, offset); offset += algId.length;
  result.set(octetHeader, offset); offset += octetHeader.length;
  result.set(pkcs1Der, offset);
  return result;
}

/**
 * Import a PEM-encoded RSA private key for RSASSA-PKCS1-v1_5 (RS256) signing.
 *
 * Supports both PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`, used by GitHub Apps)
 * and PKCS#8 (`-----BEGIN PRIVATE KEY-----`). PKCS#1 keys are wrapped into
 * PKCS#8 format before import, since the Web Crypto API only supports PKCS#8.
 *
 * Cloudflare secret values store newlines as literal `\n`. This function
 * reconstructs the PEM by converting `\n` escape sequences to real newlines
 * before importing the key.
 */
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Normalise: strip real newlines, then convert literal `\n` to real newlines,
  // so the format is deterministic regardless of how the secret was stored.
  const normalised = pem.replace(/\r?\n/g, '').replace(/\\n/g, '\n');

  // Detect key format from the PEM header.
  const isPkcs1 = normalised.includes('BEGIN RSA PRIVATE KEY');

  const pemContents = normalised
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
    .replace('-----END RSA PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  // base64 → binary string → Uint8Array
  let bytes: Uint8Array;
  try {
    const binary = atob(pemContents);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } catch {
    throw new Error(
      `Invalid private key: base64 decode failed. ` +
      `Content length=${pemContents.length}. ` +
      `The PEM was likely truncated or mangled during secret upload. ` +
      `Re-set via: Get-Content key.pem -Raw | wrangler secret put GITHUB_APP_PRIVATE_KEY --env development`,
    );
  }

  // PKCS#1 keys must be wrapped into PKCS#8 for the Web Crypto API.
  if (isPkcs1) {
    bytes = wrapPkcs1ToPkcs8(bytes);
  }

  try {
    return await crypto.subtle.importKey(
      'pkcs8',
      bytes,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  } catch {
    throw new Error(
      `Invalid key input: decoded ${bytes.length} bytes from PEM ` +
      `(base64 content length=${pemContents.length}, format=${isPkcs1 ? 'PKCS#1 wrapped to PKCS#8' : 'PKCS#8'}). ` +
      `Expected ~1190 DER bytes (PKCS#1) or ~1675 DER bytes (PKCS#8) for a 2048-bit RSA key. ` +
      `If bytes < 300, the secret was truncated during interactive paste. ` +
      `Re-set via: Get-Content key.pem -Raw | wrangler secret put GITHUB_APP_PRIVATE_KEY --env development`,
    );
  }
}

/** Cache the imported key so we don't re-parse the PEM on every request. */
let cachedKey: CryptoKey | null = null;
let cachedKeyPem = '';

/**
 * Sign a GitHub App JWT (RS256).
 *
 * @param appId   The GitHub App's numeric ID.
 * @param pemKey  PEM-encoded RSA private key (with literal `\n` or real newlines).
 * @returns A compact JWT string.
 */
async function signAppJwt(appId: string, pemKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // backdate 60s to tolerate clock skew
    exp: now + (10 * 60), // GitHub max JWT lifetime is 10 minutes
    iss: appId,
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const encoder = new TextEncoder();

  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  if (!cachedKey || cachedKeyPem !== pemKey) {
    cachedKey = await importPrivateKey(pemKey);
    cachedKeyPem = pemKey;
  }

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cachedKey,
    encoder.encode(signingInput),
  );
  const signatureB64 = base64urlEncode(signature);

  return `${signingInput}.${signatureB64}`;
}

// ---------------------------------------------------------------------------
// Installation token resolution
// ---------------------------------------------------------------------------

/**
 * Fetch the installation ID for a given repo using the App JWT.
 *
 * GET /repos/{owner}/{repo}/installation returns the installation record
 * for the app installed on that repo.
 */
async function getInstallationId(
  appJwt: string,
  repo: GithubRepoConfig,
): Promise<number> {
  const response = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.repo}/installation`,
    {
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nb-feedback-kit',
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub App installation lookup failed (${response.status}): ${body}. ` +
      'Ensure the app is installed on this repository.',
    );
  }

  const data = (await response.json()) as { id: number };
  return data.id;
}

/**
 * Exchange the App JWT for a short-lived installation access token.
 */
async function createInstallationToken(
  appJwt: string,
  installationId: number,
): Promise<CachedToken> {
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nb-feedback-kit',
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create installation token (${response.status}): ${body}`,
    );
  }

  const data = (await response.json()) as {
    token: string;
    expires_at: string;
  };

  const expiresAt = Math.floor(
    new Date(data.expires_at).getTime() / 1000,
  ) - TOKEN_REFRESH_MARGIN_SECONDS;

  return { token: data.token, expiresAt };
}

/**
 * Resolve a GitHub API token for the given repository.
 *
 * Uses GitHub App authentication when `GITHUB_APP_ID` and
 * `GITHUB_APP_PRIVATE_KEY` are configured, caching installation tokens
 * per-isolate with a safety margin before expiry. Falls back to the static
 * `GITHUB_TOKEN` PAT for backward compatibility.
 *
 * @throws If App auth is configured but the app is not installed on the repo,
 *         or if token creation fails.
 */
export async function resolveGitHubToken(
  env: ApiEnv,
  repo: GithubRepoConfig,
): Promise<string> {
  // --- GitHub App path (preferred) ----------------------------------------
  if (env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY) {
    const now = Math.floor(Date.now() / 1000);
    const cacheKey = `${repo.owner}/${repo.repo}`;

    // Return cached token if still valid for this specific repo.
    const cached = repoTokenCache.get(cacheKey);
    if (cached && cached.token.expiresAt > now) {
      return cached.token.token;
    }

    // Sign a fresh App JWT (required for installation lookups + token creation).
    const appJwt = await signAppJwt(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY);

    // Resolve installation ID for THIS repo (cached per-repo, not globally).
    let installationId: number;
    if (cached) {
      // Reuse the known installation ID; just refresh the token.
      installationId = cached.installationId;
    } else {
      installationId = await getInstallationId(appJwt, repo);
    }

    // Create (or refresh) the installation token.
    const token = await createInstallationToken(appJwt, installationId);
    repoTokenCache.set(cacheKey, { installationId, token });

    return token.token;
  }

  // --- Legacy PAT fallback ------------------------------------------------
  if (env.GITHUB_TOKEN) {
    return env.GITHUB_TOKEN;
  }

  throw new Error(
    'GitHub authentication not configured. Set either GITHUB_APP_ID + ' +
    'GITHUB_APP_PRIVATE_KEY (GitHub App) or GITHUB_TOKEN (PAT).',
  );
}