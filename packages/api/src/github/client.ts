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
 * Escape HTML special characters in user-supplied values (alt text, URL)
 * before interpolating them into an `<img>` tag in the issue body. This
 * prevents attribute/HTML injection from a malicious filename or a tampered
 * storage-provider response.
 *
 * The ampersand entity is built from its character code so that no literal
 * HTML entities appear in source — this keeps source formatters/previewers
 * from decoding them and silently breaking the escaper.
 */
const AMP = String.fromCharCode(38); // "&"
function escapeHtml(value: string | undefined | null): string {
  if (!value) return '';
  return value.replace(/[&"'<>]/g, (ch) => {
    if (ch === AMP) return AMP + 'amp;';
    if (ch === '"') return AMP + 'quot;';
    if (ch === "'") return AMP + '#39;';
    if (ch === '<') return AMP + 'lt;';
    if (ch === '>') return AMP + 'gt;';
    return ch;
  });
}

/**
 * Creates the issue body with metadata and optional screenshot attachments.
 * Exported for unit testing of the screenshot-rendering behavior.
 */
export function buildIssueBody(payload: FeedbackPayload): string {
  const { description, metadata, type } = payload;

  // FEEDBACK-4: The description is user-authored Markdown — leave it
  // unescaped so users can include code blocks and formatting. GitHub
  // sanitises HTML server-side (strips <script>, onclick, etc.), so the
  // risk is limited to Markdown formatting injection, which is acceptable
  // for an issue body.
  const sections: string[] = [`## Description\n\n${description}`];

  // Screenshot attachments, rendered as inline images. GitHub renders these
  // in the issue body. The section is only emitted when attachments are
  // present, so submissions without images produce a body byte-identical to
  // the pre-screenshot implementation.
  if (payload.attachments && payload.attachments.length > 0) {
    const images = payload.attachments
      .map((file) => {
        // Non-empty alt text required; fall back to a generic label.
        const alt = escapeHtml(file.filename || 'screenshot');
        const url = escapeHtml(file.url);
        // HTML <img> wrapper constrains width on large screenshots.
        return `<img src="${url}" alt="${alt}" width="600" />`;
      })
      .join('\n\n');
    sections.push(`## Screenshots\n\n${images}`);
  }

  // FEEDBACK-4: Metadata fields are system-generated values (browser, OS,
  // version, route, etc.) — they should never contain HTML or Markdown.
  // Escape them as defence-in-depth against a tampered client injecting
  // formatting or HTML into the issue body. A malicious `metadata.os`
  // like `</pre><img src=x onerror=alert(1)>` is neutralised to inert text.
  sections.push(
    '---',
    '## Metadata',
    '',
    `**Type:** ${type}`,
    `**Application:** ${escapeHtml(metadata.application)}`,
    `**Version:** ${escapeHtml(metadata.version)}`
  );

  if (metadata.route) sections.push(`**Route:** ${escapeHtml(metadata.route)}`);
  if (metadata.browser) sections.push(`**Browser:** ${escapeHtml(metadata.browser)}`);
  if (metadata.os) sections.push(`**Operating System:** ${escapeHtml(metadata.os)}`);
  if (metadata.screenResolution) sections.push(`**Screen Resolution:** ${escapeHtml(metadata.screenResolution)}`);
  if (metadata.userId) sections.push(`**User ID:** ${escapeHtml(metadata.userId)}`);

  sections.push(`**Timestamp:** ${escapeHtml(metadata.timestamp)}`);

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
    ...((options.headers as Record<string, string>) || {}),
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

  const response = await githubFetch(token, `/repos/${repo.owner}/${repo.repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels }),
  });

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