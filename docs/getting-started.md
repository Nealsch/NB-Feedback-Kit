<div align="center">

# Getting Started with NB Feedback Kit

**From zero to your first GitHub Issue in under five minutes.**

</div>

---

## Prerequisites

Before you begin, make sure you have the following:

- <img src="../assets/icons/folder-git-2.svg" width="16" /> &nbsp;**A GitHub repository** where feedback will be created as Issues.
- <img src="../assets/icons/key-round.svg" width="16" /> &nbsp;**A GitHub Personal Access Token** with `issues: write` and `contents: read` scopes.
- <img src="../assets/icons/server.svg" width="16" /> &nbsp;**A Cloudflare account** (free tier works) to deploy the Worker backend.
- <img src="../assets/icons/atom.svg" width="16" /> &nbsp;**A React 18+ / React Native app** OR **any HTML site** where you'll embed the SDK.
- <img src="../assets/icons/terminal.svg" width="16" /> &nbsp;**Node.js 18+** and **pnpm** installed locally.

> **New to pnpm?** Install it with `npm install -g pnpm`. NB Feedback Kit uses pnpm workspaces for its monorepo.

---

## How It Works

NB Feedback Kit has three pieces. You'll set them up in order:

| | Component | What it does |
|:--:|---|---|
| <img src="../assets/icons/server.svg" width="20" /> | **Backend Worker** | Receives feedback, creates GitHub Issues, enforces auth and rate limits. |
| <img src="../assets/icons/atom.svg" width="20" /> | **React SDK** | Embeds in your React or React Native app — provider, hooks, and UI components. |
| <img src="../assets/icons/code.svg" width="20" /> | **Core SDK** | Framework-agnostic SDK for vanilla JS / HTML sites — a single `<script>` tag. |
| <img src="../assets/icons/folder-git-2.svg" width="20" /> | **GitHub Repository** | The single source of truth where issues, releases, and roadmap live. |

```
Your App  →  NB Feedback SDK  →  NB Feedback Worker  →  GitHub Issues
                                    ↓
                              Your Storage (optional)
```

Credentials for GitHub and storage **never leave the Worker** — the client only ever holds an API key.

---

## Step 1 — Deploy the Backend

The backend is a Cloudflare Worker. Clone this repo and deploy from the `packages/api` directory.

### 1.1 Clone and install

```bash
git clone https://github.com/Nealsch/NB-Feedback-Kit.git
cd NB-Feedback-Kit
pnpm install
```

### 1.2 Create the KV namespaces

The Worker uses two KV namespaces — one for API-key mapping and one for device records:

```bash
cd packages/api

# Create both namespaces (note the returned IDs)
pnpm wrangler kv namespace create API_KEYS
pnpm wrangler kv namespace create DEVICES
```

Add the returned namespace IDs to your `wrangler.toml` under the `[env.production.kv_namespaces]` section.

### 1.3 Set your secrets

Store your credentials as Worker secrets — they are encrypted by Cloudflare and never appear in your source:

```bash
# Required: GitHub token with issues:write and contents:read
pnpm wrangler secret put GITHUB_TOKEN

# Required: HMAC secret for device JWTs (≥32 characters)
pnpm wrangler secret put JWT_SECRET

# Recommended: admin token for device revocation endpoints
pnpm wrangler secret put ADMIN_TOKEN
```

### 1.4 Register your API key

The Worker maps each API key to a GitHub repository configuration. The key is stored in KV **as a SHA-256 hash** — never in plaintext. Register your first key:

```bash
pnpm wrangler kv key put --binding=API_KEYS \
  "<sha256-of-your-key>" \
  '{"github":{"owner":"your-org","repo":"your-repo"},"applicationName":"My App"}'
```

> **Tip:** Generate a strong random key (e.g. `openssl rand -hex 32`), hash it, store the hash in KV, and keep the raw key to use in your app's `apiKey` config.

### 1.5 Deploy

```bash
pnpm deploy
```

Your Worker is now live at `https://nb-feedback-api-prod.<your-subdomain>.workers.dev`. Verify it:

```bash
curl https://nb-feedback-api-prod.<your-subdomain>.workers.dev/health
# → { "status": "ok", "service": "nb-feedback-api", ... }
```

---

## Step 2 — Install the SDK

**React / React Native:**

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

> **Peer dependencies:** The React SDK requires `react` and `react-dom` `^18.0.0`.

**Vanilla JS / HTML:**

```bash
npm install @nb-feedback-kit/core-sdk
```

