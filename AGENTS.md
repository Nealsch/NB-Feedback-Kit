# AGENTS.md

## Project Overview
**Purpose:** NB-Feedback-Kit is a drop-in, MIT-licensed feedback collection system for React applications — bug reports, feature requests, and feedback are submitted from a headless React SDK, routed through a Cloudflare Worker API, and persisted as GitHub Issues, with GitHub Releases and a label-based roadmap surfaced back to end users.

**Key Business Constraints:**
- **Server-Side GitHub Token Isolation:** The GitHub PAT (`GITHUB_TOKEN`) must never reach the client. It lives only as a Worker secret and is used server-side by the API to call the GitHub REST API. Clients authenticate with a rotating `X-API-Key` mapped to repo coordinates via Workers KV.
- **Client-Side Screenshot Upload:** Screenshot upload is performed entirely client-side by the SDK's `StorageProvider`. The Worker never receives or stores screenshot bytes. Host apps configure a custom HTTP endpoint via `StorageConfigPanel`; the SDK uploads directly to it and attaches the returned URL to the feedback payload. The Worker's only screenshot-related responsibility is sanitizing the attachment URLs in `sanitizeAttachments` before interpolating them into the GitHub issue body.
- **Per-Key Rate Limiting:** All `/api/*` routes enforce per-API-key rate limits via the `RateLimiter` Durable Object. Rate-limit logic must remain isolated in the DO — do not inline counters into route handlers.
- **Attachment Sanitization:** Client-supplied attachment URLs are rebuilt from validated primitives server-side before interpolation into the GitHub issue body. Only `http`/`https` URLs are allowed; attachment count is capped at 5; fields are length-trimmed. Never disable or bypass `sanitizeAttachments`.
- **Storage Provider Abstraction:** The issue provider (GitHub) only ever receives `UploadedFile` URLs — never raw image bytes. Storage providers must implement the `StorageProvider` interface and never leak provider-specific details into the SDK's public API.
- **Auth-Protected API Surface:** `GET /health` and `GET /` are the only unauthenticated routes. Every state-changing or data-returning endpoint sits under `/api/*` behind `createAuthMiddleware`.

**Critical Success Criteria:**
- **End-to-End Feedback Flow:** A user can click a feedback button, fill a form, optionally attach a screenshot, and a GitHub Issue is created with correct labels (`bug`/`feature`/`feedback`) and a rendered metadata table.
- **Screenshot Attachment Flow:** When a storage provider is configured, a selected screenshot is uploaded client-side to the configured endpoint and the returned URL is embedded as a Markdown image in the created GitHub issue.
- **Release Notes & Roadmap:** `GET /api/releases` returns versioned release notes and `GET /api/roadmap` returns label-driven roadmap items, both rendered by the SDK modals.
- **Zero Client-Side Secrets:** The published SDK bundle contains no embedded tokens, API keys, or GitHub credentials.
- **Headless Portability:** SDK components render without built-in styles so any host app can adopt them without visual conflicts.

---

## Tech Stack
- **Frontend:** React 18 + TypeScript 5.7 (headless components, inline-minimal styles, className passthrough)
- **State Management:** React Context (`FeedbackProvider`) — no external state library
- **Backend:** Cloudflare Workers + Hono ^4.6.14 (TypeScript)
- **Storage:** Workers KV (API-key → repo mapping), Durable Objects (per-key rate limiting). No relational database, no object storage (R2 is not currently bound).
- **Issue/Release Source:** GitHub REST API (Issues, Releases, label-based roadmap)
- **Screenshot Storage:** Client-side only via `StorageProvider` (`NoneStorageProvider` or `CustomEndpointProvider`). The Worker does not handle screenshot bytes.
- **Testing:** Vitest (API uses `@cloudflare/vitest-pool-workers`; SDK has `__tests__`); PowerShell smoke script (`packages/api/smoke-feedback.ps1`) for the feedback flow
- **Infrastructure:** Cloudflare Workers (serverless), pnpm workspaces + Turborepo (monorepo orchestration), tsup (package builds — CJS + ESM + `.d.ts`)
- **Monitoring:** Not yet decided (no Sentry/PostHog/Datadog integration — candidate for future work)

---

## Repository Structure
- `/apps/demo-app` = Reference integration (Vite + React 18) demonstrating SDK usage
- `/packages/api` = Cloudflare Worker API (Hono routes: `/api/feedback`, `/api/releases`, `/api/roadmap`; GitHub client; auth middleware; `RateLimiter` Durable Object; `sanitizeAttachments`)
- `/packages/react-sdk` = Headless React components, hooks, client-side storage providers (`none` + `custom-endpoint`), metadata utils, `StorageConfigPanel` UI
- `/packages/shared-types` = Shared TypeScript contracts (`FeedbackPayload`, `FeedbackResponse`, `UploadedFile`, `ReleaseNote`, `RoadmapItem`, etc.)
- `/memory` = Local project documentation and permanent architectural decision logs
- `/resources` = Project-specific registers and inventories (architecture, API, schema, risks, tech debt, tests, security)
- `/standards` = Project-specific standards that specialise/override the general `.clinerules/` standards

