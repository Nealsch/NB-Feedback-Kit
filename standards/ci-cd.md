<!--
  PURPOSE: Define CI/CD pipeline requirements, stages, and quality gates.
  POPULATE: At project start. Customise the pipeline stages, runner, and tooling for your stack.
  OWNER: Maintained by NB-Project-Admin. Pipeline implementation is a DevOps task (no dedicated skill — see personas.md Known Gaps).
  OVERRIDES: This is project-specific. General deployment standards are in .clinerules/deployment.md.
  SEE ALSO: .github/workflows/ci.yml for a ready-to-use GitHub Actions template.
-->

# CI/CD Pipeline Standards

## Purpose

The CI/CD pipeline enforces quality gates automatically on every push and pull request. No code reaches `main` without passing all gates.

This aligns with `.clinerules/deployment.md § Deployment Gates` and `.clinerules/testing.md § CI/CD Requirements`.

---

## Pipeline Stages

Every pipeline must include these stages in order:

```
1. Checkout & Setup → 2. Install Dependencies → 3. Lint → 4. Type Check → 5. Build → 6. Test → 7. Security Scan → 8. (Deploy)
```

### Stage Requirements

| Stage | What It Does | Blocking? | Tooling (Example) |
|-------|-------------|-----------|-------------------|
| **Checkout & Setup** | Clone repo, set up runtime (Node, Python, etc.) | Yes | `actions/checkout`, `actions/setup-node` |
| **Install Dependencies** | Install packages, cache for speed | Yes | `npm ci`, `pnpm install --frozen-lockfile` |
| **Lint** | Enforce code style and quality rules | Yes | ESLint, Prettier, Ruff, Flake8 |
| **Type Check** | Verify type safety | Yes | `tsc --noEmit`, mypy |
| **Build** | Compile/build the application | Yes | `npm run build`, `nest build` |
| **Test** | Run unit + integration tests | Yes | Vitest, Jest, Pytest |
| **Security Scan** | Scan dependencies and code for vulnerabilities | Yes | `npm audit`, Snyk, Trivy, CodeQL |
| **Deploy** | Deploy to staging/prod (only on `main`) | Conditional | Platform-specific |

---

## Pipeline Triggers

| Trigger | Pipeline Behaviour |
|---------|-------------------|
| Push to `feature/*` or `fix/*` | Run stages 1-7 (no deploy) |
| Pull request to `main` | Run stages 1-7 (no deploy) — **required to pass before merge** |
| Push to `main` (after merge) | Run stages 1-7, then deploy to staging |
| Manual deploy trigger | Deploy to production (requires approval) |

---

## Caching Strategy

To keep pipelines fast:

- **Dependency cache:** Cache `node_modules`, `.pnpm-store`, or equivalent
- **Build cache:** Cache compiled output (e.g., `.next`, `dist`)
- **Test cache:** Cache test results for unchanged files (if tooling supports it)

---

## Quality Gates

A pipeline **fails** (blocks merge) if:

- [ ] Any lint error exists
- [ ] Any type error exists
- [ ] Build fails
- [ ] Any test fails
- [ ] Test coverage drops below the threshold defined in `standards/testing.md`
- [ ] Security scan finds critical vulnerabilities
- [ ] Security scan finds high vulnerabilities (configurable — see below)

### Vulnerability Handling

| Severity | Pipeline Action |
|----------|----------------|
| Critical | **Block** — pipeline fails |
| High | **Block** — pipeline fails (can be overridden with documented exception) |
| Medium | **Warn** — pipeline passes, but creates a task in `memory/tasks/` |
| Low | **Info** — logged, no action |

> Exceptions must be documented in `memory/project-decisions.md` with a remediation timeline.

---

## Environment Strategy

The pipeline should support the environments defined in `.clinerules/deployment.md`:

| Environment | When Deployed | Approval Required |
|-------------|---------------|-------------------|
| Development | On push to `main` (automatic) | No |
| Staging | After dev deploy passes health checks | No |
| Production | Manual trigger or tagged release | **Yes** — release owner approval |

> See `.clinerules/deployment.md § Deployment Strategies` for canary/blue-green guidance.

---

## Secrets Management

CI/CD secrets must:

- Be stored in the CI platform's secret store (GitHub Secrets, GitLab CI Variables, etc.)
- **Never** be echoed in logs
- Be scoped to the minimum required environment
- Be rotated periodically

> See `.clinerules/security.md § Secrets Management` for the full policy.

---

## Template Pipeline

A ready-to-use GitHub Actions template is provided in `.github/workflows/ci.yml`.

**Customise at project start:**
- Node version
- Package manager (npm, pnpm, yarn)
- Linting commands
- Build commands
- Test commands
- Deploy steps

---

## Pipeline Observability

The pipeline should report:

- Build duration per stage (to identify slow stages)
- Test results (pass/fail/skip counts)
- Coverage percentage
- Vulnerability counts
- Deployment status and duration

> See `.clinerules/observability.md` for broader observability standards.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Initial creation | Template review |