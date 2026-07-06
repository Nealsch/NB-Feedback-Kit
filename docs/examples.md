# Examples

Practical, copy-pasteable patterns for integrating NB Feedback Kit into real applications.

Each example is complete — no omitted logic, no pseudo-code. Copy it, run it, adapt it.

---

## Minimal Setup

The shortest path to working feedback. Drop this into your app's entry point.

```tsx
import {
  FeedbackProvider,
  FeedbackButton,
  FeedbackModal,
} from '@nb-feedback-kit/react-sdk';

function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'My App',
        version: '1.0.0',
        apiEndpoint: 'https://feedback-worker.example.workers.dev',
        apiKey: 'your-api-key',
      }}
    >
      <FeedbackButton />
      <FeedbackModal />

      {/* Your app */}
      <YourApp />
    </FeedbackProvider>
  );
}
```

That's it. The `FeedbackButton` opens the `FeedbackModal`. The modal submits to your Worker, which creates a GitHub Issue with the appropriate label (`bug`, `feature`, or `feedback`) and a rendered metadata table.

> Screenshots are disabled by default. See [S3-Compatible Storage](#s3-compatible-storage) or [Custom Endpoint Storage](#custom-endpoint-storage) to enable them.

---

## Custom-Styled Feedback Button and Modal

The SDK is headless — components render with minimal inline styles and accept `className` and `style` props. This example shows how to match your design system.

```tsx
import {
  FeedbackProvider,
  FeedbackButton,
  FeedbackModal,
} from '@nb-feedback-kit/react-sdk';
import './feedback-styles.css';

function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'Acme Dashboard',
        version: '2.4.1',
        apiEndpoint: 'https://feedback.acme.workers.dev',
        apiKey: import.meta.env.VITE_FEEDBACK_API_KEY,
        userId: currentUser.id,
      }}
    >
      <FeedbackButton
        className="btn btn-primary feedback-trigger"
        style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem' }}
      >
        Report a Bug
      </FeedbackButton>

      <FeedbackModal
        className="modal-overlay"
        title="Send Feedback"
        labels={{
          type: 'Feedback type',
          title: 'Summary',
          description: 'Details',
          submit: 'Submit',
        }}
      />

      <Dashboard />
    </FeedbackProvider>
  );
}
```

The `className` and `style` props pass through to the rendered elements. Your CSS targets those classes — the SDK imposes no styling opinions.

---

## Fully Headless: Building Your Own UI

If the built-in components don't fit your needs, use the hooks directly. This example builds a completely custom feedback form using `useSubmitFeedback`.

```tsx
import { useState } from 'react';
import {
  FeedbackProvider,
  useSubmitFeedback,
} from '@nb-feedback-kit/react-sdk';
import type { FeedbackType } from '@nb-feedback-kit/shared-types';

function CustomFeedbackForm() {
  const { submit, isLoading, error, isSuccess } = useSubmitFeedback();
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit({ type, title, description });
  };

  if (isSuccess) {
    return (
      <div className="feedback-success">
        <h3>Thank you!</h3>
        <p>Your feedback has been submitted.</p>
        <button onClick={() => window.location.reload()}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="feedback-form">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as FeedbackType)}
      >
        <option value="bug">Bug Report</option>
        <option value="feature">Feature Request</option>
        <option value="feedback">General Feedback</option>
      </select>

      <input
        type="text"
        placeholder="Brief title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <textarea
        placeholder="Describe what happened..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={5}
        required
      />

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Submitting...' : 'Submit Feedback'}
      </button>

      {error && <p className="error">{error.message}</p>}
    </form>
  );
}

function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'Custom UI App',
        version: '1.0.0',
        apiEndpoint: 'https://feedback.example.workers.dev',
        apiKey: process.env.NEXT_PUBLIC_FEEDBACK_KEY,
      }}
    >
      <CustomFeedbackForm />
    </FeedbackProvider>
  );
}
```

The `useSubmitFeedback` hook handles the API call, loading state, error handling, and success state. You handle the presentation.

---

## Release Notes Modal

Display versioned release notes sourced from your GitHub Releases.

```tsx
import {
  FeedbackProvider,
  ReleaseNotesModal,
  useReleaseNotes,
} from '@nb-feedback-kit/react-sdk';

function ChangelogButton() {
  const { releases, isLoading, error } = useReleaseNotes();

  if (isLoading) return <span>Loading...</span>;
  if (error) return null;

  return (
    <ReleaseNotesModal
      trigger={
        <button className="nav-link">
          What's New ({releases.length})
        </button>
      }
      title="Release Notes"
    />
  );
}

function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'My App',
        version: '1.0.0',
        apiEndpoint: 'https://feedback.example.workers.dev',
        apiKey: 'your-api-key',
      }}
    >
      <nav>
        <ChangelogButton />
      </nav>

      <main>
        <YourApp />
      </main>
    </FeedbackProvider>
  );
}
```

The `useReleaseNotes` hook fetches releases from `GET /api/releases` on your Worker, which in turn reads from your GitHub repository's Releases.

---

## Roadmap Modal

Display a label-driven roadmap sourced from your GitHub Issues.

```tsx
import {
  FeedbackProvider,
  RoadmapModal,
  useRoadmap,
} from '@nb-feedback-kit/react-sdk';

function RoadmapLink() {
  const { items, isLoading, error } = useRoadmap();

  if (isLoading || error || items.length === 0) return null;

  return (
    <RoadmapModal
      trigger={<a href="#roadmap">Roadmap</a>}
      title="Product Roadmap"
    />
  );
}

function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'My App',
        version: '1.0.0',
        apiEndpoint: 'https://feedback.example.workers.dev',
        apiKey: 'your-api-key',
      }}
    >
      <footer>
        <RoadmapLink />
      </footer>

      <YourApp />
    </FeedbackProvider>
  );
}
```

Roadmap items are driven by labels in your GitHub repository. See the [Backend guide](backend.md) for label configuration.

---

## S3-Compatible Storage

Enable screenshot uploads using any S3-compatible provider (AWS S3, Cloudflare R2, MinIO, Backblaze B2).

### AWS S3

```tsx
import {
  FeedbackProvider,
  FeedbackButton,
  FeedbackModal,
} from '@nb-feedback-kit/react-sdk';

function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'My App',
        version: '1.0.0',
        apiEndpoint: 'https://feedback.example.workers.dev',
        apiKey: 'your-api-key',
        storage: {
          type: 's3',
          s3: {
            bucket: 'my-feedback-screenshots',
            region: 'us-east-1',
            keyPrefix: 'feedback/',
          },
        },
      }}
    >
      <FeedbackButton />
      <FeedbackModal />
      <YourApp />
    </FeedbackProvider>
  );
}
```

### Cloudflare R2

R2 uses the S3-compatible API. Set the `endpoint` and use `region: 'auto'`.

```tsx
storage: {
  type: 's3',
  s3: {
    bucket: 'my-r2-bucket',
    region: 'auto',
    endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
    keyPrefix: 'feedback/',
  },
}
```

> The `s3` config holds only non-secret targeting information. Cloud credentials (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) live as Worker secrets and are used to sign short-lived presigned PUT URLs. See the [Storage Providers guide](storage-providers.md) for CORS configuration and bucket hardening.

---

## Custom Endpoint Storage

If you have an existing upload endpoint, route screenshots through it.

```tsx
import {
  FeedbackProvider,
  FeedbackButton,
  FeedbackModal,
} from '@nb-feedback-kit/react-sdk';

function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'My App',
        version: '1.0.0',
        apiEndpoint: 'https://feedback.example.workers.dev',
        apiKey: 'your-api-key',
        storage: {
          type: 'custom',
          endpoint: {
            url: 'https://uploads.myapp.com/api/screenshots',
            method: 'POST',
            fieldName: 'file',
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_UPLOAD_TOKEN}`,
            },
            responseUrlPath: 'data.url',
          },
        },
      }}
    >
      <FeedbackButton />
      <FeedbackModal />
      <YourApp />
    </FeedbackProvider>
  );
}
```

The SDK POSTs the file as `multipart/form-data` and expects a JSON response. `responseUrlPath` is a dotted path into that JSON — for `{ data: { url: "https://..." } }`, use `'data.url'`.

---

## Multi-Project Configuration

One Worker backend can serve multiple applications. Each application gets its own API key, which maps to a specific GitHub repository and storage configuration on the Worker side.

The SDK configuration is identical — the only difference is the `apiKey` and `applicationName`:

```tsx
// Project A — maps to GitHub repo "org/project-a"
const configA = {
  applicationName: 'Project A',
  version: '1.0.0',
  apiEndpoint: 'https://feedback.example.workers.dev',
  apiKey: 'pk_project_a_xxxxxxxxxxxx',
};

