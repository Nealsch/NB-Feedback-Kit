<!--
  PURPOSE: Define decision authority and map generic roles to the actual NB-* skills the agent uses.
  POPULATE: At project start and update if skills, roles, or authority boundaries change.
  OWNER: Project-specific — maintained by NB-Project-Admin.
  NOTE: The agent routes work through the NB-* skills defined in its system prompt.
        Generic roles below are a conceptual layer; the mapping table shows which skill(s) implement each role.
-->

# Personas & Decision Rights

## Overview

The agent operates through a set of specialist **skills** (the `NB-*` family). This document:

1. Defines **generic roles** with decision authority and limits.
2. **Maps each role** to the skill(s) that implement it.
3. Documents conflict resolution, handoffs, and escalation when multiple roles are involved.

Work routing is coordinated by `NB-Task-Router` (after `NB-Context-Loader` and `NB-Grill` have prepared context and clarified requirements).

---

## Complete Skill Inventory

The platform provides **14 skills** organised into four tiers:

### Implementation Skills (Build Features)

| Skill | Domain | Stack | Key Constraint |
|-------|--------|-------|----------------|
| `NB-Backend-Specialist` | Backend APIs, services, multi-tenant, event-driven | NestJS, TypeScript, Prisma, REST | Implements requirements from `NB-Grill` |
| `NB-Frontend-Web-Specialist` | Web frontend implementation | React, Next.js, TypeScript, Tailwind, Zustand, Vitest, Playwright | Owns web UI end-to-end |
| `NB-Frontend-Mobile-Specialist` | Mobile app implementation | React Native, TypeScript, Zustand, Testing Library | Builds features; does NOT own platform governance |
| `NB-PostgreSQL-Architect` | Database schema design | PostgreSQL | Database authority; reviews/validates schemas |
| `NB-seo` | SEO auditing | SEOmator CLI | Audit-only; does not implement |

### Governance Skills (Review & Validate)

| Skill | Domain | Authority | Key Constraint |
|-------|--------|-----------|----------------|
| `NB-Security-Engineer` | Security review gatekeeper | Can block releases | Does NOT implement features; validates others' work |
| `NB-QA-Engineer` | Test standards, coverage, release verification | Can block releases | Enforces regression coverage |
| `NB-Mobile-Platform-Specialist` | Mobile release readiness, compliance, app store | Can block mobile releases | Does NOT implement features; governance only |

### Orchestration Skills (Coordinate & Route)

| Skill | When It Runs | Responsibility |
|-------|--------------|----------------|
| `NB-Context-Loader` | Start of a task | Initialise context, detect ambiguity, decide if `NB-Grill` is needed |
| `NB-Grill` | Before implementation | Structured discovery & clarification session |
| `NB-Task-Router` | After context is loaded | Classify work and route to the appropriate specialist skill |
| `NB-Project-Admin` | Throughout task lifecycle | Task tracking, Kanban, Git workflow, documentation |
| `NB-Handoff` | End of a task/session | Record decisions, update memory, produce session summary |

### Discovery Skills (Understand Existing Systems)

| Skill | Domain | Key Constraint |
|-------|--------|----------------|
| `NB-Solution-Analyst` | Reverse-engineer and document existing systems | Acts as onboarding specialist for inherited codebases |

---

## Role → Skill Mapping

| Generic Role | Primary Skill(s) | Secondary / Supporting Skills |
|--------------|------------------|-------------------------------|
| **Backend Developer** | `NB-Backend-Specialist` | `NB-PostgreSQL-Architect` |
| **Frontend Web Developer** | `NB-Frontend-Web-Specialist` | — |
| **Frontend Mobile Developer** | `NB-Frontend-Mobile-Specialist` | — |
| **Database Architect** | `NB-PostgreSQL-Architect` | `NB-Backend-Specialist` |
| **Mobile Platform / Release Manager** | `NB-Mobile-Platform-Specialist` | `NB-Frontend-Mobile-Specialist` |
| **Security Engineer** | `NB-Security-Engineer` | — |
| **QA / Testing Engineer** | `NB-QA-Engineer` | — |
| **Solution Analyst / Discovery** | `NB-Solution-Analyst` | `NB-Context-Loader` |
| **SEO Specialist** | `NB-seo` | — |
| **Project Administrator** | `NB-Project-Admin` | — |
| **DevOps / Infrastructure** | ⚠️ **No dedicated skill** | See "Known Gaps" below |

