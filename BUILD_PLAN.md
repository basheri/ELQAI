# BUILD_PLAN.md — ELQAI

How to use this: in Claude Code, do **one step at a time, in order**. For each step, paste the prompt block into Claude Code, let it finish, then run the **Verify** check. Only move on when Verify passes. If something breaks, paste the exact error to Claude Code and ask for a targeted fix.

Every prompt assumes Claude Code has already read `CLAUDE.md`, `PRD.md`, and `docs/`.

Legend: v1.0 = MVP core loop · v1.1 = history · v1.2 = dashboard.

---

## Step 0 — Scaffold the project · v1.0
**Goal:** A running, empty Next.js app with all tooling configured.
**Depends on:** None
**New dependencies:** Next.js, Tailwind, shadcn/ui, Prisma, Zod, Supabase client, Anthropic SDK, unzipper, pdf-parse, mammoth, playwright, docx, vitest.

```
Read CLAUDE.md. Initialize a Next.js project (App Router, TypeScript, Tailwind) in this folder,
using the @/ import alias. Then:
- Install and init shadcn/ui (RTL-friendly).
- Install Prisma and point it at the existing prisma/schema.prisma (do NOT overwrite it).
- Install: zod, @supabase/supabase-js, @supabase/ssr, @anthropic-ai/sdk, unzipper, pdf-parse,
  mammoth, playwright, docx, and dev deps vitest + @testing-library/react.
- Create /lib/db.ts (Prisma singleton) and /lib/utils.ts (cn helper).
- Set <html dir="rtl" lang="ar"> in the root layout and wire an Arabic font (Cairo) from /public/fonts.
- Create .env from .env.example structure (leave values blank).
Do NOT build any features. When done, list files created and dependencies added.
```
**Verify:** `npm run build` compiles with zero errors · `npm run dev` shows the default page in RTL.

---

## Step 1 — Database schema + rubric seed · v1.0
**Goal:** The database matches the model and the built-in rubric is seedable.
**Depends on:** Step 0

```
Using the existing prisma/schema.prisma, generate the Prisma client and create the initial
migration. Then create prisma/seed.ts that loads rubric criteria from docs/rubric-seed-template.md
format into the RubricCriterion table (read from a local seed JSON file the owner will fill;
create prisma/rubric.seed.json with the template's example rows as placeholders).
Wire "prisma db seed" in package.json. Do not invent QM criterion text.
```
**Verify:** `npx prisma migrate dev` succeeds · `npx prisma studio` shows all tables · seed runs without error.

---

## Step 2 — Authentication · v1.0
**Goal:** Reviewers can log in; unauthenticated users can't reach the app.
**Depends on:** Step 1

```
Implement Supabase Auth (email/password). Create a login page, a sign-out action, and
server-side session checks so every route except /login is protected (middleware or a
protected layout). On first login, ensure the user has an Org and a User row (single default Org
for MVP). Follow CLAUDE.md auth rules — no secrets client-side.
```
**Verify:** Visiting any page while logged out redirects to /login · logging in reaches the app · sign-out works.

---

## Step 3 — App shell + Reviews list · v1.0
**Goal:** The main authenticated screen: an (empty) list of reviews with a "New Review" button.
**Depends on:** Step 2

```
Build the RTL app shell: top bar with app name (ELQAI) and sign-out, and a main "Reviews" page
listing reviews for the current Org (newest first) using the Prisma client. Show a proper empty
state and a "New Review" button. Use shadcn/ui + Skeleton loading. No upload logic yet.
```
**Verify:** Logged-in user sees the Reviews page in RTL with an empty state and a working "New Review" button.

---

## Step 4 — New Review: upload the Blackboard export · v1.0
**Goal:** Reviewer can create a review by uploading a course export and entering course name + code.
**Depends on:** Step 3

```
Build the "New Review" flow: a form for course name + course code and an upload for the Blackboard
export .zip. On submit (Server Action, Zod-validated): store the file in Supabase Storage, create a
Review row (status UPLOADED), and redirect to the review detail page. Show upload progress + toasts.
```
**Verify:** Uploading a .zip creates a Review, stores the file, and lands on a detail page showing status UPLOADED.

---

## Step 5 — Extract package + file inventory · v1.0
**Goal:** ELQAI unpacks the export and lists what is / isn't examinable.
**Depends on:** Step 4

```
Create /lib/blackboard-parser.ts: unzip the stored export, read the manifest, and enumerate content
files. Classify each into ExaminedFile rows: examinable (html, pdf, docx, pptx) vs not-examinable
(video, audio, some SCORM/interactive) with a reason. Update review status to EXTRACTED. On the
detail page, show two lists: "الملفات التي أمكن فحصها" and "الملفات التي تعذّر فحصها".
```
**Verify:** After extraction, the detail page shows both file lists correctly; a video in the export appears under "not examinable".

---

## Step 6 — PII scrubbing (governance) · v1.0
**Goal:** Student data is removed before any analysis.
**Depends on:** Step 5

