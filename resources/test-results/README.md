# test-results/

<!--
  PURPOSE: Per-release test result records.
  POPULATE: After each release's testing cycle (NB-QA-Engineer).
  OWNER: Project-specific — maintained by NB-QA-Engineer.
-->

## Overview

This directory holds one test result record per release. Each record captures what was tested, what passed/failed, coverage, defects found, and the release recommendation.

## Naming Convention

`YYYY-MM-DD_v{VERSION}_test-results.md`

Examples:
- `2026-06-13_v1.0.0_test-results.md`
- `2026-06-13_v1.1.0-rc1_test-results.md`

## How to Use

1. Copy `TEMPLATE.md` to a new file named per the convention above.
2. Fill in the test results for that release.
3. Reference the file from the release approval / handoff.

## Index

<!-- Add a row to this table each time a new test result record is produced. -->

| Date | Version | Status | File |
|------|---------|--------|------|
| — | — | — | — |

## Related

- [Test Matrix](../test-matrix.md) — coverage targets and gaps
- [Testing Standards](../../standards/testing.md) — project test rules
- [TEMPLATE.md](TEMPLATE.md) — blank template to copy