# Coding Standards

## Purpose
These standards govern code readability, maintainability, and implementation consistency.

Read all relevant files from .clinerules/index.md before starting work. 

**For behavioral scope and change-minimization rules, see `.clinerules/agent-behavior.md`.**

---

# Core Principles

- Clarity over cleverness
- Explicitness over magic
- Simplicity over abstraction
- Readability over brevity
- Consistency over personal preference

## Simplicity-First Implementation

When implementing:
- Prefer minimal implementations
- Use explicit logic (avoid clever one-liners)
- Adopt direct solutions over complex patterns
- Build on existing patterns rather than inventing new ones

Avoid:
- Speculative abstractions (architecture designed for future needs not yet required)
- Premature optimization (optimize based on measurement, not assumption)
- Unnecessary configurability (don't add flags for theoretical flexibility)
- Future-proofing without evidence (don't design for scenarios you don't have)
- Generic frameworks for narrow problems (don't use heavyweight solutions for simple needs)

**Rule: The simplest correct solution is preferred.**

---

# Naming Standards

## Variables
- Use descriptive names
- Avoid vague abbreviations
- Prefer domain terminology

Bad:
tmp
data2

Good:
validatedUserInput
housePointTransaction

---

## Functions
Functions should:
- describe actions
- have single responsibility
- avoid hidden side effects

Preferred:
calculateHouseScore()

Avoid:
handleStuff()

---

# Function Design

- Prefer early returns
- Avoid deep nesting
- Keep functions focused
- Minimize parameter count
- Avoid boolean flag parameters when possible

---

# Code Structure

- Group related logic together
- Keep modules cohesive
- Avoid excessively large files
- Prefer composition over inheritance

---

# Comments

Comments should explain:
- WHY
- assumptions
- constraints
- tradeoffs

Do not comment obvious implementation details.

---

# Readability

Prefer:
- explicit logic
- predictable flow
- maintainable abstractions

Avoid:
- clever one-liners
- unnecessary indirection
- hidden mutations

---

# Dependency Usage

Before introducing dependencies:
1. Verify necessity
2. Evaluate maintenance risk
3. Prefer mature ecosystems
4. Avoid overlapping libraries

---

# Refactoring

## Permission Criteria

Refactoring is permitted when:

**Always allowed (during feature work):**
- Renaming poorly-named variables for clarity
- Extracting logic to reduce function length
- Simplifying conditional logic without behavior change
- Moving code to more appropriate module
- Fixing obvious bugs discovered during work

**Requires approval/task (separate PR/task):**
- Large-scale architectural changes
- Removing deprecated code
- Rewriting modules for performance
- Reorganizing directory structures
- Updating framework versions

**Prohibited (unless explicitly requested):**
- "Cleaning up" existing code you didn't write
- Reformatting entire files for style
- Renaming abstractions for consistency
- Refactoring unrelated systems discovered during work

## Guidelines

Prefer:
- incremental refactors
- behavior-preserving changes
- isolated improvements
- test coverage before major refactors

Avoid:
- broad rewrites without justification
- mixing refactors with feature work
- refactoring code you don't fully understand
- refactors that lack a specific problem they solve

**Rule:** When in doubt, document the refactoring intention and ask for approval rather than assuming it's allowed.

---

# Versioning & Compatibility

## Semantic Versioning

Follow semantic versioning: MAJOR.MINOR.PATCH

- **MAJOR:** Breaking changes (requires migration)
- **MINOR:** Backward-compatible additions
- **PATCH:** Backward-compatible bug fixes

## Backward Compatibility

Maintain backward compatibility for:
- Public APIs
- Data formats (JSON, database schemas)
- Configuration options
- CLI interfaces
- Library exports

## Deprecation Policy

When breaking changes are required:

1. Release MINOR version with deprecation warning (logged/documented)
2. Maintain deprecated functionality for at least 2 MINOR versions
3. Release MAJOR version with removed deprecated functionality
4. Document migration path in release notes

Example:
```
v1.5.0 - Deprecated: old_function() (will be removed in v2.0.0)
v1.6.0 - Deprecated: old_function() continues to work with warning
v1.7.0 - Deprecated: old_function() continues to work with warning
v2.0.0 - Breaking: old_function() removed, use new_function() instead
```

## Data Format Versioning

For APIs and data formats:
- Include version in schema or contract
- Support reading older versions
- Always write newest version
- Document format changes in release notes

## Breaking Changes

Document breaking changes in release notes with:
- What changed
- Why it changed
- How to migrate
- Deprecation timeline (if applicable)

---

# Code Review Checklist

When reviewing code, verify:

**Functionality:**
- ✓ Meets requirements
- ✓ Handles happy path
- ✓ Handles edge cases
- ✓ Handles error cases

**Quality:**
- ✓ Follows naming conventions
- ✓ Comments explain WHY
- ✓ No obvious performance issues
- ✓ No unnecessary complexity

**Testing:**
- ✓ Tests are comprehensive
- ✓ Tests cover edge cases
- ✓ Tests verify outcomes, not implementation

**Maintenance:**
- ✓ Code is readable
- ✓ No dead code
- ✓ Dependencies are justified

**Security:**
- ✓ No hardcoded secrets
- ✓ Input validation present
- ✓ No authentication/authorization bypasses
- ✓ No exposure of sensitive information in logs