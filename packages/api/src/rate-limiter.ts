/**
 * Durable Object Rate Limiter
 * 
 * Implements per-key sliding window rate limiting using Durable Objects.
 * Each API key gets its own isolated Durable Object instance.
 * 
 * ADR-004: API Key Authentication with Durable Objects Rate Limiting
 * Durable Objects provide accurate distributed rate limiting with durable storage.
 * Window length: 60 seconds.
 */

export class RateLimiter implements DurableObject {
  private storage: DurableObjectStorage;
  private window: number[] = []; // timestamps of requests in current window

  // Rate limit state persisted to DO storage
  private static readonly WINDOW_MS = 60_000; // 1 minute window
  private static readonly PERSIST_KEY = 'window';

  constructor(ctx: DurableObjectState) {
    this.storage = ctx.storage;

    // Rehydrate state on wakeup
    ctx.blockConcurrencyWhile(async () => {
      const stored = await this.storage.get<number[]>(RateLimiter.PERSIST_KEY);
      if (stored) {
        this.window = stored;
        this.pruneExpired();
      }
    });
  }

  /**
   * Prune timestamps older than the sliding window
   */
  private pruneExpired(): void {
    const now = Date.now();
    const cutoff = now - RateLimiter.WINDOW_MS;
    this.window = this.window.filter((ts) => ts > cutoff);
  }

  /**
   * Handle rate limit check requests
   * POST /check with JSON body: { limit: number }
   * Returns 200 if under limit, 429 if over limit
   */
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/check') {
      return new Response('Not found', { status: 404 });
    }

    let limit: number;
    try {
      const body = await request.json() as { limit: number };
      limit = body.limit;

      if (typeof limit !== 'number' || limit < 1) {
        return new Response('Invalid limit', { status: 400 });
      }
    } catch {
      return new Response('Invalid JSON body', { status: 400 });
    }

    // Prune old entries
    this.pruneExpired();

    const remaining = Math.max(0, limit - this.window.length);
    const resetAt = new Date(Date.now() + RateLimiter.WINDOW_MS).toISOString();

    if (this.window.length >= limit) {
      // Rate limited
      const retryAfter = Math.ceil(
        (this.window[0] + RateLimiter.WINDOW_MS - Date.now()) / 1000
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          limit,
          remaining: 0,
          resetAt,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.max(1, retryAfter)),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetAt,
          },
        }
      );
    }

    // Add current request timestamp
    this.window.push(Date.now());

    // Persist state
    await this.storage.put(RateLimiter.PERSIST_KEY, this.window);

    return new Response(
      JSON.stringify({
        success: true,
        limit,
        remaining: remaining - 1,
        resetAt,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining - 1),
          'X-RateLimit-Reset': resetAt,
        },
      }
    );
  }
}