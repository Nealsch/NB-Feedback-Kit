<div align="center">

# React SDK

**Add GitHub-native feedback to any React app in under five minutes.**

</div>

---

## Overview

The NB Feedback Kit React SDK provides **headless** components and hooks for collecting feedback, displaying release notes, and showing a roadmap — all powered by your self-hosted Worker and GitHub repository.

The SDK is **unstyled by default**. Components render minimal inline styles and accept `className` and `style` props so you can match your app's design system. You bring the UI; the SDK handles the data flow.

```bash
npm install @nb-feedback-kit/react-sdk
```

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Your React App                     │
│                                                       │
│   <FeedbackProvider config={...}>                    │
│     │                                                 │
│     ├── <FeedbackButton onClick={open} />            │
│     │         ↓                                       │
│     ├── <FeedbackModal                                │
│     │     isOpen={open}                               │
│     │     storageProvider={storage}                   │
│     │     onSubmit={submitFeedback}                   │
│     │   />                                            │
│     │         ↓                                       │
│     │   useSubmitFeedback()                           │
│     │         ↓                                       │
│     │   POST /api/feedback  ──────────┐              │
│     │                                  │              │
│     ├── <ReleaseNotesModal />          │              │
│     │     uses useReleaseNotes()       │              │
│     │     GET /api/releases            │              │
│     │                                  │              │
│     └── <RoadmapModal />               │              │
│           uses useRoadmap()            │              │
│           GET /api/roadmap             │              │
│                                        ↓              │
│                         ┌──────────────────────────┐ │
│                         │   Cloudflare Worker      │ │
│                         │   (GitHub Issues,        │ │
│                         │    Releases, Roadmap)    │ │
│                         └──────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## Installation

```bash
# npm
npm install @nb-feedback-kit/react-sdk

# pnpm
pnpm add @nb-feedback-kit/react-sdk

# yarn
yarn add @nb-feedback-kit/react-sdk

# bun
bun add @nb-feedback-kit/react-sdk
```

**Peer dependencies:** React 18+.

---

## Quick Start

```tsx
import {
  FeedbackProvider,
  FeedbackButton,
  FeedbackModal,
  useSubmitFeedback,
} from '@nb-feedback-kit/react-sdk';
import { useState } from 'react';

function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { submitFeedback } = useSubmitFeedback();

  return (
    <>
      <FeedbackButton onClick={() => setIsOpen(true)} />
      <FeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={async (data) => {
          await submitFeedback(data);
          setIsOpen(false);
        }}
      />
    </>
  );
}

// Wrap your app with the provider
function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'My App',
        version: '1.0.0',
        apiEndpoint: 'https://your-worker.workers.dev',
        apiKey: 'your-api-key',
      }}
    >
      <FeedbackWidget />
      <YourApp />
    </FeedbackProvider>
  );
}
```

That's it. Users can now submit feedback that creates GitHub Issues.

---

## FeedbackProvider

The root provider that captures metadata, creates the storage provider, and makes everything available via context.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `config` | `FeedbackConfig` | Yes | SDK configuration (see below). |
| `children` | `ReactNode` | Yes | Your application. |

### FeedbackConfig

```typescript
interface FeedbackConfig {
  /** Display name of your application (included in issue metadata). */
  applicationName: string;
  /** App version (included in issue metadata). */
  version: string;
  /** Your deployed Worker URL. */
  apiEndpoint: string;
  /** Bootstrap API key mapped to your GitHub repo in KV. */
  apiKey: string;
  /** Optional: identify the current user (included in metadata). */
  userId?: string;
  /** Optional: screenshot storage config. Omit to disable. */
  storage?: StorageProviderConfig;
}
```

### Example: With Screenshot Uploads

```tsx
<FeedbackProvider
  config={{
    applicationName: 'My App',
    version: '1.0.0',
    apiEndpoint: 'https://your-worker.workers.dev',
    apiKey: 'your-api-key',
    userId: user?.id, // optional
    storage: {
      type: 's3',
      bucket: 'my-feedback-bucket',
      region: 'auto',
      keyPrefix: 'screenshots/',
      provider: 'r2', // 'r2', 'aws', 'minio', 'b2'
    },
  }}
>
  <App />
</FeedbackProvider>
```

See [Storage Providers](storage-providers.md) for all storage options.

### What the provider does

1. **Captures metadata** on mount (browser, OS, route, resolution, timestamp).
2. **Creates the storage provider** from `config.storage` (memoized).
3. **Provides context** via `useFeedback()` to all children.

> **Note:** The provider renders `null` until metadata is captured. This prevents flashes of unconfigured components.

---

## Components

### FeedbackButton

A fixed-position floating button that triggers the feedback modal.

