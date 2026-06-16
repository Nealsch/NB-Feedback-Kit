# Project Board — NB Feedback Kit

## Kanban Status

| Step | Limit | Items |
|------|-------|-------|
| Step 0 - To Be Started | ∞ | TASK-005, TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013 |
| Step 1 - Discovery | 3 | |
| Step 2 - Ready | ∞ | |
| Step 3 - In Development | 1 | |
| Step 4 - Review | 2 | |
| Step 5 - Testing | 2 | |
| Step 6 - Complete | ∞ | TASK-001, TASK-002, TASK-003, TASK-004 |

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
- **Status:** To Be Started
- **Priority:** High
- **Owner:** NB-Backend-Specialist + NB-Security-Engineer (review)
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Dependencies:** TASK-004
- **Scope:** Implement API key authentication and Durable Objects rate limiting
- **Security Requirements:**
  - API keys stored in Cloudflare KV (`API_KEYS` namespace)
  - Durable Objects for per-key rate limiting (10-30 req/min)
  - Repository routing via API key mapping
- **Deliverables:**
  - ✅ API key validation middleware
  - ✅ Cloudflare KV integration
  - ✅ Durable Object rate limiter implementation
  - ✅ Per-key rate limit enforcement
  - ✅ 401 response for invalid keys
  - ✅ 429 response for rate limit exceeded
  - ✅ Security review completed by NB-Security-Engineer
- **Record:** `.ai/tasks/items/TASK-005-api-auth-rate-limiting.md`

### TASK-006: GitHub Integration Layer
- **Status:** To Be Started
- **Priority:** High
- **Owner:** NB-Backend-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Dependencies:** TASK-005
- **Scope:** Implement GitHub API client and issue creation logic
- **Features:**
  - GitHub PAT stored as Cloudflare Worker secret
  - Repository routing from API key mapping
  - Issue creation with formatted body (description + metadata)
  - Automatic label application (bug/feature-request/feedback + beta-feedback)
  - Error handling for GitHub API failures
- **Deliverables:**
  - ✅ GitHub API client module
  - ✅ Issue template renderer
  - ✅ Label auto-tagging logic
  - ✅ Repository resolution from API key
  - ✅ Error handling + logging
  - ✅ `POST /feedback` endpoint functional
- **Record:** `.ai/tasks/items/TASK-006-github-integration.md`

### TASK-007: Demo App Implementation
- **Status:** To Be Started
- **Priority:** Medium
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Dependencies:** TASK-003
- **Scope:** Build demo application showcasing SDK integration
- **Features:**
  - Vite + React 18 app
  - FeedbackProvider configured with mock/dev settings
  - Multiple pages/routes to demonstrate route capture
  - Example styling for FeedbackButton and FeedbackModal
  - Mock submission (console log) until API deployed
- **Deliverables:**
  - ✅ `apps/demo-app/` fully functional
  - ✅ SDK integrated via workspace reference
  - ✅ All feedback types functional
  - ✅ Form validation working
  - ✅ Metadata capture visible in console
  - ✅ README with setup instructions
- **Record:** `.ai/tasks/items/TASK-007-demo-app.md`

### TASK-008: SDK-to-API Integration
- **Status:** To Be Started
- **Priority:** High
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Dependencies:** TASK-003, TASK-006
- **Scope:** Wire SDK feedback submission to live API endpoint
- **Features:**
  - Fetch API integration
  - API key header transmission
  - Loading states
  - Success/error handling
  - User feedback (toast/notification)
- **Deliverables:**
  - ✅ `submitFeedback()` function calls API
  - ✅ API key passed via header
  - ✅ Loading states during submission
  - ✅ Success message on 201 response
  - ✅ Error handling for network/API failures
  - ✅ Demo app submits to deployed Worker
- **Record:** `.ai/tasks/items/TASK-008-sdk-api-integration.md`

### TASK-009: Release Notes Feature (API)
- **Status:** To Be Started
- **Priority:** Medium
- **Owner:** NB-Backend-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Dependencies:** TASK-006
- **Scope:** Implement GitHub Releases retrieval endpoint
- **Features:**
  - `GET /releases?repository={key}` endpoint
  - Fetch releases from GitHub API
  - Parse release body markdown
  - Return structured release data
- **Deliverables:**
  - ✅ `/releases` endpoint functional
  - ✅ Repository resolution from API key
  - ✅ GitHub Releases API integration
  - ✅ Response format defined in shared-types
  - ✅ Error handling for missing releases
- **Record:** `.ai/tasks/items/TASK-009-release-notes-api.md`

### TASK-010: Release Notes Feature (SDK)
- **Status:** To Be Started
- **Priority:** Medium
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
- **Dependencies:** TASK-009
- **Scope:** Build ReleaseNotesModal component and hook
- **Features:**
  - `useReleaseNotes()` hook
  - `ReleaseNotesModal` headless component
  - Fetch releases from API
  - Display version, date, notes
- **Deliverables:**
  - ✅ `useReleaseNotes()` fetches from API
  - ✅ `ReleaseNotesModal` component
  - ✅ Release list rendering
  - ✅ Markdown rendering support (or plain text)
  - ✅ Demo app shows release notes
- **Record:** `.ai/tasks/items/TASK-010-release-notes-sdk.md`

### TASK-011: Roadmap Feature (API)
- **Status:** To Be Started
- **Priority:** Low
- **Owner:** NB-Backend-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
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
- **Status:** To Be Started
- **Priority:** Low
- **Owner:** NB-Frontend-Web-Specialist
- **Type:** Feature Development
- **Created:** 2026-06-16
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

### TASK-013: Changesets + Release Automation
- **Status:** To Be Started
- **Priority:** Medium
- **Owner:** NB-Backend-Specialist + NB-DevOps-Engineer
- **Type:** Infrastructure
- **Created:** 2026-06-16
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

**Active Blockers:** None.

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
| **Phase 9: Screenshots** | Deferred (Future) | — |
| **Phase 10: Multi-Project** | TASK-005, TASK-006 (included) | To Be Started |

---

## Deferred Features (Post-MVP)

The following features from the project definition are deferred until post-MVP:

- **Screenshot Upload** (Phase 9) — Requires Cloudflare R2 integration
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

## Last Updated
2026-06-16 (Initial project board created by NB-Project-Admin)
