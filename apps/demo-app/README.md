# Demo App

A reference React application demonstrating the [NB Feedback Kit](../../README.md) SDK integration.

## What This Demonstrates

- ✅ `FeedbackProvider` wrapping the app with SDK configuration
- ✅ `FeedbackButton` + `FeedbackModal` for collecting user feedback
- ✅ `ReleaseNotesModal` for displaying version history
- ✅ Automatic metadata capture (browser, OS, route, screen resolution)
- ✅ Multi-page routing (route is captured in every feedback submission)
- ✅ Accessibility (keyboard nav, focus trap, ESC to close)

## Prerequisites

The demo app expects the API to be running locally:

1. **Start the API** (from repo root):
   ```bash
   cd packages/api
   pnpm dev
   ```
   The API runs on `http://localhost:8787` by default.

2. **Configure API secrets** — copy `packages/api/.dev.vars.example` to `.dev.vars` and fill in:
   ```
   GITHUB_PAT=ghp_your_github_personal_access_token
   GITHUB_OWNER=your-github-org-or-user
   GITHUB_REPO=your-repo-name
   API_KEYS=your-secret-api-key
   ```

3. **Update the demo config** — if your API key differs from `demo-key`, update the `apiKey` field in `src/App.tsx`.

## Running the Demo

From the repo root:

```bash
pnpm dev
```

Or from this directory:

```bash
pnpm dev
```

The app runs on `http://localhost:5173`.

## Pages

| Route        | Purpose                                         |
| ------------ | ----------------------------------------------- |
| `/`          | Home — launch feedback & release notes modals   |
| `/features`  | Lists SDK capabilities                          |
| `/about`     | Explains how the feedback kit works             |

Navigate between pages and open the feedback modal — the **captured metadata panel** at the bottom shows the current route changing in real time. When you submit feedback, that route is included in the GitHub Issue.

## Configuration

SDK config is set in `src/App.tsx`:

```typescript
<FeedbackProvider
  config={{
    applicationName: 'Demo App',
    version: '0.0.1',
    apiEndpoint: 'http://localhost:8787',
    apiKey: 'demo-key',
    userId: 'test-user-123',
  }}
>
```

| Field             | Description                                       |
| ----------------- | ------------------------------------------------- |
| `applicationName` | Label included in GitHub Issue metadata           |
| `version`         | App version included in metadata                  |
| `apiEndpoint`     | Where feedback submissions are sent               |
| `apiKey`          | Authenticates with the API (must match `API_KEYS`)|
| `userId`          | Optional — identifies the submitting user         |

## Tech Stack

- **React 18** + **TypeScript**
- **Vite 6** (dev server + build)
- No router dependency — uses a minimal History API hook (`src/hooks/useRouter.ts`)