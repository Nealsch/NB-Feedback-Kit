import { useState, useEffect, useCallback } from 'react';

/**
 * Minimal client-side router for the demo app.
 * Uses the History API so window.location.pathname changes are
 * picked up by the SDK's detectRoute() metadata capture.
 */
export function useRouter() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
    window.scrollTo(0, 0);
  }, []);

  return { path, navigate };
}