```tsx
<FeedbackButton onClick={() => setModalOpen(true)} />
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Fixed position on screen. |
| `ariaLabel` | `string` | `'Open feedback form'` | Accessibility label. |
| `className` | `string` | `''` | Custom CSS class. |
| `style` | `CSSProperties` | — | Inline styles (merged with position). |
| `children` | `ReactNode` | `'Feedback'` | Button label/content. |
| `...props` | `ButtonHTMLAttributes` | — | All native button attributes. |

#### Custom Styled Button

```tsx
<FeedbackButton
  className="my-feedback-btn"
  style={{ backgroundColor: '#6366f1', color: 'white', borderRadius: '9999px' }}
>
  🐛 Report a Bug
</FeedbackButton>
```

---

### FeedbackModal

A fully functional feedback form with type selection, validation, optional screenshot upload, and submission state.

```tsx
<FeedbackModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={handleSubmit}
  storageProvider={storage} // from useFeedback()
/>
```

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `isOpen` | `boolean` | Yes | Controls modal visibility. |
| `onClose` | `() => void` | Yes | Called when modal should close. |
| `onSubmit` | `(data: FeedbackFormData) => void \| Promise<void>` | Yes | Called with form data on submission. |
| `storageProvider` | `StorageProvider` | No | Enables screenshot uploads. From `useFeedback().storage`. |
| `className` | `string` | No | Custom CSS class for the overlay. |
| `style` | `CSSProperties` | No | Custom styles for the overlay. |

#### FeedbackFormData

```typescript
interface FeedbackFormData {
  type: 'bug' | 'feature' | 'feedback';
  title: string;
  description: string;
  /** Uploaded screenshot files. Absent if storage is disabled. */
  attachments?: UploadedFile[];
}
```

#### Built-in features

- **Accessibility:** Focus trap, ESC-to-close, `aria-modal`, ARIA labeling, keyboard navigation.
- **Validation:** Title (min 3 chars), description (min 10 chars). Inline error messages.
- **Screenshot upload:** Per-file upload state (uploading/uploaded/error). Failed uploads don't block submission.
- **Submission state:** Loading indicator, inline error banner, auto-reset on success.
- **Body scroll lock:** Prevents background scrolling while modal is open.

---

### ReleaseNotesModal

Displays versioned release notes fetched from GitHub Releases.

```tsx
import { ReleaseNotesModal, useReleaseNotes } from '@nb-feedback-kit/react-sdk';

function Changelog({ onClose }: { onClose: () => void }) {
  return (
    <ReleaseNotesModal
      isOpen={true}
      onClose={onClose}
    />
  );
}
```

---

### RoadmapModal

Displays label-driven roadmap items from GitHub Issues.

```tsx
import { RoadmapModal } from '@nb-feedback-kit/react-sdk';

<RoadmapModal isOpen={open} onClose={() => setOpen(false)} />
```

---

### StorageConfigPanel

A diagnostic UI for testing storage provider connectivity. Useful in admin/settings panels.

```tsx
import { StorageConfigPanel } from '@nb-feedback-kit/react-sdk';

<StorageConfigPanel
  storageConfig={config.storage}
  apiEndpoint={config.apiEndpoint}
  apiKey={config.apiKey}
/>
```

See [Storage Providers](storage-providers.md) for details.

---

## Hooks

### useFeedback()

Access the provider context directly. Returns config, metadata, and the storage provider.

```tsx
const { config, metadata, storage } = useFeedback();
```

| Return | Type | Description |
|---|---|---|
| `config` | `FeedbackConfig` | The configuration passed to the provider. |
| `metadata` | `FeedbackMetadata` | Auto-captured browser, OS, route, and user info. |
| `storage` | `StorageProvider` | The configured storage provider instance. |

> **Error:** Throws if used outside a `<FeedbackProvider>`.

---

### useSubmitFeedback()

Submit feedback to the API. Wraps `POST /api/feedback` with error handling.

```tsx
const { submitFeedback } = useSubmitFeedback();

try {
  const result = await submitFeedback({
    type: 'bug',
    title: 'Login button broken',
    description: 'The login button does nothing on click.',
    attachments: [uploadedFile], // optional
  });
  console.log('Issue created:', result.issueUrl);
} catch (err) {
  if (err instanceof FeedbackSubmitError) {
    setError(err.message);
  }
}
```

| Return | Type | Description |
|---|---|---|
| `submitFeedback` | `(data: FeedbackFormData) => Promise<FeedbackResponse>` | Submits feedback. Throws `FeedbackSubmitError` on failure. |

**FeedbackSubmitError:** Thrown for network failures, non-JSON responses, and API errors (non-2xx or `success: false`). The message is user-safe.

---

### useReleaseNotes()

Fetch release notes from the API.

```tsx
const { releases, loading, error, refetch } = useReleaseNotes();

