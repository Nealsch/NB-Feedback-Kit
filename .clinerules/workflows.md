# Multi-Agent Workflows

## Purpose

These workflows define how multiple agent personas collaborate, hand off work, and resolve conflicts in typical development scenarios.

---

# Feature Development Workflow

```
┌─ Feature Request
│
├─ [Architect] Design Architecture
│   ├─ Define services/APIs
│   ├─ Identify dependencies
│   └─ Create ARCH-### decision
│
├─ [Security Engineer] Review Architecture
│   ├─ Identify auth/authz requirements
│   ├─ Review data handling
│   └─ Approve or request changes
│
├─ [Developer] Implement Feature
│   ├─ Follow architecture
│   ├─ Add security controls
│   ├─ Write tests
│   └─ Submit PR
│
├─ [Code Reviewer] Review Code
│   ├─ Check architecture compliance
│   ├─ Verify security practices
│   ├─ Assess test coverage
│   └─ Approve or request changes
│
├─ [QA Engineer] Verify Feature
│   ├─ Test functionality
│   ├─ Verify coverage
│   ├─ Security testing
│   └─ Release verification
│
└─ Feature Complete
```

**Critical Path:** Architect → Security → Developer → QA  
**Parallel:** Code review can happen during implementation  
**Blockers:** Security approval required before development; QA verification required before release

---

# Bug Investigation Workflow

```
┌─ Bug Reported
│
├─ [Debugger] Reproduce Issue
│   ├─ Identify reproduction steps
│   ├─ Confirm consistency
│   ├─ Isolate failing component
│   └─ Evaluate severity
│
├─ Severity Assessment
│   ├─ CRITICAL → Immediate fix required
│   ├─ HIGH → Fix in current sprint
│   └─ MEDIUM/LOW → Backlog
│
├─ [Debugger] Root Cause Analysis
│   ├─ Investigate logs
│   ├─ Inspect state
│   ├─ Narrow failing system
│   ├─ Identify root cause
│   └─ Document findings
│
├─ Architectural Issue?
│   ├─ YES → [Architect] Advises solution
│   └─ NO → [Developer] Fixes bug
│
├─ [Security Relevant?]
│   ├─ YES → [Security Engineer] Reviews fix
│   └─ NO → [Developer] Implements fix
│
├─ [Code Review] Verify Fix
│   ├─ Check fix correctness
│   ├─ Verify no regressions
│   └─ Approve
│
├─ [QA Engineer] Verify Resolution
│   ├─ Confirm bug is fixed
│   ├─ Test adjacent flows
│   ├─ Run regression tests
│   └─ Release verification
│
└─ Bug Resolved
```

**Critical Path:** Debugger → Developer/Architect → Code Review → QA  
**Priority:** CRITICAL bugs skip some review gates if previously approved architecture is being used  
**Escalation:** If root cause is unclear after 2 hours, escalate to tech lead

---

# Security Incident Workflow

```
┌─ Security Issue Identified
│
├─ [Security Engineer] Assess Severity
│   ├─ Evaluate exposure
│   ├─ Identify impact
│   ├─ Determine timeline
│   └─ CRITICAL → Immediate mitigation
│
├─ [Architect] Consult (if architectural)
│   ├─ Assess design implications
│   └─ Propose long-term fix
│
├─ [Developer] Implement Fix
│   ├─ Security Engineer oversight
│   ├─ May bypass normal code review for critical issues
│   └─ Implement immediate mitigation
│
├─ [Code Review] Expedited Review
│   ├─ Security focus
│   ├─ Regression risk assessment
│   └─ Approve
│
├─ [QA Engineer] Expedited Testing
│   ├─ Verify fix effectiveness
│   ├─ Regression testing
│   └─ Release verification
│
├─ [Release Owner] Deploy
│   ├─ May bypass normal deployment gates for CRITICAL
│   ├─ Enhanced monitoring
│   └─ Immediate validation
│
└─ Post-Incident Review
   ├─ [Security Engineer] Document findings
   ├─ [Debugger] RCA if needed
   ├─ [Architect] Long-term fix plan
   └─ [Team] Learn and update processes
```

**Critical Path:** Security → Developer → QA → Deployment  
**Parallelization:** Immediate mitigation while long-term fix is designed  
**Escalation:** CRITICAL issues escalate to VP Engineering; MEDIUM to Tech Lead  
**Timeline:** CRITICAL must be patched within 4 hours; HIGH within 24 hours

---

# Performance Issue Workflow

```
┌─ Performance Degradation Detected
│
├─ [Observability] Alert fired
│   ├─ Error rate > 1% → CRITICAL
│   ├─ Latency p99 > 2x baseline → HIGH
│   └─ Resource utilization > 95% → CRITICAL
│
├─ [Debugger] Investigate
│   ├─ Query logs and metrics
│   ├─ Identify affected component
│   ├─ Gather performance data
│   └─ Diagnose root cause
│
├─ [Architect] Evaluate Solutions
│   ├─ Quick fix (temporary scaling)
│   ├─ Medium-term (code optimization)
│   └─ Long-term (architectural change)
│
├─ [Developer] Implement Fix
│   ├─ Quick fix: Deploy immediately
│   ├─ Medium/Long term: Code review cycle
│   └─ Benchmark after change
│
├─ [QA Engineer] Verify Metrics
│   ├─ Confirm latency improved
│   ├─ Verify error rates normalized
│   ├─ Check for regressions
│   └─ Release verification
│
└─ Performance Restored
   └─ [Team] Schedule long-term optimization
```

