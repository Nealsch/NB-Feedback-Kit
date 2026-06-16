# Threat Models

<!--
  PURPOSE: Hold structured threat models for the project's features and components.
  POPULATE: As threat models are produced (NB-Security-Engineer). Start with a baseline whole-app threat model at project start.
  OWNER: Project-specific — maintained by NB-Security-Engineer.
-->

## Naming Convention

`YYYY-MM-DD_<feature>_threat-model.md`

Examples:
- `YYYY-MM-DD_baseline-app_threat-model.md`
- `YYYY-MM-DD_auth-flow_threat-model.md`

## Index

<!-- Add a row to this table each time a new threat model is produced. -->

| Date | Feature | File |
|------|---------|------|
| — | — | — |

## Methodology

Each threat model addresses:
- **Assets** — what is being protected
- **Trust Boundaries** — who/what is trusted at each layer
- **Attack Vectors** — how those assets could be compromised
- **Impact** — consequence of a successful attack
- **Mitigations** — controls (existing or required)
- **Residual Risk** — what remains after mitigations

See `TEMPLATE.md` for the blank threat-model structure.