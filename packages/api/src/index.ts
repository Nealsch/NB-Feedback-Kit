import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// CORS middleware - configured for cross-origin requests
app.use('*', cors({
  origin: '*', // In production, restrict to specific origins
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['Content-Length'],
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
      feedback: 'POST /feedback (coming in TASK-006)',
      releases: 'GET /releases (coming in TASK-009)',
      roadmap: 'GET /roadmap (coming in TASK-011)',
    },
    documentation: 'https://github.com/your-org/nb-feedback-kit',
  });
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
