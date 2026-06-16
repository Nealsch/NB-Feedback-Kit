# AI Development Template

A structured template repository for starting new coding projects with an AI agent (Cline) and the NB Skills Framework.

---

## What This Template Gives You

Starting a new project with an AI agent is hard because the agent lacks context: it doesn't know your architecture, your conventions, your security requirements, or your decision history. This template solves that by providing a **context layer** the agent reads before doing any work.

The template is organised into four tiers with a clear precedence rule:

| Layer | Folder | When Populated | Purpose |
|-------|--------|----------------|---------|
| **General standards** | `.clinerules/` | Pre-filled (ready to use) | Reusable rules governing how the agent reasons, codes, tests, secures, deploys, and debugs |
| **Project standards** | `standards/` | At project start | Project-specific rules that specialise or tighten the general standards |
| **Registers & inventories** | `resources/` | At project start, updated ongoing | The project's concrete architecture, API, schema, risks, tests, personas |
| **Memory** | `memory/` | At project start, updated ongoing | Project definition, decisions (ADRs), lessons learned, task tracking |

**Precedence rule:** Project-specific files override general files. If a `standards/` file is silent on a topic, the `.clinerules/` default applies. See `.clinerules/index.md` for details.

---

## How to Use This Template (Step by Step)

### Phase 1: Create the Project (5 minutes)

1. **Copy this template** into your new project directory:
   ```
   xcopy /E /I /H "ai-dev-Template" "my-new-project"
   ```
   Or use it as a GitHub template repository.

2. **Initialise Git** (if not already):
   ```
   cd my-new-project
   git init
   git add .
   git commit -m "chore: initialise project from ai-dev-Template"
   ```

3. **Install dependencies** for your chosen stack (the template doesn't include code — it's context only):
   ```
   # Example: NestJS backend
   npm init -y
   npm install @nestjs/core @nestjs/common prisma
   ```

### Phase 2: Populate Project Definition (10 minutes)

These three files define **what the project is**. Populate them before writing any code:

1. **`memory/project-definition.md`** — Answer:
   - What is this project? (purpose, goals)
   - What are the key business constraints?
   - What are the critical success criteria?
   - What is the tech stack? (update `AGENTS.md` too)

2. **`resources/system-inventory.md`** — List:
   - Repositories and services
   - Environments (dev, staging, prod)
   - External dependencies
   - Infrastructure

3. **`standards/project-conventions.md`** — Define:
   - Naming conventions
   - Directory structure
   - Any project-specific rules

### Phase 3: Configure the CI Pipeline (5 minutes)

1. **`.github/workflows/ci.yml`** — Uncomment and customise:
   - Set the correct Node version
   - Update lint/build/test commands for your stack
   - Add deploy steps for your platform

2. **`.github/pull_request_template.md`** — Already ready to use. Customise the checklist if needed.

3. **`.gitignore`** — Add any project-specific ignore patterns (e.g., build output for your framework).

### Phase 4: Populate Standards & Resources (as needed, ongoing)

Not everything needs to be filled in on day one. Populate files **when they become relevant**:

| When | Populate |
|------|----------|
| **Before writing backend code** | `standards/coding-standards.md`, `resources/api-reference.md` |
| **Before designing the database** | `resources/database-schema.md` |
| **Before adding auth or handling sensitive data** | `standards/security-standards.md`, `resources/threat-models/` |
| **Before setting up external integrations** | `resources/integration-register.md` |
| **Before writing tests** | `standards/testing.md`, `resources/test-matrix.md` |
| **Before the first release** | `standards/git-workflow.md`, `standards/code-review.md`, `standards/ci-cd.md` |
| **When making architecture decisions** | `memory/project-decisions.md` (record ADRs) |
| **When learning from mistakes** | `memory/lessons-learned.md` |
| **When tracking risks or tech debt** | `resources/risk-register.md`, `resources/technical-debt-register.md` |

### Phase 5: Work with the Agent

The agent (Cline) automatically reads `.clinerules/` and `AGENTS.md` for context. When you give it a task, it follows this workflow:

```
1. NB-Context-Loader     → Loads relevant context, detects ambiguity
        ↓
2. NB-Grill              → Clarifies requirements (if ambiguous)
        ↓
3. NB-Task-Router        → Routes to the right specialist skill
        ↓
4. Specialist Skill      → Implements the work
   (NB-Backend-Specialist, NB-Frontend-Web-Specialist, etc.)
        ↓
5. NB-QA-Engineer        → Verifies tests and coverage
        ↓
6. NB-Security-Engineer  → Reviews security (if applicable)
        ↓
7. NB-Handoff            → Records decisions, updates memory
```

