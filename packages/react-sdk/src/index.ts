// React SDK for NB Feedback Kit
// Headless components for feedback collection

export { FeedbackProvider } from './FeedbackProvider';
export { useFeedback } from './useFeedback';
export { useSubmitFeedback, FeedbackSubmitError } from './hooks/useSubmitFeedback';
export { FeedbackButton } from './components/FeedbackButton';
export { FeedbackModal } from './components/FeedbackModal';
export { ReleaseNotesModal } from './components/ReleaseNotesModal';
export { useReleaseNotes } from './hooks/useReleaseNotes';
export { RoadmapModal } from './components/RoadmapModal';
export { useRoadmap } from './hooks/useRoadmap';
export type { FeedbackConfig, FeedbackContextValue } from './types';
export type { FeedbackButtonProps } from './components/FeedbackButton';
export type { FeedbackModalProps, FeedbackFormData } from './components/FeedbackModal';
export type { ReleaseNotesModalProps } from './components/ReleaseNotesModal';
export type { UseReleaseNotesResult } from './hooks/useReleaseNotes';
export type { RoadmapModalProps } from './components/RoadmapModal';
export type { UseRoadmapResult } from './hooks/useRoadmap';
export { captureMetadata, detectBrowser, detectOS, detectRoute, detectScreenResolution } from './utils/metadata';
