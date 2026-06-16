import { useContext, useCallback } from 'react';
import { FeedbackContext } from '../FeedbackProvider';
import type { FeedbackFormData } from '../components/FeedbackModal';
import type { FeedbackPayload, FeedbackResponse } from '@nb-feedback-kit/shared-types';

export function useSubmitFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error('useSubmitFeedback must be used within a FeedbackProvider');
  }

  const { config, metadata } = context;

  const submitFeedback = useCallback(
    async (formData: FeedbackFormData): Promise<FeedbackResponse> => {
      const payload: FeedbackPayload = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        metadata,
      };

      // For now, just log to console
      // In TASK-008, we'll wire this to the actual API
      console.log('📤 Submitting feedback:', payload);
      console.log('🔑 API Config:', {
        endpoint: config.apiEndpoint,
        apiKey: config.apiKey.substring(0, 8) + '...',
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        issueUrl: 'https://github.com/example/repo/issues/1',
      };
    },
    [config, metadata]
  );

  return { submitFeedback };
}