Or skip npm entirely — download the pre-built IIFE bundle (`dist/index.global.js`) and load it with a `<script>` tag. See the [HTML / Vanilla JS guide](html.md) for details.

---

## Step 3 — Wrap Your App

> **Using vanilla JS / HTML instead of React?** Skip to the [HTML Quick Start](#step-3b--html--vanilla-js-quick-start) below — you'll use `createFeedbackClient()` instead of `<FeedbackProvider>`.

Import the `FeedbackProvider` and wrap your application root. The provider accepts a single `config` object:

```tsx
import { FeedbackProvider, FeedbackButton, FeedbackModal } from '@nb-feedback-kit/react-sdk'
import { useState } from 'react'

export default function App() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <FeedbackProvider
      config={{
        applicationName: 'My App',          // Required — shown in the GitHub issue
        version: '1.0.0',                   // Required — captured in metadata
        apiEndpoint: 'https://nb-feedback-api-prod.your-subdomain.workers.dev',
        apiKey: 'your-raw-api-key',         // The raw key you registered in KV
        userId: 'optional-user-id',         // Optional — for tracing
      }}
    >
      <YourApp />

      <FeedbackButton onClick={() => setIsOpen(true)}>
        Feedback
      </FeedbackButton>

      <FeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </FeedbackProvider>
  )
}
```

### Config reference

| Field | Type | Required | Description |
|---|---|:--:|---|
| `applicationName` | `string` | <img src="../assets/icons/check.svg" width="14" /> | Name shown in the created GitHub issue. |
| `version` | `string` | <img src="../assets/icons/check.svg" width="14" /> | App version captured in issue metadata. |
| `apiEndpoint` | `string` | <img src="../assets/icons/check.svg" width="14" /> | Base URL of your deployed Worker. |
| `apiKey` | `string` | <img src="../assets/icons/check.svg" width="14" /> | The raw API key you registered in KV. |
| `userId` | `string` | | Optional identifier for tracing submissions to users. |
| `storage` | `StorageProviderConfig` | | Optional screenshot storage config. Omit or set to `{ type: 'none' }` to disable. |

---

## Step 3B — HTML / Vanilla JS Quick Start

For static sites, server-rendered pages, or any project without a React bundler, use the Core SDK's IIFE global build. No `npm install` required if you use the pre-built bundle.

### 3B.1 Load the SDK

```html
<!-- Load the Core SDK (IIFE global build) -->
<script src="/assets/js/nb-feedback-kit.global.js"></script>
```

### 3B.2 Create the client

In your own widget script (loaded **after** the SDK):

```js
// feedback-widget.js
const client = NbFeedbackKit.createFeedbackClient({
  applicationName: 'My Site',
  version: '1.0.0',
  apiEndpoint: 'https://nb-feedback-api-prod.your-subdomain.workers.dev',
  apiKey: 'your-raw-api-key',
})
```

### 3B.3 Build your UI

The Core SDK is headless — it provides the `submitFeedback()` API, but you build the button and modal yourself in vanilla JS:

```js
const btn = document.getElementById('feedback-button')
btn.addEventListener('click', async () => {
  const result = await client.submitFeedback({
    type: 'bug',           // 'bug' | 'feature' | 'feedback'
    title: 'Something broke',
    description: 'Steps to reproduce...',
  })
  console.log('Issue created:', result.issueUrl)
})
```

See the [HTML / Vanilla JS guide](html.md) for a complete widget example with modal, form validation, and error handling.

---

## Step 4 — Collect Feedback

That's it. When a user fills the modal and submits, the SDK sends the payload to your Worker, which:

1. Authenticates the request via your API key.
2. Validates and sanitizes the payload.
3. Creates a **GitHub Issue** with the correct label (`bug`, `feature`, or `feedback`).
4. Returns the issue URL to your app.

```tsx
import { useSubmitFeedback } from '@nb-feedback-kit/react-sdk'

function FeedbackForm() {
  const { submitFeedback, loading, error } = useSubmitFeedback()

  const handleSubmit = async ({ type, title, description }) => {
    try {
      const result = await submitFeedback({ type, title, description })
      console.log('Issue created:', result.issueUrl)
    } catch (err) {
      // Error is also available via the `error` return value
    }
  }

  // ...
}
```

The `submitFeedback` function returns `{ success, issueUrl, issueNumber }` on success and throws on failure.

---

## Step 5 — Add Screenshots (Optional)

To let users attach screenshots, configure a storage provider. The SDK supports:

| Provider | Config type | How it works |
|---|---|---|
| <img src="../assets/icons/server-off.svg" width="16" /> &nbsp;**None** | `{ type: 'none' }` | Screenshots disabled (default). |
| <img src="../assets/icons/cloud.svg" width="16" /> &nbsp;**S3-compatible** | `{ type: 's3', ... }` | Worker presigns a PUT URL; client uploads directly to your bucket. |

Example with S3-compatible storage (Amazon S3, Cloudflare R2, MinIO, Backblaze B2):

```tsx
<FeedbackProvider
  config={{
    applicationName: 'My App',
    version: '1.0.0',
    apiEndpoint: 'https://your-worker.workers.dev',
    apiKey: 'your-api-key',
    storage: {
      type: 's3',
      bucket: 'feedback-screenshots',
      region: 'us-east-1',
      // For R2/MinIO/B2, add:
      endpoint: 'https://your-account.r2.cloudflarestorage.com',
      keyPrefix: 'feedback/',
    },
  }}
>
  <YourApp />
</FeedbackProvider>
```

The Worker signs short-lived upload URLs using `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` secrets — your cloud credentials **never reach the client**.

> **CORS:** Your bucket must allow `PUT` requests from your app's origin. See [`packages/api/S3_CORS_CONFIGURATION.md`](../packages/api/S3_CORS_CONFIGURATION.md) for the exact policy.

---

## Step 6 — Show Release Notes & Roadmap

Close the loop by surfacing GitHub Releases and roadmap items back to your users:

```tsx
import {
  useReleaseNotes,
  useRoadmap,
  ReleaseNotesModal,
  RoadmapModal,
} from '@nb-feedback-kit/react-sdk'

function App() {
  const { releases, loading: releasesLoading } = useReleaseNotes()
  const { roadmap, loading: roadmapLoading } = useRoadmap()

  return (
    <>
      {/* ... */}
      <ReleaseNotesModal releases={releases} loading={releasesLoading} />
      <RoadmapModal roadmap={roadmap} loading={roadmapLoading} />
    </>
  )
}
```

- **Release Notes** are pulled from GitHub Releases automatically.
- **Roadmap** is driven by GitHub labels (`planned`, `in-progress`, `released`).

---

## Verify It Works

Submit a test feedback from your app or site, then check your GitHub repository — you should see a new Issue with:

- The correct label (`bug`, `feature`, or `feedback`).
- A rendered metadata table (app name, version, browser, OS, timestamp).
- Any attached screenshots as Markdown images.

You can also run the included smoke test against a local Worker:

```bash
cd packages/api
pnpm dev          # start the Worker locally on :8787
# in another terminal:
pwsh ./smoke-feedback.ps1
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 Unauthorized` | API key not registered or hash mismatch in KV | Re-register the key's SHA-256 hash in the `API_KEYS` namespace. |
| `502 Bad Gateway` from `/api/feedback` | `GITHUB_TOKEN` missing or lacks `issues: write` | Re-run `wrangler secret put GITHUB_TOKEN` with a token that has the `repo` scope. |
| `503 Service Unavailable` on `/api/devices/*` | `ADMIN_TOKEN` not set | Run `wrangler secret put ADMIN_TOKEN`. |
| Screenshots don't appear in issues | Bucket not publicly readable, or CORS blocked the upload | Make the bucket objects publicly accessible and configure CORS per the [S3 CORS guide](../packages/api/S3_CORS_CONFIGURATION.md). |
| `500 Server configuration error` | `GITHUB_TOKEN` secret not set on the Worker | Run `wrangler secret put GITHUB_TOKEN` and redeploy. |

---

## Next Steps

- <img src="../assets/icons/book-open.svg" width="16" /> &nbsp;**[Authentication](authentication.md)** — Understand device registration, JWT sessions, and revocation.
- <img src="../assets/icons/database.svg" width="16" /> &nbsp;**[Storage Providers](storage-providers.md)** — Configure S3, R2, MinIO, or B2 for screenshots.
- <img src="../assets/icons/server.svg" width="16" /> &nbsp;**[Backend](backend.md)** — Full Worker deployment reference.
- <img src="../assets/icons/lock.svg" width="16" /> &nbsp;**[Security](security.md)** — Threat model and hardening guide.
- <img src="../assets/icons/code.svg" width="16" /> &nbsp;**[Examples](examples.md)** — Runnable React and React Native apps.

---

<p align="center">
  <sub>Stuck? <a href="https://github.com/Nealsch/NB-Feedback-Kit/issues">Open an issue</a> — I'm happy to help.</sub>
</p>