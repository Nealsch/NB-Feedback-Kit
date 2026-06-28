/**
 * GitHub API Client for NB Feedback Kit
 *
 * Handles all GitHub API interactions:
 * - Issue creation with formatted body
 * - Label auto-tagging based on feedback type
 * - Release notes retrieval
 * - Roadmap issue queries
 *
 * ADR-005: API Key → Repository Mapping (Server-Side Routing)
 * Repository details are resolved from the API key, never from client input.
 */

import type { GithubRepoConfig } from '../types';
import type { FeedbackPayload } from '@nb-feedback-kit/shared-types';

interface GitHubIssueResponse {
  html_url: string;
  number: number;
  title: string;
  state: string;
  labels: { name: string }[];
}

interface GitHubReleaseResponse {
  tag_name: string;
  published_at: string;
  body: string;
  html_url: string;
}

interface GitHubIssueQueryResponse {
  number: number;
  title: string;
  state: string;
  html_url: string;
  labels: { name: string }[];
}

/**
 * Creates the issue title with type prefix
 */
function buildIssueTitle(type: string, title: string): string {
  const prefix = type === 'bug' ? '[BUG]' : type === 'feature' ? '[FEATURE]' : '[FEEDBACK]';
  return `${prefix} ${title}`;
}

/**
 * Creates the issue body with metadata
 */
function buildIssueBody(payload: FeedbackPayload): string {
  const { description, metadata, type } = payload;

  const sections = [
    `## Description\n\n${description}`,
    '---',
    '## Metadata',
    '',
    `**Type:** ${type}`,
    `**Application:** ${metadata.application}`,
    `**Version:** ${metadata.version}`,
  ];

  if (metadata.route) sections.push(`**Route:** ${metadata.route}`);
  if (metadata.browser) sections.push(`**Browser:** ${metadata.browser}`);
  if (metadata.os) sections.push(`**Operating System:** ${metadata.os}`);
  if (metadata.screenResolution) sections.push(`**Screen Resolution:** ${metadata.screenResolution}`);
  if (metadata.userId) sections.push(`**User ID:** ${metadata.userId}`);

  sections.push(`**Timestamp:** ${metadata.timestamp}`);

  return sections.join('\n\n');
}

/**
 * Resolves labels based on feedback type
 * ADR-006: GitHub Labels — Bug/Feature/Feedback each get specific labels + beta-feedback
 */
function resolveLabels(type: string): string[] {
  const typeLabel = type === 'bug' ? 'bug' : type === 'feature' ? 'feature-request' : 'feedback';
  return [typeLabel, 'beta-feedback'];
}

/**
 * Creates an authenticated GitHub API request.
 */
async function githubFetch(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `https://api.github.com${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'nb-feedback-kit',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

  return response;
}

/**
 * Creates a GitHub Issue from a feedback submission.
 */
export async function createGitHubIssue(
  token: string,
  repo: GithubRepoConfig,
  payload: FeedbackPayload
): Promise<{ issueUrl: string; issueNumber: number }> {
  const title = buildIssueTitle(payload.type, payload.title);
  const body = buildIssueBody(payload);
  const labels = resolveLabels(payload.type);

  const response = await githubFetch(
    token,
    `/repos/${repo.owner}/${repo.repo}/issues`,
    {
      method: 'POST',
      body: JSON.stringify({ title, body, labels }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage: string;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.message || errorBody;
    } catch {
      errorMessage = errorBody;
    }
    throw new Error(`GitHub API error (${response.status}): ${errorMessage}`);
  }

  const issue: GitHubIssueResponse = await response.json();
  return { issueUrl: issue.html_url, issueNumber: issue.number };
}

/**
 * Fetches releases for a GitHub repository.
 */
export async function getReleases(
  token: string,
  repo: GithubRepoConfig
): Promise<{ version: string; date: string; body: string; url: string }[]> {
  const response = await githubFetch(
    token,
    `/repos/${repo.owner}/${repo.repo}/releases?per_page=10`
  );

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage: string;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.message || errorBody;
    } catch {
      errorMessage = errorBody;
    }
    throw new Error(`GitHub API error (${response.status}): ${errorMessage}`);
  }

  const releases: GitHubReleaseResponse[] = await response.json();
  return releases.map((r) => ({
    version: r.tag_name,
    date: r.published_at,
    body: r.body || '',
    url: r.html_url,
  }));
}

/**
 * Fetches roadmap items from GitHub Issues filtered by labels.
 * Labels: planned, in-progress, released
 */
export async function getRoadmap(
  token: string,
  repo: GithubRepoConfig
): Promise<{ id: number; title: string; status: string; url: string }[]> {
  const labelQuery = encodeURIComponent('planned,in-progress,released');
  const response = await githubFetch(
    token,
    `/repos/${repo.owner}/${repo.repo}/issues?labels=${labelQuery}&state=all&per_page=50`
  );

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage: string;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.message || errorBody;
    } catch {
      errorMessage = errorBody;
    }
    throw new Error(`GitHub API error (${response.status}): ${errorMessage}`);
  }

  const issues: GitHubIssueQueryResponse[] = await response.json();
  return issues.map((issue) => {
    // Determine status from labels
    const status = issue.labels.some((l) => l.name === 'released')
      ? 'released'
      : issue.labels.some((l) => l.name === 'in-progress')
        ? 'in-progress'
        : 'planned';

    return {
      id: issue.number,
      title: issue.title,
      status,
      url: issue.html_url,
    };
  });
}