import { useContext } from 'react';
import { FeedbackContext } from './FeedbackProvider';
import type { FeedbackContextValue } from './types';

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  
  return context;
}
