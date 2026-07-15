# Core Architecture Principles

## Design Philosophy
- Prefer simplicity over abstraction
- Prefer explicitness over magic
- Prefer composition over inheritance
- Optimize for maintainability first

---

## Separation of Concerns
- UI handles presentation only
- Business logic belongs in services/domain layers
- Data access must be isolated
- Infrastructure concerns must remain externalized
- Database access only through repositories/services
- Shared utilities must remain stateless

---

## Dependency Direction
Dependencies must flow inward:
UI → Services → Domain → Data

Lower layers must not depend on higher layers.

---

## State Management
- Minimize global mutable state
- Keep state ownership explicit
- Prefer deterministic state transitions

---

## Scalability Principles
- Design for modular replacement
- Avoid tight coupling
- Prefer interfaces/contracts between systems

---

## Modification Rules
- Prefer extending existing systems over introducing new abstractions
- Do not duplicate logic
- Avoid introducing dependencies without justification

---

## Error Handling
- Fail predictably
- Surface actionable errors
- Preserve observability

---

## Security Principles
- Least privilege
- Validate all external input
- Never expose secrets
- Never disable authentication checks
- Never modify deployment configs without explicit request
- Never trust client-side enforcement

---

## AI-Agent Rules
- Preserve architectural boundaries
- Do not introduce unnecessary abstractions
- Prefer modifying existing systems over creating parallel systems
- Explain architectural tradeoffs before major refactors