---

## Architectural Rules

**See `.clinerules/architecture/core-principles.md` for complete architectural guidance.**

Key principles:
- **Separation of Concerns:** The SDK is headless (presentation only) and owns client-side screenshot upload via the `StorageProvider` abstraction; the Worker owns auth, rate limiting, sanitization, and GitHub orchestration; `shared-types` owns cross-package contracts.
- **Dependency Direction:** Dependencies flow inward (SDK UI → SDK hooks/services → `shared-types` contracts ← API routes → GitHub client). The `shared-types` package has no runtime dependencies and depends on nothing.
- **Server-Side Secret Boundary:** GitHub credentials live only in Worker secrets/bindings. Clients only ever hold a rotating `X-API-Key`.
- **Client-Side Storage Boundary:** The Worker never receives screenshot bytes. Storage providers upload directly from the browser to a host-configured endpoint and return a URL that is later validated (not re-uploaded) by the Worker.
- **Discriminated-Union Extensibility:** New storage providers are added by extending the `StorageProviderConfig` union in `packages/react-sdk/src/storage/types.ts` and adding a branch to the exhaustive `switch` in `createStorageProvider`. The `never` guard makes an unhandled branch a compile error.
- **Auth-Protected Route Prefix:** `GET /health` and `GET /` are the only unauthenticated routes. Everything under `/api/*` must pass through `createAuthMiddleware`.
- **Modification Rules:** Prefer extending existing configurations over creating new paradigms; avoid duplicating logic. Extend the storage-provider union rather than forking the upload path.
- **Safety:** Never disable `createAuthMiddleware` on `/api/*` routes. Never expose `GITHUB_TOKEN` to the client. Never bypass `sanitizeAttachments`. Never render client-supplied URLs in the issue body without the `http`/`https` scheme check.

---

## Coding Workflow

**See `.clinerules/agent-behavior.md` for detailed behavioral guidelines.**
**See [`standards/git-workflow.md § Coding Session Lifecycle`](standards/git-workflow.md) for the full enforcement policy.**

The workflow is a **session-scoped lifecycle**, not a per-task commit cycle. Steps 0 and 7 are triggered by explicit user instructions; Steps 1–6 repeat per task within a session.

### Step 0 — Session Start
**Trigger:** Explicit user instruction that a coding session is beginning (e.g., "let's start coding", "begin session").

1. Read handoff files — check `memory/tasks/` for the latest handoff document from the previous session.
2. Read the project board (`memory/tasks/project-board.md`) — understand current Kanban state, what's in progress, what's blocked, what's next.
3. Read `active-task.md` — review the last session's summary and hand-off notes.
4. Confirm the task to work on with the user if ambiguous.

### Step 1 — Before Coding
1. Read relevant files completely.
2. **Invoke `NB-Context-Loader`** — initialize project context, load only the required information, and detect ambiguity. This skill determines whether clarification is needed before proceeding.
3. **If ambiguity is detected, invoke `NB-Grill`** — structured discovery session to challenge assumptions, sharpen terminology, validate requirements, and establish shared understanding. Do not proceed to implementation until critical requirements are clear.
4. **Invoke `NB-Task-Router`** — classify the work and route to the most appropriate specialist skill based on domain, complexity, and system context. This determines which specialist skill(s) to consult for implementation.
5. Identify architectural boundaries — specifically the **server-side secret boundary** (GitHub PAT isolation), the **auth-protected `/api/*` prefix**, the **client-side storage boundary** (Worker never handles screenshot bytes), the **storage-provider abstraction** (GitHub must only receive `UploadedFile` URLs), and the **attachment-sanitization boundary** (`sanitizeAttachments` before issue-body interpolation).
6. Explain intended approach.
7. Identify possible downstream effects — on **rate-limit behavior** (DO state), **GitHub issue formatting** (Markdown body rendered by GitHub), and **published SDK bundle** (no secrets may ship).

### Step 2 — During Coding
1. Make surgical, scoped changes (see `.clinerules/agent-behavior.md § 3`).
2. Preserve backward compatibility across the **SDK public exports** (`FeedbackProvider`, `useFeedback`, `useSubmitFeedback`, `FeedbackButton`, `FeedbackModal`, `StorageConfigPanel`, storage providers) and the **API contract** (`FeedbackPayload`/`FeedbackResponse` shapes, route paths, `X-API-Key` auth).
3. Add structured logging around **screenshot upload outcomes** (client-side, in the SDK), **GitHub issue creation** (issue URL, app name), **auth failures** (key prefix only, never the full key), and **rate-limit rejections**.
4. Avoid speculative refactors of the storage-provider abstraction or the GitHub issue-body formatter.

