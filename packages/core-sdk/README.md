# @nb-feedback-kit/core-sdk

Framework-agnostic JavaScript SDK for [NB Feedback Kit](../../README.md). Works with any frontend — vanilla JS, Vue, Svelte, Angular, Eleventy, Web Components — or any JavaScript environment with `fetch`.

For **React** apps, use [`@nb-feedback-kit/react-sdk`](../react-sdk) instead; it wraps the same backend contract with hooks and components.

## Why a core SDK?

The React SDK carries a peer dependency on React 18. Apps that do not use React (static-site generators, vanilla-JS sites, other frameworks) would have to bundle React (~130 KB) just to submit feedback. This package has **zero runtime dependencies** and ships CJS, ESM, and IIFE (browser-global) builds.

## Install

```bash
npm install @nb-feedback-kit/core-sdk
# or
pnpm add @nb-feedback-kit/core-sdk
```

## Quick start

```ts
import { createFeedbackClient } from '@nb-feedback-kit/core-sdk';

const feedback = createFeedbackClient({
  applicationName: 'My App',
  version: '1.0.0',
  apiEndpoint: 'https://feedback.example.com',
  apiKey: 'my-api-key',
});

// Submit feedback (creates a GitHub Issue server-side)
const result = await feedback.submitFeedback({
  type: 'bug',
  title: 'Save button broken',
  description: 'Clicking save does nothing on the dashboard.',
});
console.log(result.issueUrl);

// Fetch release notes
const releases = await feedback.getReleases();

// Fetch the public roadmap
const roadmap = await feedback.getRoadmap();
```

## `<script>` tag usage (static sites)

The IIFE build exposes a global `NbFeedbackKit`:

```html
<script src="https://unpkg.com/@nb-feedback-kit/core-sdk/dist/index.global.js"></script>
<script>
  const feedback = NbFeedbackKit.createFeedbackClient({
    applicationName: 'My Site',
    version: '1.0.0',
    apiEndpoint: 'https://feedback.example.com',
    apiKey: 'my-api-key',
  });
</script>
```

## API

### `createFeedbackClient(config)`

Creates a client. Throws `TypeError` if `apiEndpoint` or `apiKey` is missing.

**Config:**

| Field             | Type     | Required | Description                                      |
| ----------------- | -------- | -------- | ------------------------------------------------ |
| `applicationName` | `string` | yes      | Human-readable app name (in issue metadata).     |
| `version`         | `string` | yes      | App version (in issue metadata).                 |
| `apiEndpoint`     | `string` | yes      | Fully-qualified Worker base URL. No trailing `/`.|
| `apiKey`          | `string` | yes      | API key registered in the Worker's KV store.     |
| `userId`          | `string` | no       | Stable user ID for tracing.                      |
| `storage`         | object   | no       | Screenshot storage provider config.              |

**Returns:** `{ submitFeedback, getReleases, getRoadmap, config }`

### `client.submitFeedback(input)`

Submits feedback. Auto-captures browser metadata unless `input.metadata` is provided.

**Throws:**

- `FeedbackApiError` — Worker responded with a non-success status. Carries `.status` and `.endpoint`.
- `Error` — Network failure or invalid JSON response.
- `TypeError` — Missing required `type`, `title`, or `description`.

### `client.getReleases()` / `client.getRoadmap()`

Fetch GitHub Releases / roadmap items. Same error semantics as `submitFeedback`.

## Screenshot uploads (optional)

Configure a storage provider to enable screenshot attachments:

```ts
const feedback = createFeedbackClient({
  // ...required fields...
  storage: {
    type: 's3',
    s3: { bucket: 'my-bucket', region: 'auto' },
  },
});

// Upload a file, then attach the result
const file = fileInput.files[0];
const uploaded = await feedback.storage.upload(file);
await feedback.submitFeedback({
  type: 'bug',
  title: 'See screenshot',
  description: 'Error dialog shown',
  attachments: [uploaded],
});
```

Supported storage types: `'none'` (default), `'custom'` (your own HTTP endpoint), `'s3'` (AWS S3, Cloudflare R2, MinIO, B2 — via Worker-issued presigned URLs).

## Build outputs

| File                   | Format | Use case                                  |
| ---------------------- | ------ | ----------------------------------------- |
| `dist/index.mjs`       | ESM    | Bundlers, modern Node, `<script type=esm>`|
| `dist/index.js`        | CJS    | `require()` in Node                       |
| `dist/index.global.js` | IIFE   | `<script>` tag on static sites            |
| `dist/index.d.ts`      | Types  | TypeScript consumers                      |