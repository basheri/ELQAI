# TEST_PLAN.md — ELQAI

## Testing Strategy

All tests use **Vitest** + **React Testing Library** (jsdom environment). Server Actions are tested with mocked Prisma client and Supabase clients. Component tests verify rendering and user interactions.

## Test Coverage

| Test File | Tests | Covers |
|-----------|-------|--------|
| `actions/reviews.test.ts` | 12 | createReview, extractReview, updateReviewDecision, signOffReview |
| `actions/analysis.test.ts` | 2 | analyzeReview pipeline (happy path + error) |
| `actions/findings.test.ts` | 5 | updateFinding, setFindingAccepted, sign-off locking |
| `actions/exports.test.ts` | 6 | exportReport (PDF/Word), sign-off gate, storage rollback |
| `actions/review-list.test.ts` | 17 | listReviews (org scope, search, verdict filter, pagination, auth, empty results, combined filters, edge cases) |
| `actions/dashboard.test.ts` | 17 | getDashboardData (role gating, aggregation, org scope, zero reviews, bucket boundaries, null readiness, year boundaries, rounding, top-10) |
| `lib/blackboard-parser.test.ts` | 6 | Zip extraction, file classification, metadata skipping |
| `lib/pii-scrubber.test.ts` | 4 | Structural exclusion, content redaction, safe content passthrough |
| `lib/claude.test.ts` | 7 | API call, JSON extraction, retry on invalid output, error handling, OpenRouter auth, missing key |
| `lib/report/html-template.test.ts` | 6 | RTL attributes, executive summary, verdict, findings, file inventories |
| `components/review/reviews-list.test.tsx` | 4 | List rendering, empty state, status badges, card links |

**Total: 86 tests across 11 test files, all passing.**

## Test Patterns

### Server Action Tests
- Mock `getCurrentUser()` and Prisma client methods via `vi.mock()`
- Test happy path with expected data flow
- Test auth rejection (null session)
- Test validation rejection (invalid input)
- Test state guards (e.g., sign-off locking)
- Verify org-scoped queries

### Component Tests
- Render with mock data via React Testing Library
- Assert presence of expected text/elements
- Verify link targets and navigation behavior
- Test empty states

## What Is Not Tested

- **E2E tests**: No Playwright browser tests for full user flows (deferred to production readiness phase).
- **Integration tests**: No tests against a real database (tests use mocked Prisma client).
- **Chart rendering**: Dashboard chart components are not unit-tested (recharts rendering requires a browser-like canvas environment).
- **PDF/Word output**: Report generators are tested via the HTML template test; actual PDF/Word binary output is tested manually.

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch
```
