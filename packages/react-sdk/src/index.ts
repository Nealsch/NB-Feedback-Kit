// React SDK for NB Feedback Kit
// Headless components for feedback collection

export { FeedbackProvider } from './FeedbackProvider';
export { useFeedback } from './useFeedback';
export { useSubmitFeedback, FeedbackSubmitError } from './hooks/useSubmitFeedback';
export { FeedbackButton } from './components/FeedbackButton';
export { FeedbackModal } from './components/FeedbackModal';
export { StorageConfigPanel } from './components/StorageConfigPanel';
export { ReleaseNotesModal } from './components/ReleaseNotesModal';
export { useReleaseNotes } from './hooks/useReleaseNotes';
export { RoadmapModal } from './components/RoadmapModal';
export { useRoadmap } from './hooks/useRoadmap';
export type { FeedbackConfig, FeedbackContextValue } from './types';
export type { FeedbackButtonProps } from './components/FeedbackButton';
export type { FeedbackModalProps, FeedbackFormData } from './components/FeedbackModal';
export type { StorageConfigPanelProps } from './components/StorageConfigPanel';
export type { ReleaseNotesModalProps } from './components/ReleaseNotesModal';
export type { UseReleaseNotesResult } from './hooks/useReleaseNotes';
export type { RoadmapModalProps } from './components/RoadmapModal';
export type { UseRoadmapResult } from './hooks/useRoadmap';
export { captureMetadata, detectBrowser, detectOS, detectRoute, detectScreenResolution } from './utils/metadata';

// Screenshot storage providers.
// - none: default, screenshots disabled
// - custom: upload to your own HTTP endpoint (Sprint 1)
// - s3: S3-compatible (AWS S3, Cloudflare R2, MinIO, B2) via Worker-presigned URLs
export { NoneStorageProvider } from './storage/none-provider';
export { CustomEndpointProvider } from './storage/custom-endpoint-provider';
export { S3StorageProvider } from './storage/providers/s3';
export { createStorageProvider } from './storage';
export type { StorageHostContext } from './storage';
export { testStorageProvider } from './storage/test-connection';
export type {
  StorageProvider,
  StorageProviderConfig,
  CustomEndpointConfig,
  S3Config,
  StorageTestResult,
} from './storage/types';
