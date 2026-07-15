# resources/

<!--
  PURPOSE: Project-specific registers and inventories (architecture, API, schema, risks, tech debt, tests, security).
  POPULATE: At project start (NB-Solution-Analyst) and update throughout the project lifecycle.
  GOVERNANCE: See .clinerules/index.md § Precedence Rule — resources/ captures THIS project's concrete state, overriding .clinerules/ general guidance.
-->

This folder holds the project's concrete registers and inventories. Each file documents a specific aspect of the project's current state.

## Files

| File | Purpose | Primary Owner |
|------|---------|---------------|
| `personas.md` | Decision rights and role→skill mapping | NB-Project-Admin |
| `architecture.md` | This project's concrete architecture | NB-Solution-Analyst / NB-Backend-Specialist |
| `api-reference.md` | API surface (endpoints, actions, auth, errors) | NB-Backend-Specialist |
| `database-schema.md` | Database schema, indexes, migrations | NB-PostgreSQL-Architect |
| `integration-register.md` | External integrations and their risk profile | NB-Solution-Analyst |
| `system-inventory.md` | Repos, services, environments, dependencies | NB-Project-Admin |
| `risk-register.md` | Identified risks with mitigation status | NB-Security-Engineer / NB-Project-Admin |
| `technical-debt-register.md` | Tech debt items with repayment plans | NB-Project-Admin |
| `test-matrix.md` | Test coverage matrix and gaps | NB-QA-Engineer |
| `test-results/` | Per-release test result records | NB-QA-Engineer |
| `security-reports/` | Security audit and review reports | NB-Security-Engineer |
| `threat-models/` | Structured threat models | NB-Security-Engineer |

## Subdirectories

- **`test-results/`** — One file per release. See `test-results/README.md`.
- **`security-reports/`** — One file per audit/review. See `security-reports/README.md`.
- **`threat-models/`** — One file per feature/baseline. See `threat-models/README.md`.

> **Note:** All files in this folder start as empty templates. They are intentionally blank in the template repo and get populated per project.