import { useState, useEffect, useCallback, useContext } from 'react';
import { FeedbackContext } from '../FeedbackProvider';
import type { RoadmapItem } from '@nb-feedback-kit/shared-types';

export interface UseRoadmapResult {
  roadmap: RoadmapItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches roadmap items from the NB Feedback Kit API.
 * Requires FeedbackProvider to be configured with apiEndpoint and apiKey.
 *
 * @param autoFetch Whether to fetch automatically on mount (default: true)
 */
export function useRoadmap(autoFetch = true): UseRoadmapResult {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error('useRoadmap must be used within a FeedbackProvider');
  }

  const { config } = context;
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiEndpoint}/api/roadmap`, {
        headers: {
          'X-API-Key': config.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API responded with status ${response.status}`);
      }

      setRoadmap(data.roadmap ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch roadmap';
      console.error('❌ Failed to fetch roadmap:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [config.apiEndpoint, config.apiKey]);

  useEffect(() => {
    if (autoFetch) {
      fetchRoadmap();
    }
  }, [autoFetch, fetchRoadmap]);

  return {
    roadmap,
    loading,
    error,
    refetch: fetchRoadmap,
  };
}