**You don't need to manually invoke skills** — the agent routes automatically. But you can request a specific skill if needed (e.g., "use the security skill to review this auth code").

### Phase 6: Maintain the Context (ongoing)

The template only works if you keep it updated. At minimum:

- **Every session end:** Use `NB-Handoff` to update `memory/` and produce a summary
- **Every architecture decision:** Record an ADR in `memory/project-decisions.md`
- **Every release:** Update `resources/test-results/` and `resources/system-inventory.md`
- **Every incident:** Record in `memory/lessons-learned.md`
- **When conventions change:** Update `standards/project-conventions.md`

---

## The 14 Skills (NB-* Framework)

The agent operates through specialist skills. Each skill has defined authority and limits (see `resources/personas.md` for the full mapping).

### Implementation Skills (Build Features)

| Skill | Stack | Owns |
|-------|-------|------|
| `NB-Backend-Specialist` | NestJS, TypeScript, Prisma, REST | Backend APIs, services, multi-tenant, event-driven logic |
| `NB-Frontend-Web-Specialist` | React, Next.js, Tailwind, Zustand | Web UI end-to-end |
| `NB-Frontend-Mobile-Specialist` | React Native, TypeScript, Zustand | Mobile app features and screens |
| `NB-PostgreSQL-Architect` | PostgreSQL | Database schema design, indexing, migrations |
| `NB-seo` | SEOmator CLI | SEO auditing (audit-only, does not implement) |

### Governance Skills (Review & Validate)

| Skill | Authority | Key Constraint |
|-------|-----------|----------------|
| `NB-Security-Engineer` | Can block releases | Reviews only — does NOT implement features |
| `NB-QA-Engineer` | Can block releases | Enforces test coverage and regression protection |
| `NB-Mobile-Platform-Specialist` | Can block mobile releases | Release readiness, app store compliance — does NOT implement |

### Orchestration Skills (Coordinate & Route)

| Skill | When It Runs |
|-------|--------------|
| `NB-Context-Loader` | Start of a task |
| `NB-Grill` | Before implementation (if requirements are unclear) |
| `NB-Task-Router` | After context is loaded |
| `NB-Project-Admin` | Throughout task lifecycle |
| `NB-Handoff` | End of a task/session |

### Discovery Skills (Understand Existing Systems)

| Skill | Owns |
|-------|------|
| `NB-Solution-Analyst` | Reverse-engineering and documenting existing codebases |

---

## Directory Structure

```
.
├── AGENTS.md                          # Project entry point (read first)
├── README.md                          # This file
├── .editorconfig                      # Editor formatting rules
├── .gitignore                         # Git ignore patterns
│
├── .clinerules/                       # GENERAL STANDARDS (pre-filled, do not specialise)
│   ├── index.md                       #   Precedence rule + complete file index
│   ├── agent-behavior.md              #   How agents reason and act
│   ├── coding-standards.md            #   Readability, naming, refactoring rules
│   ├── debugging.md                   #   Debugging workflow
│   ├── testing.md                     #   Testing philosophy and CI gates
│   ├── workflows.md                   #   Multi-agent collaboration and escalation
│   ├── security.md                    #   Security requirements (OWASP-aligned)
│   ├── deployment.md                  #   Deployment gates and rollback
│   ├── observability.md               #   Logging, metrics, tracing, alerting
│   ├── error-handling.md              #   Resilience patterns
│   ├── architecture/                  #   Architecture rules
│   │   ├── core-principles.md         #     Dependency direction, separation of concerns
│   │   ├── web-architecture.md        #     Web-specific rules
│   │   ├── mobile-architecture.md     #     Mobile-specific rules
│   │   └── backend-architecture.md    #     Backend-specific rules
│   ├── design/                        #   Design standards (empty — populate if needed)
│   │   ├── web-design-standards.md
│   │   └── mobile-design-standards.md
│   └── personas/                      #   Legacy persona stubs (empty — see note below)
│
├── standards/                         # PROJECT STANDARDS (populate per project)
│   ├── README.md                      #   How standards relate
│   ├── coding-standards.md            #   Project-specific coding rules
│   ├── security-standards.md          #   Project-specific security controls
│   ├── testing.md                     #   Project test tooling and targets
│   ├── dependency-management.md       #   Package manager & supply-chain policy
│   ├── project-conventions.md         #   Naming, structure, conventions
│   ├── karpathy-guidelines.md         #   AI collaboration guidelines
│   ├── git-workflow.md                #   Branching, commits, PR process
│   ├── code-review.md                 #   Review process and checklist
│   └── ci-cd.md                       #   Pipeline stages and quality gates
│
├── resources/                         # REGISTERS & INVENTORIES (populate per project)
│   ├── README.md                      #   How resources are organised
│   ├── personas.md                    #   Role→skill mapping and decision rights
│   ├── architecture.md                #   This project's concrete architecture
│   ├── api-reference.md               #   API surface
│   ├── database-schema.md             #   Schema, indexes, migrations
│   ├── integration-register.md        #   External integrations
│   ├── system-inventory.md            #   Repos, services, environments
│   ├── risk-register.md               #   Risk entries
│   ├── technical-debt-register.md     #   Tech debt items
│   ├── test-matrix.md                 #   Coverage matrix
│   ├── test-results/                  #   Per-release test results
│   ├── security-reports/              #   Security audit reports
│   └── threat-models/                 #   Structured threat models
│
├── memory/                            # PROJECT MEMORY (populate per project)
│   ├── README.md                      #   How memory is organised
│   ├── project-definition.md          #   What this project is
│   ├── project-decisions.md           #   Architecture Decision Records (ADRs)
│   ├── lessons-learned.md             #   Retrospective findings
│   └── tasks/                         #   Kanban task tracking
│       ├── README.md
│       ├── active-task.md             #   Current session work
│       └── project-board.md           #   Project Kanban board
│
└── .github/                           # CI/CD TEMPLATES
    ├── workflows/ci.yml               #   GitHub Actions pipeline template
    └── pull_request_template.md       #   PR description template
```

