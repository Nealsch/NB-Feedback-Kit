<div align="center">

<img src="assets/NBFeedbackKit_Logo_Transparent.png" width="140" alt="NB Feedback Kit logo" />

# NB Feedback Kit

**Secure, GitHub-native feedback infrastructure for React & React Native.**

In-app feedback, screenshots, issues, roadmaps, and release notes — using *your* GitHub, *your* storage, and *your* infrastructure.

[![License: MIT][license]](LICENSE)
[![Latest Release][release]](https://github.com/Nealsch/nb-feedback-kit/releases/latest)
[![GitHub Stars][stars]](https://github.com/Nealsch/nb-feedback-kit/stargazers)
[![Forks][forks]](https://github.com/Nealsch/nb-feedback-kit/network/members)

[![npm version][npm]](https://www.npmjs.com/package/nb-feedback-kit)
[![Downloads][downloads]](https://www.npmjs.com/package/nb-feedback-kit)
[![TypeScript][ts]](https://www.typescriptlang.org/)
[![React][react]](https://react.dev/)
[![React Native][rn]](https://reactnative.dev/)
[![Build Status][build]](https://github.com/Nealsch/nb-feedback-kit/actions/workflows/ci.yml)

</div>

---

> **Own your feedback.**
>
> **Your GitHub. Your storage. Your infrastructure. No vendor lock-in.**

---

<p align="center">
  <a href="#quick-start"><strong>Quick Start</strong></a> &nbsp;·&nbsp;
  <a href="#features"><strong>Features</strong></a> &nbsp;·&nbsp;
  <a href="#architecture"><strong>Architecture</strong></a> &nbsp;·&nbsp;
  <a href="#documentation"><strong>Docs</strong></a> &nbsp;·&nbsp;
  <a href="CONTRIBUTING.md"><strong>Contribute</strong></a>
</p>

---

<p align="center">
  <img src="assets/FeedbackKitBanner.png" alt="NB Feedback Kit — the complete feedback ecosystem" width="860" />
</p>

---

## Why NB Feedback Kit?

Building feedback into an app usually forces a hard choice:

1. **Build it yourself** — significant engineering effort and ongoing maintenance.
2. **Adopt a hosted SaaS** — recurring costs, a duplicate workflow, another user account, and your product data living in someone else's infrastructure.

NB Feedback Kit is a third option: **reusable, open infrastructure that extends the tools you already use.** You keep GitHub as the system of record, keep screenshots in your own object storage, and keep the backend on infrastructure you own. No proprietary platform, no data export, no lock-in.

| Capability | <img src="assets/icons/folder-git-2.svg" width="16" /> &nbsp;NB Feedback Kit | Hosted SaaS | DIY build |
|---|:--:|:--:|:--:|
| GitHub-native | <img src="assets/icons/check.svg" width="16" /> | — | — |
| Own your storage | <img src="assets/icons/check.svg" width="16" /> | — | <img src="assets/icons/check.svg" width="16" /> |
| Self-hosted | <img src="assets/icons/check.svg" width="16" /> | — | <img src="assets/icons/check.svg" width="16" /> |
| Vendor neutral | <img src="assets/icons/check.svg" width="16" /> | — | <img src="assets/icons/check.svg" width="16" /> |
| Setup in minutes | <img src="assets/icons/check.svg" width="16" /> | <img src="assets/icons/check.svg" width="16" /> | — |
| No per-seat pricing | <img src="assets/icons/check.svg" width="16" /> | — | <img src="assets/icons/check.svg" width="16" /> |

---

## Features

| | Feature | Description |
|:--:|---|---|
| <img src="assets/icons/folder-git-2.svg" width="20" /> | **GitHub-native** | Feedback becomes GitHub Issues. Releases, labels, and milestones stay where your team already works. |
| <img src="assets/icons/camera.svg" width="20" /> | **Screenshot Uploads** | Users attach screenshots stored directly in your own S3-compatible bucket. |
| <img src="assets/icons/file-text.svg" width="20" /> | **Release Notes** | Surface changelogs from GitHub Releases inside your app, automatically. |
| <img src="assets/icons/map.svg" width="20" /> | **Roadmap** | Render a public roadmap driven by GitHub labels and milestones. |
| <img src="assets/icons/database.svg" width="20" /> | **S3-compatible Storage** | Bring Amazon S3, Cloudflare R2, MinIO, Backblaze B2, or any compatible provider. |
| <img src="assets/icons/shield-check.svg" width="20" /> | **Authentication** | Device-based auth and JWT sessions keep access controlled and revocable. |
| <img src="assets/icons/gauge.svg" width="20" /> | **Rate Limiting** | Built-in abuse protection prevents spam and runaway costs. |
| <img src="assets/icons/smartphone.svg" width="20" /> | **Device Security** | Devices can be authenticated, tracked, and revoked individually. |
| <img src="assets/icons/atom.svg" width="20" /> | **React** | First-class provider, hooks, and UI components for React. |
| <img src="assets/icons/smartphone.svg" width="20" /> | **React Native** | Same SDK model for React Native on iOS and Android. |
| <img src="assets/icons/server.svg" width="20" /> | **Self Hosted** | Deploy the backend anywhere — your laptop, a VPS, or the cloud. |
| <img src="assets/icons/heart.svg" width="20" /> | **Open Source** | MIT-licensed, transparent, and built for contributions. |

---

## Architecture

<p align="center">
  <img src="assets/Architecture_Diagram.png" alt="NB Feedback Kit high-level architecture" width="820" />
</p>

NB Feedback Kit is a thin **bridge**, not a replacement for your tools.

1. **Your app** (React or React Native) embeds the SDK.
2. The **SDK** talks only to your **NB Feedback backend**.
3. The backend creates **GitHub Issues** and reads Releases, labels, and milestones for the roadmap.
4. Screenshots are streamed to **your S3-compatible object storage**.

Credentials for GitHub and storage never leave the backend, and the client is never trusted with them.

---

## Feedback Workflow

<p align="center">
  <img src="assets/Feedback_Diagram.png" alt="The NB Feedback Kit feedback lifecycle" width="820" />
</p>

The lifecycle closes the loop between users and developers:

1. A user **submits feedback** — optionally with a **screenshot**.
2. The backend creates a **GitHub Issue** and uploads the screenshot to your storage.
3. Your team **triages and fixes** the issue in GitHub.
4. You publish a **GitHub Release**.
5. **Release Notes** and **Roadmap** update inside your app automatically — so the user sees the outcome.

---

## Security

<p align="center">
  <img src="assets/Security_Diagram.png" alt="Security model — credentials stay server-side" width="820" />
</p>

Security is the default, not an add-on.

- <img src="assets/icons/key-round.svg" width="16" /> &nbsp;**Tokens never reach clients.** GitHub tokens and storage credentials live only on the backend.
- <img src="assets/icons/lock.svg" width="16" /> &nbsp;**Storage credentials stay server-side.** Clients receive short-lived, scoped access — never the secret key.
- <img src="assets/icons/globe.svg" width="16" /> &nbsp;**HTTPS only.** All traffic is encrypted in transit.
- <img src="assets/icons/shield-check.svg" width="16" /> &nbsp;**Validation.** Every request is schema-validated before it touches GitHub or storage.
- <img src="assets/icons/users.svg" width="16" /> &nbsp;**Authentication.** Device-based auth and JWT sessions identify and scope every caller.
- <img src="assets/icons/gauge.svg" width="16" /> &nbsp;**Rate limiting.** Per-device and global limits prevent abuse and protect your quota.

Read the full model in the [Security documentation](docs/security.md).

---

## Multi-project Support

<p align="center">
  <img src="assets/Multi-Project-Architecture-Diagram.png" alt="One backend serving multiple projects with isolation" width="820" />
</p>

A **single backend** can securely serve multiple applications. Each project is independently configured with its own GitHub repository and storage bucket, so issues, screenshots, and roadmaps stay **isolated** — even when they share infrastructure.

- One deployment, many apps.
- Per-project GitHub repository mapping.
- Per-project storage isolation.
- Centralised auth, rate limiting, and observability.

---

## Installation

Install the SDK with your preferred package manager:

```bash
# npm
npm install nb-feedback-kit

# pnpm
pnpm add nb-feedback-kit

# yarn
yarn add nb-feedback-kit

# bun
bun add nb-feedback-kit
```

> The backend is a separate, self-hostable service. See [Backend deployment](docs/backend.md) for deployment options.

---

## Quick Start

The shortest path to live feedback — under five minutes.

### 1. Configure the backend

Deploy the backend and provide your GitHub token and S3-compatible storage credentials as environment variables. The SDK only needs the backend URL.

```bash
# backend environment
GITHUB_TOKEN=ghp_your_token
S3_ENDPOINT=https://your-storage.example.com
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=feedback-screenshots
```

### 2. Wrap your React app

```tsx
import { FeedbackProvider, FeedbackButton } from 'nb-feedback-kit'

export default function App() {
  return (
    <FeedbackProvider backendUrl="https://feedback.example.com" projectId="my-app">
      <YourApp />
      <FeedbackButton />
    </FeedbackProvider>
  )
}
```

### 3. Collect feedback

That's it. The `<FeedbackButton />` opens the dialog, collects the message and optional screenshot, and creates a GitHub Issue on your repository — all without exposing any credentials to the client.

React Native follows the same model via the `FeedbackProvider`. See the [React](docs/react.md) and [React Native](docs/react-native.md) guides for hooks, custom UI, and advanced configuration.

---

## Documentation

| | Topic | Description |
|:--:|---|---|
| <img src="assets/icons/rocket.svg" width="18" /> | [Getting Started](docs/getting-started.md) | From zero to your first piece of feedback. |
| <img src="assets/icons/download.svg" width="18" /> | [Installation](docs/installation.md) | Package managers, peer deps, and versioning. |
| <img src="assets/icons/server.svg" width="18" /> | [Backend](docs/backend.md) | Deploy and configure the self-hosted backend. |
| <img src="assets/icons/atom.svg" width="18" /> | [React](docs/react.md) | Provider, hooks, and UI components. |
| <img src="assets/icons/smartphone.svg" width="18" /> | [React Native](docs/react-native.md) | Mobile integration for iOS and Android. |
| <img src="assets/icons/database.svg" width="18" /> | [Storage Providers](docs/storage-providers.md) | S3, R2, MinIO, B2, and more. |
| <img src="assets/icons/shield-check.svg" width="18" /> | [Authentication](docs/authentication.md) | Device auth, JWT, and revocation. |
| <img src="assets/icons/lock.svg" width="18" /> | [Security](docs/security.md) | Threat model and hardening guide. |
| <img src="assets/icons/code.svg" width="18" /> | [Examples](docs/examples.md) | Runnable React and React Native apps. |
| <img src="assets/icons/book-open.svg" width="18" /> | [FAQ](docs/faq.md) | Common questions, answered. |

---

## Roadmap

The roadmap is managed where the project lives — **on GitHub**, not in a separate tool. Labels and milestones drive what ships next.

See [`ROADMAP.md`](ROADMAP.md) for planned work, and watch **Issues** labeled `enhancement` for upcoming features.

---

## Contributing

Contributions are welcome and appreciated. Whether it's a bug report, a feature idea, a docs improvement, or a pull request — there's a place for you here.

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to set up the project and open a PR.
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — our community standards.

---

## Security Policy

Found a vulnerability? **Please don't open a public issue.**

Report it privately per the instructions in [`SECURITY.md`](SECURITY.md).

---

## License

NB Feedback Kit is released under the **[MIT License](LICENSE)**.

<p align="center">
  <sub>Built with care for developers who want to own their feedback.</sub>
</p>

<!-- Badge references (kept here so the hero stays scannable) -->

[license]: https://img.shields.io/badge/license-MIT-orange?style=flat-square
[release]: https://img.shields.io/github/v/release/Nealsch/nb-feedback-kit?style=flat-square&color=f97316
[stars]: https://img.shields.io/github/stars/Nealsch/nb-feedback-kit?style=flat-square&color=f97316
[forks]: https://img.shields.io/github/forks/Nealsch/nb-feedback-kit?style=flat-square&color=f97316
[npm]: https://img.shields.io/npm/v/nb-feedback-kit?style=flat-square&color=f97316
[downloads]: https://img.shields.io/npm/dm/nb-feedback-kit?style=flat-square&color=f97316
[ts]: https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white
[react]: https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black
[rn]: https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black
[build]: https://img.shields.io/github/actions/workflow/status/Nealsch/nb-feedback-kit/ci.yml?style=flat-square&branch=main