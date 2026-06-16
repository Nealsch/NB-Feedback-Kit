# Debugging Workflow

## Core Principle
Do not modify code until the issue is understood.

---

## Standard Debugging Process

### 1. Reproduce
- Identify exact reproduction steps
- Confirm consistency
- Identify triggering conditions

### 2. Observe
- Read logs
- Inspect state
- Compare expected vs actual behavior

### 3. Isolate
- Narrow failing component
- Reduce scope
- Identify dependency chain

### 4. Hypothesize
Document:
- likely root cause
- alternative explanations
- confidence level

### 5. Verify
- test hypothesis minimally
- avoid broad rewrites
- confirm causality

### 6. Fix
- apply smallest safe change
- preserve existing behavior
- minimize side effects

### 7. Validate
- retest reproduction steps
- test adjacent flows
- run automated tests

### 8. Protect
Add:
- regression tests
- monitoring
- improved logging

---

## Debugging Rules

Never:
- change multiple systems simultaneously
- rewrite working code unnecessarily
- suppress errors without investigation
- assume root cause without evidence

Always:
- preserve reproducibility
- document findings
- verify assumptions explicitly

---

## Logging Standards
When debugging:
- increase observability first
- log state transitions (especially surprising or unexpected values)
- capture inputs/outputs only when they impact behavior
- identify timing dependencies

Do not:
- log routine/expected flow (too noisy)
- log values in tight loops
- omit context that explains the logged value (why is this logged here?)

---

## Incident Review
For critical bugs document:
- root cause
- impact
- timeline
- prevention strategy