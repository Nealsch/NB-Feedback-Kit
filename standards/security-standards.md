# Security Standards — <project name>

<!--
  PURPOSE: Define project-specific security principles, controls, and acceptance criteria.
  POPULATE: At project start (NB-Security-Engineer) and update as the threat model or controls change.
  OWNER: Project-specific — maintained by NB-Security-Engineer.
  PRECEDENCE: This file SPECIALISES/OVERRIDES .clinerules/security.md (general standards) for THIS project.
             General methodology lives in .clinerules/security.md; project-specific rules live here.
-->

## Overview

<!-- Describe THIS project's threat model and security focus areas (1–3 paragraphs).
     e.g., single-user on-device app, multi-tenant SaaS, public API, etc. -->

---

## 1. Security Principles

<!-- List the principles that govern THIS project's security decisions. -->

| # | Principle | Project Implication |
|---|-----------|---------------------|
| P-1 | — | — |

---

## 2. Authentication Standards

<!-- Document the auth method for this project (PIN, password, OAuth2, biometric, none).
     If no auth exists, state the current state and the target/required state. -->

---

## 3. Authorization Standards

<!-- Document the trust boundary model (single user, multi-tenant, role-based).
     Describe enforcement points (app launch, API endpoints, background→foreground, etc.). -->

---

## 4. Data Protection Standards

### 4.1 Data Classification

| Class | Examples | Storage | Protection |
|-------|----------|---------|------------|
| — | — | — | — |

### 4.2 Data-at-Rest
<!-- Describe how data is protected at rest. -->

### 4.3 Data-in-Transit
<!-- Describe how data is protected in transit (TLS config, certificate pinning). -->

### 4.4 Sensitive Data in Logs
<!-- Document what must never be logged. -->

---

## 5. Cryptographic Standards

<!-- Document approved and prohibited algorithms for THIS project's crypto use cases. -->

| Use Case | Approved Algorithm | Prohibited |
|----------|--------------------|------------|
| — | — | — |

---

## 6. API / Integration Security

<!-- Document the security posture of each integration. See integration-register.md for the full list. -->

| Integration | Threat Surface | Controls |
|-------------|----------------|----------|
| — | — | — |

---

## 7. Infrastructure Security

<!-- Describe infrastructure security controls (or state "not applicable" if no server-side components). -->

---

## 8. Secure Coding Standards

<!-- Project-specific additions to .clinerules/security.md § Input Validation / Output Encoding. -->

### Required
- —

### Prohibited
- —

---

## 9. Security Testing Requirements

| Type | Coverage | Owner |
|------|----------|-------|
| — | Required / Optional | NB-QA-Engineer / NB-Security-Engineer |

---

## 10. Incident Response

<!-- Reference the procedure in .clinerules/error-handling.md and add project-specific steps. -->

---

## Compliance Checklist

- [ ] —

---

## Related Standards

- [General Security Standards](../.clinerules/security.md)
- [Dependency Management](dependency-management.md)
- [Testing Standards](testing.md)
- [Risk Register](../resources/risk-register.md)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|