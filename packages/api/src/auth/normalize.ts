/**
 * KV record schema normalization.
 *
 * The `API_KEYS` KV namespace stores per-key configuration as JSON. Two schemas
 * have existed over time:
 *
 *   1. **Legacy (pre-FEEDBACK-2):**
 *      ```json
 *      { "name": "NB Toolbox", "repository": "Nealsch/nb-toolbox" }
 *      ```
 *      The GitHub repo is a flat `"owner/repo"` string.
 *
 *   2. **Current:**
 *      ```json
 *      { "name": "NB Toolbox", "github": { "owner": "Nealsch", "repo": "nb-toolbox" }, "rateLimit": 60 }
 *      ```
 *
 * The Worker's typed interfaces (`BootstrapKvValue`, `DeviceKvValue`) expect the
 * current schema — accessing `keyData.github.owner` on a legacy record throws
 * `Cannot read properties of undefined (reading 'owner')`.
 *
 * This module provides `normalizeKvConfig()` to safely convert either shape into
 * the `FeedbackConfig` the downstream handlers expect, with defensive defaults
 * for missing fields.
 */

import type { FeedbackConfig, GithubRepoConfig } from '../types';

/** Raw KV value — accepts both legacy and current schemas. */
export interface RawKvConfig {
  name?: string;
  /** Current schema: nested owner/repo object. */
  github?: { owner?: string; repo?: string };
  /** Legacy schema: flat "owner/repo" string. */
  repository?: string;
  rateLimit?: number;
}

/**
 * Parse a legacy `"owner/repo"` string into a `GithubRepoConfig`.
 * Returns `null` if the string doesn't contain exactly one `/`.
 */
function parseRepositoryString(repo: string): GithubRepoConfig | null {
  const parts = repo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { owner: parts[0], repo: parts[1] };
}

/**
 * Normalize a raw KV record into a `FeedbackConfig`, handling both the legacy
 * `repository` string and the current `github` object schema.
 *
 * Throws if the record is unusable (missing name, or no resolvable GitHub repo).
 * Callers should catch and return a 401/500 as appropriate.
 */
export function normalizeKvConfig(raw: RawKvConfig, logPrefix = '[auth]'): FeedbackConfig {
  if (!raw.name) {
    throw new Error('KV record missing "name" field');
  }

  // Resolve GitHub config: prefer the nested object, fall back to the legacy string.
  let github: GithubRepoConfig | null = null;
  if (raw.github?.owner && raw.github?.repo) {
    github = { owner: raw.github.owner, repo: raw.github.repo };
  } else if (raw.repository) {
    github = parseRepositoryString(raw.repository);
    if (github) {
      console.warn(
        `${logPrefix} KV record uses legacy "repository" string (${raw.repository}). ` +
          'Re-key with the "github" object schema when convenient.',
      );
    }
  }

  if (!github) {
    throw new Error(
      `KV record for "${raw.name}" has no valid GitHub repo config ` +
        '(neither "github.{owner,repo}" nor "repository" resolved).',
    );
  }

  const rateLimit =
    typeof raw.rateLimit === 'number' && raw.rateLimit >= 1 ? raw.rateLimit : 60;

  return {
    applicationName: raw.name,
    github,
    rateLimit,
  };
}