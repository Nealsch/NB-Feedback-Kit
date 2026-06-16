// React SDK for NB Feedback Kit
// Headless components for feedback collection

export { FeedbackProvider } from './FeedbackProvider';
export { useFeedback } from './useFeedback';
export { useSubmitFeedback } from './hooks/useSubmitFeedback';
export { FeedbackButton } from './components/FeedbackButton';
export { FeedbackModal } from './components/FeedbackModal';
export type { FeedbackConfig, FeedbackContextValue } from './types';
export type { FeedbackButtonProps } from './components/FeedbackButton';
export type { FeedbackModalProps, FeedbackFormData } from './components/FeedbackModal';
export { captureMetadata, detectBrowser, detectOS, detectRoute, detectScreenResolution } from './utils/metadata';
