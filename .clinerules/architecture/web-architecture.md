# Web Architecture Rules

## Rendering Strategy
- Prefer server-side rendering for SEO-critical pages
- Use client-side rendering only where interactivity requires it
- Avoid unnecessary hydration

---

## Frontend Boundaries
UI Components:
- presentation only
- no direct API logic
- no business rules

Services:
- API communication
- caching
- transformation

State Layer:
- centralized shared state only when necessary

---

## Performance Rules
- Minimize bundle size
- Lazy load non-critical components
- Avoid unnecessary re-renders
- Prefer memoization only when measured beneficial

---

## Accessibility
- Semantic HTML required
- Keyboard navigation supported
- ARIA only when necessary
- Color must not be sole information carrier

---

## API Interaction
- Centralize API access
- Handle retries consistently
- Validate response schemas

---

## Security
- Never expose secrets client-side
- Sanitize rendered content
- Protect against XSS/CSRF

---

## Responsive Design
- Mobile-first layouts preferred
- Avoid hardcoded dimensions
- Support degraded network conditions

---

## Observability
Frontend errors must:
- be logged centrally
- include user/session context where appropriate
- preserve stack traces