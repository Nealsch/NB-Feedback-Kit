# Lessons Learned

## 2026-06-16: Tasks 002-004 Implementation

### What Worked Well

**1. Metadata Auto-Capture on Mount**
- Decision to capture metadata automatically in FeedbackProvider eliminated need for manual triggers
- useEffect with dependency array ensures metadata updates when config changes
- Prevents rendering children until metadata ready (avoids race conditions)

**2. Headless Component Architecture**
- Providing only behavior without styling proved correct
- Consumers have full control over appearance
- Bundle size remains minimal
- Demo app shows it's easy to style components

**3. Test-First API Development**
- Writing 11 unit tests revealed edge cases early
- Vitest with Hono's testing utilities made testing straightforward
- Security audit caught CORS configuration that needs production hardening

**4. Comprehensive Documentation**
- `CLOUDFLARE_SETUP.md` eliminated deployment confusion
- `SECURITY_AUDIT.md` provided clear security roadmap
- Future maintainers have clear instructions

**5. Monorepo Structure**
- Shared types between SDK and API worked seamlessly
- No npm publish needed during development
- Turborepo caching sped up builds significantly

### What Caused Friction

**1. Cloudflare Vitest Pool Workers**
- Initial attempt to use `@cloudflare/vitest-pool-workers/config` failed
- Missing exports in package
- **Solution:** Simplified to standard Vitest with node environment
- **Lesson:** Use simpler solutions first; Cloudflare-specific testing can come later

**2. TypeScript Type Assertions in Tests**
- `res.json()` returns `unknown` type causing type errors
- **Solution:** Type assertions or explicit typing needed in test code
- **Lesson:** Test code needs same type discipline as production code

**3. Wrangler Version Lag**
- Started with Wrangler v3.92 when v4.101 was available
- User caught this and requested update
- **Lesson:** Always check for major version updates before starting infrastructure work

### What Should Be Avoided

**1. Premature Cloudflare Resource Creation**
- Almost started creating KV namespaces and Durable Objects prematurely
- Correctly deferred to TASK-005
- **Lesson:** Follow task dependencies strictly; don't jump ahead

**2. Overly Complex Test Configuration**
- Initial vitest config tried to use Workers-specific test pool
- Simpler node environment works fine for current needs
- **Lesson:** Start simple, add complexity only when needed

**3. Hardcoding Versions in Documentation**
- Documentation should reference "latest" or version ranges
- Specific versions (like Wrangler v3.92) date quickly
- **Lesson:** Use `^` ranges in documentation examples

### Patterns That Emerged

**Pattern 1: Context + Hook Pattern**
```typescript
// Provider captures and stores data
<FeedbackProvider config={...}>

// Hook exposes data to components
const { config, metadata } = useFeedback();
```
**Why it works:** Separates data capture from data consumption

**Pattern 2: Structured Error Responses**
```typescript
{
  success: false,
  error: "Message",
  path: "/endpoint",
  method: "GET",
  timestamp: "..."
}
```
**Why it works:** Consistent error format aids debugging

**Pattern 3: Security-First Middleware Stack**
```typescript
app.use('*', cors());
app.use('*', logger());
app.onError(handler);
app.notFound(handler);
```
**Why it works:** Global middleware catches all issues

### Testing Insights

**Insight 1: Integration Tests Can Be Fast**
- 11 tests complete in 1.16s
- Hono's request mocking is efficient
- No need for slow E2E tests at this stage

**Insight 2: Security Tests Are Documentation**
- Test "should not expose sensitive server information" documents security requirement
- Tests become living security checklist
- Audit reports reference test results

**Insight 3: CORS Tests Catch Config Issues**
- Testing OPTIONS preflight requests revealed configuration insights
- Caught that `credentials: true` with `origin: '*'` will be blocked by browsers
- Tests prevented production bug

### Architecture Validations

**Validation 1: Headless Components Scale**
- Demo app styled components easily
- No conflicts with existing styles
- Confirms headless approach is correct

**Validation 2: Cloudflare Workers Suitable**
- Sub-second response times locally
- Simple deployment model
- Cost-effective (free tier sufficient)

**Validation 3: Monorepo Prevents Publishing Overhead**
- Demo app uses SDK via workspace reference
- No `npm link` or version bumping needed
- Confirms ADR-001 decision

### Risk Mitigations Identified

**Risk 1: API Keys Exposed in Client Code**
- Mitigated by rate limiting (TASK-005)
- Keys are per-application, not per-user
- Revocation is straightforward

**Risk 2: CORS Too Permissive**
- Currently allows all origins
- Documented for production restriction
- Tests in place to verify configuration

