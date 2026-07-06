/**
 * SHA-256 hashing for API key storage (FEEDBACK-4).
 *
 * API keys are stored in the `API_KEYS` KV namespace keyed by their SHA-256
 * hex digest, never by the raw key string. This ensures that a KV data leak
 * does not expose usable credentials — SHA-256 is a one-way function, so
 * even read access to the namespace yields only irreversible hashes.
 *
 * The hash is computed using the native Web Crypto API
 * (`crypto.subtle.digest`), available in both the Cloudflare Workers runtime
 * and Node.js ≥ 20 (test environment). Zero external dependencies.
 *
 * Migration: existing deployments that store keys by raw value must re-key
 * their `API_KEYS` namespace using the hash of each key. See
 * `CLOUDFLARE_SETUP.md` → "API Key Hashing" for the migration script.
 */

/**
 * Compute the SHA-256 hex digest of an API key.
 *
 * Used as the KV key for bootstrap key storage and lookup. The same raw key
 * always produces the same digest, so the Worker can verify a key without
 * ever storing or logging its plaintext form.
 *
 * @param key - The raw API key string from the `X-API-Key` header.
 * @returns Lowercase hex string (64 chars for SHA-256).
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}