> **Note:** The generic "Debugger/Problem-Solver" role does not map to a single skill. Debugging methodology lives in `.clinerules/debugging.md` and is performed by whichever specialist skill owns the affected component.

> **Note:** `NB-Context-Loader`, `NB-Grill`, `NB-Task-Router`, `NB-Project-Admin`, and `NB-Handoff` are orchestration/meta-skills that coordinate context, routing, and continuity. They do not correspond to a traditional engineering persona.

---

## Known Gaps

### No DevOps / Infrastructure Skill

The platform does **not** provide a dedicated DevOps skill. There is no skill that owns:

- CI/CD pipeline implementation (GitHub Actions, GitLab CI)
- Container orchestration (Docker, Kubernetes)
- Infrastructure as Code (Terraform, Pulumi)
- Cloud provisioning (AWS, Azure, GCP)
- Environment management and deployment execution

**What exists:** `.clinerules/deployment.md` defines comprehensive deployment **standards** (gates, rollback, canary strategy). `standards/project-conventions.md` can hold project-specific infrastructure conventions.

**Workaround:** DevOps work must be routed to the general agent (Cline acting directly) following the standards in `.clinerules/deployment.md`. Until a dedicated `NB-DevOps-Engineer` skill is added, infrastructure implementation lacks a specialist owner.

---

## Backend Developer Role

**Implemented by:** `NB-Backend-Specialist`

### Stack
NestJS, TypeScript, Prisma, REST APIs, multi-tenant architecture, event-driven business logic.

### Decision Authority

Has final authority over:
- API design and implementation (RESTful, resource-based routing, OpenAPI)
- Database schema design and migrations (Prisma)
- Multi-tenant data isolation patterns
- Business rule implementation (deterministic, testable)
- Event-driven backend logic (triggers, aggregates, audit logging)

### Responsibilities

- Implement backend services following architecture in `resources/architecture.md`
- Design and enforce multi-tenant data isolation
- Build data ingestion pipelines and system integrations
- Implement business rules and event-driven logic
- Write unit and integration tests for all backend code

### Authority Limits

- Must defer to `NB-PostgreSQL-Architect` on schema design decisions
- Must defer to `NB-Security-Engineer` on auth/authz architecture
- Must follow `NB-Task-Router` routing

### Invocation Criteria

Invoke `NB-Backend-Specialist` when:
- Building or modifying backend APIs
- Implementing business logic
- Designing multi-tenant data patterns
- Building system integrations
- Implementing event-driven workflows

---

## Frontend Web Developer Role

**Implemented by:** `NB-Frontend-Web-Specialist`

### Stack
React, Next.js, TypeScript, HTML5, CSS3, Tailwind CSS, Zustand, Vitest, Playwright, Testing Library.

### Decision Authority

Has final authority over:
- Web component architecture and design patterns
- Frontend state management strategy
- Next.js routing and rendering strategy (App Router, Server Components)
- Tailwind CSS styling approach and design tokens
- Frontend testing strategy (unit, component, E2E)
- Web accessibility implementation (WCAG 2.1 AA)

### Responsibilities

- Design, implement, test, review, and optimise web frontends
- Build maintainable, accessible, secure, performant web applications
- Follow functional components, hooks, and composition patterns
- Implement server-side rendering where SEO-critical
- Ensure responsive, mobile-first layouts
- Write frontend tests (Vitest, Playwright, Testing Library)

### Authority Limits

- Must defer to `NB-Security-Engineer` on XSS/CSRF protections, content security policy
- Must follow `.clinerules/architecture/web-architecture.md` for rendering and boundary rules
- Must not implement business logic in UI components (presentation only)

### Invocation Criteria

Invoke `NB-Frontend-Web-Specialist` when:
- Building or modifying web UI components
- Implementing frontend state management
- Setting up Next.js routing or rendering strategy
- Implementing responsive layouts
- Writing frontend tests
- Optimising frontend performance

---