### Step 3 — After Coding: Verify & Impact Review
1. Run `pnpm turbo run test typecheck` from the repo root (runs Vitest + `tsc --noEmit` across all packages).
2. Run linting and type checks (`pnpm turbo run typecheck` at minimum).
3. Verify affected UI components and **critical flows** (feedback submission → GitHub Issue creation; screenshot upload via configured storage provider → URL attached to issue; releases/roadmap fetch) manually, or via `packages/api/smoke-feedback.ps1`.
4. Summarize changes and risks.
5. **Invoke `NB-Security-Engineer`** — assess security impact (auth boundaries, input validation, secret exposure, injection risks, PII handling). Security concerns must be documented and either resolved or accepted as risks before proceeding.
6. **Invoke `NB-DevOps-Engineer`** — assess deployment/infrastructure impact (Worker secrets, `wrangler.toml` bindings (KV/DO), `pnpm` workspace deps). Infrastructure changes must be documented.

### Step 4 — Do NOT Commit Per Task
> **Standing rule:** Do not commit after each coding task. Changes accumulate across the session and are committed once at session end (Step 7). This keeps the commit history clean with one meaningful commit per session rather than fragmented per-task commits.

If the user explicitly requests a mid-session commit, use the command pattern defined in Step 7.

### Step 5 — Continue to Next Task or Proceed to Documentation
If the session continues with more tasks, loop back to Step 1 for the next task. Board updates and documentation are deferred to Step 6 (batch documentation at end of session). If no more tasks remain, proceed to Step 6.

### Step 6 — Document & Report via NB-Project-Admin
**Use the `NB-Project-Admin` skill** to handle all project documentation for the session's work:

1. **Update the project board** (`memory/tasks/project-board.md`):
   - Move completed tasks to the Done column.
   - Update item files (`memory/tasks/items/`) with status, dates, and implementation notes.
   - Record any new tasks, bugs, risks, or tech debt discovered during the session.
2. **Update `active-task.md`** — session summary with what was done and next steps.
3. **Report via `attempt_completion`** (for each completed task or at session end) — describe actual work (not just git mechanics), include verification results, and end with next three tasks in priority order.

See [`standards/git-workflow.md § Documentation & Reporting`](standards/git-workflow.md) for the full policy.

### Step 7 — Session End: Handoff & Commit
**Trigger:** Explicit user instruction to end the coding session (e.g., "end session", "wrap up", "we're done for today").

