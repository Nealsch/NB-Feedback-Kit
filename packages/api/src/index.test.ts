import { describe, it, expect } from 'vitest';
import app from './index';

describe('API Foundation Tests', () => {
  describe('GET /', () => {
    it('should return API info with 200 status', async () => {
      const req = new Request('http://localhost/');
      const res = await app.fetch(req);
      
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data).toHaveProperty('name', 'NB Feedback Kit API');
      expect(data).toHaveProperty('version', '0.0.1');
      expect(data).toHaveProperty('endpoints');
      expect(data.endpoints).toHaveProperty('health');
      expect(data.endpoints).toHaveProperty('feedback');
    });

    it('should have correct content-type header', async () => {
      const req = new Request('http://localhost/');
      const res = await app.fetch(req);
      
      expect(res.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('GET /health', () => {
    it('should return health status with 200', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);
      
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('service', 'nb-feedback-api');
      expect(data).toHaveProperty('version', '0.0.1');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return valid ISO timestamp', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);
      
      const data = await res.json();
      const timestamp = new Date(data.timestamp);
      
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers on GET requests', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);
      
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const req = new Request('http://localhost/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      const res = await app.fetch(req);
      
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const req = new Request('http://localhost/non-existent');
      const res = await app.fetch(req);
      
      expect(res.status).toBe(404);
      
      const data = await res.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error', 'Endpoint not found');
      expect(data).toHaveProperty('path', '/non-existent');
      expect(data).toHaveProperty('method', 'GET');
    });
  });

  describe('Error Handling', () => {
    it('should return structured error responses', async () => {
      const req = new Request('http://localhost/test-error');
      const res = await app.fetch(req);
      
      expect(res.status).toBe(404); // Will hit 404 handler
      
      const data = await res.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    it('should not expose sensitive server information', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);
      
      // Should NOT have these headers (good for security)
      expect(res.headers.get('server')).toBeNull();
      expect(res.headers.get('x-powered-by')).toBeNull();
    });
  });

  describe('HTTP Methods', () => {
    it('should only allow GET on health endpoint', async () => {
      const req = new Request('http://localhost/health', {
        method: 'POST',
      });
      const res = await app.fetch(req);
      
      // Should return 404 since POST /health is not defined
      expect(res.status).toBe(404);
    });

    it('should handle GET requests correctly', async () => {
      const req = new Request('http://localhost/');
      const res = await app.fetch(req);
      
      expect(res.status).toBe(200);
    });
  });
});
