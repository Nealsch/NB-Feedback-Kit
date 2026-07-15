# Project Board — NB Feedback Kit

## Kanban Status

| Step | Limit | Items |
|------|-------|-------|
| Step 0 - To Be Started | ∞ | TASK-015, TASK-016, TASK-017, TASK-018, TASK-019 |
| Step 1 - Discovery | 3 | |
| Step 2 - Ready | ∞ | |
| Step 3 - In Development | 1 | |
| Step 4 - Review | 2 | |
| Step 5 - Testing | 2 | |
| Step 6 - Complete | ∞ | TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013, TASK-014 |

---

## Active Work Items

### TASK-001: Monorepo Infrastructure Setup
- **Status:** Complete
- **Priority:** Critical (Blocking)
- **Owner:** NB-DevOps-Engineer
- **Type:** Infrastructure Setup
- **Created:** 2026-06-16
- **Completed:** 2026-06-16
- **Dependencies:** None
- **Scope:** Set up pnpm workspaces + Turborepo monorepo structure with initial package scaffolding
- **Packages:**
  - `@nb-feedback-kit/react-sdk` (Vite library mode)
  - `@nb-feedback-kit/api` (Hono + Cloudflare Workers)
  - `@nb-feedback-kit/shared-types` (TypeScript types)
  - Demo app (Vite + React 18)
- **Deliverables:**
  - ✅ Root `package.json` with pnpm workspace configuration
  - ✅ `pnpm-workspace.yaml` config
  - ✅ `turbo.json` build orchestration
  - ✅ TypeScript config (root + per-package)
  - ✅ All packages scaffolded with basic structure
  - ✅ Cross-package type imports working
  - ✅ `pnpm install` succeeds
  - ✅ `turbo build` succeeds (even if packages are empty)
- **Record:** `.ai/tasks/items/TASK-001-monorepo-setup.md`

### TASK-002: SDK Core Architecture
- **Status:** Complete
- **Priority:** High
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-16
- **Dependencies:** TASK-001
- **Scope:** Implement core SDK architecture (FeedbackProvider, Context, hooks)
- **Components:**
  - `FeedbackProvider` (React Context wrapper)
  - `useFeedback()` hook
  - Configuration interface
  - Context metadata capture utilities
- **Acceptance Criteria:**
  - ✅ FeedbackProvider accepts config prop (including optional userId)
  - ✅ Config includes: applicationName, version, apiEndpoint, apiKey, userId
  - ✅ Context available to child components via FeedbackContextValue
  - ✅ Automatic metadata collection (browser, OS, route, screen size, timestamp, userId)
  - ✅ TypeScript types exported from shared-types package
  - ✅ Metadata detection utilities (detectBrowser, detectOS, detectRoute, detectScreenResolution)
  - ✅ Build succeeds with all packages compiling
  - ✅ Demo app displays captured metadata
- **Record:** `.ai/tasks/items/TASK-002-sdk-core-architecture.md`

---

## To Be Started

### TASK-015: Resolve `shared-types` Workspace Dependency for core-sdk
- **Status:** To Be Started
- **Priority:** High (Blocks publish — TASK-016)
- **Owner:** NB-DevOps-Engineer + NB-Backend-Specialist
- **Type:** Infrastructure
- **Created:** 2026-07-07
- **Dependencies:** None (core-sdk package exists in working tree)
- **Scope:** The new `@nb-feedback-kit/core-sdk` package depends on `@nb-feedback-kit/shared-types` via `"workspace:*"`. This specifier only resolves inside the monorepo — an external `npm install` would fail. Resolve this before publishing so external consumers can install cleanly.
- **Context:** core-sdk was created during the FreeToolWorks integration session (2026-07-07). The React SDK doesn't have this problem because it is consumed via workspace only. core-sdk must be independently installable.
- **Acceptance Criteria:**
  - [ ] Decision recorded: bundle-and-inline `shared-types` into core-sdk's build output (recommended, lower friction) OR publish `shared-types` to npm as a separate public package.
  - [ ] If bundling: tsup config updated to inline the dependency; `package.json` `dependencies` no longer references `workspace:*`.
  - [ ] If publishing: `shared-types` published first; core-sdk references a concrete version (e.g. `^1.0.0`).
  - [ ] `pnpm build` from repo root succeeds.
  - [ ] Verified: a clean `npm pack` output of core-sdk contains no `workspace:*` references.
