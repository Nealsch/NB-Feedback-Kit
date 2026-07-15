# Error Handling & Resilience

## Purpose

Error handling patterns and resilience strategies ensure systems remain operational under failure conditions while providing meaningful feedback to users and operators.

---

# Core Principles

## Fail Gracefully

Systems should:
- Recover when possible
- Degrade gracefully when recovery isn't possible
- Provide actionable error information
- Preserve data integrity under all circumstances

## Distinguish Error Types

Handle differently:
- **Transient errors:** Temporary network issues, timeouts (retry)
- **Permanent errors:** Bad input, authentication failure (fail immediately)
- **System errors:** Out of resources, database down (degrade)

## Surface Actionable Errors

Users and operators need:
- What went wrong
- Why it happened
- What to do about it
- Whether it's recoverable

Bad error: `Error: null`  
Good error: `Payment processing failed: Credit card declined. Please verify card details or use a different payment method.`

---

# Error Handling Patterns

## Fail-Fast Pattern

**When to use:** Validation errors, authorization failures, missing prerequisites

**Implementation:**
```
Validate all inputs immediately
If any invalid, return error without side effects
If valid, proceed with operation
```

**Example:**
```
def process_order(order):
  if not order.customer_id:
    raise ValidationError("Customer ID required")
  if order.total < 0:
    raise ValidationError("Order total cannot be negative")
  # Only proceed if all validations passed
  return submit_order(order)
```

## Retry Pattern

**When to use:** Transient network errors, timeouts, temporary service unavailability

**Implementation:**
```
Attempt operation
If transient error, wait and retry
Increase wait between retries (exponential backoff)
Stop after max attempts
```

**Guidelines:**
- Retry only transient errors (network, timeout, service unavailable)
- Do NOT retry permanent errors (400, 401, 403, 404)
- Use exponential backoff: wait 1s, 2s, 4s, 8s, max 60s
- Maximum 3-5 retries for most operations
- Add jitter to prevent thundering herd

**Example:**
```
def call_with_retry(func, max_attempts=3, base_wait=1):
  for attempt in range(max_attempts):
    try:
      return func()
    except TransientError as e:
      if attempt < max_attempts - 1:
        wait = base_wait * (2 ** attempt) + random.jitter()
        sleep(wait)
        continue
      raise
```

## Circuit Breaker Pattern

**When to use:** Protecting against cascading failures when downstream service is degraded

**Implementation:**

States:
- **Closed:** Normal operation, calls pass through
- **Open:** Too many failures, reject calls immediately
- **Half-Open:** Testing if service recovered, limited calls allowed