1. **Invoke the `NB-Handoff` skill** — creates a structured handoff file in `memory/tasks/` capturing:
   - Decisions made this session.
   - Project memory updates.
   - Session summary (what was done, what's next, blockers).
2. **Commit once** — stage all session changes and commit using the handoff summary as the commit message:
   ```bash
   git add -A && git commit -m "<type>(<scope>): <handoff-subject>" --no-verify
   ```
   - Always use `git commit -m` (never bare `git commit` — opens editor, hangs terminal).
   - Always append `--no-verify` (skips background linters/hooks that block `cmd.exe`).
   - The message should summarize the session's work, drawn from the handoff.

See [`standards/git-workflow.md § Session-End Commit Command`](standards/git-workflow.md) for the full policy.

---

## Skill Usage

The following skills must be consulted at specific points in the workflow. Failure to invoke the required skills at the required time is a process violation.

### Pre-Task (Step 1 — Mandatory)

| Skill | When | Purpose |
|-------|------|---------|
| `NB-Context-Loader` | Start of every task | Initialize context, load only required info, detect ambiguity |
| `NB-Grill` | Only if `NB-Context-Loader` detects ambiguity | Structured discovery/clarification |
| `NB-Task-Router` | After context loaded + ambiguity resolved | Classify work, route to specialist skill |

### Specialist Skills (Routed by `NB-Task-Router`)
| Skill | Domain |
|-------|--------|
| `NB-Backend-Specialist` | Cloudflare Workers + Hono routes, GitHub REST client, auth middleware, rate-limit DO, `sanitizeAttachments` |
| `NB-Frontend-Web-Specialist` | React 18 SDK — headless components, hooks, client-side storage providers, metadata utils, tsup build |
| `NB-QA-Engineer` | Testing standards, test matrix, regression coverage, smoke-script maintenance |

> **Note:** No relational database or object storage is used (KV + DO only), so `NB-PostgreSQL-Architect` does not apply.

### Mandatory Impact Review (Step 3 — After ALL code changes)

| Skill | Scope |
|-------|-------|
| `NB-Security-Engineer` | Auth (`X-API-Key`, KV lookup), attachment sanitization, secret isolation (GitHub PAT), injection risks in issue body — must resolve or accept risks |
| `NB-DevOps-Engineer` | Worker secrets, `wrangler.toml` bindings (KV/DO), `pnpm` workspace deps, Turborepo pipeline, Wrangler deploy |

### Session Lifecycle

| Skill | Step | Purpose |
|-------|------|---------|
| `NB-Project-Admin` | Step 6 | Board updates, item files, active-task, new tasks/risks/debt |
| `NB-Handoff` | Step 7 | Record decisions, update memory, produce handoff summary |
| `NB-Solution-Analyst` | When onboarding to inherited codebase | Reverse-engineer architecture, APIs, data, integrations |

---

## Testing Requirements

**See `.clinerules/testing.md` for complete testing standards.**

Summary:
- All changes affecting validation logic must include happy path, edge case (invalid feedback type, malformed attachment URL, non-image content type), and failure case (GitHub API failure, KV auth miss, rate-limit rejection) tests.
- The **API↔GitHub integration** and the **attachment-sanitization path** require mandatory integration coverage and regression protection — these are security-critical and must not regress silently.
- Smoke-test scripts via `packages/api/smoke-feedback.ps1` must verify the critical user pathway: **FeedbackButton → FeedbackModal → POST /api/feedback → GitHub Issue created** (and optionally **screenshot upload → configured endpoint → URL attached to issue**).
- Component-level styling and visual regression testing are deferred post-MVP — the SDK is headless and host-styled.
- Before merge: all tests pass (`pnpm turbo run test`), linting passes, type checks pass (`pnpm turbo run typecheck`), security checks pass.

---

## Debugging Protocol

When debugging:
1. Reproduce issue (utilizing diagnostic tools like `wrangler tail` for Worker logs, the `smoke-feedback.ps1` script for end-to-end repro, and the `Test Connection` probe in `StorageConfigPanel` for storage issues).
2. Identify root cause.
3. Explain failing assumption — common failure modes in this project are **CORS misconfiguration on client-side storage uploads** (custom endpoints), **GitHub PAT permission gaps** (missing `issues: write` / `contents: read`), **KV key-mapping drift** (API key not mapped to the right repo), and **storage endpoint misconfiguration** (wrong URL, wrong response path, missing auth headers).
4. Verify fix minimally.
5. Confirm no regression introduced — especially to **existing issue-body formatting**, **attachment sanitization**, and **rate-limit correctness**.

Never:
- apply speculative fixes to the GitHub issue-body formatter or the attachment-sanitization chain
- rewrite unrelated modules
- suppress error states without explanation — particularly inside the GitHub-client response handling

---

## Performance Expectations
- Avoid unnecessary GitHub REST calls during feedback submission — one `createGitHubIssue` per request, no batching.
- Minimize frontend re-renders during feedback form entry and modal open/close.
- Keep the published SDK bundle small — the SDK has only one runtime dependency (`shared-types`); do not add heavy libraries.
- Enforce mobile view optimization via mobile-first layout rules in the demo app and any host integration.
- Do not optimize without measuring; profile first to identify bottlenecks (use `wrangler tail`, Worker analytics, and React DevTools).

---

## Documentation Rules

**Project Documentation Location:** All project-specific documentation belongs in `memory/` folder for that project.

**Exception:** If a lesson learned could benefit all future projects, update the appropriate `.clinerules/` file or AGENTS.md instead.

Update documentation when:
- architecture changes
- the API surface changes (new routes, changed `FeedbackPayload`/`FeedbackResponse` shapes, new storage-provider branches)
- the SDK public exports change
- `wrangler.toml` bindings change (new KV/DO namespaces)
- workflows change
- deployment changes
- significant decisions are made
- new patterns or standards are established

**Documentation Format:**
Documentation must explain the WHY, not just the WHAT.

Include:
- Context: Why was this decision made?
- Rationale: What problem does this solve?
- Constraints: What tradeoffs were considered?
- Examples: How should this be used?
- Maintenance: How will this be kept up to date?

---

## Decision Logging
Major technical decisions must be recorded in:
`memory/project-decisions.md`

Format:
- context
- decision
- alternatives considered
- consequences

---

## Definition of Done
A task is complete only if:
- implementation works on modern desktop and mobile web browsers (the SDK is browser-targeted; the Worker is edge-runtime-targeted)
- tests (`pnpm turbo run test` — Vitest) pass
- linting passes
- type checks pass (`pnpm turbo run typecheck`)
- security checks pass — specifically `sanitizeAttachments` integrity, `X-API-Key` enforcement on `/api/*`, and no client-side secret leakage
- architecture rules followed (server-side secret boundary, client-side storage boundary, storage-provider abstraction, auth-protected route prefix)
- documentation updated
- no critical regressions identified