import type { FeedbackMetadata } from '@nb-feedback-kit/shared-types';

export interface FeedbackConfig {
  applicationName: string;
  version: string;
  apiEndpoint: string;
  apiKey: string;
  userId?: string;
}

export interface FeedbackContextValue {
  config: FeedbackConfig;
  metadata: FeedbackMetadata;
}
