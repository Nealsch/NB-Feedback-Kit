---
"@nb-feedback-kit/react-sdk": minor
---

Fix SDK→API error propagation for feedback submissions.

## Problem
`useSubmitFeedback` swallowed failures by returning `{ success: false }` instead of throwing. As a result, `FeedbackModal` could not detect errors — it closed the modal and showed a success alert even when the API rejected the submission (network failure, invalid key, GitHub down, etc.).

## Changes
- **`useSubmitFeedback`**: Now throws a `FeedbackSubmitError` on:
  - Network errors (fetch rejected before a response was received)
  - Non-JSON / malformed responses
  - Non-2xx HTTP status codes
  - API responses with `success: false`
- **`FeedbackSubmitError`**: New exported error class for typed catch handling by consumers.
- **`FeedbackModal`**: Added inline submission error banner (`role="alert"`) shown when `onSubmit` rejects. Modal stays open so the user can retry. Error clears on retry or close.
- **`index.ts`**: Exports `FeedbackSubmitError`.

## Behavior change
- **Breaking (edge-case):** `submitFeedback()` now rejects on failure instead of resolving with `{ success: false }`. Consumers calling the hook directly must add `try/catch`. The bundled `FeedbackModal` handles this internally; consumers using custom UI must update their submit handler.

## Demo app
Updated `onSubmit` to rely on the rejection — the modal surfaces the error inline, the success alert only fires on actual success.

## Testing
- `pnpm typecheck` ✅ (4/4 packages)
- `pnpm build` ✅ (4/4 packages)
- SDK package has no test framework configured (see tech-debt register).