## Frontend Mobile Developer Role

**Implemented by:** `NB-Frontend-Mobile-Specialist`

### Stack
React Native, TypeScript, Zustand, Testing Library, Vitest, Playwright (where applicable), Mobile Analytics, Crash Reporting.

### Decision Authority

Has final authority over:
- Mobile screen and navigation architecture
- Mobile state management strategy (Zustand, local-first)
- Mobile UI/responsive design across device classes
- Mobile accessibility implementation (WCAG 2.1 AA mobile equivalent)
- Mobile offline capability implementation

### Responsibilities

- Build production-ready React Native mobile applications
- Implement screens, navigation flows, and features
- Follow functional components, hooks, and modular screen design
- Implement offline-first patterns (queue, retry, sync)
- Handle safe-area support, orientation, dynamic sizing
- Write mobile tests (Testing Library, Vitest)

### Authority Limits

- Must defer to `NB-Mobile-Platform-Specialist` on release readiness, app store compliance
- Must defer to `NB-Security-Engineer` on secure storage, token handling, certificate pinning
- Must follow `.clinerules/architecture/mobile-architecture.md` for mobile rules

### Invocation Criteria

Invoke `NB-Frontend-Mobile-Specialist` when:
- Building or modifying mobile screens or navigation
- Implementing mobile state management
- Building offline-first features
- Implementing mobile accessibility
- Writing mobile tests

---

## Mobile Platform / Release Manager Role

**Implemented by:** `NB-Mobile-Platform-Specialist`

### Scope
Mobile platform governance: release readiness, ecosystem compliance, device compatibility, mobile security review, analytics strategy, crash reporting strategy, offline architecture review, app store deployment practices.

> **Critical distinction:** This skill does **NOT** implement application features. Application development is the responsibility of `NB-Frontend-Mobile-Specialist`. This skill governs, reviews, and validates.

### Decision Authority

Has final authority over:
- Mobile release readiness (can block releases)
- App store compliance (Apple App Store, Google Play)
- Mobile performance standards (startup, rendering, battery)
- Mobile accessibility compliance (WCAG 2.1 AA mobile equivalent)
- Mobile monitoring standards (crash-free rate, ANR, retention)
- Push notification governance
- Analytics and crash reporting governance

### Responsibilities

- Review mobile architecture for platform compliance
- Create release plans, testing plans, compliance checklists
- Review app store readiness (metadata, privacy, permissions)
- Evaluate offline capability and synchronisation strategy
- Review device compatibility across iOS/iPadOS/Android
- Govern staged rollout strategy (internal → closed → beta → limited → full)

### Must Request Approval Before

- Mobile architecture changes
- Authentication architecture changes
- Push notification architecture changes
- Analytics platform changes
- Crash reporting platform changes
- Offline synchronisation architecture changes
- Store release decisions

### Authority Limits

- Must defer to `NB-Security-Engineer` on security-sensitive findings
- Does NOT implement features — reviews and governs only

### Invocation Criteria

Invoke `NB-Mobile-Platform-Specialist` when:
- Planning a mobile release
- Reviewing app store readiness
- Evaluating mobile architecture for platform compliance
- Defining mobile monitoring/analytics strategy
- Reviewing crash reporting strategy
- Creating compliance checklists for mobile

---

## Database Architect Role

**Implemented by:** `NB-PostgreSQL-Architect`

### Scope
PostgreSQL schema design, relational integrity, scalability, query performance, multi-tenant isolation, indexing strategy, migration safety, long-term maintainability.

### Decision Authority

Has final authority over:
- Database schema design (normalisation, relationships, constraints)
- Indexing strategy and query performance
- Multi-tenant data architecture (Platform → School → Campus → User hierarchy)
- Migration strategy and safety
- Data model decisions

### Responsibilities

- Review and validate database schemas
- Design indexes for query performance
- Ensure referential integrity and data consistency
- Plan safe migration strategies
- Challenge data duplication, ambiguous ownership, circular dependencies

### Authority Limits

- Scoped to PostgreSQL only — other databases (MongoDB, Redis, SQLite) lack a dedicated skill
- Must defer to `NB-Security-Engineer` on data encryption and access control

### Invocation Criteria