**Rules:**
- Fail fast when circuit is open (don't waste time)
- Transition to half-open after cooldown period
- Return to closed only after successful calls in half-open state
- Track failure rate, not just count

**Thresholds (adjust per service):**
- Open circuit when error rate > 50% in last 30 seconds
- Open circuit after 5+ consecutive failures
- Enter half-open after 60 seconds
- Return to closed after 3 consecutive successes in half-open

**Example:**
```
class CircuitBreaker:
  def __init__(self, threshold=5, timeout=60):
    self.state = "CLOSED"
    self.failures = 0
    self.threshold = threshold
    self.timeout = timeout
    self.last_failure_time = None
  
  def call(self, func):
    if self.state == "OPEN":
      if time.now() - self.last_failure_time > self.timeout:
        self.state = "HALF_OPEN"
      else:
        raise CircuitBreakerOpen("Service unavailable")
    
    try:
      result = func()
      if self.state == "HALF_OPEN":
        self.state = "CLOSED"
        self.failures = 0
      return result
    except Exception as e:
      self.failures += 1
      self.last_failure_time = time.now()
      if self.failures >= self.threshold:
        self.state = "OPEN"
      raise
```

## Bulkhead Pattern

**When to use:** Isolating resources to prevent one failure from affecting others

**Implementation:**
- Separate thread pools for different services
- Connection pool limits per service
- Memory isolation between components
- Timeout isolation (each request has timeout)

**Example:**
```
# Separate thread pools
payment_executor = ThreadPoolExecutor(max_workers=10, queue_size=100)
notification_executor = ThreadPoolExecutor(max_workers=5, queue_size=50)

# Call with appropriate pool
payment_future = payment_executor.submit(charge_payment)
notification_future = notification_executor.submit(send_email)

# If payment pool is saturated, notification won't be blocked
```

## Degradation Pattern

**When to use:** Non-critical functionality failing shouldn't break core functionality

**Implementation:**
- Identify critical vs. non-critical features
- Disable non-critical on failure
- Degrade quality instead of failing completely

**Example:**
```
def get_product_with_recommendations(product_id):
  product = fetch_product(product_id)  # Critical - fail if unavailable
  
  try:
    recommendations = fetch_recommendations(product_id)
  except ServiceUnavailable:
    recommendations = []  # Degrade gracefully
  
  return {
    "product": product,
    "recommendations": recommendations
  }
```

---

# Error Logging

## Log on Error

Always log:
- Error type
- Error message
- Stack trace (in DEBUG/production logs)
- Context: what operation was being performed
- User/request ID for tracing
- Timestamp

**Example:**
```json
{
  "timestamp": "2026-06-13T15:30:00Z",
  "level": "ERROR",
  "operation": "process_payment",
  "error_type": "PaymentGatewayTimeout",
  "error_message": "Payment gateway did not respond within 30 seconds",
  "request_id": "req-12345",
  "user_id": "user-789",
  "stack_trace": "...",
  "context": {
    "amount": 99.99,
    "currency": "USD",
    "retry_attempt": 2
  }
}
```

## Don't Log Sensitive Data

Never log:
- Payment information (credit card numbers)
- Passwords or tokens
- Personal information (SSN, health data)
- Encryption keys

## Categorize Error Messages for Monitoring

Use consistent error codes for alerting:
- `TRANSIENT_ERROR`: Network timeout, temporarily unavailable
- `INVALID_REQUEST`: Bad input, validation failed
- `AUTHENTICATION_FAILED`: Invalid credentials
- `AUTHORIZATION_DENIED`: Insufficient permissions
- `RESOURCE_EXHAUSTED`: Out of memory, quota exceeded
- `SYSTEM_ERROR`: Unexpected internal error
- `EXTERNAL_SERVICE_ERROR`: Third-party service failed

---

# Testing Error Scenarios

## Required Tests

For any operation that can fail, test:

**Happy path:**
- Operation succeeds
- Expected result returned

**Transient error:**
- First attempt fails with transient error
- Retry succeeds
- Circuit breaker enters half-open state
- Half-open test succeeds, returns to closed

**Permanent error:**
- Operation fails with permanent error
- No retry attempted
- User receives clear error message
- Error is logged with appropriate severity

**Resource exhaustion:**
- System degraded under load
- Bulkhead isolation prevents cascade
- Non-critical features disabled
- Core functionality still available

## Chaos Engineering

For critical systems, test failure scenarios:
- Kill random services
- Add network latency
- Reduce network bandwidth
- Fill disk space
- Spike memory usage

Verify system:
- Survives failures
- Recovers automatically
- Provides degraded service
- Alerts appropriately

---

# Observability Requirements

When implementing error handling, ensure:

- **Logging:** Error events are logged with context
- **Metrics:** Error rates are tracked
- **Alerting:** Critical errors trigger alerts
- **Tracing:** Request traces include error details
- **Documentation:** Error codes and meanings are documented

---

# Error Handling for Agents

When generating error handling code, AI agents must:

* Distinguish transient from permanent errors
* Implement appropriate retry strategies
* Include circuit breakers for external services
* Avoid cascading failures (bulkhead isolation)
* Log errors with actionable context
* Never expose internal errors to users
* Provide clear error messages to users
* Test error scenarios explicitly
* Flag missing error handling in code reviews

---

# Common Mistakes

**Mistake:** Catching all exceptions and ignoring them
```python
try:
  process_payment()
except:
  pass  # ❌ Silent failure
```

**Better:**
```python
try:
  process_payment()
except TransientError:
  retry_with_backoff()  # Handle expected error
except Exception as e:
  log_unexpected_error(e)
  raise  # Fail visibly
```

**Mistake:** Retrying permanent errors
```python
for attempt in range(3):
  try:
    validate_input(user_input)
    break
  except ValidationError:
    continue  # ❌ Retrying won't help
```

**Better:**
```python
try:
  validate_input(user_input)
except ValidationError as e:
  return error_response("Invalid input: " + str(e))
```

**Mistake:** Missing circuit breaker for external services
```python
for item in items:
  try:
    call_external_service(item)  # ❌ Cascading failure if service is down
  except:
    continue
```

**Better:**
```python
for item in items:
  try:
    call_external_service_with_circuit_breaker(item)
  except CircuitBreakerOpen:
    degrade_functionality()
    break
```

---

# Performance Considerations

## Retry Strategy Impact

- Aggressive retries can increase latency during outages
- Exponential backoff + jitter prevents thundering herd
- Too many retries tie up resources

## Circuit Breaker Trade-offs

- Circuit breaker prevents wasted calls but users see failures faster
- Half-open state allows fast recovery when service returns
- Timeout values must balance recovery speed with stability

## Bulkhead Trade-offs

- Isolation prevents cascade but uses more resources
- Each bulkhead needs separate limits (tune per service)
- Too many bulkheads become hard to manage
