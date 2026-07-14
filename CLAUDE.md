# CLAUDE.md — ELQAI

> This is the rules file Claude Code reads automatically at the start of every session.
> It sets the guardrails, standards, and non-negotiable governance rules for this project.
> **Do not delete this file. Read it before writing any code.**

---

## PROJECT CONTEXT

- **App:** ELQAI — AI-Powered Quality Assurance for E-Courses
- **Purpose:** Ingest a Blackboard course export, analyze it against a fixed QM + NELC rubric via the Claude API, and produce a share-ready Arabic executive report (PDF + Word) with a final verdict.
- **Users:** Quality reviewers at a single deanship (internal tool).
- **Source of truth for scope:** `PRD.md`. If this file and the PRD ever conflict, follow the PRD and flag the conflict.
- **Current phase:** MVP (v1.0 — core loop). See `BUILD_PLAN.md`.
- **Stack:** Next.js (App Router, TypeScript) · Tailwind + shadcn/ui (RTL) · PostgreSQL via Supabase · Prisma · Supabase Auth + Storage · OpenRouter API (Claude models) · Playwright (PDF) + `docx` (Word).

---

## 🔴 NON-NEGOTIABLE GOVERNANCE RULES (read first)

These rules exist because ELQAI handles sensitive institutional content and issues formal verdicts. Never violate them, even if a task seems to ask you to.

1. **AI is advisory only.** ELQAI never auto-issues a verdict. A review MUST pass through explicit human **sign-off** before any report can be exported. The "Export" action must be disabled until `signedOffAt` is set.
2. **Strip PII before any API call.** Blackboard exports may contain student submissions, grades, discussion posts, and rosters. This content MUST be removed/excluded in a pre-processing step **before** any course content is sent to the Claude API. Never send raw export content to the API.
3. **Data privacy.** Never log full course content or full API request bodies. PII must be stripped before any external API call.
4. **Never embed Quality Matters rubric text verbatim.** The QM rubric is proprietary/licensed. The code holds the *structure* of criteria; the actual criterion text is loaded from a seed file the owner populates from a licensed source. Do not paste QM rubric wording into the repo.
5. **Arabic report output is binding.** The generated report is Arabic, right-to-left, executive prose, with **Western (English) numerals** (0-9), correct bidi for embedded English terms, and the exact structure in `docs/report-structure.md`. Do not change this structure without instruction.
6. **Secrets never touch the client.** API keys, service-role keys, and database URLs are server-side only.

---

## CODING STANDARDS

- **TypeScript strict mode.** No `any`. Define interfaces/enums in `/types`.
- **Functional components only.** Named exports (default export only for page routes).
- **File naming:** kebab-case for files (`review-card.tsx`), PascalCase for component names.
- **Imports:** absolute via `@/` alias. Order: (1) external, (2) internal, (3) types.
- **Error handling:** every async operation wrapped in try/catch with a user-facing error state.
- **Validation:** validate ALL inputs with Zod before any database write.
- **Comments:** explain non-obvious logic with `// WHY: [reason]`.

## FOLDER STRUCTURE

```
/app             → App Router: pages, layouts, loading/error states, API routes
/components
  /ui            → shadcn/ui primitives (do not rebuild)
  /[feature]     → feature components (review, findings, report, dashboard)
/lib             → clients + utilities (db.ts, claude.ts, blackboard-parser.ts, pii-scrubber.ts, report/)
/actions         → Server Actions, one file per domain (reviews.ts, findings.ts, auth.ts)
/hooks           → custom React hooks (prefix use-)
/types           → global interfaces + enums (Verdict, Severity, Framework, etc.)
/prisma          → schema.prisma + migrations + seed.ts
/docs            → report structure, rubric seed template, governance
/public          → static assets (Arabic fonts live here)
```

## UI RULES

- Whole app is **RTL** (`dir="rtl"` on `<html>`), Arabic-first. Embedded English terms must render correctly (bidi).
- Arabic fonts: Cairo (UI) / Amiri or Cairo (report). Load locally from `/public/fonts`.
- Numerals: **Western (0-9)** everywhere, including the report.
- Use shadcn/ui first; never rebuild primitives.
- All colors via Tailwind tokens — no hardcoded hex.
- Every async view has a Skeleton loading state; every mutation shows a success + error toast.
- Every interactive element: hover, focus-visible ring, disabled state.

## BACKEND RULES

- All DB access through the Prisma client only.
- All mutations through Server Actions (no raw CRUD API routes).
- Long-running analysis runs **async** with visible progress — never block the request.
- Use Prisma transactions for multi-table writes.
- Cursor-based pagination for lists > 20 items.

## AUTH & SECURITY

- Protected routes check the session server-side (layout or middleware).
- Sanitize any rendered HTML pulled from course content (DOMPurify).
- Rate-limit auth endpoints.

## CLAUDE CODE BEHAVIOR (important)

- Do NOT refactor code outside the scope of the current request.
- Do NOT add dependencies without stating it first.
- Do NOT delete or rename existing files without explicit instruction.
- Work **one BUILD_PLAN step at a time.** Do not jump ahead or implement future steps.
- If intent is unclear, ASK — do not guess.
- After each task, list: files created, files modified, dependencies added.

## TESTING

- Every Server Action: ≥ 1 happy-path + 1 error-path test.
- Report generation: a snapshot test that the Arabic report renders RTL with the correct sections.
- Tooling: Vitest + React Testing Library.

## GIT CONVENTIONS

- Commit format: `type(scope): description` — types: feat, fix, refactor, style, test, chore, docs.
- One logical change per commit. No WIP commits.
