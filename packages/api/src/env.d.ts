/**
 * Cloudflare Worker environment bindings for NB Feedback Kit API
 */

interface DurableObjectStub {
  fetch(url: string | Request, init?: RequestInit): Promise<Response>;
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectId {
  name?: string;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface ApiEnv {
  API_KEYS: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  GITHUB_TOKEN: string;

  // ----- FEEDBACK-2: anonymous device registration + JWT auth -----------------
  //
  // The shared static API key is used only for the one-time `POST /api/register`
  // call. The Worker then mints a per-device JWT (HS256, 1h TTL) and the client
  // sends `Authorization: Bearer <jwt>` for all subsequent `/api/*` requests.
  // See `src/auth/jwt.ts`, `src/auth/register.ts`, and ADR-010.
  /**
   * HMAC-SHA256 secret used to sign/verify device JWTs. Must be ≥32 bytes.
   * Set via `wrangler secret put JWT_SECRET`.
   */
  JWT_SECRET?: string;
  /**
   * KV namespace storing per-device records (`DeviceRecord` JSON) keyed by
   * UUID v4. Enables per-device rate limiting and revocation (FEEDBACK-3).
   */
  DEVICES?: KVNamespace;
  /**
   * FEEDBACK-3: Admin bearer token guarding device lifecycle routes
   * (`POST /api/devices/:id/revoke` and `/activate`). Set via
   * `wrangler secret put ADMIN_TOKEN`. Fail-closed if unset — the routes
   * return 503 Service Unavailable until a token is configured.
   */
  ADMIN_TOKEN?: string;
  /**
   * S3-compatible access key id. Used by `POST /api/uploads/presign` to sign
   * short-lived upload URLs. Lives only as a Worker secret — never shipped
   * to the client.
   */
  S3_ACCESS_KEY_ID?: string;
  /** S3-compatible secret access key. Worker secret only. */
  S3_SECRET_ACCESS_KEY?: string;
  /**
   * Optional STS session token (temporary credentials). Worker secret only.
   */
  S3_SESSION_TOKEN?: string;
  /**
   * Comma- or whitespace-separated allowlist of bucket names that the
   * presign endpoint may sign for. Fail-closed if unset or empty.
   */
  S3_ALLOWED_BUCKETS?: string;

  // ----- FEEDBACK-1: native R2 binding for server-mediated uploads -----------
  //
  // Preferred over the S3 presign flow for mobile clients: bytes flow through
  // the Worker to R2 via its binding, so no CORS, no client-visible cloud
  // config, and server-enforced size/type/magic-byte caps. See
  // `src/storage/uploads.ts` and ADR-009.
  /**
   * Native Cloudflare R2 bucket binding. When present, the Worker serves
   * `POST /api/uploads` (multipart) and writes objects via this binding.
   */
  R2_BUCKET?: R2Bucket;
  /**
   * Public base URL for objects in {@link R2_BUCKET} — e.g. a custom domain
   * (`https://cdn.example.com`) or the R2.dev public URL. The handler appends
   * the server-generated object key. Required when `R2_BUCKET` is bound.
   */
  R2_PUBLIC_BASE_URL?: string;

  // ----- FEEDBACK-4: CORS origin allowlist -----------------------------------
  //
  // Replaces the insecure `origin: '*'` + `credentials: true` combination
  // (which browsers silently reject). When set, only listed origins receive
  // `Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials: true`.
  // When unset, CORS falls back to `origin: '*'` WITHOUT credentials (public,
  // unauthenticated access only). Comma- or whitespace-separated.
  /**
   * Allowlist of origins permitted to make credentialed cross-origin requests.
   * Example: `https://app.example.com, https://beta.example.com`.
   */
  ALLOWED_ORIGINS?: string;
}
