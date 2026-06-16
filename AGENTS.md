# AGENTS.md

<!--
  PURPOSE: Project entry point and tech-stack summary for AI agents.
  This file is the FIRST thing an agent reads when starting work on a project.

  INSTRUCTIONS FOR USE:
  1. Copy this file to your project root as `AGENTS.md`
  2. Replace all [PLACEHOLDER: ...] markers with your project's specifics
  3. Delete any sections that don't apply to your project
  4. Delete this HTML comment block once populated

  This template is intentionally verbose. Remove what you don't need.
  A shorter, accurate AGENTS.md is better than a long, vague one.
-->

## Project Overview
**Purpose:** [PLACEHOLDER: One-sentence description of what this project is and does. Be specific — name the problem domain, the primary users, and the core value proposition.]

**Key Business Constraints:**
<!--
  List the non-negotiable rules the system must enforce.
  These are constraints that, if violated, constitute a critical bug.
  Format each as a bullet with a bold name and a clear explanation.

  Examples of constraint categories:
  - Authentication / Authorization model
  - Data isolation requirements (multi-tenant, user-scoped, etc.)
  - Financial / billing invariants (ledger accuracy, pre-deduction, etc.)
  - Data privacy boundaries (PII handling, anonymization, etc.)
  - Domain-specific business rules (grading models, workflow states, etc.)
  - Storage / retention policies
-->
- **[PLACEHOLDER: Constraint Name]:** [PLACEHOLDER: Description of the constraint and why it exists]

**Critical Success Criteria:**
<!--
  List the measurable outcomes that define project success.
  These should be testable assertions, not aspirations.
  If a criterion cannot be tested, reword it until it can be.
-->
- **[PLACEHOLDER: Criterion Name]:** [PLACEHOLDER: Description of what must be true for this criterion to be met]

---

## Tech Stack
<!--
  List the concrete technologies chosen for each layer.
  Be specific about versions if a particular version is required.
  If a decision was made via an ADR, reference it.

  Keep the categories that apply; delete those that don't.
  Add categories as needed (e.g., "Mobile", "Desktop", "CLI", "AI/ML").
-->
- **Frontend:** [PLACEHOLDER: Framework + UI library + styling approach — e.g., React / Next.js + Shadcn/ui + Tailwind CSS]
- **State Management:** [PLACEHOLDER: e.g., Zustand, Redux Toolkit, React Context — or "N/A (server-rendered)"]
- **Backend:** [PLACEHOLDER: Framework + language — e.g., NestJS + TypeScript, Express + Node.js, FastAPI + Python]
- **Database:** [PLACEHOLDER: Engine + ORM — e.g., PostgreSQL + Prisma, MySQL + TypeORM, SQLite + Drizzle]
- **AI/LLM Layer:** [PLACEHOLDER: Provider + orchestration approach — e.g., OpenRouter, OpenAI API, local model. Delete if not applicable.]
- **Testing:** [PLACEHOLDER: Unit/Integration framework + E2E framework — e.g., Vitest + Playwright, Jest + Cypress]
- **Infrastructure:** [PLACEHOLDER: Deployment target + containerization — e.g., Render + Docker, AWS ECS, Vercel]
- **Monitoring:** [PLACEHOLDER: Observability tools — e.g., Sentry, PostHog, Datadog. Delete if not yet decided.]

---

## Repository Structure
<!--
  Map each top-level directory to its responsibility.
  This helps agents understand where code should live without exploring.
  Keep this in sync with the actual directory structure.
-->
- `/[PLACEHOLDER: dir]` = [PLACEHOLDER: responsibility]
- `/[PLACEHOLDER: dir]` = [PLACEHOLDER: responsibility]
- `/memory` = Local project documentation and permanent architectural decision logs
- `/resources` = Project-specific registers and inventories (architecture, API, schema, risks, tech debt, tests, security)
- `/standards` = Project-specific standards that specialise/override the general `.clinerules/` standards

---

## Architectural Rules

**See `.clinerules/architecture/core-principles.md` for complete architectural guidance.**

Key principles:
<!--
  List the enforceable architectural boundaries specific to this project.
  These should be rules that a code review or lint rule can verify.

  Start with the universal principles below, then add project-specific ones.
  Each rule should explain WHAT the boundary is and WHY it exists.
