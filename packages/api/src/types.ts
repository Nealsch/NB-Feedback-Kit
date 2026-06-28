/**
 * Shared API-level types for NB Feedback Kit API
 */

export interface GithubRepoConfig {
  owner: string;
  repo: string;
}

export interface FeedbackConfig {
  applicationName: string;
  github: GithubRepoConfig;
  rateLimit: number;
}