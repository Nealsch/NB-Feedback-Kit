# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub Issue for security vulnerabilities.**

Public issues can expose details about vulnerabilities before a fix is available, putting every user of NB Feedback Kit at risk. All security reports must be made privately.

### How to report

Please use one of the following methods:

1. **GitHub Security Advisories** (preferred): Use [GitHub's private vulnerability reporting](https://github.com/Nealsch/nb-feedback-kit/security/advisories/new). This is the most secure and structured way to report.

2. **Direct contact**: If you are unable to use GitHub's advisory system, contact the maintainer directly via [GitHub](https://github.com/Nealsch).

### What to include

To help me assess and address the issue quickly, please include:

- **Description** of the vulnerability and its potential impact.
- **Steps to reproduce** — the more precise, the faster the fix.
- **Affected components** — SDK, Worker API, authentication, storage providers, attachment sanitisation, etc.
- **Suggested fix** if you have one (optional but appreciated).
- **Whether you have already disclosed this elsewhere.**

### What to expect

- **Acknowledgement**: You will receive an acknowledgement of your report within 72 hours.
- **Assessment**: The report will be reviewed to determine severity and validity.
- **Updates**: You will be kept informed of progress at reasonable intervals.
- **Resolution**: If the vulnerability is confirmed, a fix will be prioritised based on severity. Once a fix is available, a security advisory will be published and you will be credited (unless you prefer to remain anonymous).
- **If declined**: If the report is assessed as not a vulnerability, an explanation will be provided.

This project is maintained by a single developer in spare time. Every report is taken seriously, but response times may vary. The 72-hour acknowledgement window is a target, not a guarantee.

---

## Scope

The following are considered in scope for security reports:

- **Authentication bypass** — any way to access `/api/*` routes without valid credentials.
- **Secret exposure** — GitHub tokens, JWT signing keys, admin tokens, or storage credentials reaching the client.
- **Attachment sanitisation bypass** — injecting malicious URLs or content into the GitHub issue body.
- **Rate-limit circumvention** — bypassing per-device or per-key rate limits.
- **Input validation failures** — any path where client-supplied data reaches GitHub or storage without proper validation.
- **Authorisation flaws** — accessing or modifying resources belonging to another project or device.

### Out of scope

- Theoretical vulnerabilities without a proof of concept.
- Self-XSS or social engineering attacks.
- Vulnerabilities in third-party dependencies (report these to the upstream project).
- Issues in forked or modified versions of the project.
- Bugs that do not have security impact (report these as regular GitHub Issues).

---

## Security Architecture

For a detailed breakdown of the project's security design — trust boundaries, threat model, secret isolation, authentication, rate limiting, and attachment sanitisation — see [`docs/security.md`](docs/security.md).

---

## Supported Versions

Security fixes are applied to the latest release. Users should always run the most recent version.

| Version | Supported |
|---|---|
| Latest release | Yes |
| Older releases | No |

---

## Acknowledgements

Contributors who responsibly report vulnerabilities will be credited in the security advisory (unless they prefer to remain anonymous). Your efforts make the project safer for everyone.

---

<p align="center">
  <sub>Found a security issue? <a href="https://github.com/Nealsch/nb-feedback-kit/security/advisories/new">Report it privately</a>.</sub>
</p>