// With auto-fetch disabled
const { releases, refetch } = useReleaseNotes(false);
```

| Return | Type | Description |
|---|---|---|
| `releases` | `ReleaseNote[]` | Array of release notes. |
| `loading` | `boolean` | Fetch in progress. |
| `error` | `string \| null` | Error message (null if no error). |
| `refetch` | `() => void` | Manually trigger a refetch. |

**Parameter:** `autoFetch?: boolean` (default: `true`) — Fetch on mount.

---

### useRoadmap()

Fetch roadmap items from the API.

```tsx
const { roadmap, loading, error, refetch } = useRoadmap();
```

| Return | Type | Description |
|---|---|---|
| `roadmap` | `RoadmapItem[]` | Array of roadmap items. |
| `loading` | `boolean` | Fetch in progress. |
| `error` | `string \| null` | Error message. |
| `refetch` | `() => void` | Manually trigger a refetch. |

---

## Building a Custom UI

The SDK is headless. You can build entirely custom UIs using the hooks directly:

```tsx
import { useSubmitFeedback, useFeedback } from '@nb-feedback-kit/react-sdk';

function CustomFeedbackForm() {
  const { submitFeedback } = useSubmitFeedback();
  const { storage } = useFeedback();
  const [type, setType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let attachments = undefined;
    if (file && storage.enabled) {
      const uploaded = await storage.upload(file);
      attachments = [uploaded];
    }

    try {
      await submitFeedback({ type, title, description, attachments });
      // Success — reset form, show toast, etc.
    } catch (err) {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your custom form fields */}
    </form>
  );
}
```

---

## Metadata Collection

The SDK automatically captures metadata on provider mount:

| Field | Source |
|---|---|
| `applicationName` | From config |
| `version` | From config |
| `userId` | From config (optional) |
| `browser` | Parsed from `navigator.userAgent` |
| `os` | Parsed from `navigator.userAgent` |
| `route` | `window.location.pathname` |
| `resolution` | `window.screen.width × height` |
| `timestamp` | `new Date().toISOString()` |

You can also capture metadata manually (e.g., for server-side logging):

```tsx
import { captureMetadata } from '@nb-feedback-kit/react-sdk';

const metadata = captureMetadata('My App', '1.0.0', 'user-123');
```

---

## TypeScript Types

All types are exported from the package:

```typescript
import type {
  FeedbackConfig,
  FeedbackContextValue,
  FeedbackButtonProps,
  FeedbackModalProps,
  FeedbackFormData,
  StorageConfigPanelProps,
  ReleaseNotesModalProps,
  UseReleaseNotesResult,
  RoadmapModalProps,
  UseRoadmapResult,
  StorageProvider,
  StorageProviderConfig,
  CustomEndpointConfig,
  S3Config,
  StorageTestResult,
} from '@nb-feedback-kit/react-sdk';
```

---

## Storage Providers

The SDK supports multiple screenshot storage backends. Configure via `config.storage`:

| Provider | `type` | Description |
|---|---|---|
| **None** | `'none'` | Screenshots disabled (default). |
| **Custom Endpoint** | `'custom'` | Upload to your own HTTP endpoint. |
| **S3-compatible** | `'s3'` | AWS S3, Cloudflare R2, MinIO, Backblaze B2 via Worker-presigned URLs. |

See [Storage Providers](storage-providers.md) for full configuration details.

---

## API Reference

### Components

| Component | Purpose |
|---|---|
| `<FeedbackProvider>` | Root context provider. |
| `<FeedbackButton>` | Fixed-position trigger button. |
| `<FeedbackModal>` | Feedback form with validation and upload. |
| `<ReleaseNotesModal>` | Release notes display. |
| `<RoadmapModal>` | Roadmap display. |
| `<StorageConfigPanel>` | Storage connectivity diagnostics. |

### Hooks

| Hook | Purpose |
|---|---|
| `useFeedback()` | Access provider context (config, metadata, storage). |
| `useSubmitFeedback()` | Submit feedback to the API. |
| `useReleaseNotes()` | Fetch release notes. |
| `useRoadmap()` | Fetch roadmap items. |

### Utilities

| Utility | Purpose |
|---|---|
| `captureMetadata()` | Manually capture browser/OS/route metadata. |
| `detectBrowser()` | Detect browser from user agent. |
| `detectOS()` | Detect OS from user agent. |
| `detectRoute()` | Get current route. |
| `detectScreenResolution()` | Get screen resolution. |
| `testStorageProvider()` | Test storage connectivity. |

---

## Next Steps

- <img src="../assets/icons/settings.svg" width="16" /> &nbsp;**[Getting Started](getting-started.md)** — Full setup walkthrough.
- <img src="../assets/icons/database.svg" width="16" /> &nbsp;**[Storage Providers](storage-providers.md)** — Configure screenshot uploads.
- <img src="../assets/icons/shield-check.svg" width="16" /> &nbsp;**[Security](security.md)** — Understand the trust model.

---

<p align="center">
  <sub>Need help? <a href="https://github.com/Nealsch/NB-Feedback-Kit/discussions">Ask in Discussions</a>.</sub>
</p>