- **Record:** `memory/tasks/items/TASK-015-resolve-shared-types-dep.md` (to be created)

### TASK-016: Commit and Publish `@nb-feedback-kit/core-sdk` to npm
- **Status:** To Be Started
- **Priority:** High (Unblocks external availability)
- **Owner:** NB-DevOps-Engineer
- **Type:** Release
- **Created:** 2026-07-07
- **Dependencies:** TASK-015 (workspace dep must be resolved first)
- **Scope:** The core-sdk source, tests (21/21 passing), and build artifacts exist locally but are uncommitted and unpublished. This task makes the package available to external developers via the npm registry.
- **Context:** Currently `version: "0.0.1"`. The README's `npm install @nb-feedback-kit/core-sdk` instruction fails until this task completes. `publishConfig.access: public` is already set.
- **Acceptance Criteria:**
  - [ ] core-sdk changes committed to the `NB-Feedback-Kit` repo and pushed to `origin`.
  - [ ] Version bumped from `0.0.1` to a release version (e.g. `0.1.0`) following semver.
  - [ ] `CHANGELOG.md` entry added (or changeset consumed via the existing TASK-013 changeset flow).
  - [ ] `pnpm publish --filter @nb-feedback-kit/core-sdk --access public` succeeds.
  - [ ] Verified: `npm view @nb-feedback-kit/core-sdk` returns the published manifest.
  - [ ] Verified: `npm install @nb-feedback-kit/core-sdk` in a clean external directory resolves and imports `createFeedbackClient`.
  - [ ] Backend Worker confirmed deployed so the SDK has a live endpoint to talk to (coordinate with TASK-004/005 deployment).
- **Record:** `memory/tasks/items/TASK-016-publish-core-sdk.md` (to be created)

