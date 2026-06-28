/**
 * API Key Authentication Middleware
 * 
 * Validates X-API-Key header against Cloudflare KV store.
 * Maps API keys to application configuration (name, GitHub repo, rate limit).
 * 
 * ADR-004: API Key Authentication with Durable Objects Rate Limiting
 * API keys are stored in Cloudflare KV (`API_KEYS` namespace).
 * Each key maps to a repository config and rate limit.
 */

import { Context, MiddlewareHandler, Next } from 'hono';
import type { FeedbackConfig } from '../types';
import type { ApiEnv } from '../env';

declare module 'hono' {
  interface ContextVariableMap {
    feedbackConfig: FeedbackConfig;
    apiKey: string;
  }
}

interface KvApiKeyValue {
  name: string;
  github: {
    owner: string;
    repo: string;
  };
  rateLimit: number;
}

/**
 * Creates auth middleware that validates API keys against Cloudflare KV.
 * Routes must provide the KV namespace binding name and DO binding.
 */
export function createAuthMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('X-API-Key');

    if (!apiKey) {
      return c.json({
        success: false,
        error: 'Missing X-API-Key header',
        timestamp: new Date().toISOString(),
      }, 401);
    }

    const env = c.env as unknown as ApiEnv;

    // Look up API key in KV store
    if (!env.API_KEYS) {
      console.error('API_KEYS KV namespace not bound');
      return c.json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      }, 500);
    }

    let keyData: KvApiKeyValue | null = null;
    try {
      const raw = await env.API_KEYS.get(apiKey);
      if (raw) {
        keyData = JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to read API key from KV:', err);
      return c.json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      }, 500);
    }

    if (!keyData) {
      return c.json({
        success: false,
        error: 'Invalid API key',
        timestamp: new Date().toISOString(),
      }, 401);
    }

    // Check rate limit via Durable Object
    if (!env.RATE_LIMITER) {
      console.error('RATE_LIMITER Durable Object not bound');
      return c.json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      }, 500);
    }

    // Each API key gets its own Durable Object instance for isolated rate limiting
    const doId = env.RATE_LIMITER.idFromName(apiKey);
    const stub = env.RATE_LIMITER.get(doId);

    const rateLimitResult = await stub.fetch('http://internal/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: keyData.rateLimit }),
    });

    if (!rateLimitResult.ok) {
      const resetAt = rateLimitResult.headers.get('X-RateLimit-Reset') || 'unknown';
      return c.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimitResult.headers.get('Retry-After') || '60',
        resetAt,
        timestamp: new Date().toISOString(),
      }, 429);
    }

    // Attach config to context for downstream handlers
    c.set('feedbackConfig', {
      applicationName: keyData.name,
      github: keyData.github,
      rateLimit: keyData.rateLimit,
    });
    c.set('apiKey', apiKey);

    // Add rate limit headers to response
    c.res.headers.set('X-RateLimit-Limit', String(keyData.rateLimit));
    c.res.headers.set('X-RateLimit-Remaining', rateLimitResult.headers.get('X-RateLimit-Remaining') || '0');

    await next();
  };
}