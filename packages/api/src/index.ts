import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createAuthMiddleware } from './middleware/auth';
import type { FeedbackConfig } from './types';
import type { FeedbackPayload } from '@nb-feedback-kit/shared-types';
import type { ApiEnv } from './env';
import { createGitHubIssue, getReleases, getRoadmap } from './github/client';

const app = new Hono();

// CORS middleware - configured for cross-origin requests
app.use('*', cors({
  origin: '*', // In production, restrict to specific origins
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
  credentials: true,
}));

// Logger middleware for request logging
app.use('*', logger());

// Global error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  
  return c.json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  }, 500);
});

// Public endpoints (no auth required)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'nb-feedback-api',
    version: '0.0.1',
    timestamp: new Date().toISOString(),
  });
});

// API info endpoint
app.get('/', (c) => {
  return c.json({
    name: 'NB Feedback Kit API',
    version: '0.0.1',
    endpoints: {
      health: 'GET /health',
      feedback: 'POST /api/feedback',
      releases: 'GET /api/releases',
      roadmap: 'GET /api/roadmap',
    },
    documentation: 'https://github.com/your-org/nb-feedback-kit',
  });
});

// Authenticated endpoints (require X-API-Key header)
app.use('/api/*', createAuthMiddleware());

/**
 * POST /api/feedback
 * Creates a GitHub Issue from user feedback.
 * Requires: X-API-Key header, valid API key in KV store.
 * Body: FeedbackPayload (type, title, description, metadata)
 */
app.post('/api/feedback', async (c) => {
  const config = c.get('feedbackConfig') as FeedbackConfig;
  const env = c.env as unknown as ApiEnv;
  const githubToken = env.GITHUB_TOKEN;

  if (!githubToken) {
    console.error('GITHUB_TOKEN secret not configured');
    return c.json({
      success: false,
      error: 'Server configuration error: GitHub token not set',
      timestamp: new Date().toISOString(),
    }, 500);
  }

  let payload: FeedbackPayload;
  try {
    payload = await c.req.json<FeedbackPayload>();
  } catch (err) {
    return c.json({
      success: false,
      error: 'Invalid JSON body',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  // Validate required fields
  if (!payload.type || !payload.title || !payload.description || !payload.metadata) {
    return c.json({
      success: false,
      error: 'Missing required fields: type, title, description, metadata',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  if (!['bug', 'feature', 'feedback'].includes(payload.type)) {
    return c.json({
      success: false,
      error: 'Invalid feedback type. Must be: bug, feature, or feedback',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  if (payload.title.trim().length < 3) {
    return c.json({
      success: false,
      error: 'Title must be at least 3 characters',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  if (payload.description.trim().length < 10) {
    return c.json({
      success: false,
      error: 'Description must be at least 10 characters',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  try {
    const result = await createGitHubIssue(githubToken, config.github, payload);

    console.log(`✅ Issue created: ${result.issueUrl} (app: ${config.applicationName})`);

    return c.json({
      success: true,
      issueUrl: result.issueUrl,
      issueNumber: result.issueNumber,
      timestamp: new Date().toISOString(),
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Failed to create GitHub issue:', message);

    return c.json({
      success: false,
      error: 'Failed to submit feedback. Please try again later.',
      details: message,
      timestamp: new Date().toISOString(),
    }, 502);
  }
});

/**
 * GET /api/releases
 * Fetches release notes from GitHub Releases.
 * Requires: X-API-Key header, valid API key in KV store.
 */
app.get('/api/releases', async (c) => {
  const config = c.get('feedbackConfig') as FeedbackConfig;
  const env = c.env as unknown as ApiEnv;
  const githubToken = env.GITHUB_TOKEN;

  if (!githubToken) {
    return c.json({
      success: false,
      error: 'Server configuration error: GitHub token not set',
      timestamp: new Date().toISOString(),
    }, 500);
  }

  try {
    const releases = await getReleases(githubToken, config.github);

    return c.json({
      success: true,
      releases,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Failed to fetch releases:', message);

    return c.json({
      success: false,
      error: 'Failed to fetch releases',
      details: message,
      timestamp: new Date().toISOString(),
    }, 502);
  }
});

/**
 * GET /api/roadmap
 * Fetches roadmap items from GitHub Issues with roadmap labels.
 * Requires: X-API-Key header, valid API key in KV store.
 */
app.get('/api/roadmap', async (c) => {
  const config = c.get('feedbackConfig') as FeedbackConfig;
  const env = c.env as unknown as ApiEnv;
  const githubToken = env.GITHUB_TOKEN;

  if (!githubToken) {
    return c.json({
      success: false,
      error: 'Server configuration error: GitHub token not set',
      timestamp: new Date().toISOString(),
    }, 500);
  }

  try {
    const items = await getRoadmap(githubToken, config.github);

    return c.json({
      success: true,
      roadmap: items,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Failed to fetch roadmap:', message);

    return c.json({
      success: false,
      error: 'Failed to fetch roadmap',
      details: message,
      timestamp: new Date().toISOString(),
    }, 502);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Endpoint not found',
    path: c.req.path,
    method: c.req.method,
  }, 404);
});

export default app;
