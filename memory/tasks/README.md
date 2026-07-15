# memory/tasks/

<!--
  PURPOSE: Kanban-style task tracking for the project.
  POPULATE: Continuously, as work is planned, progressed, and completed.
  OWNER: Project-specific — maintained by NB-Project-Admin.
-->

## Overview

This directory holds the project's task board. Tasks flow through a Kanban process with WIP limits enforced by `NB-Project-Admin`.

## Task Lifecycle

```
Backlog → To Do → In Progress → Review → Done
                  (WIP limit)  (WIP limit)
```

## Task ID Convention

Tasks use the format: `TASK-###` (e.g., `TASK-001`, `TASK-042`).

Task files (if used) follow: `TASK-###_<short-description>.md`

## Statuses

| Status | Meaning |
|--------|---------|
| Backlog | Identified but not yet planned |
| To Do | Planned and ready to start |
| In Progress | Actively being worked on |
| Review | Awaiting review (code review, QA, etc.) |
| Done | Completed and verified |
| Blocked | Cannot proceed (requires external input) |

> **Note:** The specific Kanban format (single board file vs. individual task files) is a project convention. Define it in `standards/project-conventions.md` at project start.