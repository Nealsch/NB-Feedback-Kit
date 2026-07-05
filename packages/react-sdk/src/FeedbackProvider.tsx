import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import type { FeedbackConfig, FeedbackContextValue } from './types';
import { captureMetadata } from './utils/metadata';
import type { FeedbackMetadata } from '@nb-feedback-kit/shared-types';
import { createStorageProvider } from './storage';
import type { StorageProvider } from './storage/types';

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

interface FeedbackProviderProps {
  config: FeedbackConfig;
  children: ReactNode;
}

export function FeedbackProvider({ config, children }: FeedbackProviderProps) {
  const [metadata, setMetadata] = useState<FeedbackMetadata | null>(null);

  // Build the storage provider from config once. Recreated only if the
  // caller's storage config identity changes. Default = disabled (none).
  const storage: StorageProvider = useMemo(
    () => createStorageProvider(config.storage ?? { type: 'none' }),
    [config.storage]
  );

  useEffect(() => {
    // Capture metadata on mount
    const captured = captureMetadata(
      config.applicationName,
      config.version,
      config.userId
    );
    setMetadata(captured);
  }, [config.applicationName, config.version, config.userId]);

  // Don't render children until metadata is captured
  if (!metadata) {
    return null;
  }

  const contextValue: FeedbackContextValue = {
    config,
    metadata,
    storage,
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
    </FeedbackContext.Provider>
  );
}
