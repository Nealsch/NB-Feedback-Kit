<!--
  PURPOSE: Define the code review process, reviewer roles, approval gates, and review quality standards.
  POPULATE: At project start. Customise reviewer assignments and review depth.
  OWNER: Enforced by NB-Project-Admin. Reviews conducted by the relevant specialist skills.
  OVERRIDES: This is project-specific. General coding standards checklist is in .clinerules/coding-standards.md § Code Review Checklist.
  SEE ALSO: standards/git-workflow.md for PR process, .clinerules/workflows.md for review workflows.
-->

# Code Review Process

## Purpose

Code reviews exist to:
- Catch defects before they reach production
- Share knowledge across the team
- Maintain architecture and quality standards
- Mentor and upskill
- Document decisions and rationale

Reviews are **not** about gatekeeping or blame — they are a collaborative quality practice.

---

## Review Triggers

A code review is required when:

| Trigger | Review Type |
|---------|-------------|
| Pull request to `main` | Standard review |
| Security-sensitive change | Standard + security review |
| Database schema change | Standard + schema review |
| Architecture change | Standard + architecture review |
| Mobile release build | Standard + platform review |
| Emergency hotfix | Expedited review (see below) |

---

## Reviewer Assignment

### Default Assignment

Reviews are conducted by the **specialist skill** that owns the affected component:

| Code Area | Reviewer Skill |
|-----------|---------------|
| Backend API, services, business logic | `NB-Backend-Specialist` |
| Frontend web (React, Next.js) | `NB-Frontend-Web-Specialist` |
| Frontend mobile (React Native) | `NB-Frontend-Mobile-Specialist` |
| Database schema, migrations | `NB-PostgreSQL-Architect` |
| Security-sensitive code | `NB-Security-Engineer` |
| Test quality and coverage | `NB-QA-Engineer` |
| Mobile release readiness | `NB-Mobile-Platform-Specialist` |

### Cross-Review

When code spans multiple domains, **each specialist reviews their area**. For example:
- A new API endpoint with auth logic → `NB-Backend-Specialist` + `NB-Security-Engineer`
- A mobile screen with offline sync → `NB-Frontend-Mobile-Specialist` + `NB-Mobile-Platform-Specialist`

---

## Review Process

### 1. Pre-Review (Author's Responsibility)

Before requesting review, the author must ensure:

- [ ] Branch is rebased on `main`
- [ ] All tests pass
- [ ] Linting passes
- [ ] Type checks pass
- [ ] Self-review completed (read your own diff)
- [ ] PR description explains **what** and **why**
- [ ] Breaking changes are documented

### 2. Review Pass

The reviewer evaluates the PR against the checklist (see § Review Checklist below).

**Reviewer rules:**
- Review within a reasonable time (don't block the author unnecessarily)
- Be specific: reference line numbers and explain the issue
- Be kind: critique the code, not the author
- Suggest alternatives, don't just point out problems
- Distinguish between "must fix" and "nit" / "suggestion"

### 3. Feedback Categories

| Category | Meaning | Action |
|----------|---------|--------|
| **Blocking** | Must be fixed before merge | Author fixes before merge |
| **Important** | Should be fixed, but not necessarily in this PR | Author addresses or creates follow-up task |
| **Nit** | Minor style/preference | Optional — author's discretion |
| **Question** | Clarification, not a change request | Author answers |
| **Praise** | Highlighting good work | No action |

Use clear labels so the author knows what's blocking vs. optional.

### 4. Approval

A PR is approved when:
- All blocking comments are resolved
- All required reviewers have approved
- CI pipeline passes
- No unresolved conversations (unless explicitly waived)

### 5. Post-Approval

- Author merges (squash and merge per `git-workflow.md`)
- Branch is deleted
- Any follow-up tasks are created in `memory/tasks/`

---

## Review Checklist

### Functionality
- [ ] Code does what the PR description claims
- [ ] Happy path works correctly
- [ ] Edge cases are handled
- [ ] Error cases are handled gracefully
- [ ] No obvious logic bugs

### Quality
- [ ] Naming is clear and follows conventions
- [ ] Functions are focused and single-responsibility
- [ ] No dead code or commented-out code
- [ ] No unnecessary complexity
- [ ] Comments explain **why**, not **what**

### Testing
- [ ] Tests cover the happy path
- [ ] Tests cover edge cases
- [ ] Tests cover failure scenarios
- [ ] Tests are deterministic (no timing/randomness issues)
- [ ] Tests verify outcomes, not implementation details

### Architecture
- [ ] Follows established patterns (see `resources/architecture.md`)
- [ ] Separation of concerns maintained
- [ ] No business logic in UI layer
- [ ] No data access in UI/controller layer
- [ ] Dependencies flow inward (UI → Services → Domain → Data)

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] No authentication/authorization bypasses
- [ ] No exposure of sensitive data in logs
- [ ] Parameterized queries used (no SQL injection)
- [ ] Output encoding applied (no XSS)

### Maintenance
- [ ] Code is readable
- [ ] No magic numbers (use named constants)
- [ ] Dependencies are justified
- [ ] Documentation updated if needed
- [ ] No breaking changes without documentation

---

## Expedited Review (Emergency Hotfixes)

For urgent production fixes:

1. **One reviewer required** (not two)
2. **Security review required** if the fix touches auth, data access, or crypto
3. **CI may be waived** if the production system is down (document why)
4. **Post-merge review required** — schedule a full review within 24 hours
5. **Document the incident** in `memory/project-decisions.md`

> See `.clinerules/workflows.md § Security Incident Workflow` for expedited paths.

---

## What Code Review Is Not

- **Not a performance review** — code quality, not author evaluation
- **Not a teaching session** — keep feedback focused; create a separate task for mentoring
- **Not a bottleneck** — if reviews are consistently slow, raise the issue with `NB-Project-Admin`
- **Not a rubber stamp** — "LGTM" without reading the code is not a review

---

## Review Metrics

Track these to identify process improvements:

| Metric | Target |
|--------|--------|
| Time from PR open to first review | < 4 hours (business hours) |
| Time from PR open to merge | < 2 days |
| Number of review rounds | < 3 (if higher, the PR may be too large) |
| Defects found in review vs. production | Higher ratio is better (catching bugs early) |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Initial creation | Template review |