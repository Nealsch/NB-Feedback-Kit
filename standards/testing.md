# Testing Standards — <project name>

<!--
  PURPOSE: Define project-specific testing standards (tooling, coverage targets, conventions).
  POPULATE: At project start (NB-QA-Engineer) and update as the testing approach evolves.
  OWNER: Project-specific — maintained by NB-QA-Engineer.
  PRECEDENCE: This file SPECIALISES/OVERRIDES .clinerules/testing.md (general standards) for THIS project.
             General testing methodology lives in .clinerules/testing.md; project-specific rules live here.
-->

## Overview

<!-- Summarise the testing approach for THIS project (1–2 paragraphs). -->

---

## Test Tooling

| Tool | Purpose | Version |
|------|---------|---------|
| — | Test runner / assertion / mocking / coverage | — |

---

## Test Levels

### Unit Tests
<!-- What must be unit-tested in this project. -->

### Integration Tests
<!-- What must be integration-tested in this project. -->

### End-to-End Tests
<!-- What critical workflows require E2E tests. -->

---

## Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| Business Logic | — % | — |
| Data Access | — % | — |
| Components / UI | — % | — |
| Overall | — % | — |

---

## Conventions

### Test File Naming
<!-- e.g., *.test.ts / *.spec.ts / colocated vs __tests__/ -->

### Test Descriptions
<!-- Describe the naming convention for test cases (e.g., "should X when Y"). -->

---

## Execution

<!-- How to run tests (commands). -->

```bash
# Run all tests
{command}

# Run with coverage
{command}
```

---

## Release Validation

<!-- What must pass before a release. See also .clinerules/testing.md § CI/CD Requirements. -->

- [ ] All tests pass
- [ ] Coverage meets minimum targets
- [ ] No critical defects
- [ ] Regression suites pass

Test results recorded in: `resources/test-results/`

---

## Platform-Specific Testing Notes

<!-- Add notes for this project's platform (web, mobile, backend).
     e.g., React Native component testing, API contract testing, browser compatibility. -->

---

## Change Log

| Date | Change | Author |
|------|--------|--------|