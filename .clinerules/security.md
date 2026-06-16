# Security Standards

## Purpose

These security requirements apply to all software development activities, including web applications, mobile applications, APIs, backend services, infrastructure automation, and CI/CD pipelines.

All code changes must comply with these standards unless an explicit exception is approved and documented.

---

# Core Principles

## Secure by Default

* Default configurations must be secure.
* Security controls must be enabled by default.
* Features requiring reduced security must require explicit opt-in.

## Least Privilege

* Grant only the minimum permissions required.
* Avoid administrative or root privileges unless absolutely necessary.
* Service accounts must have narrowly scoped permissions.

## Defense in Depth

* Do not rely on a single security control.
* Layer authentication, authorization, validation, monitoring, and logging controls.

## Zero Trust

* Never trust user input.
* Never trust client-side validation.
* Always verify identity, authorization, and data integrity.

---

# Authentication

## Requirements

* Use industry-standard authentication providers and protocols.
* Support Multi-Factor Authentication (MFA) where applicable.
* Enforce strong password policies if passwords are used.
* Passwords must never be stored in plaintext.

## Password Storage

* Use Argon2id, bcrypt, or scrypt.
* Never implement custom password hashing.
* Never use MD5, SHA1, or unsalted hashes.

## Session Security

* Use secure session management.
* Sessions must expire appropriately.
* Revoke sessions after logout.
* Regenerate session identifiers after authentication events.

---

# Authorization

## Access Control

* Implement server-side authorization checks.
* Never rely solely on UI restrictions.
* Apply Role-Based Access Control (RBAC) or equivalent.

## Object-Level Access

* Verify ownership and permissions before exposing resources.
* Prevent IDOR (Insecure Direct Object Reference) vulnerabilities.

---

# Input Validation

## Validation Rules

* Validate all external input.
* Use allowlists wherever practical.
* Reject malformed data.

## Injection Prevention

* Use parameterized queries.
* Never concatenate SQL queries from user input.
* Prevent:

  * SQL Injection
  * NoSQL Injection
  * Command Injection
  * LDAP Injection
  * XML Injection

---

# Output Encoding

* Contextually encode output.
* Prevent Cross-Site Scripting (XSS).
* Escape untrusted content before rendering.
* Use framework-provided encoding mechanisms.

---

# API Security

## Authentication

* Protect all non-public endpoints.
* Validate tokens on every request.

## Authorization

* Verify permissions on every protected endpoint.
* Do not expose sensitive data unnecessarily.

## Rate Limiting

* Implement rate limiting.
* Protect authentication and high-risk endpoints.

## Error Handling

* Do not expose stack traces.
* Do not reveal implementation details.

---

# Secrets Management

## Prohibited

Never:

* Commit secrets to source control.
* Store secrets in code.
* Store credentials in configuration files.
* Hardcode API keys.

## Required

* Use environment variables or a secret management system.
* Rotate secrets periodically.
* Limit secret access by role.

---

# Data Protection

## Data Classification

Classify data according to sensitivity.

Examples:

* Public
* Internal
* Confidential
* Restricted

## Encryption

### Data in Transit

* Use TLS 1.2+.
* Prefer TLS 1.3 where supported.
* Disable insecure protocols and ciphers.

### Data at Rest

* Encrypt sensitive data.
* Protect encryption keys separately from encrypted data.

## Personal Data

* Collect only required information.
* Follow data minimization principles.
* Support deletion and retention requirements.

---

# Mobile Application Security

## Secure Storage

Do not store:

* Passwords
* Tokens
* Encryption keys

in insecure local storage.

Use:

* Android Keystore
* iOS Keychain
* Platform secure storage mechanisms

## Local Data

* Encrypt sensitive local data.
* Minimize offline storage.

## Mobile APIs

* Validate server certificates.
* Protect API communications.
* Avoid embedding secrets in applications.

---

# Web Application Security

## Browser Security Headers

Implement appropriate security headers including:

* Content-Security-Policy
* X-Frame-Options
* X-Content-Type-Options
* Referrer-Policy
* Strict-Transport-Security

## CSRF Protection

* Protect state-changing operations.
* Use framework-native CSRF protections.

## Cookie Security

Sensitive cookies must use:

* HttpOnly
* Secure
* SameSite

where appropriate.

---

# Dependency Security

## Third-Party Components

* Use maintained libraries.
* Remove unused dependencies.
* Prefer reputable projects.

## Vulnerability Management

* Scan dependencies regularly.
* Address critical vulnerabilities immediately.
* Document accepted risks.

---

# Logging and Monitoring

## Logging Requirements

Log:

* Authentication events
* Authorization failures
* Administrative actions
* Security-relevant changes

## Sensitive Data

Never log:

* Passwords
* Access tokens
* Session identifiers
* Encryption keys
* Sensitive personal information

---

# Error Handling

* Fail securely.
* Return generic error messages to users.
* Capture detailed information only in protected logs.

---

# Secure Development Requirements

## Pull Requests

Security review is required for:

* Authentication changes
* Authorization changes
* Cryptographic changes
* Payment processing
* Data access controls

## Security Testing

Perform appropriate:

* Static analysis
* Dependency scanning
* Secret scanning
* Security testing

before release.

---

# AI Agent Requirements

When generating or modifying code, AI agents must:

* Follow OWASP Top 10 principles.
* Follow secure coding practices.
* Never introduce hardcoded secrets.
* Never disable authentication or authorization controls.
* Never weaken encryption standards.
* Never bypass validation requirements.
* Flag security concerns when identified.
* Prefer secure framework defaults.
* Recommend remediation for discovered vulnerabilities.

If security requirements conflict with functionality, security requirements take precedence unless an approved exception is documented.

