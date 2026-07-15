import { describe, it, expect } from 'vitest';
import { buildIssueBody } from './client';
import type { FeedbackPayload, UploadedFile } from '@nb-feedback-kit/shared-types';

/** Minimal valid metadata block reused across tests. */
const baseMetadata = {
  application: 'Test App',
  version: '1.0.0',
  timestamp: '2026-06-29T00:00:00.000Z',
};

// FEEDBACK-4: Build escaped-entity tokens at runtime via char codes so the
// editor/formatter cannot decode them back to raw HTML characters. These
// mirror the output of escapeHtml() in client.ts.
const A = String.fromCharCode(38); // the ampersand char — spelled out so it
// survives any entity-decoding formatter. It is the "&" prefix of all entities.
const LT = A + 'lt;';
const GT = A + 'gt;';
const QUOT = A + 'quot;';
const SQUOT = A + '#39;';

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
        makePayload({ attachments: [screenshot({ filename: 'crash.png' })] }),
      );

      expect(body).toContain('## Screenshots');
      expect(body).toContain('<img src="https://cdn.example.com/shots/abc.png"');
      expect(body).toContain('alt="crash.png"');
      expect(body).toContain('width="600"');
    });

    it('renders multiple screenshots, each as its own image', () => {
      const body = buildIssueBody(
        makePayload({
          attachments: [
            screenshot({ url: 'https://cdn.example.com/a.png', filename: 'a.png' }),
            screenshot({ url: 'https://cdn.example.com/b.png', filename: 'b.png' }),
          ],
        }),
      );

      expect(body.match(/<img /g)).toHaveLength(2);
      expect(body).toContain('src="https://cdn.example.com/a.png"');
      expect(body).toContain('src="https://cdn.example.com/b.png"');
    });

    it('falls back to a generic alt when filename is empty', () => {
      const body = buildIssueBody(
        makePayload({ attachments: [screenshot({ filename: '' })] }),
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

  describe('HTML injection guard — screenshot fields (security)', () => {
    it('escapes a malicious filename that attempts to break out of the alt attribute', () => {
      const body = buildIssueBody(
        makePayload({
          attachments: [
            screenshot({
              filename: 'x" onerror="alert(1)" src="evil.png',
            }),
          ],
        }),
      );

      // The unescaped quote must not appear as a live attribute delimiter.
      expect(body).not.toContain('" onerror="alert(1)"');
    });

    it('escapes a malicious URL containing a script tag', () => {
      const body = buildIssueBody(
        makePayload({
          attachments: [
            screenshot({
              url: 'https://evil.example.com/x"><script>alert(1)</script>',
            }),
          ],
        }),
      );

      // No raw script open tag should reach the rendered body.
      expect(body).not.toContain('<script>');
    });

    it('escapes angle brackets in a URL', () => {
      const body = buildIssueBody(
        makePayload({
          attachments: [screenshot({ url: 'https://evil.example.com/<>' })],
        }),
      );

      // Raw angle brackets must be escaped, not passed through.
      expect(body).not.toContain('src="https://evil.example.com/<>');
    });
  });

  describe('body structure (unchanged behavior)', () => {
    it('still renders Description and Metadata sections with screenshots', () => {
      const body = buildIssueBody(
        makePayload({ attachments: [screenshot()], description: 'My bug details here.' }),
      );

      expect(body).toContain('## Description');
      expect(body).toContain('My bug details here.');
      expect(body).toContain('## Metadata');
      expect(body).toContain('**Type:** bug');
      expect(body).toContain('**Application:** Test App');
    });
  });

  // -------------------------------------------------------------------------
  // FEEDBACK-4: Metadata field HTML-escaping (defence-in-depth)
  //
  // Metadata fields (browser, OS, route, etc.) are system-generated values
  // that should never contain HTML. They are escaped as defence-in-depth
  // against a tampered client injecting formatting or HTML into the issue
  // body. The escaped forms use named entities built at runtime (see LT/GT/
  // QUOT/SQUOT above) to survive editor entity-decoding.
  //
  // NOTE on assertion style: escaped text like "<img onerror=alert(1)>"
  // still CONTAINS the literal substring "onerror=alert(1)" — it's just
  // safely inert as text, not a live attribute. So we assert against the
  // full RAW tag boundary (e.g. "<img src=x onerror=alert(1)>") rather than
  // a substring.
  // -------------------------------------------------------------------------
  describe('FEEDBACK-4: metadata HTML-escaping', () => {
    it('escapes HTML in metadata.os (img onerror payload)', () => {
      const body = buildIssueBody(
        makePayload({
          metadata: {
            ...baseMetadata,
            os: 'Windows</pre><img src=x onerror=alert(1)>',
          },
        }),
      );

      // The RAW img tag (with live angle brackets) must not survive.
      expect(body).not.toContain('<img src=x onerror=alert(1)>');
      // The escaped form (LT + 'img') should be present.
      expect(body).toContain(LT + 'img');
    });

    it('escapes HTML in metadata.browser (script tag)', () => {
      const body = buildIssueBody(
        makePayload({
          metadata: {
            ...baseMetadata,
            browser: 'Chrome<script>alert("xss")</script>',
          },
        }),
      );

      // Raw script tags must not survive.
      expect(body).not.toContain('<script>');
      // Escaped form should be present.
      expect(body).toContain(LT + 'script' + GT);
    });

    it('escapes HTML in metadata.route (quote injection)', () => {
      const body = buildIssueBody(
        makePayload({
          metadata: {
            ...baseMetadata,
            route: '/page" onmouseover="alert(1)',
          },
        }),
      );

      // The unescaped quote must not survive as a live attribute delimiter.
      expect(body).not.toContain('onmouseover="alert(1)"');
    });

    it('escapes HTML in metadata.application (bold tag)', () => {
      const body = buildIssueBody(
        makePayload({
          metadata: {
            ...baseMetadata,
            application: 'App<b>name</b>',
          },
        }),
      );

      // Raw bold tags must not survive.
      expect(body).not.toContain('<b>name');
      // Escaped form should be present.
      expect(body).toContain(LT + 'b' + GT + 'name' + LT + '/b' + GT);
    });

    it('escapes all four HTML special chars in metadata.version', () => {
      const body = buildIssueBody(
        makePayload({
          metadata: {
            ...baseMetadata,
            version: '1.0<">' + String.fromCharCode(39) + '2',
          },
        }),
      );

      // The raw sequence must not appear.
      expect(body).not.toContain('1.0<">');
      // Escaped entities should be present.
      expect(body).toContain(LT);
      expect(body).toContain(GT);
      expect(body).toContain(QUOT);
      expect(body).toContain(SQUOT);
    });

    it('escapes HTML in metadata.screenResolution (iframe)', () => {
      const body = buildIssueBody(
        makePayload({
          metadata: {
            ...baseMetadata,
            screenResolution: '1920x1080<iframe>',
          },
        }),
      );

      // Raw iframe tag must not survive.
      expect(body).not.toContain('<iframe>');
      // Escaped form should be present.
      expect(body).toContain(LT + 'iframe' + GT);
    });

    it('escapes HTML in metadata.userId (img onerror)', () => {
      const body = buildIssueBody(
        makePayload({
          metadata: {
            ...baseMetadata,
            userId: 'user_123<img/src=x onerror=alert(1)>',
          },
        }),
      );

      // The RAW tag (with live angle brackets) must not survive.
      expect(body).not.toContain('<img/src=x onerror=alert(1)>');
      // Escaped form should be present.
      expect(body).toContain(LT + 'img');
    });

    it('escapes HTML in metadata.timestamp', () => {
      const body = buildIssueBody(
        makePayload({
          metadata: {
            ...baseMetadata,
            timestamp: '2026-01-01<evil>',
          },
        }),
      );

      // Raw evil tag must not survive.
      expect(body).not.toContain('<evil>');
      // Escaped form should be present.
      expect(body).toContain(LT + 'evil' + GT);
    });

    it('handles missing/undefined metadata fields without crashing (null-safety)', () => {
      // A client that omits optional metadata fields (timestamp, browser, os,
      // etc.) must not trigger a TypeError in escapeHtml. This is a regression
      // test for a production bug found during the FEEDBACK-4 JWT smoke test.
      const body = buildIssueBody(
        makePayload({
          metadata: {
            application: 'Test App',
            version: '1.0.0',
            // timestamp intentionally omitted
          } as FeedbackPayload['metadata'],
        }),
      );

      // The body should still be built successfully.
      expect(body).toContain('## Metadata');
      expect(body).toContain('**Application:** Test App');
      // The Timestamp label should render with no value after it.
      expect(body).toContain('**Timestamp:**');
    });
  });

  describe('description handling', () => {
    it('does NOT escape the description (user-authored Markdown)', () => {
      // The description is intentionally left unescaped so users can include
      // legitimate code blocks and Markdown formatting in their feedback.
      // GitHub sanitises HTML server-side, so the risk is limited to
      // Markdown formatting injection, which is acceptable for an issue body.
      const body = buildIssueBody(
        makePayload({
          description: 'Here is a code block:\n\n```js\nconsole.log("hi");\n```',
        }),
      );

      // The raw text should appear unmodified (unescaped quotes survive).
      expect(body).toContain('console.log("hi")');
      // The escaped form should NOT appear.
      expect(body).not.toContain('console.log(' + QUOT + 'hi' + QUOT + ')');
    });
  });
});