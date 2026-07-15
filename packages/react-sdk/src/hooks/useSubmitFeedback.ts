import { useContext, useCallback } from 'react';
import { FeedbackContext } from '../FeedbackProvider';
import type { FeedbackFormData } from '../components/FeedbackModal';
import type { FeedbackPayload, FeedbackResponse } from '@nb-feedback-kit/shared-types';

/**
 * Error thrown when feedback submission fails (network error or non-2xx API response).
 * Callers (e.g. FeedbackModal) can catch this to surface inline error messages.
 */
export class FeedbackSubmitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackSubmitError';
  }
}

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
        // Forward uploaded screenshot URLs when present. Absent entirely
        // (not even an empty array) when screenshots are disabled or none
        // uploaded, keeping the payload backward-compatible.
        ...(formData.attachments && formData.attachments.length > 0
          ? { attachments: formData.attachments }
          : {}),
      };

      console.log('📤 Submitting feedback to:', config.apiEndpoint + '/api/feedback');

      let response: Response;
      try {
        response = await fetch(`${config.apiEndpoint}/api/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.apiKey,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // Transient network error (fetch threw before a response was received)
        const message = err instanceof Error ? err.message : 'Network request failed';
        console.error('❌ Network error submitting feedback:', message);
        throw new FeedbackSubmitError(
          'Unable to reach the feedback service. Please check your connection and try again.'
        );
      }

      // Parse JSON body (guard against empty/non-JSON responses)
      let result: FeedbackResponse;
      try {
        result = (await response.json()) as FeedbackResponse;
      } catch {
        console.error('❌ Non-JSON response from API. Status:', response.status);
        throw new FeedbackSubmitError(
          `The feedback service returned an unexpected response (status ${response.status}).`
        );
      }

      // Surface API failures as thrown errors so the UI (FeedbackModal) can react.
      if (!response.ok || !result.success) {
        const message = result.error || `API responded with status ${response.status}`;
        console.error('❌ Feedback submission rejected:', message);
        throw new FeedbackSubmitError(message);
      }

      console.log('✅ Feedback submitted successfully:', result);
      return result;
    },
    [config, metadata]
  );

  return { submitFeedback };
}