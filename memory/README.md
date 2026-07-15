# memory/

<!--
  PURPOSE: Project-specific context, decisions, and lessons learned.
  POPULATE: At project start and throughout the project lifecycle.
  GOVERNANCE: See .clinerules/index.md § Precedence Rule — memory/ overrides .clinerules/ defaults for project-specific decisions.
-->

This folder holds the project's living memory. It is populated when a project starts and updated throughout its lifecycle.

## Files

| File | Purpose | Populated By |
|------|---------|--------------|
| `project-definition.md` | What this project is, its goals, and constraints | NB-Context-Loader / NB-Solution-Analyst |
| `project-decisions.md` | Architecture Decision Records (ADRs) | Any skill making a significant decision |
| `lessons-learned.md` | Retrospective findings and improvement actions | NB-Handoff / team retrospectives |
| `tasks/` | Task tracking (Kanban board) | NB-Project-Admin |

## When to Update

- **project-definition.md** — at project start, and when scope/goals change
- **project-decisions.md** — whenever a significant technical decision is made (see `AGENTS.md § Decision Logging`)
- **lessons-learned.md** — at session end (NB-Handoff), after incidents, after retrospectives
- **tasks/** — continuously, as work progresses (NB-Project-Admin)

> **Note:** All files in this folder start as empty templates. They are intentionally blank in the template repo and get populated per project.