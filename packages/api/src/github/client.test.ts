import { describe, it, expect } from 'vitest';
import { buildIssueBody } from './client';
import type { FeedbackPayload, UploadedFile } from '@nb-feedback-kit/shared-types';

/** Minimal valid metadata block reused across tests. */
const baseMetadata = {
  application: 'Test App',
  version: '1.0.0',
  timestamp: '2026-06-29T00:00:00.000Z',
};

/** Build a payload with the given overrides, for terse test fixtures. */
function makePayload(overrides: Partial<FeedbackPayload> = {}): FeedbackPayload {
  return {
    type: 'bug',
    title: 'Sample title',
    description: 'A sufficiently long description for validation.',
    metadata: baseMetadata,
    ...overrides,
  };
}

/** Helper to make a screenshot attachment. */
function screenshot(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    url: 'https://cdn.example.com/shots/abc.png',
    filename: 'screenshot.png',
    contentType: 'image/png',
    size: 12345,
    ...overrides,
  };
}

describe('buildIssueBody', () => {
  describe('screenshots section', () => {
    it('renders a Screenshots section with inline images when attachments are present', () => {
      const body = buildIssueBody(
        makePayload({ attachments: [screenshot({ filename: 'crash.png' })] })
      );

      // Section heading present
      expect(body).toContain('## Screenshots');
      // Image tag with the URL + alt text
      expect(body).toContain('<img src="https://cdn.example.com/shots/abc.png"');
      expect(body).toContain('alt="crash.png"');
      // Width constraint applied
      expect(body).toContain('width="600"');
    });

    it('renders multiple screenshots, each as its own image', () => {
      const body = buildIssueBody(
        makePayload({
          attachments: [
            screenshot({ url: 'https://cdn.example.com/a.png', filename: 'a.png' }),
            screenshot({ url: 'https://cdn.example.com/b.png', filename: 'b.png' }),
          ],
        })
      );

      expect(body.match(/<img /g)).toHaveLength(2);
      expect(body).toContain('src="https://cdn.example.com/a.png"');
      expect(body).toContain('src="https://cdn.example.com/b.png"');
    });

    it('falls back to a generic alt when filename is empty', () => {
      const body = buildIssueBody(
        makePayload({ attachments: [screenshot({ filename: '' })] })
      );

      expect(body).toContain('alt="screenshot"');
    });
  });

  describe('backward compatibility (no attachments)', () => {
    it('omits the Screenshots section entirely when attachments are absent', () => {
      const body = buildIssueBody(makePayload());

      expect(body).not.toContain('## Screenshots');
      expect(body).not.toContain('<img');
    });

    it('omits the Screenshots section when attachments is an empty array', () => {
      const body = buildIssueBody(makePayload({ attachments: [] }));

      expect(body).not.toContain('## Screenshots');
      expect(body).not.toContain('<img');
    });
  });

  describe('HTML injection guard (security)', () => {
    it('escapes a malicious filename that attempts to break out of the alt attribute', () => {
      const body = buildIssueBody(
        makePayload({
          attachments: [
            screenshot({
              filename: 'x" onerror="alert(1)" src="evil.png',
            }),
          ],
        })
      );

      // The literal `"` from the filename must NOT appear unescaped inside
      // the rendered tag (it should be "). The onerror payload must not
      // survive as a live attribute.
      expect(body).not.toContain('" onerror="alert(1)"');
    });

    it('escapes a malicious URL containing a <script> tag', () => {
      const body = buildIssueBody(
        makePayload({
          attachments: [
            screenshot({
              url: 'https://evil.example.com/x"><script>alert(1)</script>',
            }),
          ],
        })
      );

      // No raw <script> should reach the rendered body.
      expect(body).not.toContain('<script>');
    });

    it('escapes angle brackets in a URL', () => {
      const body = buildIssueBody(
        makePayload({
          attachments: [screenshot({ url: 'https://evil.example.com/<>' })],
        })
      );

      // Raw <> must be escaped to entities, not passed through.
      expect(body).not.toContain('src="https://evil.example.com/<>"');
    });
  });

  describe('body structure (unchanged behavior)', () => {
    it('still renders Description and Metadata sections with screenshots', () => {
      const body = buildIssueBody(
        makePayload({ attachments: [screenshot()], description: 'My bug details here.' })
      );

      expect(body).toContain('## Description');
      expect(body).toContain('My bug details here.');
      expect(body).toContain('## Metadata');
      expect(body).toContain('**Type:** bug');
      expect(body).toContain('**Application:** Test App');
    });
  });
});