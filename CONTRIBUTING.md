# Contributing to NB Feedback Kit

First: thank you.

Every open-source project lives because someone decided to give their time to it. Whether you're fixing a typo, reporting a bug, proposing a feature, or just asking a question in Discussions — that matters. This document exists to make contributing as straightforward and welcoming as possible.

The project values consistency over complexity. Processes are intentionally lightweight and may evolve as the project and community grow.

---

## What Counts as a Contribution

A lot of the work that keeps this project healthy isn't code at all. I welcome and value:

- **Bug reports** that help me reproduce and fix real issues
- **Feature ideas** that push the project forward
- **Documentation improvements** — clarity is a feature
- **Code fixes** for bugs, edge cases, or performance
- **New features** that align with the project's direction
- **Examples and demos** that help others integrate the SDK
- **Testing** on different platforms, browsers, and storage providers
- **Design feedback** on the developer experience

If you're unsure whether something is worth contributing, the answer is almost always yes. Open a Discussion and ask.

---

## Before You Start

Before opening a new Issue or starting work on a change, please:

1. **Search existing Issues** to avoid duplicates.
2. **Search existing Discussions** — ideas and questions often live there first.
3. **Check the roadmap** in [`ROADMAP.md`](ROADMAP.md) to see what's already planned.

### For significant changes

If you're proposing a new feature, a change to the architecture, or anything that touches the project's core boundaries (security model, storage provider abstraction, API contract), **please open a Discussion first**.

This isn't bureaucracy. It's a way to make sure your time is well spent and that the change aligns with where the project is headed. A five-minute conversation upfront can save five hours of work later.

---

## Development Setup

NB Feedback Kit is a pnpm monorepo using Turborepo. Here's how to get it running locally.

### Prerequisites

- **Node.js** 20 or later
- **pnpm** 9 or later

### Clone and install

```bash
git clone https://github.com/Nealsch/nb-feedback-kit.git
cd nb-feedback-kit
pnpm install
```

### Repository layout

```
/
├── apps/
│   └── demo-app/          # Reference integration (Vite + React)
├── packages/
│   ├── api/               # Cloudflare Worker (Hono)
│   ├── react-sdk/         # React SDK (headless components + hooks)
│   └── shared-types/      # Shared TypeScript contracts
├── docs/                  # Documentation
└── assets/                # Diagrams and images
```

### Common commands

| Task | Command |
|---|---|
| Install dependencies | `pnpm install` |
| Run the demo app | `pnpm dev` |
| Build all packages | `pnpm build` |
| Run all tests | `pnpm test` |
| Type-check all packages | `pnpm typecheck` |
| Lint all packages | `pnpm lint` |
| Clean build artifacts | `pnpm clean` |

These commands run through Turborepo, so they'll execute across all packages in the correct order and cache results where possible.

### Working on the Worker

The API package (`packages/api`) runs on Cloudflare Workers. To develop locally:

```bash
cd packages/api
pnpm dev    # Starts Wrangler's local dev server
```

You'll need to set up local secrets (GitHub token, API key) via your `wrangler.toml` or `.dev.vars` file. See [`docs/backend.md`](docs/backend.md) for details.

### Working on the SDK

The React SDK (`packages/react-sdk`) builds with tsup. During development, the demo app in `apps/demo-app` imports directly from source, so changes are reflected immediately when you run `pnpm dev` from the repo root.

---

## Coding Standards

This project cares about code that is **readable, secure, and maintainable**. Cleverness is welcome in algorithms; it is not welcome in naming or control flow.

### What I expect

- **TypeScript everywhere.** No untyped `any` without a justification in a comment.
- **Self-documenting code.** Function names should describe what they do. Variable names should describe what they hold. If a comment is needed to explain *what* the code does, the code probably needs renaming.
- **Comments explain *why*, not *what*.** Use them for context, constraints, assumptions, and tradeoffs — not narration.
- **Secure by default.** Never hardcode secrets. Never disable authentication or validation. Never trust client-supplied input without sanitising it server-side.
- **No new dependencies without explicit approval.** This project is deliberately lightweight — the SDK ships with a single runtime dependency (`shared-types`). Adding any new dependency (runtime or dev) requires discussion in an Issue or PR first. You must justify why existing tools or the standard library cannot solve the problem, assess the maintenance and security risk of the package, and confirm it does not overlap with existing dependencies. PRs that add dependencies without prior discussion will be rejected.
- **Consistent style.** I use ESLint and Prettier. Run `pnpm lint` before submitting.

### Architecture boundaries

If your change touches the boundary between client and server, please be aware of:

- **Server-side secret boundary** — GitHub tokens, JWT signing keys, admin tokens, and storage credentials never reach the client. They live only as encrypted Worker secrets.
- **Dual-scheme authentication** — Everything under `/api/*` requires valid authentication: either a per-device JWT (1-hour TTL, revocable) or an X-API-Key. Unauthenticated requests are rejected. Admin routes use a separate `ADMIN_TOKEN` with constant-time comparison.
- **Storage security boundary** — For S3 presign, the Worker signs short-lived PUT URLs and the browser uploads directly to the bucket; credentials never reach the client. For R2 native uploads, bytes flow through the Worker with server-side validation (size, MIME, magic bytes). Both modes keep cloud credentials server-side.
- **Attachment sanitisation** — Client-supplied URLs are validated and rebuilt server-side (`sanitizeAttachments`) before being interpolated into the GitHub issue body. Only `http`/`https` schemes allowed; max 5 attachments; all fields length-capped.

These boundaries exist for security reasons and should not be weakened without explicit discussion.

---

## Testing Requirements

All code changes that affect logic, validation, or business behaviour **must include tests**. This is not optional.

### What must be tested

Every PR that changes code must include:

- **Unit tests** for new or modified functions, hooks, and components.
- **Happy path coverage** — the normal expected flow works.
- **Edge case coverage** — invalid input, empty values, boundary conditions (e.g., malformed attachment URLs, invalid feedback types, empty descriptions).
- **Failure case coverage** — error paths behave correctly (e.g., GitHub API failure, auth rejection, rate-limit response).

### When tests are not required

- Documentation-only changes.
- Configuration changes that do not affect runtime behaviour.

### Security-critical paths

The following areas have mandatory regression coverage and will receive extra scrutiny during review:

- **Attachment sanitisation** (`sanitizeAttachments`) — never regress silently.
- **Authentication middleware** (`createAuthMiddleware`) — every `/api/*` route must remain protected.
- **Rate limiter** (Durable Object) — counter logic must remain isolated and correct.
- **GitHub issue body formatting** — the rendered Markdown must remain correct.

Run the full test suite before requesting review:

```bash
pnpm test
```

If tests are missing from a PR that changes logic, the PR will be blocked until they are added.

---

## Security Review

This project handles authentication, user-submitted content, and GitHub API integration. Security is not an afterthought — it is a review gate.

### What reviewers will check

Every PR is reviewed for:

- **Secret exposure** — no tokens, keys, or credentials in code, logs, or commits.
- **Input validation** — all client-supplied data is validated and sanitised server-side.
- **Auth boundary integrity** — `/api/*` routes remain protected; no bypasses introduced.
- **Injection risks** — especially in the GitHub issue body (Markdown interpolation) and attachment URL handling.
- **Dependency safety** — no unvetted packages added (see the dependency rule above).

### Changes that require explicit security sign-off

If your PR touches any of the following, it will not be merged until a maintainer has explicitly confirmed the security implications:

- Authentication or authorisation logic
- Attachment sanitisation or URL validation
- Storage provider credential handling
- GitHub token usage
- Rate-limit logic
- Any new external API call

When in doubt, over-explain your security reasoning in the PR description. Reviewers would rather read extra context than miss a risk.

---

## Commit Messages

I follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This keeps the history readable and enables automated changelog generation.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Common types

| Type | Use for |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or correcting tests |
| `build` | Changes to the build system or dependencies |
| `ci` | Changes to CI configuration |
| `chore` | Routine maintenance, tooling, config |

### Examples

```
feat(react-sdk): add useReleaseNotes hook
fix(api): handle empty attachment array in sanitizeAttachments
docs(readme): update installation instructions
```

### Why this matters

Conventional commits let me generate changelogs automatically, make the history scannable, and help reviewers understand the intent of a change at a glance.

---

## Pull Requests

I use pull requests for all changes. Here's how to make the process smooth for everyone.

### Before opening a PR

1. **Open an Issue or Discussion first** for anything beyond a small fix. This confirms the change is wanted and avoids wasted effort.
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/add-new-storage-provider
   ```
3. **Keep changes focused.** One feature or one bug fix per PR. If you find yourself making unrelated changes, split them into separate PRs.

### Writing the PR description

A good PR description answers three questions:

1. **What changed?**
2. **Why did it change?**
3. **How was it tested?**

If the PR fixes an issue, reference it: `Fixes #123`.

### Review process

- All PRs require at least one review before merging.
- Reviews focus on correctness, security, architecture alignment, and documentation.
- Be kind. Be specific. Be open to feedback.
- If a reviewer asks for changes, that's normal — it's how I maintain quality.

---

## Pull Request Checklist

Before requesting review, please confirm:

- [ ] I have searched existing Issues and Discussions for related work
- [ ] My changes follow the project's coding standards
- [ ] **I have written unit tests** for all new or modified logic (happy path, edge cases, and failure cases)
- [ ] All tests pass (`pnpm test`)
- [ ] Type checks pass (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] **No new dependencies were added**, OR any new dependency was explicitly discussed and approved
- [ ] **I have reviewed my changes for security impact** (secret exposure, input validation, auth boundaries, injection risks)
- [ ] I have updated documentation where necessary
- [ ] My commits follow Conventional Commits
- [ ] No secrets, tokens, or credentials are included
- [ ] Breaking changes are clearly documented in the PR description

---

## Versioning

NB Feedback Kit follows [Semantic Versioning (SemVer 2.0.0)](https://semver.org/). Every release is assigned a version in the format:

```
MAJOR.MINOR.PATCH
```

### PATCH

Used for changes that do not modify the public API:

- Bug fixes
- Documentation improvements
- Internal refactoring
- Dependency updates
- Performance improvements

### MINOR

Used for backwards-compatible additions:

- New features
- New configuration options
- New integrations
- Additional SDK capabilities

Existing applications should continue to work without modification.

### MAJOR

Used when introducing intentional breaking changes.

Breaking changes are always documented in both:

- [`CHANGELOG.md`](CHANGELOG.md)
- GitHub Release Notes

Migration guidance is provided where appropriate.

---

## Branching Strategy

The repository uses a simple branching model.

The protected branch is **`main`**. It should always reflect a stable, releasable state.

All development occurs in short-lived feature or fix branches.

### Naming conventions

Use descriptive branch names prefixed by type:

```
feature/add-roadmap
feature/react-native
fix/upload-timeout
fix/security-validation
docs/readme-improvements
chore/dependency-updates
```

### Keeping PRs focused

Keep pull requests focused on a single feature or fix. Avoid mixing unrelated changes in the same branch. If a change requires work in multiple areas, open separate PRs for each.

---

## Changelog

The project maintains a [`CHANGELOG.md`](CHANGELOG.md) following the principles of [Keep a Changelog](https://keepachangelog.com/).

The changelog records notable changes under the following categories:

- **Added** — new features
- **Changed** — changes to existing functionality
- **Fixed** — bug fixes
- **Removed** — removed features
- **Deprecated** — features slated for removal
- **Security** — security-related changes

Contributors should update the changelog when submitting changes that affect users. Internal-only changes (refactors, test additions) generally do not require a changelog entry.

---

## Releases

Official releases are published using **GitHub Releases**.

Each release includes:

- A summary of the release
- New features
- Bug fixes
- Documentation improvements
- Security updates
- Breaking changes (if applicable)
- Upgrade or migration notes where required

---

## Recommended Release Workflow

For maintainers, the recommended release process is:

1. Merge approved Pull Requests into `main`.
2. Update [`CHANGELOG.md`](CHANGELOG.md) with all notable changes since the last release.
3. Increment the project version following Semantic Versioning.
4. Commit the version update.
5. Create and push a Git tag (for example, `v1.1.0`).
6. Create a GitHub Release using the tag, using the changelog entries as the release notes.
7. Publish the package to npm (when applicable).

This process is intentionally simple while the project is maintained by a single maintainer. Automation (CI-based publishing, automated changelog generation) may be introduced in the future as the project grows.

---

## Documentation

Documentation improvements are always welcome. If you found something confusing, someone else probably will too — and fixing it is a genuine contribution.

When updating documentation:

- Explain the *why*, not just the *what*.
- Keep examples minimal and copy-pasteable.
- Use relative links for internal references.
- Place project-specific docs in the `docs/` folder.

---

## Security

**Do not report security vulnerabilities through public GitHub Issues.**

If you believe you've found a security issue, please review [`SECURITY.md`](SECURITY.md) and follow the private reporting process outlined there.

Security is a first-class concern in this project. The default configuration is the most secure configuration, and I expect contributions to maintain that standard.

---

## Community

I want this to be a place where people feel comfortable contributing, regardless of experience level.

- **[Code of Conduct](CODE_OF_CONDUCT.md)** — The shared expectations for behaviour.
- **[Security Policy](SECURITY.md)** — How to report vulnerabilities.
- **[Support](SUPPORT.md)** — Where to ask questions and get help.

If you're ever unsure where something belongs, open a Discussion. I'll point you in the right direction.

---

## Thank You

Open source is built on generosity. Every issue filed, every PR reviewed, every typo fixed, and every question answered makes the project better for everyone who uses it.

If you've read this far, you're already contributing — you're taking the project seriously enough to understand how it works. That's the part that matters most.

Thank you for being here.

— Neal