// Project B — maps to GitHub repo "org/project-b"
const configB = {
  applicationName: 'Project B',
  version: '3.2.0',
  apiEndpoint: 'https://feedback.example.workers.dev',
  apiKey: 'pk_project_b_yyyyyyyyyyyy',
};
```

Isolation is enforced server-side: each API key resolves to a specific GitHub repository and storage configuration. A key for Project A cannot create issues in Project B's repository. See the [Authentication guide](authentication.md) for details.

---

## Integration Patterns

### Next.js (App Router)

Wrap your root layout with `FeedbackProvider`:

```tsx
// app/layout.tsx
import { FeedbackProvider, FeedbackButton, FeedbackModal } from '@nb-feedback-kit/react-sdk';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FeedbackProvider
          config={{
            applicationName: 'My Next.js App',
            version: process.env.npm_package_version ?? '0.0.0',
            apiEndpoint: process.env.NEXT_PUBLIC_FEEDBACK_ENDPOINT!,
            apiKey: process.env.NEXT_PUBLIC_FEEDBACK_KEY!,
          }}
        >
          {children}
          <FeedbackButton />
          <FeedbackModal />
        </FeedbackProvider>
      </body>
    </html>
  );
}
```

> Use `NEXT_PUBLIC_` prefixed environment variables so the values are available in the browser. Never put secrets (GitHub tokens, Worker secrets) in client-accessible environment variables — only the public API key belongs here.

### Vite

Vite exposes environment variables via `import.meta.env`:

```tsx
<FeedbackProvider
  config={{
    applicationName: 'My Vite App',
    version: '1.0.0',
    apiEndpoint: import.meta.env.VITE_FEEDBACK_ENDPOINT,
    apiKey: import.meta.env.VITE_FEEDBACK_KEY,
  }}
