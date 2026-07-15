# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog management.

## How It Works

1. **Contributors add a changeset** describing what changed (patch/minor/major + which package).
2. **Changesets are committed** alongside the code changes they describe.
3. **A Release PR** aggregates pending changesets, bumps versions, and updates CHANGELOGs.
4. **Merging the Release PR** publishes to npm.

## Adding a Changeset

From the repo root:

```bash
pnpm changeset
```

This launches an interactive prompt that asks:

1. **Which packages changed?** — Select `@nb-feedback-kit/react-sdk`, `@nb-feedback-kit/shared-types`, or both.
2. **Semver bump type:**
   - `patch` — Bug fixes (0.0.x)
   - `minor` — New features, backward-compatible (0.x.0)
   - `major` — Breaking changes (x.0.0)
3. **Summary** — A description of the change (appears in the CHANGELOG).

This generates a markdown file in `.changeset/` like:

```
---
"@nb-feedback-kit/react-sdk": minor
"@nb-feedback-kit/shared-types": patch
---

Added `ReleaseNotesModal` component and `useReleaseNotes` hook.
```

Commit this file with your code changes.

## Consuming Changesets (Versioning)

To preview version bumps locally:

```bash
pnpm changeset version
```

This:
- Reads all pending changesets in `.changeset/`
- Bumps `version` in affected `package.json` files
- Updates (or creates) `CHANGELOG.md` for each package
- Removes consumed changeset files

> **Note:** In CI, this is handled automatically by the Release workflow.

## Releasing

Releases are automated via GitHub Actions (see `.github/workflows/release.yml`).

1. Push commits with changesets to `main`.
2. The workflow opens a **"Version Packages" PR** with version bumps and CHANGELOG updates.
3. Merge the PR to publish to npm.

### Manual Release (Fallback)

If automation is unavailable:

```bash
pnpm changeset version
pnpm changeset publish
```

## Publishable Packages

| Package | Published? |
|---------|------------|
| `@nb-feedback-kit/shared-types` | ✅ Yes |
| `@nb-feedback-kit/react-sdk` | ✅ Yes |
| `@nb-feedback-kit/api` | ❌ No (Cloudflare Worker, deployed via Wrangler) |
| `demo-app` | ❌ No (internal reference app) |

Only packages with `"private": false` (or no `private` field) and listed in the workspace are published.