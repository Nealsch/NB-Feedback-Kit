---
"@nb-feedback-kit/shared-types": minor
"@nb-feedback-kit/react-sdk": patch
---

Define the release-notes response contract in shared-types and render the release link.

## Problem
The `GET /api/releases` endpoint returns `{ version, date, body, url }`, but the shared `ReleaseNote` type omitted `url`. This was a contract drift — TASK-009's deliverable "Response format defined in shared-types" was not met. As a consequence, `ReleaseNotesModal` could not link to the GitHub release page, even though the data was available.

## Changes
- **`shared-types`**: Added optional `url?: string` to `ReleaseNote`. Optional to preserve backward compatibility with older API responses that may omit it.
- **`react-sdk` (`ReleaseNotesModal`)**: When `release.url` is present, the version badge renders as an anchor (`<a target="_blank" rel="noopener noreferrer">`) pointing to the GitHub release, with an external-link indicator (↗). When absent, falls back to the existing `<span>` badge.

## Behavior change
- **Additive only.** The `url` field is optional; existing consumers and older API responses continue to work unchanged.

## Testing
- `pnpm typecheck` ✅ (4/4 packages)
- `pnpm build` ✅ (4/4 packages, fresh build — cache invalidated)