>
  <FeedbackButton />
  <FeedbackModal />
  <App />
</FeedbackProvider>
```

Prefix variables with `VITE_` in your `.env` file:

```bash
# .env
VITE_FEEDBACK_ENDPOINT=https://feedback.example.workers.dev
VITE_FEEDBACK_KEY=your-api-key
```

### Environment-Based Configuration

For apps that run across multiple environments (dev, staging, production), resolve the config at runtime:

```tsx
const feedbackConfig = {
  applicationName: 'My App',
  version: APP_VERSION,
  apiEndpoint:
    process.env.NODE_ENV === 'production'
      ? 'https://feedback.example.workers.dev'
      : 'https://feedback-dev.example.workers.dev',
  apiKey:
    process.env.NODE_ENV === 'production'
      ? import.meta.env.VITE_FEEDBACK_KEY_PROD
      : import.meta.env.VITE_FEEDBACK_KEY_DEV,
};
```

> Use different API keys for different environments. Each key maps to a different GitHub repository on the Worker, keeping test feedback out of your production issue tracker.

---

## Next Steps

- **[React SDK](react.md)** — Full component and hook API reference.
- **[Backend](backend.md)** — Worker deployment and secret configuration.
- **[Storage Providers](storage-providers.md)** — CORS policies and bucket hardening.
- **[Security](security.md)** — Trust boundaries and threat model.
