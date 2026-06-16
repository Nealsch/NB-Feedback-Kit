# Instruction Index

## Purpose

This index lists every file that governs agent behaviour in this repository. Files are split into two tiers with a clear precedence rule.

---

## Precedence Rule

When two files cover the same topic, **project-specific files override general files**:

```
.clinerules/  (general, reusable standards)
      ↓ overridden by
standards/    (project-specific standards)
resources/    (project-specific registers & inventories)
memory/       (project-specific decisions & lessons)
```

**Examples:**
- `standards/security-standards.md` SPECIALISES `.clinerules/security.md`
- `standards/testing.md` SPECIALISES `.clinerules/testing.md`
- `standards/dependency-management.md` SPECIALISES `.clinerules/security.md` and `.clinerules/coding-standards.md`

If a `standards/`, `resources/`, or `memory/` file is silent on a topic, the `.clinerules/` default applies.

---

## Tier 1 — General Standards (`.clinerules/`)

Reusable across all projects. Do not specialise project details here.

### Core Files
- `AGENTS.md` — project entry point and tech-stack summary
- `agent-behavior.md` — how agents must reason and act
- `coding-standards.md` — readability, naming, refactoring rules
- `debugging.md` — debugging workflow
- `testing.md` — testing philosophy, pyramid, CI gates
- `workflows.md` — multi-agent collaboration and escalation
- `security.md` — security requirements (OWASP-aligned)
- `deployment.md` — deployment gates and rollback
- `observability.md` — logging, metrics, tracing, alerting
- `error-handling.md` — resilience patterns

### Architecture
- `architecture/core-principles.md` — dependency direction, separation of concerns
- `architecture/web-architecture.md` — web-specific rules
- `architecture/mobile-architecture.md` — mobile-specific rules
- `architecture/backend-architecture.md` — backend-specific rules

---

## Tier 2 — Project-Specific (populate at project start)

These files are templates in this repo and must be populated when a project starts.

### Project Definition & Memory (`memory/`)
- `memory/project-definition.md` — what this project is, goals, constraints
- `memory/project-decisions.md` — Architecture Decision Records (ADRs)
- `memory/lessons-learned.md` — retrospective findings
- `memory/tasks/` — task tracking (Kanban)

### Standards (`standards/`)
- `standards/coding-standards.md` — project coding additions
- `standards/security-standards.md` — project security controls
- `standards/testing.md` — project test tooling and targets
- `standards/dependency-management.md` — package manager & supply-chain policy
- `standards/project-conventions.md` — naming, structure, conventions
- `standards/karpathy-guidelines.md` — AI collaboration guidelines
- `standards/git-workflow.md` — branching strategy, commit conventions, PR process
- `standards/code-review.md` — review process, reviewer assignment, checklist
- `standards/ci-cd.md` — pipeline stages, quality gates, environment strategy

### Resources & Registers (`resources/`)
- `resources/personas.md` — decision rights and role→skill mapping
- `resources/architecture.md` — this project's concrete architecture
- `resources/api-reference.md` — API surface
- `resources/database-schema.md` — schema, indexes, migrations
- `resources/integration-register.md` — external integrations
- `resources/system-inventory.md` — repos, services, environments, dependencies
- `resources/risk-register.md` — risk entries
- `resources/technical-debt-register.md` — tech debt items
- `resources/test-matrix.md` — coverage matrix
- `resources/test-results/` — per-release test result records
- `resources/security-reports/` — security audit reports
- `resources/threat-models/` — structured threat models

---

## Project Scaffolding

These files are provided as templates and should be customised at project start:

- `.gitignore` — ignores node_modules, build output, env files, secrets
- `.editorconfig` — consistent indentation and line endings across editors
- `.github/workflows/ci.yml` — GitHub Actions CI pipeline template (lint, type-check, build, test, security scan)
- `.github/pull_request_template.md` — PR description template with checklist
