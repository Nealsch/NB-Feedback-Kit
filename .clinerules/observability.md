# Observability Standards

## Purpose

Observability ensures systems are transparent, measurable, and debuggable. This document defines standards for logging, metrics, tracing, and alerting.

---

# Core Principles

## Actionable Observability

Observability must be:
- **Measurable:** Capture numeric or structured data, not just prose
- **Queryable:** Enable search and aggregation of related events
- **Actionable:** Data must inform decisions or trigger responses

## Data Value

Do not collect observability data unless you will:
- Monitor it
- Alert on it
- Act on it
- Retain it for analysis

---

# Structured Logging

## Log Format

Use structured logging (JSON or equivalent).

Example:
```json
{
  "timestamp": "2026-06-13T15:30:00Z",
  "level": "ERROR",
  "service": "payment-api",
  "operation": "process_transaction",
  "user_id": "user-123",
  "transaction_id": "txn-456",
  "error": "payment_gateway_timeout",
  "duration_ms": 5000,
  "context": {
    "attempt": 1,
    "retry_eligible": true
  }
}
```

## Log Levels

- **DEBUG:** Development and troubleshooting (not in production)
- **INFO:** Normal operation milestones (application started, job completed)
- **WARN:** Recoverable issues that may indicate problems (retry attempt, degraded mode)
- **ERROR:** Errors that require action (API failure, invalid state)
- **CRITICAL:** System-threatening issues (data loss, authentication bypass)

---

# Required Logging

## Always Log

- **Service startup/shutdown:** Service name, version, configuration
- **External service calls:** Service name, endpoint, status, latency, error details
- **Authentication events:** Login attempts, MFA, token validation failures
- **Authorization changes:** Permission grants, role assignments
- **Security events:** Failed validation, rate limit exceeded, suspicious patterns
- **Data mutations:** Create, update, delete operations (non-sensitive fields)
- **State transitions:** Workflow progression, job status changes
- **Resource limits:** Approaching quota, cache full, memory pressure

## Never Log

- Passwords
- API keys or tokens
- Encryption keys
- Sensitive personal information (SSN, credit card numbers)
- Health information
- Unencrypted PII
- Session identifiers
- Authorization headers

## Conditional Logging

**Log only on failure:**
- Successful validations (log failures instead)
- Successful authorization checks (log denials instead)
- Routine cache hits (log misses instead)
- Normal flow execution (log abnormalities instead)

---

# Metrics

## Application Metrics

Track:
- Request count
- Request latency (p50, p95, p99)
- Error rate
- Success rate
- Throughput (requests/sec)

## Resource Metrics

Track:
- CPU utilization
- Memory utilization
- Disk space
- Network bandwidth
- Database connection pool usage
- Cache hit rate

## Business Metrics

Track (if applicable):
- Transactions completed
- Revenue
- User actions
- Conversion rate
- Feature usage

---

# Distributed Tracing

## When to Use

Use distributed tracing for:
- Multi-service requests
- Background jobs spanning services
- High-latency operations
- Performance investigations

## Trace Context

Include in trace spans:
- Service name
- Operation name
- Start time, end time, duration
- Status (success, error, timeout)
- Error details if applicable
- User or request context
- Sampling rate

## Sampling Strategy

- Production: Sample at 1-10% for high-volume operations (aggregate metrics instead)
- Production: Sample at 100% for low-volume critical operations
- Staging/Dev: 100% sampling for debugging
- Never sample errors (always trace failures)

---

# Alerting

## Alert Thresholds

Define thresholds for:
- Error rate > 1% (critical)
- Latency p99 > 2x baseline (warning)
- Availability < 99.5% (critical)
- Resource utilization > 85% (warning)
- Resource utilization > 95% (critical)
- Failed authentication attempts > 10 in 5min (critical)

## Alert Severity

- **CRITICAL:** Immediate action required (escalate to on-call)
- **WARNING:** Should be investigated soon (next business day acceptable)
- **INFO:** FYI only (no immediate action required)

## Alert Fatigue Prevention

- Avoid alerting on normal variations
- Use composite alerts (only alert if multiple conditions are met)
- Require alerts to be resolved (no silent recovery without notification)
- Suppress known maintenance windows
- Implement alert de-duplication (group related alerts)

---

# Observability Gates

## Pre-Production Readiness

Before deploying to production, verify:
- Logging is configured for all external service calls
- Critical user flows include logging at key points
- Error scenarios generate actionable logs
- Metrics are being collected
- Alerts are defined for critical thresholds
- On-call procedures reference which alerts require response

## Production Monitoring

After production deployment:
- Monitor for 30min (low-risk), 2hr (medium-risk), 24hr (high-risk)
- Watch for increased error rates, latency, or resource usage
- Verify business metrics are moving correctly
- Confirm no unexpected alerts are firing

---

# Observability for Agents

When implementing systems, AI agents must:

* Define logging strategy for the component
* Identify critical user workflows to instrument
* Specify metrics to collect
* Define alert thresholds for critical failures
* Include observability in the Definition of Done
* Avoid logging sensitive data
* Prefer structured logging
* Use appropriate log levels
* Flag missing observability in code reviews

---

# Maintenance

Observability configuration must be reviewed:
- When scaling (new volume thresholds)
- When changing SLOs
- When architecture changes
- Quarterly (even if nothing changed)

Remove:
- Logs that are never queried
- Metrics no one is watching
- Alerts that fire but require no action
