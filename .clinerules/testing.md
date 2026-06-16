# Testing Standards

## Testing Philosophy
Tests exist to:
- prevent regressions
- validate behavior
- document expectations
- improve refactor safety

---

## Testing Pyramid

### Unit Tests
Validate:
- isolated business logic
- edge cases
- validation rules

### Integration Tests
Validate:
- service interactions
- database behavior
- API contracts

### End-to-End Tests
Validate:
- critical user workflows
- authentication flows
- high-risk operations

---

## Required Test Coverage

All changes affecting logic, validation rules, or business behavior must include:
- happy path test
- edge case test
- failure case test

Exceptions:
- Documentation-only changes (no test required)
- Configuration changes (verify manually unless affecting business logic)

Critical systems require:
- integration coverage
- regression protection

---

## Test Quality Rules

Tests must:
- be deterministic
- avoid timing assumptions
- avoid external dependencies where possible
- verify outcomes, not implementation details

Avoid:
- brittle snapshot tests
- over-mocking
- duplicate assertions

---

## Regression Prevention
Every bug fix should include:
- regression test
- reproduction scenario
- validation for adjacent flows

---

## Contract Testing
Validate:
- API schemas
- request/response compatibility
- backward compatibility

---

## CI/CD Requirements

Before merge:
- tests must pass
- linting must pass
- type checks must pass
- security checks must pass

---

## Observability
Production systems should include:
- structured logging
- metrics
- tracing where appropriate
- alerting for critical failures

### Observability Tradeoff Rules
When adding observability (logging, metrics, tracing):

**Always required in production:**
- Error conditions and failures
- State transitions in critical workflows
- Performance-sensitive operations (if optimizing)
- Security-relevant events (auth, authorization, config changes)

**Optional in non-production / development:**
- Routine/expected flow execution
- Input validation successes (unless debugging a specific issue)
- Internal state changes in helper functions

**Cost consideration:**
- Don't add observability to speculative "future needs"
- Profile before adding expensive observability (e.g., full request tracing in high-traffic paths)
- Observability should be measurable (can we act on the data?)

---

## AI-Agent Testing Rules
Agents must:
- run relevant tests after changes
- explain skipped tests
- avoid claiming success without verification
- prefer adding tests before major refactors