/**
 * Public configuration types for the framework-agnostic NB Feedback Kit core SDK.
 *
 * These mirror the React SDK's `FeedbackConfig` shape so the two packages stay
 * interchangeable. A consumer using this core SDK instead of `@nb-feedback-kit/react-sdk`
 * passes the same values — minus React.
 */

import type { StorageProviderConfig } from './storage/types';

/**
 * Configuration accepted by {@link createFeedbackClient}.
 *
 * @property applicationName - Human-readable app name; included in the GitHub issue metadata.
 * @property version        - App version; captured in metadata.
 * @property apiEndpoint    - Fully-qualified base URL of the NB Feedback Kit Worker
 *                            (e.g. `https://feedback.example.com`). No trailing slash.
 * @property apiKey         - API key registered in the Worker's KV store. Sent as `X-API-Key`.
 * @property userId         - Optional stable user identifier for tracing across submissions.
 * @property storage        - Optional screenshot storage provider config. Omit or set to
 *                            `{ type: 'none' }` to disable screenshot attachments.
 */
export interface FeedbackConfig {
  applicationName: string;
  version: string;
  apiEndpoint: string;
  apiKey: string;
  userId?: string;
  storage?: StorageProviderConfig;
}

/**
 * Form data accepted by {@link FeedbackClient.submitFeedback}.
 *
 * Decoupled from the wire {@link FeedbackPayload} so consumers do not have to build
 * metadata themselves — the client attaches it automatically (unless `metadata` is
 * explicitly provided, which overrides auto-capture for advanced use cases).
 */
export interface FeedbackInput {
  type: 'bug' | 'feature' | 'feedback';
  title: string;
  description: string;
  /** Optional uploaded-file URLs produced by a storage provider. */
  attachments?: import('@nb-feedback-kit/shared-types').UploadedFile[];
  /**
   * Optional override for the auto-captured metadata. When omitted the client builds
   * a {@link FeedbackMetadata} from the browser environment at submission time.
   */
  metadata?: import('@nb-feedback-kit/shared-types').FeedbackMetadata;
}

/**
 * The object returned by {@link createFeedbackClient}.
 */
export interface FeedbackClient {
  /** Submit feedback, creating a GitHub Issue via the Worker. Throws on failure. */
  submitFeedback(input: FeedbackInput): Promise<import('@nb-feedback-kit/shared-types').FeedbackResponse>;
  /** Fetch GitHub Releases for the configured project. */
  getReleases(): Promise<import('@nb-feedback-kit/shared-types').ReleaseNote[]>;
  /** Fetch roadmap items (GitHub Issues with roadmap labels) for the configured project. */
  getRoadmap(): Promise<import('@nb-feedback-kit/shared-types').RoadmapItem[]>;
  /** The config the client was created with. */
  readonly config: FeedbackConfig;
}