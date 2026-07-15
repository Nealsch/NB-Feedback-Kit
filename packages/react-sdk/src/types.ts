import type { FeedbackMetadata } from '@nb-feedback-kit/shared-types';
import type { StorageProviderConfig } from './storage/types';

export interface FeedbackConfig {
  applicationName: string;
  version: string;
  apiEndpoint: string;
  apiKey: string;
  userId?: string;
  /**
   * Optional screenshot storage provider. Omit or set to `{ type: 'none' }`
   * to disable screenshot attachments (default). See `StorageProviderConfig`
   * for available providers (custom endpoint now; R2/S3/Supabase in Sprint 2).
   */
  storage?: StorageProviderConfig;
}

export interface FeedbackContextValue {
  config: FeedbackConfig;
  metadata: FeedbackMetadata;
  storage: import('./storage/types').StorageProvider;
}