**Critical Path:** Debugger → Architect → Developer → QA  
**Timeline:** Quick fixes within 15 minutes; medium-term within sprint  
**Metrics:** Must validate improvement with before/after metrics

---

# Refactoring Task Workflow

```
┌─ Refactoring Proposal
│
├─ [Architect] Evaluate
│   ├─ Assess complexity
│   ├─ Risk evaluation
│   └─ Approve or defer
│
├─ [Developer] Plan Refactor
│   ├─ Scope definition
│   ├─ Test coverage audit
│   ├─ Rollback strategy
│   └─ Time estimate
│
├─ [QA Engineer] Test Planning
│   ├─ Regression test strategy
│   ├─ Coverage verification
│   └─ Approval to proceed
│
├─ [Developer] Execute Refactor
│   ├─ Behavior-preserving changes only
│   ├─ Continuous test execution
│   ├─ Incremental commits
│   └─ Code review at key points
│
├─ [Code Review] Multiple Reviews
│   ├─ Segment reviews (don't review entire refactor at once)
│   ├─ Verify behavior preservation
│   └─ Approve incrementally
│
├─ [QA Engineer] Final Verification
│   ├─ Run full regression suite
│   ├─ Spot-check functionality
│   └─ Release verification
│
└─ Refactoring Complete
```

**Critical Path:** Architect → Developer → QA  
**Constraint:** Large refactors must be planned and approved before starting  
**Safeguard:** Automated tests must pass before any merge  
**Timeline:** Major refactors should be scheduled; minor can be ad-hoc

---

# Conflict Resolution Workflow

```
┌─ Decision Conflict Arises
│   (Two personas have different opinions)
│
├─ [Disagreeing Personas] Attempt Resolution
│   ├─ Present positions and tradeoffs
│   ├─ Look for compromise
│   ├─ Agree → Decision made
│   └─ Disagree → Escalate
│
├─ [Tech Lead] Review Conflict
│   ├─ Hear both perspectives
│   ├─ Evaluate tradeoffs
│   ├─ Make decision
│   ├─ Document rationale
│   └─ Communicate decision
│
└─ Work Proceeds
   └─ Decision is binding
```

**Special Cases:**

**Architecture vs. Security:**
```
If Architect & Security disagree:
→ Security takes precedence
→ Architect proposes alternative that satisfies security
→ No escalation needed (clear authority)
```

**Timeline vs. Quality:**
```
If developer timeline conflicts with QA coverage:
→ Escalate to Tech Lead
→ Can proceed with risk acceptance:
   - Document gaps
   - Owner must approve
   - Monitor in production
   - Fix in next sprint
```

**Schedule vs. Architecture:**
```
If timeline doesn't allow architectural work:
→ Escalate to Product Manager + Tech Lead
→ Options:
   - Extend timeline
   - Defer feature
   - Use quick fix + tech debt ticket
```

---

# Parallel Work Coordination

When multiple personas work simultaneously:

## Independent Tracks (No Blocking)

```
Architect designs API schema
  ↓ (hands off after design complete)
Developer implements (can start while Architect refines)
  ↓
QA plans tests based on spec (can start from design)
  ↓
Code review + QA test execution (parallel)
```

## Dependent Tracks (Blocking)

```
Security designs auth scheme (BLOCKS developer)
  ↓ (hands off after approval)
Developer implements using approved scheme (can proceed)
  ↓
QA verifies security implementation
```

## Recommendations

1. **Start QA test planning early** from architecture/design
2. **Architect and Security should review in parallel** when possible
3. **Code review can happen during implementation** (draft PRs)
4. **Testing can start from specification** before code is complete
5. **Documentation should be written concurrently** with feature development

---

# Handoff Checkpoints

Ensure handoffs are clean with these verification steps:

**Architect → Developer:**
- [ ] Architecture documented
- [ ] API contracts defined
- [ ] Data models approved
- [ ] Dependencies identified
- [ ] Risks documented

**Developer → Code Review:**
- [ ] Tests written and passing
- [ ] Architecture followed
- [ ] Documentation updated
- [ ] No security red flags
- [ ] Ready for review checklist

**Code Review → QA:**
- [ ] Code approved
- [ ] Tests are comprehensive
- [ ] No regressions introduced
- [ ] Ready for testing

**QA → Release:**
- [ ] All tests passing
- [ ] Coverage verified
- [ ] Edge cases tested
- [ ] Performance acceptable
- [ ] Ready for release

---

# Escalation Matrix

| Issue | To | Timeline | Authority |
|-------|----|-----------|---------| 
| Architectural conflict | Tech Lead | 1 day | Tech Lead decides |
| Security conflict | Security Lead | URGENT | Security Lead decides |
| Timeline conflict | Product Manager | 1 day | PM + Tech Lead |
| Quality vs. Speed | Tech Lead | 1 day | Tech Lead (can override) |
| Resource constraint | Engineering Manager | 1 day | EM decides |
| Critical bug root cause unclear | Tech Lead | 2 hours | Tech Lead escalates if needed |

---

# Review & Iteration

These workflows should be reviewed:
- Quarterly (look for bottlenecks)
- After major incidents (learn from problems)
- When team composition changes (adjust for new skills)

Common improvements:
- Adding parallel review tracks
- Adding security earlier in process
- Earlier QA involvement
- Faster feedback loops
