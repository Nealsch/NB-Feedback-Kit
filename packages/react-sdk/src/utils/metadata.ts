/**
 * Metadata capture utilities for NB Feedback Kit
 * Captures browser, OS, route, screen resolution automatically
 */

import type { FeedbackMetadata } from '@nb-feedback-kit/shared-types';

/**
 * Detect browser name from User-Agent
 */
export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'Unknown';
  
  const ua = window.navigator.userAgent;
  
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  
  return 'Unknown';
}

/**
 * Detect operating system from User-Agent
 */
export function detectOS(): string {
  if (typeof window === 'undefined') return 'Unknown';
  
  const ua = window.navigator.userAgent;
  const platform = window.navigator.platform;
  
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || platform.includes('iPhone') || platform.includes('iPad')) return 'iOS';
  
  return 'Unknown';
}

/**
 * Get current route from window.location
 */
export function detectRoute(): string {
  if (typeof window === 'undefined') return '/';
  
  return window.location.pathname + window.location.search;
}

/**
 * Get screen resolution
 */
export function detectScreenResolution(): string {
  if (typeof window === 'undefined') return 'Unknown';
  
  const { innerWidth, innerHeight } = window;
  return `${innerWidth}x${innerHeight}`;
}

/**
 * Capture all metadata automatically
 * @param application - Application name from config
 * @param version - Application version from config
 * @param userId - Optional user ID from config
 */
export function captureMetadata(
  application: string,
  version: string,
  userId?: string
): FeedbackMetadata {
  return {
    application,
    version,
    route: detectRoute(),
    browser: detectBrowser(),
    os: detectOS(),
    screenResolution: detectScreenResolution(),
    timestamp: new Date().toISOString(),
    userId,
  };
}