```
Create /lib/pii-scrubber.ts that, from the examinable content, removes/excludes student submissions,
grades, discussion posts, and roster/identity data — producing a clean instructional-content payload.
This MUST run before any Claude API call. Add a unit test proving student data is excluded.
Follow docs/governance.md rule #3.
```
**Verify:** Unit test passes: given content containing student names/grades, the scrubbed output excludes them.

---

## Step 7 — AI analysis engine · v1.0
**Goal:** Claude analyzes the clean content against the rubric and produces findings + levels + a suggested verdict.
**Depends on:** Step 6

```
Create /lib/claude.ts (Anthropic client, zero-retention config) and an async analysis action.
Input: scrubbed instructional content + the seeded RubricCriterion set. Output persisted to DB:
Finding rows (framework, severity, descriptionAr, recommendationAr, location), per-dimension
ComplianceLevels (QM/NELC/content/accessibility), SafetyStatus, overallReadiness (0-100), and a
SUGGESTED verdict — all in Arabic. Run async with visible progress; set status ANALYZING → ANALYZED.
Never send raw (unscrubbed) content. Do not auto-set the final verdict — it stays a suggestion.
```
**Verify:** Running analysis on a course produces findings + dimension levels + a suggested verdict, with progress shown, and status becomes ANALYZED.

---

## Step 8 — Findings review + override · v1.0
**Goal:** Reviewer reviews AI output on screen and can accept/edit/override each finding.
**Depends on:** Step 7

```
Build the findings review screen: per-dimension levels, findings grouped by severity, each with
accept / edit / override / exclude controls (PATCH via Server Action, sets overridden/accepted).
Reviewer can also adjust the proposed final verdict and safety status. The report will use the
human's version. Toasts on every change.
```
**Verify:** Editing a finding persists the change · excluding a finding removes it from the set · the adjusted verdict is saved.

---

## Step 9 — Human sign-off gate (governance) · v1.0
**Goal:** No report until a human signs off.
**Depends on:** Step 8

```
Add a "Sign off" action that sets Review.signedOffAt and reviewedById and locks further edits.
The Export controls (next step) must be disabled until signedOffAt is set. Follow docs/governance.md
rules #1 and #2.
```
**Verify:** Export is disabled before sign-off · after sign-off the review locks and Export becomes available.

---

## Step 10 — Arabic report generation: PDF + Word · v1.0
**Goal:** Export the report in both formats, exactly per docs/report-structure.md.
**Depends on:** Step 9

```
Create /lib/report/ with:
- an RTL HTML template (Arabic, Western numerals, Cairo/Amiri fonts) implementing docs/report-structure.md
  (Executive Summary fields + Final Verdict),
- a PDF generator (Playwright renders the template to PDF),
- a Word generator (docx, RTL paragraphs) with the same structure.
Add an export Server Action (?format=pdf|docx) that writes a ReportExport row and returns the file.
Wire the (now-enabled) Export buttons on the detail page.
```
**Verify:** After sign-off, exporting produces a correct Arabic RTL PDF and an editable .docx, both matching the report structure, with Western numerals.

---

## Step 11 — Saved history + search · v1.1
**Goal:** Past reviews are searchable and re-openable.
**Depends on:** Step 10

```
Enhance the Reviews list into a searchable history: filter by course name/code, verdict, and date;
cursor-based pagination. Allow opening a past review read-only and re-exporting its report.
```
**Verify:** Searching by course code returns the right reviews · a past review re-exports correctly.

---

## Step 12 — Quality-trends dashboard · v1.2
**Goal:** Leadership sees quality trends across courses.
**Depends on:** Step 11

```
Build a dashboard: readiness distribution, verdict mix, most common failing standards, and trend
over time — aggregated across reviews for the Org. Read-only. Use accessible charts. LEADERSHIP and
ADMIN roles can view.
```
**Verify:** With several completed reviews, the dashboard shows accurate aggregates and trends.

---

## Summary

| Step | Feature | Depends On | Complexity | Milestone |
|---|---|---|---|---|
| 0 | Scaffold | — | Low | v1.0 |
| 1 | DB schema + rubric seed | 0 | Low | v1.0 |
| 2 | Auth | 1 | Medium | v1.0 |
| 3 | App shell + Reviews list | 2 | Low | v1.0 |
| 4 | Upload export | 3 | Medium | v1.0 |
| 5 | Extract + file inventory | 4 | Medium | v1.0 |
| 6 | PII scrubbing | 5 | Medium | v1.0 |
| 7 | AI analysis engine | 6 | High | v1.0 |
| 8 | Findings review + override | 7 | Medium | v1.0 |
| 9 | Sign-off gate | 8 | Low | v1.0 |
| 10 | Report PDF + Word | 9 | High | v1.0 |
| 11 | History + search | 10 | Medium | v1.1 |
| 12 | Dashboard | 11 | Medium | v1.2 |

**Critical path:** 0 → 1 → 2 → 4 → 5 → 6 → 7 → 8 → 9 → 10
**v1.0 launch = through Step 10.** The two highest-effort, highest-risk steps are **7 (AI analysis)** and **10 (Arabic report generation)** — expect the most iteration there.
