# NB Feedback Kit

A drop-in feedback system for React applications. Collect bug reports, feature requests, and feedback — automatically routed to GitHub Issues. Also surfaces your GitHub Releases and roadmap to users, all from headless, customizable components.

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  React SDK  │ ──► │  Cloudflare Worker   │ ──► │   GitHub    │
│  (your app) │ ◄── │  (API + rate limit)  │ ◄── │  Issues/    │
└─────────────┘     └──────────────────────┘     │  Releases   │
                          │                       └─────────────┘
                          │ KV: API key → repo
                          │ DO: per-key rate limit
                          ▼
                    GitHub PAT (server-side secret)
```

## Why use this?

- **GitHub-native:** Feedback becomes GitHub Issues with auto-applied labels (`bug`, `feature-request`, `feedback`, `beta-feedback`). No separate ticketing system.
- **Secure by design:** Your GitHub PAT never touches the client. API keys are low-trust, rate-limited, and map server-side to a single repo (ADR-005).
- **Headless & customizable:** Components ship with minimal base styles. Bring your own design system.
- **Multi-project:** One API instance serves multiple applications — each API key routes to its own repo.
- **Bonus features:** Release Notes modal (from GitHub Releases) and Roadmap modal (from labeled Issues) included.

---

## Quick Start

### Option A: Use the hosted API (fastest)

1. **Get an API key** mapped to your GitHub repo (configured in the API's KV store).
2. **Install the SDK:**

   ```bash
   npm install @nb-feedback-kit/react-sdk
   ```

3. **Add to your app:**

   ```tsx
   import { FeedbackProvider, FeedbackButton, FeedbackModal } from '@nb-feedback-kit/react-sdk';

   function App() {
     return (
       <FeedbackProvider
         config={{
           applicationName: 'My App',
           version: '1.0.0',
           apiEndpoint: 'https://your-api-endpoint.workers.dev',
           apiKey: 'your-api-key',
         }}
       >
         <FeedbackButton onClick={open} />
         <FeedbackModal isOpen={isOpen} onClose={close} />
       </FeedbackProvider>
     );
   }
   ```

See the **[SDK README](packages/react-sdk/README.md)** for the full component and hook API.

### Option B: Self-host the API

Deploy your own Cloudflare Worker with KV (API keys) and Durable Objects (rate limiting).

1. Clone this repo.
2. Follow **[Cloudflare Setup Guide](packages/api/CLOUDFLARE_SETUP.md)**.
3. Set your `GITHUB_TOKEN` secret and populate `API_KEYS` in KV.
4. Deploy: `pnpm wrangler deploy --env production`.

---

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@nb-feedback-kit/react-sdk` | [`packages/react-sdk`](packages/react-sdk) | Headless React components and hooks |
| `@nb-feedback-kit/api` | [`packages/api`](packages/api) | Cloudflare Worker API (Hono + KV + Durable Objects) |
| `@nb-feedback-kit/shared-types` | [`packages/shared-types`](packages/shared-types) | Shared TypeScript contracts |
| Demo app | [`apps/demo-app`](apps/demo-app) | Reference integration (Vite + React 18) |

---

## Documentation

| Document | Purpose |
|----------|---------|
| **[SDK README](packages/react-sdk/README.md)** | How to integrate the React SDK (primary consumer doc) |
| **[API Reference](resources/api-reference.md)** | REST contract (endpoints, auth, error shapes) |
| **[Cloudflare Setup](packages/api/CLOUDFLARE_SETUP.md)** | Deploy your own API instance |
| **[Security Review](resources/security-reports/task-005-006-security-review.md)** | Auth, rate limiting, and secret handling assessment |
| **[Architecture Decisions](memory/project-decisions.md)** | ADRs (server-side routing, labels, etc.) |
| **[Demo App README](apps/demo-app/README.md)** | Run the reference integration locally |

---

## How It Works

### Feedback Flow

1. User clicks the **FeedbackButton** → **FeedbackModal** opens.
2. User selects type (Bug / Feature / Feedback), enters title + description.
3. SDK auto-captures metadata (browser, OS, route, screen size, timestamp, optional userId).
4. SDK POSTs to `/api/feedback` with `X-API-Key`.
5. API validates the key (KV lookup) → checks rate limit (Durable Object) → creates a GitHub Issue.
6. Issue is auto-labeled: `bug`/`feature-request`/`feedback` + `beta-feedback`.
7. SDK shows success with a link to the created issue.

### Release Notes & Roadmap

- **`GET /api/releases`** → fetches latest 10 GitHub Releases (version, date, body, link).
- **`GET /api/roadmap`** → fetches Issues labeled `planned` / `in-progress` / `released`.

---

## Security

- **API keys** are low-trust: rate-limited (60s sliding window per key), scoped to one repo.
- **GitHub PAT** is a server-side Cloudflare secret — never shipped to the client.
- **CORS** is permissive in development (`origin: '*'`). **Restrict to known domains before production launch.**
- See the full [security review](resources/security-reports/task-005-006-security-review.md) (PASS — 0 Critical, 0 High).

---

## Tech Stack

- **Frontend:** React 18 + TypeScript (headless components)
- **API:** Hono.js on Cloudflare Workers
- **Storage:** Cloudflare KV (API keys) + Durable Objects (rate limiting)
- **Integration:** GitHub REST API (Issues + Releases)
- **Build:** Vite + Turborepo + pnpm workspaces

---

## Development

```bash
# Install dependencies
pnpm install

# Run the demo app (uses local SDK + API)
pnpm dev

# Run API tests
cd packages/api && pnpm test

# Build all packages
pnpm build
```

---

## Status

**MVP delivered** — all 13 planned tasks complete. See the [project board](memory/tasks/project-board.md) for details.

### Pre-production checklist

Before going live:

- [ ] Set `GITHUB_TOKEN` via `wrangler secret put`
- [ ] Create `API_KEYS` KV namespace and populate with real key→repo mappings
- [ ] Restrict CORS origins to known application domains
- [ ] Create GitHub labels: `bug`, `feature-request`, `feedback`, `beta-feedback`, `planned`, `in-progress`, `released`

### Deferred (post-MVP)

- Screenshot upload (requires Cloudflare R2)
- Feature voting
- User feedback portal
- AI categorization / deduplication

---

## License

MIT