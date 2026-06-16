# Mobile Architecture Rules

## Design Philosophy
Mobile applications must:
- tolerate unstable connectivity
- preserve battery efficiency
- recover gracefully from interruptions

---

## State Management
- Persist critical state
- Avoid unnecessary background processing
- Handle app suspension/resume correctly

---

## Offline Support
Critical workflows should:
- queue requests when offline
- retry safely
- avoid data corruption

---

## Network Usage
- Minimize polling
- Batch requests where possible
- Compress large payloads

---

## UI Rules
- Respect platform conventions
- Avoid web-style UI patterns that feel non-native
- Ensure touch targets meet accessibility standards

---

## Performance
- Minimize unnecessary renders
- Avoid memory leaks
- Optimize startup time
- Release unused resources aggressively

---

## Device Resources
Use device features carefully:
- location
- camera
- notifications
- background services

Only request permissions when necessary.

---

## Security
- Store sensitive data securely
- Never hardcode secrets
- Protect local storage
- Handle token expiration safely

---

## Error Recovery
Mobile apps must:
- tolerate network interruption
- preserve user progress
- recover from partial failures gracefully

---

## Crash Handling
Crashes must:
- be logged centrally
- include device/app state where possible
- preserve reproduction information