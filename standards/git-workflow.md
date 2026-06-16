<!--
  PURPOSE: Define branching strategy, commit conventions, PR process, and merge rules.
  POPULATE: At project start. Customise branch names, protection rules, and review requirements.
  OWNER: Enforced by NB-Project-Admin.
  OVERRIDES: This is project-specific. General coding standards are in .clinerules/coding-standards.md.
-->

# Git Workflow Standards

## Branching Strategy

This template uses **trunk-based development** with short-lived feature branches. This keeps integration simple and reduces merge conflicts.

### Branch Types

| Branch Pattern | Purpose | Lifetime |
|----------------|---------|----------|
| `main` | Production-ready code. Always deployable. | Permanent |
| `feature/<task-id>-<short-description>` | New feature or enhancement | Merged and deleted when complete |
| `fix/<task-id>-<short-description>` | Bug fix | Merged and deleted when complete |
| `hotfix/<task-id>-<short-description>` | Urgent production fix (branched from `main`) | Merged and deleted when complete |
| `chore/<short-description>` | Dependency updates, config changes, refactoring | Merged and deleted when complete |

### Branch Rules

1. **Branch from `main`** — all feature/fix branches start from the latest `main`
2. **Keep branches short-lived** — target merge within 2-3 days; split large work into smaller branches
3. **One concern per branch** — don't mix features, fixes, and refactoring in the same branch
4. **Rebase before merge** — rebase onto `main` to resolve conflicts before opening a PR
5. **Delete after merge** — remove branches immediately after merge to keep the repo clean

---

## Commit Conventions

### Commit Message Format

Use **Conventional Commits** for structured, parseable history:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semi colons, etc. — no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding missing tests or correcting existing tests |
| `chore` | Build process, dependencies, tooling — no production code change |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |
| `build` | Build system or external dependencies |

### Rules

1. **Subject line:** imperative mood (`add` not `added`), lowercase, no period, max 72 characters
2. **Body:** explain **why** the change was made (the diff already shows **what**)
3. **Footer:** reference task ID (e.g., `Closes #123`) or breaking change notes (`BREAKING CHANGE:`)
4. **One logical change per commit** — don't combine unrelated changes
5. **Write clear messages** — `fix: handle null user in checkout flow` not `fix: stuff`

### Examples

```
feat(auth): add MFA support for admin accounts

Adds TOTP-based multi-factor authentication for users with the admin
role. Users can enable MFA from their profile settings.

Closes #142
```

```
fix(api): handle null user_id in transaction endpoint

The endpoint assumed user_id was always present from the JWT, but
service-to-service calls omit it. Added explicit validation before
processing.

Closes #198
```

```
chore(deps): bump prisma from 5.1.0 to 5.2.0
```

---

## Pull Request Process

### Before Opening a PR

- [ ] Branch is rebased on latest `main`
- [ ] All tests pass locally
- [ ] Linting passes
- [ ] Type checks pass
- [ ] Code is self-reviewed
- [ ] Commit messages follow Conventional Commits

### PR Description Template

```markdown
## Summary
[Brief description of what this PR does and why]

## Changes
- [Key change 1]
- [Key change 2]

## Testing
- [How to test this change]
- [What was tested]

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated (if applicable)
- [ ] No breaking changes (or breaking changes documented)
- [ ] Security implications considered
```

### Review Requirements

| Change Type | Reviewers Required | Additional Gate |
|-------------|-------------------|-----------------|
| Standard feature/fix | 1 reviewer | — |
| Security-sensitive (auth, crypto, data access) | 1 reviewer + `NB-Security-Engineer` | Security review required |
| Database schema change | 1 reviewer + `NB-PostgreSQL-Architect` | Schema review required |
| Architecture change | 2 reviewers | ADR in `memory/project-decisions.md` |
| Mobile release | 1 reviewer + `NB-Mobile-Platform-Specialist` | Platform review required |

### Merge Rules

1. **Squash and merge** for feature/fix branches (keeps history clean)
2. **Merge commit** for release branches or when preserving detailed history matters
3. **Never force-push** to `main` or shared branches
4. **Delete the source branch** after merge

---

## Protection Rules (for `main`)

> **Populate at project start:** Configure these in your Git platform (GitHub, GitLab, etc.)

- [ ] Require pull request before merging
- [ ] Require at least 1 approval
- [ ] Require status checks to pass (CI pipeline)
- [ ] Require branches to be up to date before merging
- [ ] Require conversation resolution before merging
- [ ] Restrict force-pushes
- [ ] Restrict deletions

---

## Handling Secrets

**Never commit secrets.** If a secret is accidentally committed:

1. **Immediately rotate the secret** (assume it's compromised)
2. **Remove from history** using `git filter-repo` or BFG Repo-Cleaner
3. **Document the incident** in `memory/project-decisions.md`
4. **Review access logs** for unauthorised use

See `.clinerules/security.md § Secrets Management` for the full policy.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Initial creation | Template review |