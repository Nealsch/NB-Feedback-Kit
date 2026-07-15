import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFeedbackClient, FeedbackApiError } from '../src/index';

/**
 * Unit tests for the framework-agnostic core SDK client.
 *
 * These mirror the testing philosophy in `.clinerules/testing.md`: happy path,
 * edge cases, and failure cases for each public method. All tests stub
 * `globalThis.fetch` — no network calls are made.
 */

// --- Test fixtures ----------------------------------------------------------

const validConfig = {
  applicationName: 'Test App',
  version: '1.0.0',
  apiEndpoint: 'https://feedback.example.com',
  apiKey: 'test-api-key',
};

const validInput = {
  type: 'bug' as const,
  title: 'Save button broken',
  description: 'Clicking save does nothing on the dashboard page.',
};

/** Build a minimal ok JSON Response stub. */
function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

/** Build a minimal error JSON Response stub. */
function errorResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    json: async () => body,
  } as Response;
}

// --- Tests ------------------------------------------------------------------

describe('createFeedbackClient', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('configuration validation', () => {
    it('throws TypeError when apiEndpoint is missing', () => {
      expect(() =>
        createFeedbackClient({ ...validConfig, apiEndpoint: '' } as never)
      ).toThrow(TypeError);
    });

    it('throws TypeError when apiKey is missing', () => {
      expect(() =>
        createFeedbackClient({ ...validConfig, apiKey: '' } as never)
      ).toThrow(TypeError);
    });

    it('normalises trailing slashes on apiEndpoint', async () => {
      fetchSpy.mockResolvedValueOnce(
        okResponse({ success: true, releases: [] })
      );
      const client = createFeedbackClient({
        ...validConfig,
        apiEndpoint: 'https://feedback.example.com/',
      });
      await client.getReleases();
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://feedback.example.com/api/releases',
        expect.anything()
      );
    });
  });

  describe('submitFeedback', () => {
    it('submits feedback and returns the response on success', async () => {
      fetchSpy.mockResolvedValueOnce(
        okResponse({
          success: true,
          issueUrl: 'https://github.com/owner/repo/issues/1',
          issueNumber: 1,
        })
      );

      const client = createFeedbackClient(validConfig);
      const result = await client.submitFeedback(validInput);

      expect(result.success).toBe(true);
      expect(result.issueUrl).toBe('https://github.com/owner/repo/issues/1');
      expect(result.issueNumber).toBe(1);
    });

    it('sends X-API-Key header and JSON body to POST /api/feedback', async () => {
      fetchSpy.mockResolvedValueOnce(okResponse({ success: true }));

      const client = createFeedbackClient(validConfig);
      await client.submitFeedback(validInput);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://feedback.example.com/api/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          }),
        })
      );

      const callBody = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.type).toBe('bug');
      expect(callBody.title).toBe('Save button broken');
      expect(callBody.metadata.application).toBe('Test App');
      expect(callBody.metadata.version).toBe('1.0.0');
    });

    it('auto-captures metadata when none is provided', async () => {
      fetchSpy.mockResolvedValueOnce(okResponse({ success: true }));

      const client = createFeedbackClient(validConfig);
      await client.submitFeedback(validInput);

      const callBody = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.metadata.timestamp).toBeTruthy();
      expect(typeof callBody.metadata.timestamp).toBe('string');
    });

    it('uses caller-provided metadata when present', async () => {
      fetchSpy.mockResolvedValueOnce(okResponse({ success: true }));

      const explicitMetadata = {
        application: 'Custom',
        version: '2.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const client = createFeedbackClient(validConfig);
      await client.submitFeedback({ ...validInput, metadata: explicitMetadata });

      const callBody = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.metadata).toEqual(explicitMetadata);
    });

    it('includes attachments when provided', async () => {
      fetchSpy.mockResolvedValueOnce(okResponse({ success: true }));

      const attachments = [
        {
          url: 'https://cdn.example.com/screenshot.png',
          filename: 'screenshot.png',
          contentType: 'image/png',
          size: 12345,
        },
      ];

      const client = createFeedbackClient(validConfig);
      await client.submitFeedback({ ...validInput, attachments });

      const callBody = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.attachments).toEqual(attachments);
    });

    it('omits attachments key entirely when empty', async () => {
      fetchSpy.mockResolvedValueOnce(okResponse({ success: true }));

      const client = createFeedbackClient(validConfig);
      await client.submitFeedback({ ...validInput, attachments: [] });

      const callBody = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody).not.toHaveProperty('attachments');
    });

    it('throws FeedbackApiError on a 400 validation failure', async () => {
      fetchSpy.mockResolvedValueOnce(
        errorResponse(400, {
          success: false,
          error: 'Title must be at least 3 characters',
        })
      );

      const client = createFeedbackClient(validConfig);
      await expect(client.submitFeedback(validInput)).rejects.toMatchObject({
        name: 'FeedbackApiError',
        status: 400,
        message: 'Title must be at least 3 characters',
      });
    });

    it('throws FeedbackApiError on a 401 auth failure', async () => {
      fetchSpy.mockResolvedValueOnce(
        errorResponse(401, { success: false, error: 'Invalid API key' })
      );

      const client = createFeedbackClient(validConfig);
      await expect(client.submitFeedback(validInput)).rejects.toMatchObject({
        name: 'FeedbackApiError',
        status: 401,
      });
    });

    it('throws a plain Error on network failure', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const client = createFeedbackClient(validConfig);
      await expect(client.submitFeedback(validInput)).rejects.toThrow(
        /network/i
      );
    });

    it('throws TypeError when required fields are missing', async () => {
      const client = createFeedbackClient(validConfig);
      await expect(
        client.submitFeedback({ ...validInput, title: '' } as never)
      ).rejects.toThrow(TypeError);
    });
  });

  describe('getReleases', () => {
    it('returns releases on success', async () => {
      fetchSpy.mockResolvedValueOnce(
        okResponse({
          success: true,
          releases: [
            { version: '1.0.0', date: '2024-01-01', body: 'Initial release' },
          ],
        })
      );

      const client = createFeedbackClient(validConfig);
      const releases = await client.getReleases();

      expect(releases).toHaveLength(1);
      expect(releases[0].version).toBe('1.0.0');
    });

    it('returns empty array when releases is absent', async () => {
      fetchSpy.mockResolvedValueOnce(okResponse({ success: true }));

      const client = createFeedbackClient(validConfig);
      const releases = await client.getReleases();
      expect(releases).toEqual([]);
    });

    it('sends X-API-Key header to GET /api/releases', async () => {
      fetchSpy.mockResolvedValueOnce(okResponse({ success: true, releases: [] }));

      const client = createFeedbackClient(validConfig);
      await client.getReleases();

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://feedback.example.com/api/releases',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-API-Key': 'test-api-key' }),
        })
      );
    });

    it('throws FeedbackApiError on failure', async () => {
      fetchSpy.mockResolvedValueOnce(
        errorResponse(502, { success: false, error: 'Bad gateway' })
      );

      const client = createFeedbackClient(validConfig);
      await expect(client.getReleases()).rejects.toMatchObject({
        name: 'FeedbackApiError',
        status: 502,
      });
    });
  });

  describe('getRoadmap', () => {
    it('returns roadmap items on success', async () => {
      fetchSpy.mockResolvedValueOnce(
        okResponse({
          success: true,
          roadmap: [
            { id: 1, title: 'Dark mode', status: 'planned', url: 'https://example.com/1' },
          ],
        })
      );

      const client = createFeedbackClient(validConfig);
      const roadmap = await client.getRoadmap();

      expect(roadmap).toHaveLength(1);
      expect(roadmap[0].title).toBe('Dark mode');
    });

    it('returns empty array when roadmap is absent', async () => {
      fetchSpy.mockResolvedValueOnce(okResponse({ success: true }));

      const client = createFeedbackClient(validConfig);
      const roadmap = await client.getRoadmap();
      expect(roadmap).toEqual([]);
    });

    it('throws FeedbackApiError on failure', async () => {
      fetchSpy.mockResolvedValueOnce(
        errorResponse(403, { success: false, error: 'Forbidden' })
      );

      const client = createFeedbackClient(validConfig);
      await expect(client.getRoadmap()).rejects.toMatchObject({
        name: 'FeedbackApiError',
        status: 403,
      });
    });
  });

  describe('FeedbackApiError', () => {
    it('carries status and endpoint for caller branching', () => {
      const err = new FeedbackApiError('boom', 429, 'https://example.com/api/feedback');
      expect(err.status).toBe(429);
      expect(err.endpoint).toBe('https://example.com/api/feedback');
      expect(err.name).toBe('FeedbackApiError');
      expect(err.message).toBe('boom');
    });
  });
});