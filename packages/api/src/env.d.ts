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
}
