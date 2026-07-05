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
}
