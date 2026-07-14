# SECURITY_REVIEW.md — ELQAI

> Security audit of the ELQAI codebase. Last updated: 2026-07-14.

## Summary

The codebase demonstrates strong security practices overall. One governance compliance gap was found and fixed (zero-retention header). The remaining findings are defense-in-depth improvements.

## Findings

### Fixed

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | High | **Zero-retention API header missing** — `lib/claude.ts` created the Anthropic client without the `anthropic-no-store: true` header, relying on account-level config instead of code-level enforcement (governance rule #3). | **Fixed** — Added `defaultHeaders: { "anthropic-no-store": "true" }` to client constructor. |

### Verified Secure

| Area | Status | Evidence |
|------|--------|----------|
| Authentication | Secure | Supabase Auth with SSR cookie sessions. Middleware (`middleware.ts`) protects all non-public routes. Layout-level defense-in-depth via `getCurrentUser()`. |
| Authorization / Role gating | Secure | Dashboard gated to ADMIN + LEADERSHIP roles in both the page component and Server Action. |
| Org-scoped queries | Secure | Every Prisma query in Server Actions and page components filters by `user.orgId`. No cross-org data access possible. |
| Input validation | Secure | All Server Actions validate inputs with Zod before any DB operation. File upload restricted to `.zip`, max 200MB. |
| PII protection | Secure | `lib/pii-scrubber.ts` performs two-layer PII removal (structural exclusion + content redaction) before any Claude API call. Pipeline enforced in `actions/analysis.ts`. |
| Sign-off gate | Secure | `actions/exports.ts` checks `signedOffAt` before allowing report export. Export buttons disabled in UI until sign-off. |
| Secret management | Secure | Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are client-exposed. API keys, service-role key, and DATABASE_URL are server-side only. |
| XSS prevention | Secure | Course content is never rendered as HTML in the UI. Report HTML template uses `escapeHtml()` for all dynamic values. |
| SQL injection | Secure | No raw SQL queries — all DB access through Prisma ORM with parameterized queries. |
| CSRF protection | Secure | Next.js Server Actions include built-in CSRF protection. |
| Rate limiting | Secure | Auth endpoint (`signIn`) rate-limited to 5 attempts per minute per key via in-memory sliding window. |

### Recommendations (Defense-in-Depth)

| # | Priority | Recommendation |
|---|----------|----------------|
| 1 | P2 | Add zip bomb protection — validate decompressed size against a maximum threshold before full extraction. |
| 2 | P2 | Add security headers (CSP, X-Frame-Options, X-Content-Type-Options) via Next.js middleware or `next.config.ts`. |
| 3 | P3 | Add rate limiting on expensive operations (analysis, export) to prevent resource exhaustion. |
| 4 | P3 | Move rate limiting from in-memory to Redis/database-backed for multi-instance deployments. |
| 5 | P3 | Add audit logging for security-sensitive actions (sign-off, export, verdict changes). |

## Governance Compliance

| Rule | Status |
|------|--------|
| #1 — AI is advisory only, human sign-off required | Compliant |
| #2 — PII stripped before API calls | Compliant |
| #3 — Zero-retention API | Compliant (after fix) |
| #4 — No QM rubric text verbatim | Compliant |
| #5 — Arabic RTL report with Western numerals | Compliant |
| #6 — Secrets server-side only | Compliant |
