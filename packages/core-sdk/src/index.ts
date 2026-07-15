/**
 * @nb-feedback-kit/core-sdk
 *
 * Framework-agnostic JavaScript SDK for NB Feedback Kit.
 *
 * Works with any frontend — vanilla JS, Vue, Svelte, Angular, Eleventy, Web
 * Components — or any JavaScript environment with `fetch`. For React apps,
 * use `@nb-feedback-kit/react-sdk` instead (it wraps this same backend contract
 * with hooks and components).
 */

// Main client factory + typed error.
export { createFeedbackClient, FeedbackApiError } from './client';

// Public types.
export type { FeedbackClient, FeedbackConfig, FeedbackInput } from './types';

// Metadata capture utilities — exported for consumers that build custom UIs
// and want to preview or override the metadata that would be attached.
export {
  captureMetadata,
  detectBrowser,
  detectOS,
  detectRoute,
  detectScreenResolution,
} from './utils/metadata';

// Storage abstraction — exported so consumers can build custom upload flows
// (e.g. a file picker in a Web Component) and still feed `attachments` into
// `submitFeedback`.
export {
  createStorageProvider,
  NoneStorageProvider,
  CustomEndpointProvider,
  S3StorageProvider,
} from './storage';
export type {
  StorageProvider,
  StorageProviderConfig,
  CustomEndpointConfig,
  S3Config,
  StorageTestResult,
  StorageHostContext,
  S3StorageProviderOptions,
} from './storage';

// Re-export the shared wire types consumers will commonly need.
export type {
  FeedbackType,
  FeedbackMetadata,
  FeedbackPayload,
  FeedbackResponse,
  ReleaseNote,
  RoadmapItem,
  UploadedFile,
  PresignRequest,
  PresignResponse,
} from '@nb-feedback-kit/shared-types';