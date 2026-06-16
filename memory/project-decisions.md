# Architecture Decision Records (ADRs)

## ADR-001: Monorepo with pnpm + Turborepo

**Date:** 2026-06-16

**Status:** Accepted

**Context:**

The NB Feedback Kit consists of three related packages (React SDK, API, shared types) plus a demo application. We needed to decide between a monorepo structure or separate repositories.

**Decision:**

Use a monorepo with pnpm workspaces and Turborepo for build orchestration.

**Structure:**
```
NB-Feedback-Kit/
├── apps/
│   └── demo-app/          (Vite + React 18)
├── packages/
│   ├── react-sdk/         (Vite library mode)
│   ├── api/               (Hono + Cloudflare Workers)
│   └── shared-types/      (TypeScript types)
```

**Alternatives Considered:**

1. **Separate repositories** (nb-feedback-sdk, nb-feedback-api, nb-feedback-shared)
   - Rejected: More complex to coordinate changes, requires npm publishing for local dev

**Consequences:**

**Positive:**
- Shared TypeScript types with zero npm publish overhead
- Atomic cross-package changes in single commits
- Simpler CI/CD (one pipeline tests all packages)
- Easier local development (no npm link)
- Automatic version coordination

**Negative:**
- SDK and API can't have fully independent release cycles (mitigated by Changesets)
- Slightly more complex build configuration

**Tools:**
- pnpm workspaces (package management)
- Turborepo (build orchestration, caching)

---

## ADR-002: Hono + Cloudflare Workers for API

**Date:** 2026-06-16

**Status:** Accepted

**Context:**

The API serves as a secure proxy between React applications and GitHub APIs. It must be lightweight, globally distributed, and inexpensive to operate.

**Decision:**

Use Hono framework deployed to Cloudflare Workers.

**Technology Stack:**
- **Framework:** Hono (lightweight, fast)
- **Runtime:** Cloudflare Workers (edge computing)
- **Language:** TypeScript
- **Storage:** Cloudflare KV (API keys), Durable Objects (rate limiting)
- **Secrets:** Cloudflare Worker environment variables (GitHub PAT)

**Alternatives Considered:**

1. **NestJS + Traditional Hosting (Render/Railway/AWS)**
   - Rejected: Overengineered for a stateless proxy, higher costs, cold starts, more operational overhead

2. **Express + Serverless (AWS Lambda)**
   - Rejected: Cold starts, no native edge distribution

3. **Next.js API Routes**
   - Rejected: Ties API to Next.js framework, can't be deployed independently

**Consequences:**

**Positive:**
- Sub-50ms global latency (300+ edge locations)
- No cold starts
- Generous free tier (100k requests/day)
- Simple secrets management
- Cloudflare R2 ready for Phase 9 (screenshots)
- Minimal operational overhead (no servers, no database)

**Negative:**
- 10ms CPU time limit per request (acceptable for proxy use case)
- Team may need to learn Cloudflare platform
- Less mature ecosystem than Express/NestJS

**Architecture Constraint:**

The API must remain **stateless**. GitHub is the system of record. The API only proxies and enriches requests.

---

## ADR-003: Headless Component Architecture for SDK

**Date:** 2026-06-16

**Status:** Accepted

**Context:**

The SDK must be reusable across diverse React applications with different design systems (Tailwind, styled-components, CSS Modules, Material-UI, etc.). We needed to decide how components should be styled.

**Decision:**

Build **headless components** — no styling, only behavior and data.

**Approach:**
- FeedbackButton: Provides logic, renders unstyled `<button>`
- FeedbackModal: Provides form state, validation, submission — consumers apply CSS
- Minimal demo styling provided in demo app only

**Build System:**
- Vite library mode
- Output: ESM + CJS bundles
- TypeScript declaration files
- Peer dependencies: react@^18, react-dom@^18

**Alternatives Considered:**

1. **Tailwind CSS included**
   - Rejected: Forces consumers to use Tailwind, increases bundle size

2. **CSS Modules included**
   - Rejected: Harder to customize, still opinionated

**Consequences:**

**Positive:**
- Maximum flexibility for consumers
- Smallest possible bundle size
- Works with any design system
- No peer dependency on styling frameworks

**Negative:**
- Consumers must style components themselves
- More initial setup effort for consumers
- Demo app styling is not production-ready

**Documentation Requirement:**

Must provide clear examples of how to style components in README.

---

## ADR-004: API Key Authentication with Durable Objects Rate Limiting

**Date:** 2026-06-16

**Status:** Accepted

**Context:**

The API must authenticate incoming requests to prevent abuse and protect GitHub API rate limits. We needed a security mechanism suitable for client-side applications.

**Decision:**

Use **API keys** stored in Cloudflare KV with **Durable Objects** for per-key rate limiting.

