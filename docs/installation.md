<div align="center">

# Installation

**Everything you need to install the NB Feedback Kit SDK and backend.**

</div>

---

## Two Ways to Install

Most developers only need the SDK. If you're self-hosting the backend, you'll clone the full monorepo.

| | What | Audience | Steps |
|:--:|---|---|---|
| <img src="../assets/icons/download.svg" width="20" /> | **Install the SDK** | App developers embedding feedback into a React or React Native app | [Step 1](#1-install-the-sdk) below |
| <img src="../assets/icons/server.svg" width="20" /> | **Self-host the backend** | Developers running their own Cloudflare Worker | [Backend setup](#self-host-the-backend) below |

> **New here?** Start with the **[Getting Started guide](getting-started.md)** — it walks through both the SDK and backend end-to-end.

---

## Prerequisites

Before installing, make sure your environment meets the baseline:

| Requirement | Minimum version | Check |
|---|:--:|---|
| <img src="../assets/icons/atom.svg" width="16" /> &nbsp;React | `18.0.0` | `npm ls react` |
| <img src="../assets/icons/atom.svg" width="16" /> &nbsp;React DOM | `18.0.0` | `npm ls react-dom` |
| <img src="../assets/icons/terminal.svg" width="16" /> &nbsp;Node.js | `18.0.0` | `node --version` |
| <img src="../assets/icons/package.svg" width="16" /> &nbsp;Package manager | any (npm, pnpm, yarn, bun) | — |

> **React Native?** The SDK works with React Native `^0.72` (which ships React 18). No `react-dom` dependency is pulled into native bundles — the SDK's components are headless and DOM-agnostic.

---

## 1. Install the SDK

The SDK is published as a scoped package: **`@nb-feedback-kit/react-sdk`**.

Choose your preferred package manager:

<!-- TIP: All four commands install the same package. Use whichever your project already uses. -->

### npm

```bash
npm install @nb-feedback-kit/react-sdk
```

### pnpm

```bash
pnpm add @nb-feedback-kit/react-sdk
```

### yarn

```bash
yarn add @nb-feedback-kit/react-sdk
```

### bun

```bash
bun add @nb-feedback-kit/react-sdk
```

That's it. The SDK has **zero runtime dependencies** beyond `react`, `react-dom`, and `@nb-feedback-kit/shared-types` (a tiny types-only package).

---

## Peer Dependencies

The SDK declares `react` and `react-dom` as peer dependencies to avoid version conflicts with your app.

```json
"peerDependencies": {
  "react": "^18.0.0",
  "react-dom": "^18.0.0"
}
```

If your app uses React 18, you're done — npm/pnpm/yarn/bun will resolve these automatically. If you see a peer-dependency warning, ensure your React version is `18.0.0` or higher:

```bash
npm ls react react-dom
```

> **Why peer deps?** This prevents two copies of React from being bundled (which breaks hooks). The SDK uses React 18's hooks, context, and concurrent features under the hood.

---

## What Gets Installed

The published package is intentionally minimal:

```text
@nb-feedback-kit/react-sdk
├── dist/
│   ├── index.js       ← CommonJS build
│   ├── index.mjs      ← ES module build
│   └── index.d.ts     ← TypeScript declarations
└── package.json
```

| Property | Value |
|---|---|
| <img src="../assets/icons/package.svg" width="16" /> &nbsp;**Package name** | `@nb-feedback-kit/react-sdk` |
| <img src="../assets/icons/code.svg" width="16" /> &nbsp;**Module formats** | ESM (`import`) + CJS (`require`) |
| <img src="../assets/icons/file-text.svg" width="16" /> &nbsp;**TypeScript types** | Bundled (`.d.ts`) — no `@types/*` needed |
| <img src="../assets/icons/layers.svg" width="16" /> &nbsp;**Runtime deps** | `@nb-feedback-kit/shared-types` (types-only) |
| <img src="../assets/icons/shield.svg" width="16" /> &nbsp;**Tree-shakeable** | <img src="../assets/icons/check.svg" width="14" /> &nbsp;Yes — import only what you use |
| <img src="../assets/icons/lock.svg" width="16" /> &nbsp;**Bundled secrets** | None — zero credentials ship to the client |

---

## Self-Host the Backend

The backend (`@nb-feedback-kit/api`) is a Cloudflare Worker. It is **not published to npm** — it's a private workspace package you deploy from source.

### 2.1 Clone the monorepo

```bash
git clone https://github.com/Nealsch/NB-Feedback-Kit.git
cd NB-Feedback-Kit
```

### 2.2 Install dependencies

NB Feedback Kit uses **pnpm workspaces** + **Turborepo** for monorepo orchestration. Install everything from the root:

```bash
pnpm install
```

This installs:
- `@nb-feedback-kit/api` — the Cloudflare Worker backend
- `@nb-feedback-kit/react-sdk` — the React SDK
- `@nb-feedback-kit/shared-types` — shared TypeScript contracts
- `apps/demo-app` — the reference integration app

### 2.3 Build all packages

```bash
pnpm turbo run build
```

Turborepo caches builds — subsequent runs are fast. Output:

| Package | Build output | Tool |
|---|---|---|
| `@nb-feedback-kit/react-sdk` | `packages/react-sdk/dist/` | tsup |
| `@nb-feedback-kit/shared-types` | `packages/shared-types/dist/` | tsup |
| `@nb-feedback-kit/api` | (built by Wrangler at deploy) | wrangler |

### 2.4 Deploy the Worker

See the **[Getting Started guide](getting-started.md)** for the full deployment walkthrough (KV namespaces, secrets, API-key registration). The short version:

```bash
cd packages/api
pnpm wrangler kv namespace create API_KEYS
pnpm wrangler kv namespace create DEVICES
pnpm wrangler secret put GITHUB_TOKEN
pnpm wrangler secret put JWT_SECRET
pnpm deploy
```

---

## Monorepo Structure

If you're contributing or forking, here's how the workspace is organized:

```text
NB-Feedback-Kit/
├── apps/
│   └── demo-app/              ← Reference React integration (Vite)
├── packages/
│   ├── api/                   ← Cloudflare Worker backend (Hono)
│   ├── react-sdk/             ← Headless React SDK
│   └── shared-types/          ← Shared TypeScript contracts (no runtime deps)
├── memory/                    ← Project decisions & lessons
├── resources/                 ← Architecture, API, risk registers
├── standards/                 ← Project-specific coding standards
└── turbo.json                 ← Turborepo pipeline config
```

| Workspace package | Published? | Purpose |
|---|:--:|---|
| `@nb-feedback-kit/react-sdk` | <img src="../assets/icons/check.svg" width="14" /> &nbsp;Public | SDK installed by app developers |
| `@nb-feedback-kit/shared-types` | <img src="../assets/icons/check.svg" width="14" /> &nbsp;Public | Shared types (auto-installed as a dep) |
| `@nb-feedback-kit/api` | — &nbsp;Private | Worker backend (deploy from source) |

---

## Versioning

NB Feedback Kit follows [**Semantic Versioning**](https://semver.org/):

| Release type | When it happens | Example |
|---|---|---|
| <img src="../assets/icons/bug.svg" width="16" /> &nbsp;**Patch** (`0.0.x`) | Bug fixes, no breaking changes | `0.0.1` → `0.0.2` |
| <img src="../assets/icons/rocket.svg" width="16" /> &nbsp;**Minor** (`0.x.0`) | New features, backward-compatible | `0.0.2` → `0.1.0` |
| <img src="../assets/icons/zap.svg" width="16" /> &nbsp;**Major** (`x.0.0`) | Breaking changes (with migration guide) | `0.1.0` → `1.0.0` |

> **Pre-1.0 note:** While the major version is `0`, minor releases may include breaking changes. Pin to an exact version (`0.0.1`) in production until `1.0.0` ships. Use the caret (`^0.0.1`) only if you can test before each upgrade.

### Pinning the SDK

For production stability, pin to an exact version:

```json
"dependencies": {
  "@nb-feedback-kit/react-sdk": "0.0.1"
}
```

For libraries wrapping the SDK, use a range:

```json
"peerDependencies": {
  "@nb-feedback-kit/react-sdk": ">=0.0.1"
}
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module '@nb-feedback-kit/react-sdk'` | Package not installed, or build cache stale | Run your package manager's install command again. If building from source, run `pnpm turbo run build`. |
| `peer/react: not found` warning | React not installed, or version `< 18` | Install React 18: `npm install react@^18 react-dom@^18`. |
| Hooks error: "Invalid hook call" | Two copies of React bundled | Check for nested `node_modules/react` — dedupe with `npm dedupe` or remove lockfile and reinstall. |
| TypeScript: cannot find type declarations | Editor using stale TS server | Restart your editor / TS server. Types are bundled in `dist/index.d.ts`. |
| `pnpm install` fails in monorepo | Node version too old | Ensure Node `>= 18`. Run `node --version`. |
| Turborepo build cache miss | First run or cache cleared | Expected — subsequent builds will be cached. |

---

## Verification

Confirm the SDK installed correctly:

```bash
# Check it's in your dependencies
npm ls @nb-feedback-kit/react-sdk

# Verify TypeScript can resolve the types
npx tsc --noEmit
```

Then follow the **[Quick Start](getting-started.md#step-3--wrap-your-app)** to wrap your app with `FeedbackProvider`.

---

## Next Steps

- <img src="../assets/icons/rocket.svg" width="16" /> &nbsp;**[Getting Started](getting-started.md)** — End-to-end integration walkthrough.
- <img src="../assets/icons/atom.svg" width="16" /> &nbsp;**[React Guide](react.md)** — Provider, hooks, and headless components.
- <img src="../assets/icons/smartphone.svg" width="16" /> &nbsp;**[React Native Guide](react-native.md)** — Mobile integration.
- <img src="../assets/icons/server.svg" width="16" /> &nbsp;**[Backend Guide](backend.md)** — Full Worker deployment reference.

---

<p align="center">
  <sub>Installation issue not covered here? <a href="https://github.com/Nealsch/NB-Feedback-Kit/issues">Open an issue</a>.</sub>
</p>