-->
- **Separation of Concerns:** [PLACEHOLDER: e.g., "Parsing logic is isolated from API orchestration"]
- **Dependency Direction:** Dependencies flow inward (UI → State/Services → Domain Logic → Data Access Layer).
- **[PLACEHOLDER: Project-Specific Boundary]:** [PLACEHOLDER: Description — e.g., "All external API calls route through a single orchestration module"]
- **[PLACEHOLDER: Project-Specific Boundary]:** [PLACEHOLDER: Description]
- **Modification Rules:** Prefer extending existing configurations over creating new paradigms; avoid duplicating logic.
- **Safety:** [PLACEHOLDER: List the absolute "never do this" rules — e.g., "Never disable authentication checks", "Never expose API keys to clients", "Never modify ledger balance rules without explicit request"]

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
5. Identify architectural boundaries [PLACEHOLDER: e.g., "(specifically the data scrubbing and credit verification boundaries)" — delete placeholder or name your project's critical boundaries].
6. Explain intended approach.
7. Identify possible downstream effects [PLACEHOLDER: e.g., "on global user balance states or prompt injection risks" — delete placeholder or name your project's risk areas].

### Step 2 — During Coding
1. Make surgical, scoped changes (see `.clinerules/agent-behavior.md § 3`).
2. Preserve backward compatibility [PLACEHOLDER: e.g., "across the Subject-Level-Unit hierarchy" — delete or specify your domain hierarchy].
3. Add structured logging around [PLACEHOLDER: e.g., "text parsing states and OpenRouter tokens used" — specify your critical logging points].
4. Avoid speculative refactors of the design layout system.

### Step 3 — After Coding: Verify & Impact Review
1. Run [PLACEHOLDER: test suite command — e.g., `vitest run`].
2. Run linting and type checks.
3. Verify affected UI components and [PLACEHOLDER: critical flows — e.g., "report generation flows"] manually.
4. Summarize changes and risks.
5. **Invoke `NB-Security-Engineer`** — assess security impact (auth boundaries, input validation, secret exposure, injection risks, PII handling). Security concerns must be documented and either resolved or accepted as risks before proceeding.
6. **Invoke `NB-DevOps-Engineer`** — assess deployment/infrastructure impact (environment variables, Docker configs, CI/CD pipeline, database migrations, runtime dependencies). Infrastructure changes must be documented.

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
<!--
  List the specialist skills relevant to your project's tech stack.
  Delete rows that don't apply. Add rows as needed.
-->
| Skill | Domain |
|-------|--------|
| `NB-Backend-Specialist` | [PLACEHOLDER: e.g., NestJS, Prisma, APIs, database models, multi-tenant logic] |
| `NB-Frontend-Web-Specialist` | [PLACEHOLDER: e.g., React/Next.js, UI components, styling, optimization] |
| `NB-PostgreSQL-Architect` | [PLACEHOLDER: All schema/data-model decisions — delete if using a different database] |
| `NB-QA-Engineer` | Testing standards, test matrix, regression coverage |

### Mandatory Impact Review (Step 3 — After ALL code changes)

| Skill | Scope |
|-------|-------|
| `NB-Security-Engineer` | Auth, input validation, secrets, injection, PII — must resolve or accept risks |
| `NB-DevOps-Engineer` | Env vars, Docker, CI/CD, migrations, runtime deps |

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
- All changes affecting validation logic must include happy path, edge case [PLACEHOLDER: e.g., "(partial correctness, cascade edge cases)"], and failure case [PLACEHOLDER: e.g., "(text parsing failure)"] tests.
- [PLACEHOLDER: List any systems requiring mandatory integration coverage — e.g., "Financial systems (credit deductions, refunds) and PII filters require mandatory integration coverage and regression protection." Delete if not applicable.]
- E2E smoke-test scripts via [PLACEHOLDER: Playwright/Cypress] must verify the critical user pathway: [PLACEHOLDER: e.g., "Login → Upload → Process → Result Display"].
- [PLACEHOLDER: List any deferred testing — e.g., "Component-level styling and visual regression testing deferred post-MVP." Delete if not applicable.]
- Before merge: all tests pass, linting passes, type checks pass, security checks pass.

---

## Debugging Protocol

When debugging:
1. Reproduce issue (utilizing diagnostic tools like [PLACEHOLDER: e.g., "Playwright traces or Sentry error reports"])
2. Identify root cause
3. Explain failing assumption [PLACEHOLDER: e.g., "(especially regarding prompt hallucinations or context window limitations)" — delete or specify your project's common failure modes]
4. Verify fix minimally
5. Confirm no regression introduced [PLACEHOLDER: e.g., "to historical outputs" — specify what must not break]

Never:
- apply speculative fixes to core processing chains
- rewrite unrelated modules
- suppress error states without explanation [PLACEHOLDER: e.g., "inside the credit ledger loop" — delete or specify]

---

## Performance Expectations
<!--
  List the performance constraints agents must respect.
  These should be measurable or at least directional.
  Remove items that don't apply to your project.
-->
- Avoid unnecessary database queries during [PLACEHOLDER: e.g., "active LLM evaluation streaming"].
- Prefer streaming structures for [PLACEHOLDER: e.g., "displaying real-time feedback"].
- Minimize frontend re-renders during [PLACEHOLDER: e.g., "document transformation"].
- Enforce mobile view optimization via mobile-first layout rules.
- Do not optimize without measuring; profile first to identify bottlenecks.

---

## Documentation Rules

**Project Documentation Location:** All project-specific documentation belongs in `memory/` folder for that project.

**Exception:** If a lesson learned could benefit all future projects, update the appropriate `.clinerules/` file or AGENTS.md instead.

Update documentation when:
- architecture changes
- [PLACEHOLDER: e.g., "OpenRouter prompt engineering patterns shift" — delete or specify your domain]
- APIs change
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
- implementation works [PLACEHOLDER: e.g., "on both desktop and mobile web views" — delete or specify your target platforms]
- tests ([PLACEHOLDER: e.g., "Vitest + Playwright"]) pass
- linting passes
- type checks pass
- security checks pass [PLACEHOLDER: e.g., "(and PII screening checks pass)" — delete or specify]
- architecture rules followed
- documentation updated
- no critical regressions identified