**Risk 3: No Request Size Limits**
- Could allow payload bombs
- Flagged in security audit
- Plan: Add middleware in TASK-006

### Reusable Patterns for Future Tasks

**Pattern: Test Template**
```typescript
describe('Feature', () => {
  it('should handle success case', async () => {
    const req = new Request('http://localhost/endpoint');
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
  });
  
  it('should handle error case', async () => {
    // ... error test
  });
});
```

**Pattern: Security Audit Checklist**
1. Information disclosure test
2. CORS configuration review
3. Error handling verification
4. Dependency security scan
5. Authentication/authorization check (if applicable)

### Performance Notes

**Observation 1: Metadata Capture Cost**
- Metadata capture happens once on mount
- Negligible performance impact (<1ms)
- User-Agent parsing is synchronous but fast

**Observation 2: Build Performance**
- Turborepo caching effective
- Cached builds complete in ~4s
- Full builds complete in ~10s

### Documentation Learnings

**Effective: Step-by-Step Cloudflare Setup**
- Complete commands with expected output
- Explains what each resource is for
- Shows when each resource is needed (task number)

**Effective: Security Audit Format**
- Executive summary upfront
- Detailed analysis per category
- OWASP mapping provides framework
- Action items clearly marked

**Missing: Integration Examples**
- Should add more SDK usage examples to README
- Need examples for common styling frameworks (Tailwind, styled-components)
- Future enhancement

## 2026-07-05: Storage-Provider Agnosticism (S3-compatible presigned URLs)

### What Worked Well

**1. Zero-Dependency SigV4 via Web Crypto API**
- Implementing SigV4 presigned-URL signing with the Web Crypto API (no npm
  packages) kept the SDK bundle small and avoided supply-chain surface.
- The signer is pure + deterministic, making it trivially unit-testable.
- **Lesson:** For well-documented crypto protocols (SigV4), a small in-repo
  implementation is preferable to pulling in a heavy SDK.

**2. Extending the Discriminated-Union Pattern**
- Adding the `s3` branch to `StorageProviderConfig` was a compile-time-safe
  operation thanks to the existing `never`-guarded exhaustiveness check in
  `createStorageProvider`.
- No existing provider code needed to change.
- **Lesson:** The discriminated-union + exhaustive-switch pattern pays off
  every time a new variant is added — the compiler tells you exactly what to
  wire up.

**3. Reusing the Existing Auth + Rate-Limit Pipeline**
- The presign route sits under `/api/*`, so it inherited `X-API-Key` auth,
  KV lookup, and the `RateLimiter` Durable Object for free.
- No parallel auth system was needed.
- **Lesson:** When a new endpoint fits an existing middleware prefix, prefer
  mounting it there over building a bespoke path.

### What Caused Friction

**1. No Dedicated Integration Test for the Presign Route Handler**
- The SigV4 signer has 16 unit tests, but the route handler (auth, allowlist,
  400/403/500 paths) does not yet have an integration test.
- **Lesson:** When splitting logic (signer) from orchestration (route),
  test both layers — don't assume the unit-tested layer covers the handler.

**2. Bucket Public-Readability Requirement**
- The returned `publicUrl` only renders as a Markdown image in the GitHub
  issue if the bucket is publicly readable. This is a deployment requirement
  that is easy to miss.
- **Lesson:** Document provider-specific deployment prerequisites inline in
  the config UI, not just in the ADR.

### Patterns That Emerged

**Pattern: Server-Signed, Client-Uploaded**
- Server signs a short-lived URL → client uploads bytes directly to the
  storage backend → server never touches the bytes → client never sees the
  credentials.
- Applicable to any future storage provider that supports presigned URLs
  (Azure SAS, GCS signed URLs).

**Pattern: Non-Secret Config in SDK, Secrets in Worker**
- The SDK config holds only targeting info (bucket, region, endpoint). The
  Worker holds the credentials. The bucket allowlist defends against forged
  config.
- Generalizes to any provider where credentials must be isolated from the
  client bundle.

### Reusable Insight

**Insight: Browser CORS Is the Operator's Responsibility**
- The SDK cannot control the bucket's CORS policy. Operators must allow PUT
  from the app's origin. This should be a setup-guide checklist item for
  every storage provider that involves direct browser uploads.

---

## Summary

Session was highly productive. Completed 3 major tasks with comprehensive testing and documentation. Monorepo architecture validated. Security-first approach paid off immediately. Ready for authentication and GitHub integration phase.

**Key Takeaway:** Test coverage and documentation up front prevents issues later. Security audits should happen at every major milestone, not just at the end.