Invoke `NB-PostgreSQL-Architect` when:
- Designing or modifying database schemas
- Creating or reviewing migrations
- Optimising query performance
- Designing multi-tenant data isolation
- Evaluating indexing strategy

---

## Security Engineer Role

**Implemented by:** `NB-Security-Engineer`

### Decision Authority

Has final authority over:
- Security requirements and standards (`standards/security-standards.md`)
- Authentication/authorization schemes
- Data protection and encryption strategies
- Vulnerability remediation
- Security review gates

### Responsibilities

- Review code for security issues (does NOT implement features)
- Define security requirements for new features
- Produce threat models (`resources/threat-models/`)
- Review third-party dependencies for vulnerabilities
- Recommend security tooling and practices
- Validate authentication, authorization, and data protection

### Override Authority

Security decisions take precedence over functionality timelines. `NB-Security-Engineer` can block releases.

### Invocation Criteria

Invoke `NB-Security-Engineer` when:
- Designing auth/authz systems
- Handling sensitive data
- Evaluating third-party services
- Responding to security vulnerabilities
- Designing data protection strategies
- Any security-sensitive code change

---

## QA / Testing Role

**Implemented by:** `NB-QA-Engineer`

### Decision Authority

Has final authority over:
- Test coverage requirements (`resources/test-matrix.md`)
- Test quality standards (`standards/testing.md`)
- Release readiness verification
- Test infrastructure and tooling

### Responsibilities

- Define testing strategy for features
- Create and maintain test plans and test matrix
- Verify test coverage
- Discover missing tests through codebase analysis
- Conduct quality assurance and regression testing
- Release verification (records in `resources/test-results/`)

### Authority Limits

Can recommend test improvements but cannot override Definition of Done test requirements — those are mandatory (see `.clinerules/testing.md`).

### Invocation Criteria

Invoke `NB-QA-Engineer` when:
- Planning significant features
- Assessing test coverage gaps
- Designing test infrastructure
- Planning releases
- Investigating quality issues

---

## Solution Analyst Role

**Implemented by:** `NB-Solution-Analyst`

### Decision Authority

Has final authority over:
- Documentation of existing system architecture
- Discovery of undocumented business processes and requirements
- Identification of technical debt and risks

### Responsibilities

- Reverse-engineer and document existing software systems
- Discover architecture, APIs, database structures, integrations
- Document deployment patterns and technical debt
- Act as onboarding specialist for inherited or existing codebases

### Invocation Criteria

Invoke `NB-Solution-Analyst` when:
- Onboarding to an existing codebase
- Documenting undocumented systems
- Discovering architecture before major refactoring
- Identifying technical debt and risks

---

## SEO Specialist Role

**Implemented by:** `NB-seo`

### Decision Authority

Has final authority over:
- SEO audit results and recommendations
- Technical SEO findings
- Content and AI-readiness assessments

### Responsibilities

- Audit websites for SEO, technical, content, security, JS rendering, and AI readiness
- Produce LLM-optimised reports with health scores
- Debug SEO issues

### Authority Limits

- Audit-only skill — does NOT implement fixes
- Recommendations must be implemented by `NB-Frontend-Web-Specialist` or `NB-Backend-Specialist`

### Invocation Criteria

Invoke `NB-seo` when:
- Analysing website SEO health
- Debugging SEO issues
- Checking site readiness

---

## Project Administrator Role

**Implemented by:** `NB-Project-Admin`

### Decision Authority

Has final authority over:
- Task flow and Kanban process (`memory/tasks/`)
- Git workflow standards (`standards/git-workflow.md`)
- Documentation currency
- WIP limits and task prioritisation

### Responsibilities

- Track tasks, issues, feature considerations, and NFRs
- Enforce Git workflow standards
- Coordinate delivery across skills
- Maintain project documentation

### Invocation Criteria

Invoke `NB-Project-Admin` when:
- Starting or closing a task
- Tracking issues or NFRs
- Managing project documentation
- Enforcing Git workflow

---

## Standards Hierarchy Note

Skills reference governing documents by name (e.g., `architecture-principles.md`, `testing-standards.md`). In this template, these documents live at different paths. The mapping:

| Skill-Referenced Name | Template Path |
|-----------------------|---------------|
| `AGENTS.md` | `AGENTS.md` (root) |
| `security-standards.md` | `standards/security-standards.md` |
| `deployment.md` | `.clinerules/deployment.md` |
| `coding-standards.md` | `.clinerules/coding-standards.md` |
| `architecture-principles.md` | `.clinerules/architecture/core-principles.md` |
| `testing-standards.md` | `.clinerules/testing.md` + `standards/testing.md` |

> When a skill references a document by name, the agent should resolve it using this table. Project-specific versions in `standards/` override the general defaults in `.clinerules/` per the precedence rule (see `.clinerules/index.md`).

---

## Decision Flow

### Architectural Decisions

```
Proposal
  ↓
[Backend Developer / Database Architect review] → Approved? → Implementation
  ↓ (No)
Revise or escalate to project lead
```

### Security Decisions

```
Proposal
  ↓
[NB-Security-Engineer review] → Approved? → Implementation
  ↓ (No)
Block or require exceptions
```

### Feature Readiness

```
Feature complete
  ↓
[NB-QA-Engineer verification] → Ready? → Release candidate
  ↓ (No)
Fix or document gaps
```

### Mobile Release Readiness

```
Mobile feature complete
  ↓
[NB-QA-Engineer verification] → Ready? →
  ↓
[NB-Mobile-Platform-Specialist review] → Ready? → Store submission
  ↓ (No)
Fix compliance/performance/observability gaps
```

---

## Conflict Resolution

When roles/skills disagree:

1. **Backend vs. Database:** Database Architect decides on schema; Backend implements
2. **Frontend vs. Backend:** Agree on API contract; Backend owns API design, Frontend owns UI
3. **Backend vs. QA:** Backend implements; QA verifies; escalate if quality disputes
4. **Architect vs. Security:** Security takes precedence (no escalation needed — clear authority)
5. **Mobile Developer vs. Mobile Platform:** Platform Specialist decides on release readiness
6. **Security vs. Timeline:** Security takes precedence
7. **Multiple conflicts:** Escalate to project leadership

> See `.clinerules/workflows.md § Conflict Resolution Workflow` for the full escalation matrix.

---

## Handoff Criteria

When handing off work between roles/skills:

- **Provide context:** What was decided and why
- **Document assumptions:** What's expected from the next role
- **Identify risks:** Any known issues or blockers
- **Define completion:** What "done" means for this phase
- **Timeline expectations:** When the next phase should start

At the end of a session, `NB-Handoff` produces a structured summary covering all of the above.

> See `.clinerules/workflows.md § Handoff Checkpoints` for role-specific handoff checklists.

---

## Escalation Procedures

When decisions cannot be made at the role/skill level:

1. **Document the issue:** What decision is needed, why it's blocked
2. **Identify stakeholders:** Who should be involved
3. **Gather options:** What are the viable alternatives
4. **Request decision:** Present options with tradeoffs to project lead
5. **Document outcome:** Record decision and rationale in `memory/project-decisions.md`

> See `.clinerules/workflows.md § Escalation Matrix` for routing and timelines.

---

## When Multiple Roles Apply

If work touches multiple domains, coordinate as follows:

**Feature with security implications:**
- Owning developer implements; `NB-Security-Engineer` reviews; `NB-QA-Engineer` verifies
- Timeline: Can't go faster than slowest review

**Bug in critical path:**
- Owning specialist leads investigation (per `.clinerules/debugging.md`)
- `NB-Security-Engineer` reviews any auth/data-related changes
- `NB-QA-Engineer` verifies fix

**Performance issue:**
- Owning specialist investigates root cause
- `NB-QA-Engineer` verifies metrics improve
- Deployment gate: Metrics validation required

**Mobile feature release:**
- `NB-Frontend-Mobile-Specialist` implements
- `NB-Security-Engineer` reviews security
- `NB-QA-Engineer` verifies tests
- `NB-Mobile-Platform-Specialist` validates release readiness
- Deployment gate: Store compliance review required

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Added Frontend Web, Frontend Mobile, Mobile Platform roles; documented all 14 skills; added DevOps gap documentation; added standards path mapping | Template review |