# AI Agent Behavior Rules

## Purpose
These rules govern how AI agents should reason, plan, modify, and validate work within this repository.

These rules prioritize:
- maintainability
- predictability
- minimal risk
- architectural consistency
- verifiable outcomes

over raw implementation speed. 

---

# 1. Think Before Coding

Before implementation:
- state assumptions explicitly
- identify ambiguities
- identify architectural constraints
- identify downstream impact
- prefer clarification over silent interpretation

If multiple valid interpretations exist:
- present options
- explain tradeoffs
- avoid arbitrary decisions

Do not proceed when critical requirements are unclear.

---

# 2. Simplicity First

**See `.clinerules/coding-standards.md § Simplicity-First Implementation` for detailed guidance.**

Core principle: The simplest correct solution is preferred.

When implementing, avoid speculative abstractions, premature optimization, unnecessary configurability, and generic frameworks for narrow problems.

---

# 3. Surgical Changes

Modify only what is necessary.

Do not:
- refactor unrelated systems
- reformat unrelated files
- rename unrelated symbols
- rewrite working code without justification
- "fix" adjacent code that isn't in scope

Examples:
- ✗ Refactoring a service layer to be "cleaner" during a bug fix in that service
- ✗ Reformatting an entire file when making a single-line change
- ✗ Renaming variables in unrelated functions for consistency
- ✓ Updating error message in the affected code path
- ✓ Adding a helper function required by your change
- ✓ Fixing a directly-related validation rule in the same module

If unrelated issues are discovered:
- document them
- do not fix them unless requested

---

# 4. Preserve Architectural Integrity

Before introducing new:
- services
- patterns
- abstractions
- dependencies

verify:
- existing systems cannot solve the problem
- architecture rules are preserved
- complexity remains justified

Prefer extending existing systems over introducing parallel systems.

---

# 5. Goal-Driven Execution

Tasks must be transformed into verifiable outcomes.

Example:
- "Fix bug" → reproduce issue, add regression test, verify resolution
- "Add validation" → add invalid-input tests and verify failures

For multi-step tasks:
1. Plan
2. Implement
3. Verify
4. Re-evaluate risks

---

# 6. Verification First

Never claim success without validation.

Required validation may include:
- tests
- linting
- type checking
- manual verification
- reproduction confirmation

If verification is skipped:
- explain why
- identify remaining risk

---

# 7. Respect Existing Conventions

When modifying code:
- match repository conventions
- preserve architectural patterns
- preserve naming consistency
- avoid introducing conflicting paradigms

Consistency is preferred over personal preference.

---

# 8. Failure Handling

When blocked:
- explain the blocker clearly
- identify missing information
- propose safe next steps

Do not:
- fabricate certainty
- invent missing requirements
- silently ignore contradictions

---

# 9. Technical Debt Discipline

Allowed:
- tactical short-term workaround with documentation
- temporary duplication with explicit TODO

Not allowed:
- hidden hacks
- undocumented bypasses
- architecture violations without acknowledgment

All technical debt must be visible and intentional.

---

# 10. Observability Mindset

When appropriate:
- improve logging
- improve diagnostics
- improve traceability

Systems should become easier to debug after modification, not harder.

---

# 11. Security Awareness

Always consider:
- input validation
- secret exposure
- authorization boundaries
- unsafe dependencies
- injection risks

Security-sensitive changes require explicit verification.

---

# 12. Definition of Completion

Work is complete only when:
- implementation satisfies requirements
- verification passes
- architecture rules remain intact
- no critical regressions identified
- documentation updated where necessary