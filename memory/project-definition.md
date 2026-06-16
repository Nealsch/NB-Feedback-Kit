# NB Feedback Kit

## Overview

NB Feedback Kit is a reusable feedback, roadmap, and release management system designed for React applications.

The goal is to provide a plug-and-play solution that can be integrated into any React application with minimal configuration, enabling:

- In-app user feedback collection
- GitHub Issue creation
- Product roadmap management
- Release notes display
- Context-aware bug reporting
- Multi-project support

The system should be built once and reused across all future projects.

---

# Vision

Instead of implementing feedback collection separately for every application, developers should be able to install a single package and configure:

```tsx
<FeedbackProvider
    config={{
        applicationName: "Student Manager",
        version: "1.0.0",
        targetRepository: "student-manager"
    }}
>
    <App />
</FeedbackProvider>
```

and immediately gain:

- Persistent feedback button
- Feedback modal
- GitHub issue creation
- Release notes viewer
- Automatic metadata collection

---

# Architecture

```text
React Application
        │
        ▼
NB Feedback SDK
        │
        ▼
NB Feedback API
        │
        ▼
GitHub API
        │
        ▼
Private GitHub Repository
```

---

# High-Level Components

## Frontend SDK

Repository:

```text
nb-feedback-sdk
```

Responsibilities:

- UI Components
- Feedback collection
- Context gathering
- API communication
- Release notes display

---

## Backend API

Repository:

```text
nb-feedback-api
```

Responsibilities:

- Secure GitHub integration
- Issue creation
- Release retrieval
- Repository routing
- Authentication
- Secret management

---

## Shared Types

Repository or package:

```text
nb-feedback-shared
```

Responsibilities:

- Request types
- Response types
- Validation schemas

---

# Monorepo Structure

Recommended:

```text
NB-Feedback-Kit
│
├── packages
│   │
│   ├── react-sdk
│   │
│   ├── api
│   │
│   └── shared-types
│
├── docs
│
├── examples
│
└── infrastructure
```

---

# Phase 1 — SDK Foundation

## Objectives

Create reusable frontend components.

### Components

#### FeedbackProvider

Responsible for:

- Configuration
- Context management
- Dependency injection

#### FeedbackButton

Persistent floating button.

Requirements:

- Visible throughout application
- Position configurable
- Non-intrusive
- Theme aware

#### FeedbackModal

Fields:

- Feedback Type
- Title
- Description

Validation:

- Required type
- Required title
- Required description

---

# Phase 2 — Context Capture

## Objectives

Automatically capture useful debugging information.

### Metadata

Capture:

- Application name
- Application version
- Route
- Browser
- Operating System
- Device type
- Screen resolution
- Timestamp
- User ID (optional)

Example:

```json
{
  "application": "Student Manager",
  "version": "1.0.0",
  "route": "/dashboard",
  "browser": "Firefox",
  "os": "Windows 11",
  "screenResolution": "1920x1080",
  "timestamp": "2026-06-16T12:00:00Z"
}
```

---

# Phase 3 — API Integration

## Objectives

Create API communication layer.

### Feedback Service

Methods:

```typescript
submitFeedback()
getReleaseNotes()
getRoadmap()
```

### Payload

```json
{
  "type": "bug",
  "title": "Search not working",
  "description": "Search returns no results.",
  "metadata": {}
}
```

---

# Phase 4 — Backend API

## Objectives

Create secure GitHub integration service.

### Endpoint

#### Submit Feedback

```http
POST /feedback
```

#### Get Releases

```http
GET /releases
```

#### Get Roadmap

```http
GET /roadmap
```

---

# Phase 5 — GitHub Integration

## Objectives

Convert feedback into GitHub Issues.

### Issue Title Formats

Bug:

```text
[BUG] Search not working
```

Feature:

```text
[FEATURE] Add CSV export
```

Feedback:

```text
[FEEDBACK] Dashboard suggestions
```

---

## Issue Body Template

```markdown
## Description

User supplied description

---

## Metadata

Application: Student Manager

Version: 1.0.0

Route: /dashboard

Browser: Firefox

Operating System: Windows 11

Timestamp: 2026-06-16T12:00:00Z
```

---

# Phase 6 — GitHub Labels

## Objectives

Automatically apply labels.

### Mapping

Bug:

```text
bug
beta-feedback
```

Feature Request:

```text
feature-request
beta-feedback
```

General Feedback:

```text
feedback
beta-feedback
```

---

# Phase 7 — Release Notes

## Objectives

Display GitHub release information inside applications.

### Component

```text
ReleaseNotesModal
```

Accessible from:

- Settings
- About
- What's New

### Display

- Version
- Release Date
- Release Notes

Example:

```text
Version 1.3.0

Added:
- Student search

Improved:
- Dashboard performance

Fixed:
- Login crash
```

---

# Phase 8 — Roadmap Support

## Objectives

Expose roadmap information to users.

### Source

GitHub Issues

Labels:

```text
planned
in-progress
testing
released
```

### Roadmap Component

Display:

```text
Planned
In Progress
Released
```

---

# Phase 9 — Screenshot Support

## Objectives

Allow screenshots to accompany feedback.

### Requirements

User can:

- Upload screenshot
- Paste screenshot
- Drag and drop screenshot

### Storage Options

Option A:

GitHub issue attachment

Option B:

Cloud object storage

Examples:

- S3
- Cloudflare R2

Preferred:

Cloudflare R2

---

# Phase 10 — Multi-Project Support

## Objectives

Support multiple applications using a single API.

### SDK Configuration

```typescript
{
  applicationName: "Student Manager",
  version: "1.0.0",
  targetRepository: "student-manager"
}
```

---

## API Repository Routing

Example:

```json
{
  "student-manager": {
    "owner": "nealbresler",
    "repo": "student-manager"
  },
  "house-points": {
    "owner": "nealbresler",
    "repo": "house-points"
  }
}
```

---

# Security Requirements

## Never Expose GitHub Tokens

Forbidden:

```text
React App
    ↓
GitHub API
```

Reason:

- Token exposure
- Repository compromise

---

## Required Architecture

```text
React App
    ↓
NB Feedback API
    ↓
GitHub API
```

---

# Configuration Example

```tsx
<FeedbackProvider
    config={{
        applicationName: "Student Manager",
        version: "1.0.0",
        targetRepository: "student-manager",
        apiEndpoint: "https://feedback-api.domain.com"
    }}
>
    <App />
</FeedbackProvider>
```

---

# Future Enhancements

## Feature Voting

Allow users to vote on feature requests.

Endpoints:

```http
POST /vote
GET /features
```

---

## User Feedback Portal

Allow users to:

- View submitted feedback
- Track status
- View roadmap
- View release history

---

## AI Categorization

Automatically classify feedback:

- Bug
- Feature Request
- UX Issue
- Enhancement

---

## AI Deduplication

Detect duplicate feedback before creating new issues.

---

# Success Criteria

The project is considered successful when:

1. A React application can install the SDK in under 10 minutes.
2. Feedback can be submitted without exposing GitHub credentials.
3. Feedback automatically creates GitHub Issues.
4. Release notes can be displayed from GitHub Releases.
5. Multiple applications can share the same backend API.
6. All GitHub repositories remain private.
7. The system is reusable across future projects without modification.

---

# Target Outcome

A reusable, production-ready feedback platform that provides:

- Feedback collection
- GitHub Issue management
- Roadmap tracking
- Release note distribution
- Multi-project support

through a single SDK and backend service that can be integrated into any future React application.