# @nb-feedback-kit/react-sdk

Headless React components for collecting user feedback and displaying release notes/roadmap — backed by GitHub Issues and Releases.

## Installation

```bash
npm install @nb-feedback-kit/react-sdk
# or
pnpm add @nb-feedback-kit/react-sdk
```

> **Peer dependencies:** React 18+ and ReactDOM 18+. No styling library is required — components ship with minimal base styles and are fully customizable.

## Quick Start

Wrap your application in `FeedbackProvider` with your API configuration, then render the components you need.

```tsx
import {
  FeedbackProvider,
  FeedbackButton,
  FeedbackModal,
  ReleaseNotesModal,
  RoadmapModal,
  useReleaseNotes,
  useRoadmap,
} from '@nb-feedback-kit/react-sdk';

function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'My App',
        version: '1.0.0',
        apiEndpoint: 'https://nb-feedback-api-prod.your-subdomain.workers.dev',
        apiKey: 'your-api-key', // maps to your GitHub repo on the server
        userId: 'optional-user-id', // optional
      }}
    >
      <Feedback />
    </FeedbackProvider>
  );
}

function Feedback() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  const { releases } = useReleaseNotes();
  const { roadmap } = useRoadmap();

  return (
    <>
      <FeedbackButton onClick={() => setIsModalOpen(true)} />
      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <ReleaseNotesModal
        isOpen={isReleaseNotesOpen}
        onClose={() => setIsReleaseNotesOpen(false)}
        releases={releases}
      />

      <RoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
        roadmap={roadmap}
      />
    </>
  );
}
```

## Configuration

### `FeedbackConfig`

The `config` prop accepted by `FeedbackProvider`.

| Field             | Type     | Required | Description                                                              |
| ----------------- | -------- | -------- | ------------------------------------------------------------------------ |
| `applicationName` | `string` | Yes      | Label included in the GitHub Issue metadata.                             |
| `version`         | `string` | Yes      | App version included in metadata.                                        |
| `apiEndpoint`     | `string` | Yes      | Base URL of your deployed NB Feedback Kit API (no trailing slash).       |
| `apiKey`          | `string` | Yes      | Authenticates with the API via `X-API-Key`. Maps server-side to a repo. |
| `userId`          | `string` | No       | Identifies the submitting user. Included in metadata if provided.        |

> **Security note:** The `apiKey` is shipped to the client and is intentionally low-trust. It is rate-limited (per-key Durable Object, 60s sliding window) and can only create issues in the single repo it is mapped to. The GitHub PAT never leaves the server. See [`resources/security-reports/task-005-006-security-review.md`](../../resources/security-reports/task-005-006-security-review.md).

## Components & Hooks

### `FeedbackProvider`

React Context provider. Must wrap any component that uses the SDK.

```tsx
<FeedbackProvider config={config}>{children}</FeedbackProvider>
```

Exposes configuration and auto-captured metadata via `useFeedback()`.

### `FeedbackButton`

Floating action button that triggers the feedback modal. Headless — accepts standard button props plus position control.

```tsx
<FeedbackButton onClick={handleOpen} position="bottom-right" />
```

### `FeedbackModal`

Modal form with type selector (Bug / Feature / Feedback), title, and description. Includes:

- Real-time validation (title ≥ 3 chars, description ≥ 10 chars)
- Loading state during submission
- Success confirmation
- Error banner on failure
- Accessibility (focus trap, ESC to close, ARIA labels)

```tsx
<FeedbackModal isOpen={isOpen} onClose={handleClose} />
```

### `ReleaseNotesModal`

Displays a list of GitHub Releases (version, date, body, link).

```tsx
<ReleaseNotesModal
  isOpen={isOpen}
  onClose={handleClose}
  releases={releases}
  loading={loading}
  error={error}
/>
```

### `RoadmapModal`

Displays roadmap items grouped by status (Planned / In Progress / Released).

```tsx
<RoadmapModal
  isOpen={isOpen}
  onClose={handleClose}
  roadmap={roadmap}
  loading={loading}
  error={error}
/>
```

### `useFeedback()`

Reads context (config + metadata) from the nearest `FeedbackProvider`.

```tsx
const { config, metadata } = useFeedback();
```

### `useSubmitFeedback()`

Submits feedback to `POST /api/feedback`. Throws `FeedbackSubmitError` on failure.

```tsx
const { submitFeedback, isLoading } = useSubmitFeedback();

try {
  const result = await submitFeedback({
    type: 'bug',
    title: 'Login button does nothing',
    description: 'Clicking login on /auth has no effect in Safari 17.',
  });
  console.log(result.issueUrl);
} catch (err) {
  // err is a FeedbackSubmitError with .message and .status
}
```

> Metadata (browser, OS, route, screen resolution, timestamp, userId) is captured automatically from the provider context — you only pass `type`, `title`, and `description`.

### `useReleaseNotes()`

Fetches `GET /api/releases`.

```tsx
const { releases, loading, error, refetch } = useReleaseNotes();
```

### `useRoadmap()`

Fetches `GET /api/roadmap`.

```tsx
const { roadmap, loading, error, refetch } = useRoadmap();
```

## Auto-Captured Metadata

The SDK automatically captures the following for every submission:

| Field              | Source                          | Always present |
| ------------------ | ------------------------------- | -------------- |
| `application`      | `config.applicationName`        | Yes            |
| `version`          | `config.version`                | Yes            |
| `timestamp`        | `new Date().toISOString()`      | Yes            |
| `route`            | `window.location.pathname`      | Yes (browser)  |
| `browser`          | User-agent parsing              | Yes (browser)  |
| `os`               | User-agent parsing              | Yes (browser)  |
| `screenResolution` | `window.screen.width × height`  | Yes (browser)  |
| `userId`           | `config.userId`                 | Only if set    |

## Styling

Components are headless — they render with minimal base styles and semantic class names you can target. To fully restyle, override the CSS or pass your own children where the API supports it.

## TypeScript

All types are exported from the package and from `@nb-feedback-kit/shared-types`:

```tsx
import type {
  FeedbackConfig,
  FeedbackContextValue,
  FeedbackButtonProps,
  FeedbackModalProps,
  ReleaseNotesModalProps,
  RoadmapModalProps,
  UseReleaseNotesResult,
  UseRoadmapResult,
  FeedbackSubmitError,
} from '@nb-feedback-kit/react-sdk';
```

## API Reference (Direct HTTP)

If you are not using React, you can call the API directly. See [`../../resources/api-reference.md`](../../resources/api-reference.md) for the full REST contract.

## Backend Setup

To run your own API instance (Cloudflare Worker + KV + Durable Objects), see [`../api/CLOUDFLARE_SETUP.md`](../api/CLOUDFLARE_SETUP.md).