**Authentication Flow:**
1. Application sends `X-API-Key` header
2. API validates key against Cloudflare KV
3. Key maps to repository config + rate limit
4. Durable Object enforces per-key rate limit (10-30 req/min)
5. Request proxied to GitHub if valid

**API Key Structure (Cloudflare KV):**
```json
{
  "app_student_manager_abc123": {
    "name": "Student Manager",
    "github": {
      "owner": "nealbresler",
      "repo": "student-manager"
    },
    "rateLimit": 30
  }
}
```

**Alternatives Considered:**

1. **Public/Unauthenticated API**
   - Rejected: No protection against abuse, anyone can spam

2. **JWT Tokens**
   - Rejected: More complex, unnecessary for MVP

3. **Per-IP Rate Limiting Only**
   - Rejected: Easily bypassed, doesn't identify applications

**Consequences:**

**Positive:**
- Simple to implement and manage
- Per-application rate limiting
- Easy to revoke individual applications
- Repository routing built into key mapping
- Durable Objects provide accurate distributed rate limiting

**Negative:**
- API keys can be extracted from client-side JavaScript (mitigated by rate limiting)
- Requires manual key provisioning (acceptable for MVP)

**Security Notes:**

API keys are **not** secret in the traditional sense — they're visible in client code. Rate limiting prevents abuse even if keys are discovered.

**Future Enhancement:**

Post-MVP: Add JWT authentication with signing for higher security applications.

---

## ADR-005: API Key → Repository Mapping (Server-Side Routing)

**Date:** 2026-06-16

**Status:** Accepted

**Context:**

The API must route feedback from different applications to different GitHub repositories (multi-project support). We needed to decide how applications identify their target repository.

**Decision:**

Use **server-side repository routing** via API key mapping stored in Cloudflare KV.

**Flow:**
1. Application sends API key (no repository specified)
2. API looks up key in KV
3. Key data includes target repository
4. Feedback routed to correct repo

**Alternatives Considered:**

1. **Client-Specified Target**
   - Applications send both API key AND target repo
   - Rejected: One compromised key could spam all repos

2. **Subdomain Routing**
   - Each app gets dedicated subdomain (student-manager.feedback.domain.com)
   - Rejected: More infrastructure complexity, less flexible

**Consequences:**

**Positive:**
- One compromised key can only affect one repository
- Applications don't need to know repository details
- Centralized routing configuration
- Easy to change routing without updating applications

**Negative:**
- New applications require API provisioning (cannot self-service)

**Security Benefit:**

Repository IDs remain server-side. Clients never specify target repositories.

---

## ADR-006: Independent Versioning with Changesets

**Date:** 2026-06-16

**Status:** Accepted

**Context:**

The monorepo contains three publishable packages. We needed to decide if they share a unified version or have independent versions.

**Decision:**

Use **independent versioning** with Changesets for version management.

**Versioning Strategy:**
```json
{
  "@nb-feedback-kit/react-sdk": "1.2.0",
  "@nb-feedback-kit/api": "1.1.0",
  "@nb-feedback-kit/shared-types": "0.3.0"
}
```

Each package has its own semantic version.

**Release Process (MVP):**
- Manual releases via `pnpm changeset version`
- Post-MVP: Automate via GitHub Actions

**Alternatives Considered:**

1. **Unified Versioning (all packages share version)**
   - Rejected: Forces version bumps when only one package changes

**Consequences:**

**Positive:**
- SDK can release features without bumping API
- More flexible for consumers
- Standard for monorepos

**Negative:**
- Slightly more complex to track compatibility
- Requires coordination via semantic versioning

**Compatibility Rules:**

- SDK and API communicate via shared-types
- Breaking changes to shared-types require major version bumps in both SDK and API

---

## ADR-007: Vite + React for Demo App

**Date:** 2026-06-16

**Status:** Accepted

**Context:**

The demo app serves as an integration test bed and documentation example. We needed to choose a tech stack.

**Decision:**

Use **Vite + React 18** for the demo application.

**MVP Features:**
- FeedbackButton visible
- FeedbackModal with all feedback types
- Form validation
- Mock submission (console log)
- Multiple routes (to demonstrate route capture)

**Alternatives Considered:**

1. **Next.js App Router**
   - Rejected for MVP: More complex, SSR not required for demo
   - May add as second demo app post-MVP

**Consequences:**

**Positive:**
- Fast dev experience
- Matches SDK development environment
- Simple to understand
- Easy to extend

**Negative:**
- Doesn't demonstrate SSR usage (acceptable for MVP)

**Future Enhancement:**

Add a Next.js demo app post-MVP to show SDK in SSR context.

---

## Summary

All critical architectural decisions have been finalized via NB-Grill session on 2026-06-16.

The project is now ready for implementation starting with TASK-001 (Monorepo Infrastructure Setup).
