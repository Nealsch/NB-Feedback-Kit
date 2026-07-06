# Frequently Asked Questions

Common questions about NB Feedback Kit — what it is, how it works, and whether it's the right fit for your project.

---

## What is NB Feedback Kit?

NB Feedback Kit is an open-source SDK and backend that adds in-app feedback collection to React and React Native applications. Users can report bugs, request features, and send general feedback directly from your app — with optional screenshot uploads.

Every submission creates a GitHub Issue in your repository. Release notes and a label-driven roadmap can be surfaced back to users through the same SDK. The result is a feedback loop that lives entirely inside your existing GitHub workflow.

The goal is simple: let you own the entire feedback pipeline without relying on a third-party SaaS platform.

---

## Why not just use GitHub Issues?

GitHub Issues is excellent — for developers. It's where engineering teams already track work, triage bugs, and ship features. I'm not trying to replace it.

The problem is that GitHub Issues isn't designed for end users. Asking a non-technical user to navigate to your repository, understand issue templates, and fill in a form is a poor experience. Most won't do it.

NB Feedback Kit bridges that gap. Your users get a polished, in-app feedback experience. You get structured issues in GitHub, with labels, metadata, and screenshots — exactly where your team already works. No new tool to learn, no external dashboard to check.

---

## Is NB Feedback Kit a hosted SaaS?

No. NB Feedback Kit is self-hosted. You deploy the backend to your own infrastructure and the SDK into your own application.

You retain ownership of:

- Your GitHub repositories
- Your infrastructure
- Your object storage
- Your data

There is no vendor lock-in. If you decide to stop using the project, your feedback issues remain in your GitHub repository and your screenshots remain in your storage. Nothing is held hostage.

---

## Which storage providers are supported?

The project is storage-provider agnostic. Any S3-compatible provider should work. I've designed the storage layer to be provider-independent, so you choose where screenshots live.

Known compatible providers include:

- Amazon S3
- Cloudflare R2
- Backblaze B2 (S3 API)
- MinIO
- DigitalOcean Spaces
- Wasabi

The SDK also supports a custom endpoint option, so if you have an existing upload endpoint, you can route screenshots through it without changing your infrastructure. See the [Storage Providers guide](storage-providers.md) for configuration details.

---

## Why is a backend required?

The backend exists to protect sensitive credentials. GitHub tokens and storage credentials must never reach the client — if they did, any user could extract them and act on your behalf.

The backend handles:

- GitHub token usage (server-side only)
- Storage credential signing (presigned URLs, server-mediated uploads)
- Authentication
- Input validation and attachment sanitisation
- Rate limiting

Clients only ever hold a public API key. All privileged operations happen on the backend, where credentials remain isolated. See the [Security guide](security.md) for the full threat model.

---

## Where can I deploy the backend?

The backend runs as a Cloudflare Worker, so deployment is straightforward on Cloudflare's platform. The architecture is designed to be platform-light.

If you prefer a different environment, the codebase is portable enough to adapt to:

- Docker containers
- Virtual private servers
- Kubernetes clusters
- Other serverless platforms (where the runtime is compatible)

The deployment surface is intentionally small — a single Worker with KV and Durable Object bindings. No database server to manage, no complex infrastructure to operate.

---

## Which frontend frameworks are supported?

The first release focuses on React and React Native. The React SDK provides headless components and hooks that work in any React application — Vite, Next.js, Remix, Create React App, or custom setups.

I built the SDK to be headless so it imposes no styling opinions. You bring your own UI; the SDK handles the data flow.

Future framework support will be guided by community interest. If you'd like to see Vue, Svelte, or another framework supported, let me know — but I'm not making promises about timelines.

---

## Can one backend support multiple projects?

Yes. A single backend can securely serve multiple applications while keeping project configurations isolated.

Each application gets its own API key. That key maps to a specific GitHub repository and storage configuration on the backend. A key for Project A cannot create issues in Project B's repository — isolation is enforced server-side.

This makes NB Feedback Kit practical for teams managing multiple products, or for agencies running feedback collection for several clients from a single deployment.

---

## Does the SDK expose my GitHub token?

No. Credentials remain on the backend, always.

The GitHub token used to create issues lives only as an encrypted Worker secret. It is never included in the SDK bundle, never sent to the client, and never exposed in any client-accessible code. The SDK communicates only with your backend using a public API key.

This is a core security boundary of the project and it will not change.

---

## Are screenshots required?

No. Screenshot uploads are entirely optional.

Applications may choose to support text-only feedback. When no storage provider is configured, the SDK simply hides the screenshot picker and accepts text-only submissions.

If you want screenshots later, adding a storage provider is a configuration change — no code rewrite required.

---

## Can I customise the feedback interface?

Yes. The SDK is headless by design, so it integrates naturally into your application's existing UI.

Components accept `className` and `style` props, so you can match your design system precisely. If the built-in components don't fit your needs, the hooks (`useSubmitFeedback`, `useReleaseNotes`, `useRoadmap`) let you build a completely custom interface while the SDK handles the API communication.

You bring the UI. The SDK handles the data flow.

---

## Is the project really open source?

Yes. NB Feedback Kit is licensed under the MIT License — one of the most permissive open-source licenses available. You can use it in personal projects, commercial products, and everything in between.

The core project is intended to remain open source. That's not a temporary state or a freemium tier. The SDK, the backend, and the documentation are all in the public repository.

If I introduce commercial offerings in the future, they will be optional services that support ongoing development — not replacements for or restrictions on the open-source project. The core will stay free and open.

---

## Why should I use NB Feedback Kit instead of a commercial feedback platform?

If your development team already uses GitHub as its workflow, NB Feedback Kit extends that workflow directly into your applications. Feedback becomes GitHub Issues. Release notes come from GitHub Releases. Your roadmap comes from your labels.

You retain ownership of:

- Your repositories
- Your storage
- Your infrastructure

No new SaaS platform to evaluate. No additional dashboard to monitor. No separate database to maintain. No per-seat licensing costs.

Commercial feedback platforms serve a real need, and many are excellent products. NB Feedback Kit is for teams who would rather stay inside the tools they already use and own.

---

## How can I contribute?

Contributions are welcome and genuinely valued. Whether it's a typo fix or a new feature, it all helps.

I welcome:

- **Bug reports** that help reproduce and fix real issues
- **Documentation improvements** — clarity is a feature
- **Feature suggestions** that align with the project's direction
- **Pull requests** for bug fixes and new capabilities
- **Examples** that help others integrate the SDK

Start by reading [`CONTRIBUTING.md`](../CONTRIBUTING.md). It covers the development setup, coding standards, testing requirements, and the review process.

For significant changes, please open a Discussion first to confirm the direction before investing time in implementation.

---

## How can I support the project?

Open-source software takes real time and effort to maintain. I work on NB Feedback Kit because I believe developers should own their feedback infrastructure — but community support keeps it sustainable.

You can support the project by:

- **Starring the repository** — it helps others discover the project
- **Reporting bugs** — clear reports make the project more reliable
- **Improving documentation** — making it easier for the next person
- **Contributing code** — fixes, features, and examples
- **Sharing the project** — telling other developers who might benefit

If you'd like to help support the continued development of NB Feedback Kit, you can buy me a coffee:

**Ko-fi:** https://ko-fi.com/nealsch

Donations are appreciated but never expected. The project is open source, and it stays that way regardless.