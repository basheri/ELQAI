# DECISIONS.md — ELQAI

Architectural and design decisions made during development.

## ADR-1: Next.js App Router over Pages Router

**Context**: Building a full-stack app with server-side rendering, authentication, and file processing.

**Decision**: Use Next.js App Router with React Server Components and Server Actions.

**Rationale**: Server Components reduce client bundle size. Server Actions eliminate the need for API routes for mutations. The `after()` API enables async processing without blocking requests. Middleware provides centralized route protection.

## ADR-2: Supabase for Auth + Storage

**Context**: Need authentication, file storage, and a PostgreSQL database.

**Decision**: Use Supabase for all three (Auth, Storage, PostgreSQL) with Prisma as the ORM.

**Rationale**: Single platform reduces operational complexity. Supabase Auth handles email/password out of the box with SSR cookie support. Storage provides signed URLs for secure file access. Prisma adds type-safe queries and migration management.

## ADR-3: Playwright for PDF Generation

**Context**: Need to render RTL Arabic HTML to PDF with correct font rendering.

**Decision**: Use Playwright headless Chromium for HTML-to-PDF conversion.

**Rationale**: Chromium renders RTL, Arabic fonts, and CSS perfectly. Alternatives (puppeteer, wkhtmltopdf, jsPDF) have worse Arabic/RTL support. The HTML template is self-contained with embedded fonts, ensuring consistent rendering.

## ADR-4: Two-Layer PII Scrubbing

**Context**: Blackboard exports contain student data (grades, submissions, rosters). Governance requires PII removal before API calls.

**Decision**: Implement two-layer scrubbing — structural exclusion (drop entire content items from known student-data paths) + content redaction (regex patterns for emails, grades, IDs).

**Rationale**: Structural exclusion catches the bulk of PII (gradebook, discussions, submissions). Content redaction handles PII that may appear in instructional content. The `[محجوب]` placeholder makes redactions visible.

## ADR-5: Advisory AI with Human Sign-Off Gate

**Context**: Governance rule #1 — AI is advisory only.

**Decision**: Separate `suggestedVerdict` (AI output) from `verdict` (human decision). Export blocked until `signedOffAt` is set.

**Rationale**: The data model enforces the governance rule structurally. The AI cannot bypass human judgment — the `verdict` field starts null and is only set by the human reviewer. The `signedOffAt` timestamp provides an auditable sign-off record.

## ADR-6: Cursor-Based Pagination

**Context**: Reviews list needs pagination for large datasets.

**Decision**: Use Prisma cursor-based pagination with the fetch-N+1 pattern.

**Rationale**: Cursor pagination is stable under concurrent inserts (unlike offset pagination). The N+1 pattern detects whether more results exist without a separate count query. The cursor is the last item's ID, making it simple and URL-safe.

## ADR-7: recharts for Dashboard Charts

**Context**: Need accessible charts for the quality trends dashboard.

**Decision**: Use recharts for chart rendering.

**Rationale**: recharts is the standard React charting library, works with shadcn/ui patterns, and provides responsive containers with built-in accessibility features (tooltips, legends).

## ADR-8: In-Memory Rate Limiting

**Context**: Need to rate-limit auth endpoints.

**Decision**: Use an in-memory sliding-window rate limiter for MVP.

**Rationale**: Simple, zero-dependency implementation sufficient for single-instance deployment. Documented as a production consideration — should be replaced with Redis-backed limiting for multi-instance deployments.

## ADR-9: Org-Scoped Multi-Tenancy

**Context**: MVP serves a single deanship, but the PRD mentions future multi-college rollout.

**Decision**: Include the `Org` model from day one. All queries filter by `orgId`.

**Rationale**: Adding multi-tenancy retroactively is expensive and error-prone. By scoping all queries to `orgId` from the start, the data model is ready for multi-tenant deployment without schema changes.
