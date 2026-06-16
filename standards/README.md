# standards/

<!--
  PURPOSE: Project-specific standards that specialise/override the general .clinerules/ standards.
  POPULATE: At project start and update as project-specific rules emerge.
  GOVERNANCE: See .clinerules/index.md § Precedence Rule — standards/ overrides .clinerules/ for THIS project.
-->

This folder holds project-specific standards. Each file specialises a corresponding general standard in `.clinerules/` — if a `standards/` file is silent on a topic, the `.clinerules/` default applies.

## Files

| File | Specialises | Purpose | Primary Owner |
|------|-------------|---------|---------------|
| `coding-standards.md` | `.clinerules/coding-standards.md` | Project-specific coding rules (formatting, linting, language conventions) | NB-Backend-Specialist / team |
| `security-standards.md` | `.clinerules/security.md` | Project-specific security controls and requirements | NB-Security-Engineer |
| `testing.md` | `.clinerules/testing.md` | Project-specific test tooling, targets, and conventions | NB-QA-Engineer |
| `dependency-management.md` | `.clinerules/security.md`, `.clinerules/coding-standards.md` | Package manager (Yarn) and supply-chain security | NB-Security-Engineer |
| `project-conventions.md` | — | Naming, structure, and conventions unique to this project | NB-Project-Admin |
| `karpathy-guidelines.md` | — | AI collaboration guidelines for this project | Team |
| `git-workflow.md` | — | Branching strategy, commit conventions, PR process | NB-Project-Admin |
| `code-review.md` | `.clinerules/coding-standards.md` (checklist), `.clinerules/workflows.md` (review workflow) | Review process, reviewer assignment, checklist | NB-Project-Admin |
| `ci-cd.md` | `.clinerules/deployment.md` (gates), `.clinerules/testing.md` (CI gates) | Pipeline stages, quality gates, environment strategy | NB-Project-Admin (DevOps gap — no skill) |

## How Standards Relate

```
.clinerules/  →  general, reusable defaults (do not specialise here)
standards/    →  project-specific rules (populate at project start)
```

A `standards/` file does not replace its `.clinerules/` counterpart — it adds project-specific detail or tightens requirements. The general methodology remains in `.clinerules/`.

> **Note:** All files in this folder start as empty or partial templates. `dependency-management.md` ships with a strong default (Yarn policy, supply chain security) that can be adopted as-is or specialised. Others are intentionally blank in the template repo and get populated per project.