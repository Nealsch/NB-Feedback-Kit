/**
 * Framework-agnostic client for NB Feedback Kit.
 *
 * This is the non-React alternative to `@nb-feedback-kit/react-sdk`. It exposes
 * the same backend capabilities — submit feedback, fetch releases, fetch roadmap
 * — without any React dependency, so it can be used in vanilla JS, Vue, Svelte,
 * Angular, Eleventy, Web Components, or any JavaScript environment with `fetch`.
 *
 * Example (ESM):
 *
 * ```ts
 * import { createFeedbackClient } from '@nb-feedback-kit/core-sdk';
 *
 * const feedback = createFeedbackClient({
 *   applicationName: 'My App',
 *   version: '1.0.0',
 *   apiEndpoint: 'https://feedback.example.com',
 *   apiKey: 'my-api-key',
 * });
 *
 * const result = await feedback.submitFeedback({
 *   type: 'bug',
 *   title: 'Button does not click',
 *   description: 'On the dashboard, the save button is unresponsive.',
 * });
 * ```
 */

import type {
  FeedbackMetadata,
  FeedbackPayload,
  FeedbackResponse,
  ReleaseNote,
  RoadmapItem,
} from '@nb-feedback-kit/shared-types';
import type { FeedbackClient, FeedbackConfig, FeedbackInput } from './types';
import { captureMetadata } from './utils/metadata';
import { createStorageProvider } from './storage';
import type { StorageProvider } from './storage/types';

/**
 * Error thrown when the Worker responds with a non-success status. Carries the
 * status code and server message so callers can branch on common cases
 * (validation 400, auth 401/403, rate-limit 429, upstream 502).
 */
export class FeedbackApiError extends Error {
  readonly status: number;
  readonly endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = 'FeedbackApiError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

/**
 * Create a framework-agnostic feedback client.
 *
 * The client is cheap to construct; create one per app and reuse it. All
 * methods are stateless aside from reading {@link FeedbackConfig}.
 *
 * @throws TypeError if `config.apiEndpoint` or `config.apiKey` is missing.
 */
export function createFeedbackClient(config: FeedbackConfig): FeedbackClient {
  if (!config.apiEndpoint) {
    throw new TypeError('createFeedbackClient: `config.apiEndpoint` is required.');
  }
  if (!config.apiKey) {
    throw new TypeError('createFeedbackClient: `config.apiKey` is required.');
  }

  // Normalise once — trailing slashes cause double-slash URLs downstream.
  const baseUrl = config.apiEndpoint.replace(/\/+$/, '');

  // Build the storage provider lazily but once. The core SDK treats storage as
  // an opt-in helper: consumers can also upload via their own code and pass
  // pre-built `attachments` URLs directly to `submitFeedback`.
  const storage: StorageProvider = createStorageProvider(config.storage ?? { type: 'none' }, {
    apiEndpoint: baseUrl,
    apiKey: config.apiKey,
  });

  /**
   * Submit feedback, creating a GitHub Issue via the Worker.
   *
   * @throws FeedbackApiError on any non-success response.
   * @throws Error on network failure or invalid JSON.
   */
  async function submitFeedback(input: FeedbackInput): Promise<FeedbackResponse> {
    if (!input.type || !input.title || !input.description) {
      throw new TypeError('submitFeedback: `type`, `title`, and `description` are required.');
    }

    // Auto-capture metadata unless the caller provided an explicit override.
    const metadata: FeedbackMetadata =
      input.metadata ??
      captureMetadata(config.applicationName, config.version, config.userId);

    const payload: FeedbackPayload = {
      type: input.type,
      title: input.title,
      description: input.description,
      metadata,
      ...(input.attachments && input.attachments.length > 0
        ? { attachments: input.attachments }
        : {}),
    };

    const endpoint = `${baseUrl}/api/feedback`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network request failed';
      throw new Error(`Feedback submission failed (network): ${message}`);
    }

    const data = await safeReadJson<FeedbackResponse>(response);

    if (!response.ok || !data.success) {
      const message = (data && data.error) || `API responded with status ${response.status}`;
      throw new FeedbackApiError(message, response.status, endpoint);
    }

    return data;
  }

  /**
   * Fetch release notes (GitHub Releases) for the configured project.
   *
   * @throws FeedbackApiError on any non-success response.
   * @throws Error on network failure or invalid JSON.
   */
  async function getReleases(): Promise<ReleaseNote[]> {
    const endpoint = `${baseUrl}/api/releases`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        headers: { 'X-API-Key': config.apiKey },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network request failed';
      throw new Error(`Failed to fetch releases (network): ${message}`);
    }

    const data = await safeReadJson<{ success?: boolean; releases?: ReleaseNote[]; error?: string }>(
      response
    );

    if (!response.ok || !data.success) {
      const message = data.error || `API responded with status ${response.status}`;
      throw new FeedbackApiError(message, response.status, endpoint);
    }

    return data.releases ?? [];
  }

  /**
   * Fetch roadmap items (GitHub Issues with roadmap labels) for the configured project.
   *
   * @throws FeedbackApiError on any non-success response.
   * @throws Error on network failure or invalid JSON.
   */
  async function getRoadmap(): Promise<RoadmapItem[]> {
    const endpoint = `${baseUrl}/api/roadmap`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        headers: { 'X-API-Key': config.apiKey },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network request failed';
      throw new Error(`Failed to fetch roadmap (network): ${message}`);
    }

    const data = await safeReadJson<{ success?: boolean; roadmap?: RoadmapItem[]; error?: string }>(
      response
    );

    if (!response.ok || !data.success) {
      const message = data.error || `API responded with status ${response.status}`;
      throw new FeedbackApiError(message, response.status, endpoint);
    }

    return data.roadmap ?? [];
  }

  return {
    submitFeedback,
    getReleases,
    getRoadmap,
    config,
    // Expose storage so consumers can call `storage.upload(file)` directly when
    // building custom UIs. Not part of the minimal FeedbackClient interface to
    // keep that surface small; access via the returned object's `storage` field.
    ...(storage.enabled ? { storage } : {}),
  } as FeedbackClient & ({ storage?: StorageProvider });
}

/**
 * Read and parse a JSON response body, throwing a readable error if the body
 * is not valid JSON (e.g. HTML 502 page from a proxy).
 */
async function safeReadJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error('API returned a non-JSON response (possible proxy or gateway error).');
  }
}