import { useState, useEffect, useCallback, useContext } from 'react';
import { FeedbackContext } from '../FeedbackProvider';
import type { ReleaseNote } from '@nb-feedback-kit/shared-types';

export interface UseReleaseNotesResult {
  releases: ReleaseNote[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches release notes from the NB Feedback Kit API.
 * Requires FeedbackProvider to be configured with apiEndpoint and apiKey.
 *
 * @param autoFetch Whether to fetch automatically on mount (default: true)
 */
export function useReleaseNotes(autoFetch = true): UseReleaseNotesResult {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error('useReleaseNotes must be used within a FeedbackProvider');
  }

  const { config } = context;
  const [releases, setReleases] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiEndpoint}/api/releases`, {
        headers: {
          'X-API-Key': config.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API responded with status ${response.status}`);
      }

      setReleases(data.releases ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch release notes';
      console.error('❌ Failed to fetch release notes:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [config.apiEndpoint, config.apiKey]);

  useEffect(() => {
    if (autoFetch) {
      fetchReleases();
    }
  }, [autoFetch, fetchReleases]);

  return {
    releases,
    loading,
    error,
    refetch: fetchReleases,
  };
}