---

## Precedence Rule

When files cover the same topic, **project-specific overrides general**:

```
.clinerules/  (general defaults — pre-filled, do not specialise)
      ↓ overridden by
standards/    (project-specific standards — populate per project)
resources/    (project-specific registers — populate per project)
memory/       (project-specific decisions & lessons — populate per project)
```

See `.clinerules/index.md § Precedence Rule` for full details.

---

## Known Gaps

### No DevOps / Infrastructure Skill

The NB-* framework does not include a dedicated DevOps skill. CI/CD pipeline implementation, container orchestration, infrastructure as code, and cloud provisioning must be handled by the general agent following the standards in `.clinerules/deployment.md` and `standards/ci-cd.md`. See `resources/personas.md § Known Gaps`.

### Legacy Persona Stubs (`.clinerules/personas/`)

The `.clinerules/personas/` directory contains 5 empty stub files (`architect.md`, `debugger.md`, `reviewer.md`, `security-engineer.md`, `teacher.md`) using a different persona taxonomy than the actual NB-* skills. These are **not used** — the authoritative persona definitions live in `resources/personas.md`. You can safely delete this directory or leave the stubs as placeholders.

### Design Standards Stubs (`.clinerules/design/`)

The `.clinerules/design/` directory contains 2 empty stub files (`web-design-standards.md`, `mobile-design-standards.md`). Populate these if your project needs visual/UX design standards beyond what the architecture files cover.

---

## Decision Authority at a Glance

| Domain | Who Decides | Can Block? |
|--------|-------------|------------|
| API design | `NB-Backend-Specialist` | — |
| Database schema | `NB-PostgreSQL-Architect` | — |
| Web UI architecture | `NB-Frontend-Web-Specialist` | — |
| Mobile UI architecture | `NB-Frontend-Mobile-Specialist` | — |
| Mobile release readiness | `NB-Mobile-Platform-Specialist` | ✅ |
| Security | `NB-Security-Engineer` | ✅ |
| Test coverage / quality | `NB-QA-Engineer` | ✅ |
| Task routing | `NB-Task-Router` | — |
| Architecture conflicts | Escalate to project lead | — |

> Security decisions always take precedence over timeline pressure. See `resources/personas.md § Conflict Resolution`.

---

## Quick Reference: What to Read First

| If you are... | Read these first |
|---------------|-----------------|
| **Starting a new project** | This README → `AGENTS.md` → `.clinerules/index.md` → `memory/project-definition.md` |
| **Joining an existing project** | `AGENTS.md` → `resources/architecture.md` → `resources/system-inventory.md` → `memory/project-decisions.md` |
| **The AI agent** | `AGENTS.md` (auto-read) → `.clinerules/` (auto-read) → `resources/personas.md` → `memory/` |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-06-13 | Added comprehensive usage guide; documented all 14 skills; documented legacy persona stubs and design stubs; added known gaps section |