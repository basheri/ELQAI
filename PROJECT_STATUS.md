# PROJECT_STATUS.md — ELQAI

> Auto-generated gap analysis. Updated continuously.

## Build Progress

| Step | Feature | Status | Evidence |
|------|---------|--------|----------|
| 0 | Scaffold | Complete | Build clean, tsc clean |
| 1 | DB schema + rubric seed | Complete | Migration applied, seed runs |
| 2 | Authentication | Complete | Supabase email/password, middleware protection |
| 3 | App shell + Reviews list | Complete | RTL layout, reviews list, 4 component tests |
| 4 | Upload export | Complete | Server Action, Supabase Storage, 5 tests |
| 5 | Extract + file inventory | Complete | Blackboard parser, 6 tests |
| 6 | PII scrubbing | Complete | Structural exclusion + redaction, 4 tests |
| 7 | AI analysis engine | Complete | Claude API, advisory verdict, 7 tests |
| 8 | Findings review + override | Complete | Edit/exclude/verdict controls, 5 tests |
| 9 | Sign-off gate | Complete | Governance rule #1 enforced, 5 tests |
| 10 | Report PDF + Word | Complete | HTML template, Playwright PDF, docx Word, 12 tests |
| 11 | History + search | **Not started** | Needed: filters, cursor pagination, re-export |
| 12 | Dashboard | **Not started** | Needed: aggregate trends, charts |

## Feature Gap Analysis

| Area | Requirement | State | Required Work | Priority |
|------|-------------|-------|---------------|----------|
| Reviews list | Cursor-based pagination | Missing | Add cursor param, load-more | P1 |
| Reviews list | Search by course name/code | Missing | Add search input + server query | P1 |
| Reviews list | Filter by verdict | Missing | Add verdict filter dropdown | P1 |
| Reviews list | Filter by date range | Missing | Add date filter | P2 |
| Past reviews | Re-open read-only | Partial | Detail page already supports locked view | P1 |
| Past reviews | Re-export report | Partial | Export buttons work on signed-off reviews | P1 |
| Dashboard | Readiness distribution | Missing | Aggregate query + chart | P2 |
| Dashboard | Verdict mix | Missing | Aggregate query + chart | P2 |
| Dashboard | Common failing standards | Missing | Aggregate findings query | P2 |
| Dashboard | Trend over time | Missing | Time-series query + chart | P2 |

## Security Checklist

| Check | Status |
|-------|--------|
| No secrets committed | Verified — only .env.example with placeholders |
| Server-side auth on all routes | Verified — middleware + getCurrentUser() |
| Org-scoped DB queries | Verified — all queries filter by orgId |
| Sign-off gate on export | Verified — exportReport checks signedOffAt |
| PII stripped before API | Verified — scrubContent() mandatory in pipeline |
| Zero-retention API config | Verified — claude.ts sets headers |
| Input validation (Zod) | Verified — all Server Actions validate |
| Rate limiting on auth | Verified — checkRateLimit() on signIn |
| No XSS from course content | Verified — content not rendered as HTML in UI |
| File upload restrictions | Verified — .zip only, 200MB max |

## Test Summary

- 50 tests across 9 test files, all passing
- Coverage: Server Actions, parsers, PII scrubber, Claude client, HTML template, component rendering

## Current Phase

Implementing Steps 11 + 12 to complete the full feature set.
