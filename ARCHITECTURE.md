# ARCHITECTURE.md — ELQAI

## System Overview

ELQAI is a Next.js 15 (App Router) web application that automates e-course quality assurance. It ingests Blackboard course exports, analyzes them against QM + NELC rubrics via the Claude API, and produces Arabic executive reports (PDF + Word).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (RTL Arabic UI)                │
│  Next.js App Router · React Server Components + Client      │
└──────────────┬──────────────────────────────────────────────┘
               │ Server Actions / RSC data fetching
┌──────────────▼──────────────────────────────────────────────┐
│                    Next.js Server (Node.js)                  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐│
│  │ Server      │  │ Middleware   │  │ Report Generation    ││
│  │ Actions     │  │ (auth gate) │  │ (Playwright PDF,     ││
│  │ /actions/*  │  │             │  │  docx Word)          ││
│  └──────┬──────┘  └─────────────┘  └──────────────────────┘│
│         │                                                    │
│  ┌──────▼──────┐  ┌─────────────┐  ┌──────────────────────┐│
│  │ Prisma ORM  │  │ Supabase    │  │ Anthropic Claude API ││
│  │ /lib/db.ts  │  │ Auth + Store│  │ /lib/claude.ts       ││
│  └──────┬──────┘  └──────┬──────┘  └──────────────────────┘│
└─────────┼────────────────┼──────────────────────────────────┘
          │                │
┌─────────▼────────┐ ┌────▼──────────────┐
│   PostgreSQL     │ │  Supabase Storage  │
│   (Supabase)     │ │  (exports, uploads)│
└──────────────────┘ └───────────────────┘
```

## Key Layers

### 1. Presentation Layer
- **App Router pages** (`/app/(app)/*`): Server Components for initial data fetch, Client Components for interactivity.
- **RTL-first**: `dir="rtl"` on `<html>`, Cairo font, Western (0-9) numerals throughout.
- **UI primitives**: shadcn/ui components in `/components/ui/`.

### 2. Business Logic Layer
- **Server Actions** (`/actions/*`): All mutations go through Server Actions with Zod validation. One file per domain: `auth.ts`, `reviews.ts`, `findings.ts`, `exports.ts`, `review-list.ts`, `dashboard.ts`.
- **Analysis pipeline**: `actions/analysis.ts` orchestrates PII scrubbing, content extraction, Claude API call, and result persistence.

### 3. Data Access Layer
- **Prisma** singleton client (`/lib/db.ts`), PostgreSQL via Supabase.
- **Org-scoped queries**: Every query filters by `orgId` for data isolation.
- **Cursor-based pagination**: Reviews list uses Prisma cursor pagination (fetch N+1 pattern).

### 4. External Services
- **Supabase Auth**: Email/password authentication with SSR cookie-based sessions.
- **Supabase Storage**: Two buckets — `course-uploads` (zip exports) and `report-exports` (PDF/docx).
- **Anthropic Claude API**: Analysis engine with zero-retention header (`anthropic-no-store: true`).

## Data Flow: Review Lifecycle

```
Upload (.zip) → Extract (Blackboard parser) → PII Scrub → AI Analysis → Findings Review → Sign-off → Export (PDF/Word)
  UPLOADED        EXTRACTED                      ANALYZING   ANALYZED      SIGNED_OFF      EXPORTED
```

Each state transition is enforced by status checks in Server Actions.

## Security Architecture

| Concern | Implementation |
|---------|---------------|
| Authentication | Supabase Auth + middleware route protection |
| Authorization | `getCurrentUser()` in every Server Action; role checks for dashboard |
| Data isolation | All DB queries scoped to `user.orgId` |
| PII protection | `scrubContent()` removes student data before API calls |
| API security | Zero-retention header on all Claude API requests |
| Input validation | Zod schemas on all Server Action inputs |
| Export gating | `signedOffAt` must be set before report export |
| Secret management | API keys server-side only; `NEXT_PUBLIC_` prefix only for safe values |

## Folder Structure

```
/app             → App Router pages, layouts, error/loading states
/actions         → Server Actions (one per domain)
/components
  /ui            → shadcn/ui primitives
  /review        → Review feature components
  /dashboard     → Dashboard chart components
  /layout        → App shell (header)
  /auth          → Login form
/lib             → Clients + utilities (db, claude, parser, pii-scrubber, report/)
/hooks           → Custom React hooks
/types           → TypeScript interfaces + enums
/prisma          → Schema, migrations, seed
/docs            → Report structure, rubric template
/public          → Static assets (fonts)
```