### TASK-017: Standalone Vanilla-JS Demo UI for core-sdk
- **Status:** To Be Started
- **Priority:** Medium
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-07-07
- **Dependencies:** TASK-016 (core-sdk must be installable/loadable)
- **Scope:** Create a framework-agnostic reference UI that developers using non-React stacks (vanilla JS, Vue, Svelte, Angular, Eleventy, plain HTML) can copy as a starting point. This is the generic equivalent of the React demo app (TASK-007) — a drop-in button + modal wired to the core-sdk client.
- **Context:** A bespoke version of this was already built for the FreeToolWorks site (`src/assets/js/feedback-widget.js` + `src/assets/css/feedback-widget.css`). That implementation is project-specific (tied to FreeToolWorks' design tokens and Eleventy config). This task extracts a reusable, dependency-free reference implementation into the NB-Feedback-Kit repo so other developers can adapt it.
- **Deliverables:**
  - [ ] `apps/vanilla-demo/` (or `examples/vanilla/`) directory with a standalone HTML page.
  - [ ] `feedback-widget.js` — generic vanilla-JS UI (floating button + modal), no framework deps, consuming `NbFeedbackKit.createFeedbackClient` from the IIFE build.
  - [ ] `feedback-widget.css` — self-contained styles using CSS custom properties (no hardcoded design tokens) so consumers can theme via `--nb-feedback-*` variables.
  - [ ] `index.html` — minimal demo wiring the widget to a config object, loadable by opening the file directly (no build step).
  - [ ] `README.md` — how to copy the three files into any project and configure.
  - [ ] Form types (bug / feature / feedback), validation, loading state, success/error display.
  - [ ] Keyboard accessibility (ESC to close, focus trap, ARIA labels) matching the React modal's behaviour.
- **Acceptance Criteria:**
  - [ ] Demo opens by double-clicking `index.html` — no server, no bundler required.
  - [ ] Submitting feedback calls `client.submitFeedback()` and shows success/error state.
  - [ ] All three feedback types selectable.
  - [ ] Works in evergreen Chrome, Firefox, Safari.
  - [ ] Documented copy-paste integration path (≤ 5 minutes to add to a plain HTML site).
- **Record:** `memory/tasks/items/TASK-017-vanilla-demo-ui.md` (to be created)

### TASK-018: Update README and Docs for core-sdk
- **Status:** To Be Started
- **Priority:** Medium
- **Owner:** NB-Frontend-Web-Specialist (docs) + NB-Backend-Specialist (API contract)
- **Type:** Documentation
- **Created:** 2026-07-07
- **Dependencies:** TASK-016 (docs should reflect the published package name/version)
- **Scope:** The repo's root README and `docs/` suite were written for the React SDK only. Update them so the framework-agnostic core-sdk is a first-class documented option alongside the React SDK. The per-package `packages/core-sdk/README.md` already exists and is comprehensive — this task is about surfacing it from the top-level docs.
- **Context:** The 2026-07-06 docs session (handoff `handoff-2026-07-06-readme-and-docs.md`) produced a premium README + `docs/` suite but predates core-sdk's creation. External developers arriving at the repo currently see no mention of the non-React option.
- **Deliverables:**
  - [ ] Root `README.md` — add a "Framework support" or "Which package do I need?" section: React → `@nb-feedback-kit/react-sdk`; anything else → `@nb-feedback-kit/core-sdk`.
  - [ ] `docs/installation.md` — add core-sdk install + the three build formats (ESM / CJS / IIFE).
  - [ ] `docs/core-sdk.md` (new) — quick start, `<script>`-tag usage, full API reference, storage providers. Can mirror `packages/core-sdk/README.md` with repo-relative links.
  - [ ] `docs/getting-started.md` — branch the quick start: "Using React?" vs "Using another framework or vanilla JS?".
  - [ ] `docs/examples.md` — add a vanilla-JS example (cross-links to TASK-017 demo).
  - [ ] Root `README.md` feature/comparison tables updated if they imply React-only.
  - [ ] `CHANGELOG.md` — entry for core-sdk addition.
- **Acceptance Criteria:**
  - [ ] A developer reading only the root README can determine which package to install for their stack.
  - [ ] No broken internal links (verify all `docs/*.md` cross-references resolve).
  - [ ] Per-package README (`packages/core-sdk/README.md`) and root docs are consistent — no contradictory API descriptions.
  - [ ] Pronoun voice matches repo convention (first-person "I/Neal" per the 2026-07-06 docs decision).
- **Record:** `memory/tasks/items/TASK-018-core-sdk-docs.md` (to be created)

### TASK-019: Expand core-sdk Unit Test Coverage
- **Status:** To Be Started
- **Priority:** Medium
- **Owner:** NB-QA-Engineer
- **Type:** Quality / Testing
- **Created:** 2026-07-07
- **Dependencies:** None (tests can be added to the existing package immediately)
- **Scope:** The current 21 tests cover only `client.ts` (`submitFeedback`, `getReleases`, `getRoadmap`, `FeedbackApiError`) and basic config validation. Per `.clinerules/testing.md`, all logic-bearing modules need happy-path + edge-case + failure-case coverage. The storage layer, metadata utilities, and IIFE build artefact are currently untested.
- **Context:** Test gaps identified during the FreeToolWorks integration session. The React SDK's storage providers have integration coverage via component tests, but core-sdk's copies are exercised only indirectly.
- **Test gaps to close:**
  - [ ] **`storage/none-provider.ts`** — happy path (returns null/no-ops), edge cases (called with no config), confirms it never throws.
  - [ ] **`storage/custom-endpoint-provider.ts`** — happy path (upload returns `UploadedFile`), failure cases (endpoint 4xx/5xx, network error, malformed response), edge cases (missing endpoint config, empty file).
  - [ ] **`storage/providers/s3.ts`** — happy path (presign → PUT → returns `UploadedFile`), failure cases (presign 403, PUT 500, wrong content-type), edge cases (large file, zero-byte file, missing presign response fields).
  - [ ] **`storage/index.ts`** (`createStorageProvider`) — branch coverage: `none` / `custom` / `s3` selection, invalid type throws, default behaviour when `storage` omitted.
  - [ ] **`utils/metadata.ts`** (`collectMetadata`) — happy path (returns object with expected keys), edge cases (no `navigator`/`window` available — SSR safety), sanitisation of unexpected UA strings.
  - [ ] **IIFE build smoke test** — load `dist/index.global.js` in a jsdom/happy-dom environment, assert `window.NbFeedbackKit.createFeedbackClient` is a function. Guards against tsup global-name regressions.
- **Acceptance Criteria:**
  - [ ] All listed modules have dedicated test files under `packages/core-sdk/tests/`.
  - [ ] Each module has ≥ 1 happy-path, ≥ 1 edge-case, ≥ 1 failure-case test.
  - [ ] `pnpm --filter @nb-feedback-kit/core-sdk test` passes with the new tests added.
  - [ ] Coverage of `packages/core-sdk/src/` increases measurably (record before/after line counts if a coverage reporter is configured).
  - [ ] No network calls in any test (all `fetch` stubbed).
- **Record:** `memory/tasks/items/TASK-019-core-sdk-test-coverage.md` (to be created)

### TASK-003: SDK UI Components (Feedback Button + Modal)
- **Status:** Complete
- **Priority:** High
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-16
- **Dependencies:** TASK-002
- **Scope:** Build headless FeedbackButton and FeedbackModal components
- **Components:**
  - `FeedbackButton` (floating button, configurable position)
  - `FeedbackModal` (form with type, title, description)
  - Form validation
  - Accessibility (ARIA labels, keyboard nav, focus trap)
- **Acceptance Criteria:**
  - ✅ Button renders at configurable position (bottom-right default)
  - ✅ Modal opens on button click
  - ✅ Form has type selector (Bug, Feature, Feedback)
  - ✅ Title and description fields with validation
  - ✅ Form submits via useSubmitFeedback hook (mock implementation)
  - ✅ Accessible (keyboard navigation, ESC to close, focus trap, ARIA labels)
  - ✅ Headless (base styling only, fully customizable)
  - ✅ Loading states during submission
  - ✅ Real-time form validation with error messages
  - ✅ Demo app fully functional with interactive UI
- **Record:** `.ai/tasks/items/TASK-003-sdk-ui-components.md`

### TASK-004: API Foundation (Hono + Cloudflare Worker)
- **Status:** Complete
- **Priority:** High
- **Owner:** NB-Backend-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-16
- **Dependencies:** TASK-001
- **Scope:** Set up Hono API with Cloudflare Workers runtime and Wrangler config
- **Deliverables:**
  - ✅ `packages/api/` with Hono app (enhanced with middleware)
  - ✅ `wrangler.toml` configuration (dev + prod environments)
  - ✅ TypeScript + shared-types integration (typecheck passes)
  - ✅ Health check endpoint (`GET /health`) with metadata
  - ✅ API info endpoint (`GET /`) with endpoint documentation
  - ✅ Local dev environment via `wrangler dev` (port 8787)
  - ✅ CORS middleware configured (permissive for development)
  - ✅ Request logging middleware
  - ✅ Global error handling middleware
  - ✅ 404 handler for undefined routes
  - ✅ Comprehensive Cloudflare setup documentation (CLOUDFLARE_SETUP.md)
- **Record:** `.ai/tasks/items/TASK-004-api-foundation.md`

### TASK-005: API Authentication & Rate Limiting
- **Status:** Complete
- **Priority:** High
- **Owner:** NB-Backend-Specialist + NB-Security-Engineer (review)
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-28
- **Dependencies:** TASK-004
- **Scope:** Implement API key authentication and Durable Objects rate limiting
- **Security Requirements:**
  - API keys stored in Cloudflare KV (`API_KEYS` namespace)
  - Durable Objects for per-key rate limiting (10-30 req/min)
  - Repository routing via API key mapping
- **Deliverables:**
  - ✅ API key validation middleware (`packages/api/src/middleware/auth.ts`)
  - ✅ Cloudflare KV integration (`API_KEYS.get(apiKey)` lookup)
  - ✅ Durable Object rate limiter (`packages/api/src/rate-limiter.ts` — `RateLimiter` class)
  - ✅ Per-key rate limit enforcement (per-key DO instance via `idFromName(apiKey)`, 60s sliding window)
  - ✅ 401 response for missing/invalid keys (9 tests cover this)
  - ✅ 429 response for rate limit exceeded (with `Retry-After` + `X-RateLimit-*` headers)
  - ✅ Security review completed by NB-Security-Engineer (`resources/security-reports/task-005-006-security-review.md` — PASS)
- **Test coverage:** 9/9 TASK-005 tests pass (`vitest run` → 21/21 total)
- **Record:** `.ai/tasks/items/TASK-005-api-auth-rate-limiting.md`

### TASK-006: GitHub Integration Layer
- **Status:** Complete
- **Priority:** High
- **Owner:** NB-Backend-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-28
- **Dependencies:** TASK-005
- **Scope:** Implement GitHub API client and issue creation logic
- **Features:**
  - GitHub PAT stored as Cloudflare Worker secret
  - Repository routing from API key mapping
  - Issue creation with formatted body (description + metadata)
  - Automatic label application (bug/feature-request/feedback + beta-feedback)
  - Error handling for GitHub API failures
- **Deliverables:**
  - ✅ GitHub API client module (`packages/api/src/github/client.ts` — 223 lines)
  - ✅ Issue template renderer (`buildIssueTitle` + `buildIssueBody` — markdown sections with metadata)
  - ✅ Label auto-tagging logic (`resolveLabels` — ADR-006: type label + `beta-feedback`)
  - ✅ Repository resolution from API key (ADR-005: server-side routing via `config.github`)
  - ✅ Error handling + logging (structured `GitHub API error (status)` with parsed message)
  - ✅ `POST /api/feedback` endpoint functional (calls `createGitHubIssue`)
  - ✅ Bonus: `getReleases()` + `getRoadmap()` also implemented (supports TASK-009/011)
  - ✅ `GITHUB_TOKEN` validation on every endpoint (500 if missing)
  - ✅ Security review PASS (`resources/security-reports/task-005-006-security-review.md`)
- **Test coverage:** Integration path exercised by TASK-005 tests (502 with test creds proves code executes)
- **Record:** `.ai/tasks/items/TASK-006-github-integration.md`

### TASK-007: Demo App Implementation
- **Status:** Complete
- **Priority:** Medium
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-28
- **Dependencies:** TASK-003
- **Scope:** Build demo application showcasing SDK integration
- **Features:**
  - Vite + React 18 app
  - FeedbackProvider configured with live API settings
  - Multiple pages/routes to demonstrate route capture
  - Example styling for FeedbackButton and FeedbackModal
  - Live submission to deployed Worker endpoint
- **Deliverables:**
  - ✅ `apps/demo-app/` fully functional (Vite 6 + React 18 + TypeScript)
  - ✅ SDK integrated via workspace reference (`@nb-feedback-kit/react-sdk: workspace:*`)
  - ✅ All feedback types functional (bug, feature, feedback)
  - ✅ Form validation working (title + description required)
  - ✅ Metadata capture visible (route changes reflected in real time)
  - ✅ Multi-page routing demonstrating route capture (`/`, `/features`, `/about` via `useRouter.ts`)
  - ✅ README with setup instructions (89 lines, covers API start, secrets, config, pages)
  - ✅ Build verified (`pnpm build` → 32 modules, 166.67 KB / 52.45 KB gzip)
- **Record:** `.ai/tasks/items/TASK-007-demo-app.md`

### TASK-008: SDK-to-API Integration
- **Status:** Complete
- **Priority:** High
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-28
- **Dependencies:** TASK-003, TASK-006
- **Scope:** Wire SDK feedback submission to live API endpoint
- **Features:**
  - Fetch API integration
  - API key header transmission
  - Loading states
  - Success/error handling
  - User feedback (toast/notification)
- **Deliverables:**
  - ✅ `submitFeedback()` function calls API (`POST /api/feedback`)
  - ✅ API key passed via `X-API-Key` header
  - ✅ Loading states during submission (modal disables buttons, shows "Submitting...")
  - ✅ Success message on 201 response (alert + console log)
  - ✅ Error handling for network/API failures (`FeedbackSubmitError` thrown → inline banner)
  - ✅ Demo app wired to submit to deployed Worker endpoint
- **Record:** `.ai/tasks/items/TASK-008-sdk-api-integration.md`

### TASK-009: Release Notes Feature (API)
- **Status:** Complete
- **Priority:** Medium
- **Owner:** NB-Backend-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-28
- **Dependencies:** TASK-006
- **Scope:** Implement GitHub Releases retrieval endpoint
- **Features:**
  - `GET /api/releases` endpoint (auth via `X-API-Key`, repo routed server-side)
  - Fetch releases from GitHub Releases API
  - Pass through release body markdown
  - Return structured release data
- **Deliverables:**
  - ✅ `/api/releases` endpoint functional (`packages/api/src/index.ts`)
  - ✅ Repository resolution from API key (ADR-005 server-side routing)
  - ✅ GitHub Releases API integration (`getReleases()` in `github/client.ts`)
  - ✅ Response format defined in shared-types (`ReleaseNote` — added optional `url`)
  - ✅ Error handling for GitHub API failures (502 with structured error)
- **Record:** `.ai/tasks/items/TASK-009-release-notes-api.md`

### TASK-010: Release Notes Feature (SDK)
- **Status:** Complete
- **Priority:** Medium
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-28
- **Dependencies:** TASK-009
- **Scope:** Build ReleaseNotesModal component and hook
- **Features:**
  - `useReleaseNotes()` hook
  - `ReleaseNotesModal` headless component
  - Fetch releases from API
  - Display version, date, notes
- **Deliverables:**
  - ✅ `useReleaseNotes()` fetches from API (`packages/react-sdk/src/hooks/useReleaseNotes.ts`)
  - ✅ `ReleaseNotesModal` component (`packages/react-sdk/src/components/ReleaseNotesModal.tsx`)
  - ✅ Release list rendering (version badge, date, body)
  - ✅ Plain-text body rendering (whiteSpace: pre-wrap; markdown rendering deferred post-MVP)
  - ✅ Demo app shows release notes (Nav button → `useReleaseNotes` → `ReleaseNotesModal`)
  - ✅ Link to GitHub release when `url` present (delivered with TASK-009 contract fix)
  - ✅ Exported from SDK `index.ts`
- **Record:** `.ai/tasks/items/TASK-010-release-notes-sdk.md`

### TASK-011: Roadmap Feature (API)
- **Status:** Complete
- **Priority:** Low
- **Owner:** NB-Backend-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-28
- **Dependencies:** TASK-006
- **Scope:** Implement roadmap endpoint (GitHub Issues with labels)
- **Features:**
  - `GET /roadmap?repository={key}` endpoint
  - Filter issues by labels: planned, in-progress, released
  - Return structured roadmap data
- **Deliverables:**
  - ✅ `/roadmap` endpoint functional
  - ✅ Issue filtering by roadmap labels
  - ✅ Response format defined in shared-types
  - ✅ Pagination support (optional)
- **Record:** `.ai/tasks/items/TASK-011-roadmap-api.md`

### TASK-012: Roadmap Feature (SDK)
- **Status:** Complete
- **Priority:** Low
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Completed:** 2026-06-28
- **Dependencies:** TASK-011
- **Scope:** Build RoadmapModal component and hook
- **Features:**
  - `useRoadmap()` hook
  - `RoadmapModal` headless component
  - Display items by status (Planned, In Progress, Released)
- **Deliverables:**
  - ✅ `useRoadmap()` fetches from API
  - ✅ `RoadmapModal` component
  - ✅ Roadmap items grouped by status
  - ✅ Demo app shows roadmap
- **Record:** `.ai/tasks/items/TASK-012-roadmap-sdk.md`

### TASK-014: Storage-Provider Agnosticism (S3-Compatible + CORS Guide)
- **Status:** Complete
- **Priority:** High
- **Owner:** NB-Backend-Specialist + NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-07-05
- **Completed:** 2026-07-06
- **Dependencies:** TASK-008
- **Scope:** Make the feedback kit storage-provider agnostic so app developers can configure S3-compatible providers (AWS S3, Cloudflare R2, MinIO, Backblaze B2) alongside the existing `none` and `custom` providers. Cloud credentials stay server-side as Worker secrets; the SDK receives a short-lived SigV4 presigned PUT URL and uploads bytes directly to the bucket. Zero new npm dependencies.
- **Decision:** ADR-008 (Worker-issued presigned URLs) — `memory/project-decisions.md`.
- **Deliverables:**
  - ✅ `packages/api/src/storage/sigv4.ts` — Zero-dep SigV4 presigned-URL signer (Web Crypto API).
  - ✅ `packages/api/src/storage/presign.ts` — `POST /api/uploads/presign` route (auth + rate limiting + `S3_ALLOWED_BUCKETS` allowlist).
  - ✅ `packages/api/src/storage/sigv4.test.ts` — 16 SigV4 tests.
  - ✅ `packages/react-sdk/src/storage/providers/s3.ts` — `S3StorageProvider` (presign → PUT → `UploadedFile`).
  - ✅ `packages/react-sdk/src/storage/types.ts` — Added `S3Config`; extended `StorageProviderConfig` union.
  - ✅ `packages/react-sdk/src/storage/index.ts` — Added `s3` branch + `createStorageProvider`.
  - ✅ `packages/react-sdk/src/storage/test-connection.ts` — S3 probe (presign, no bytes written).
  - ✅ `packages/react-sdk/src/components/StorageConfigPanel.tsx` — S3 config form (bucket, region, endpoint, key prefix).
  - ✅ `packages/shared-types/src/index.ts` — `PresignRequest` / `PresignResponse` contracts.
  - ✅ `packages/api/S3_CORS_CONFIGURATION.md` — Operator CORS setup guide (AWS S3, R2, MinIO, B2) + public-read bucket policy + verification checklist (2026-07-06).
  - ✅ `resources/api-reference.md` — Documented `POST /api/uploads/presign`.
- **Test coverage:** 46/46 pass (30 existing + 16 SigV4). Typecheck passes all 4 packages.
- **Record:** `memory/tasks/handoff-2026-07-05-storage-provider-agnostic.md`

### TASK-013: Changesets + Release Automation
- **Status:** Complete
- **Priority:** Medium
- **Owner:** NB-Backend-Specialist + NB-DevOps-Engineer
- **Type:** Infrastructure
- **Created:** 2026-06-16
- **Completed:** 2026-06-28
- **Dependencies:** TASK-001, TASK-003, TASK-006
- **Scope:** Set up Changesets for independent package versioning
- **Features:**
  - Changesets CLI integration
  - Version bump workflow
  - CHANGELOG generation
  - npm publish preparation (for future)
- **Deliverables:**
  - ✅ `.changeset/` directory configured
  - ✅ Changeset workflow documented
  - ✅ `pnpm changeset` command functional
  - ✅ `pnpm changeset version` bumps packages independently
  - ✅ CI/CD pipeline placeholder (manual releases for MVP)
- **Record:** `.ai/tasks/items/TASK-013-changesets-setup.md`

---

## Work Item Records

See `memory/tasks/items/` for detailed records of each work item.

---

## WIP Limits Compliance

- Discovery: 0/3 ✅
- In Development: 0/1 ✅
- Review: 0/2 ✅
- Testing: 0/2 ✅

---

## Project Health

**Delivery Risk:** Low — project is in setup phase, architecture decisions finalized via NB-Grill.

**Active Blockers:** `@nb-feedback-kit/core-sdk` is not yet available to external developers — TASK-015 (resolve `workspace:*` dependency) blocks TASK-016 (npm publish).

**Documentation Status:** 
- Project definition ✅
- Architecture decisions confirmed ✅
- AGENTS.md requires placeholder population (post-TASK-001)
- Standards to be populated as work begins

**Test Infrastructure:** To be established (see TASK-003, TASK-006 acceptance criteria).

**Security Posture:** Architecture designed with security-first principles (API key auth, rate limiting, secure GitHub PAT storage).

---

## Phase Mapping

Tasks are organized by the 10 phases from project definition:

| Phase | Tasks | Status |
|-------|-------|--------|
| **Infrastructure** | TASK-001 | Ready |
| **Phase 1: SDK Foundation** | TASK-002, TASK-003 | To Be Started |
| **Phase 2: Context Capture** | TASK-002 (included) | To Be Started |
| **Phase 3: API Communication** | TASK-008 | To Be Started |
| **Phase 4: Backend API** | TASK-004, TASK-005 | To Be Started |
| **Phase 5: GitHub Integration** | TASK-006 | To Be Started |
| **Phase 6: GitHub Labels** | TASK-006 (included) | To Be Started |
| **Phase 7: Release Notes** | TASK-009, TASK-010 | To Be Started |
| **Phase 8: Roadmap** | TASK-011, TASK-012 | To Be Started |
| **Phase 9: Screenshots** | TASK-014 | Complete |
| **Phase 10: Multi-Project** | TASK-005, TASK-006 (included) | To Be Started |

---

## Deferred Features (Post-MVP)

The following features from the project definition are deferred until post-MVP:

- ~~**Screenshot Upload** (Phase 9)~~ — **Delivered in TASK-014** (S3-compatible providers + presigned URLs; R2 supported via S3 API)
- **Feature Voting** — Requires additional API endpoints and UI
- **User Feedback Portal** — Separate web application
- **AI Categorization** — Requires LLM integration
- **AI Deduplication** — Requires vector search or similarity detection

---

## Success Criteria (MVP)

The MVP is considered complete when:

1. ✅ SDK can be installed in a React application
2. ✅ Feedback submission creates GitHub Issues
3. ✅ Release notes can be displayed from GitHub Releases
4. ✅ Multiple applications can share the API (multi-project support)
5. ✅ GitHub credentials never exposed to clients
6. ✅ Demo app demonstrates all core features
7. ✅ Documentation is complete

---

## Post-MVP: Framework-Agnostic SDK

The original 14 MVP tasks are complete. Five follow-up tasks (TASK-015 → TASK-019) track the work needed to publish and support the new framework-agnostic `@nb-feedback-kit/core-sdk`, created during the FreeToolWorks integration session (2026-07-07). These are currently in "To Be Started".
