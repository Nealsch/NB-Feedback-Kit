# Roadmap

## Introduction

Roadmaps evolve. What a project plans today may shift tomorrow as real users adopt it, surface edge cases, and request things the maintainer never anticipated.

This document captures the current direction of NB Feedback Kit. It is not a contract. Priorities may change as the project grows, as the community forms, and as the realities of maintaining open-source software become clearer.

The goal of sharing this openly is simple: transparency. You should know what is being worked on, what is being considered, and what is not — so you can make informed decisions about adopting the project.

---

## Guiding Principles

Every decision about what to build next is filtered through the same set of priorities:

- **Stability** — the project must work reliably before it works impressively.
- **Security** — the default configuration must remain the most secure configuration. No exception.
- **Documentation** — a feature that is not documented does not exist.
- **Developer experience** — the common path should always be simple.
- **Maintainability** — code should be readable and changeable by people other than the original author.
- **Backwards compatibility** — breaking changes are avoided where practical and clearly documented when unavoidable.

Quality is more important than rapidly adding new features. A small, stable, well-documented project is more valuable than a large, fragile, undocumented one.

---

## Current Focus

The immediate priority is not new features. It is strengthening what already exists.

NB Feedback Kit is at the beginning of its journey. The most valuable work right now is making the foundation solid enough to build on — and trustworthy enough for developers to depend on.

The areas currently receiving attention include:

- **Improving documentation** — clearer guides, better examples, more complete API references, and filling gaps that real users discover.
- **Refining the developer experience** — smoother setup, better error messages, more intuitive SDK APIs.
- **Fixing bugs** — addressing issues reported by early users promptly and transparently.
- **Improving reliability** — hardening the Worker, storage providers, and authentication flows against edge cases.
- **Improving test coverage** — the security-critical paths (attachment sanitisation, authentication, rate limiting) must have comprehensive regression protection.
- **Expanding examples** — more reference integrations showing how to use the SDK across different app types and storage configurations.
- **Improving deployment guidance** — clearer instructions for deploying the Worker, configuring secrets, and setting up storage providers.
- **Strengthening security** — regular review of boundaries, input validation, and credential isolation.

This is where the majority of active development time is spent. Not on building the next thing — on making the current thing worthy of trust.

---

## Future Direction

Looking beyond the current foundation, there are a few broad areas of interest. These are directions, not commitments.

- **Additional framework support** — exploring SDKs or adapters for frameworks beyond React and React Native, guided by community demand.
- **Improved integrations** — better connections with tools developers already use alongside GitHub.
- **Community-requested enhancements** — features that real users identify as missing from their workflows.
- **Better tooling** — CLI helpers, diagnostic utilities, and developer tooling that make the SDK easier to work with.

No version numbers. No delivery dates. No feature lists.

Future priorities will be influenced by community feedback and real-world usage. The roadmap will reflect what people actually need, not what sounds impressive in a readme.

---

## Commitment to Open Source

NB Feedback Kit is released under the MIT License. That is not a marketing decision — it is a foundational one.

The core project is intended to remain open source. The source code, the SDK, the backend, and the documentation will stay publicly available under a permissive licence. The long-term success of this project depends on maintaining an open, collaborative community where contributors and users feel confident adopting the tool without fear that the core functionality will later be locked behind a paywall.

This commitment is made with sincerity. Open source is not a launch strategy. It is the strategy.

---

## Supporting the Project

Maintaining open-source software requires ongoing time and effort. This project is currently maintained by a single developer in spare time, and the immediate focus is building a reliable project and a healthy community around it.

Looking further ahead, optional commercial offerings may be explored to help fund continued development. These could include:

- Hosted or managed services for teams that prefer not to self-host.
- Professional support for organisations that need guaranteed response times.
- Consulting for custom integrations or deployments.
- Enterprise tooling for larger teams with advanced needs.

To be clear: these would be **additive** offerings. They would exist alongside the open-source project, not in place of it. No existing open-source functionality will become paid. The core SDK and backend will remain free and open.

Any future commercial work is intended to support the continued development of the open-source project — not to restrict it.

---

## Community Feedback

The community will play an important role in shaping this project's future.

You are encouraged to:

- **Submit issues** when something is broken or unclear.
- **Suggest improvements** when you see a better way to do something.
- **Contribute code** through pull requests (see [`CONTRIBUTING.md`](CONTRIBUTING.md)).
- **Improve documentation** when you find a gap.
- **Share ideas** through GitHub Discussions.

The most useful feedback comes from people actually using the SDK in real applications. If something does not work the way you expected, that is valuable information — please share it.

---

## Closing Statement

This is the project's first public release.

That means there is a lot to learn — about what works, what does not, and what people actually need from feedback infrastructure. The excitement of a launch is real, but the work that matters is what comes after: listening, improving, and earning the trust of developers who choose to depend on this tool.

To everyone who contributes, reports issues, suggests features, or simply takes the time to try the SDK — thank you. Being part of this project's early journey is what makes open source worth doing.

---

*Build a solid foundation first. Add features second. Earn trust every day.*