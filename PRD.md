# PRD: ELQAI — AI-Powered Quality Assurance for E-Courses

> Status: **Draft v0.1 — pending owner confirmation**
> Owner: أ.د. محمد زيد بشيري
> Build environment: Claude Code
> Product report language: **Arabic (executive, RTL, Western numerals)** · Repo & code: English

---

## 1. Executive Summary

ELQAI is an internal web tool that ingests a full **Blackboard course export**, runs it through a fixed, built-in quality rubric (**Quality Matters + NELC**) using the Claude API, and produces a **share-ready Arabic executive report** (PDF + Word) with an overall readiness score, per-standard compliance, severity-graded findings, and one of five final verdicts. It is built for a single deanship's quality reviewers, with the AI acting strictly as an **advisor** — every verdict passes through human sign-off before it is issued.

## 2. Problem Statement

E-course quality review today is **manual, slow, inconsistent, and reviewer-dependent**. A reviewer must open a course, cross-check it against QM and NELC criteria by hand, judge content quality and accessibility, screen for religious/political/cultural issues, and hand-write a report — taking hours per course and varying by who does it. There is no fast, standardized, defensible way to produce a consistent verdict at scale. ELQAI compresses that to minutes while keeping the human as the final authority.

## 3. Target Users & Personas

| Persona | Goal | Frustration | Usage Pattern |
|---|---|---|---|
| **Quality Reviewer / Instructional Designer** (primary) | Audit a course they did not author and issue a defensible verdict fast | Manual QM/NELC cross-checking is slow and inconsistent | Uploads a course export, reviews AI findings on screen, overrides where needed, signs off, exports |
| **Deanship Leadership** (secondary, v1.2) | See quality trends across many courses | No aggregate visibility into course readiness | Views dashboard; does not run individual reviews |
| **Admin** (light) | Manage users, seed/update the built-in rubric | — | Occasional configuration |

## 4. Feature Set (MoSCoW Prioritized)

### v1.0 — MVP · Must-Have (Launch Blockers)

| # | Feature | User Story | Acceptance Criteria |
|---|---|---|---|
| 1 | Course upload (Blackboard export) | As a reviewer, I want to upload a Blackboard course export so ELQAI can examine it | Given a valid export .zip, when uploaded, then the system extracts structure + files and lists what is / isn't examinable |
| 2 | PII stripping (pre-analysis) | As the institution, I want student data removed before analysis so no PII leaves our control | Given an export containing submissions/grades/rosters, when processed, then that content is excluded before any API call |
| 3 | AI quality analysis | As a reviewer, I want the course scored against QM + NELC + content + accessibility + cultural-safety | Given examinable content, when analysis runs, then each dimension gets a level + findings with severity |
| 4 | On-screen findings review + override | As a reviewer, I want to accept or override each AI finding | Given AI findings, when I edit/override one, then my version is what appears in the report |
| 5 | Human sign-off gate | As a reviewer, I want to confirm the verdict before it's issued | Given a completed review, when I sign off, then the report becomes exportable (not before) |
| 6 | Arabic executive report — PDF + Word | As a reviewer, I want a share-ready report in both formats | Given a signed-off review, when I export, then a correctly-rendered Arabic RTL PDF **and** editable .docx are produced per the fixed report structure (§ below) |

### v1.1 — Should-Have (Post-Launch)

| # | Feature | Unlock Condition |
|---|---|---|
| 1 | Saved review history + search | ≥ 1 review completed and stored |
| 2 | Re-open / re-export past reviews | History exists |

### v1.2 — Should-Have (After History)

| # | Feature | Unlock Condition |
|---|---|---|
| 1 | Quality-trends dashboard (readiness, verdict mix, common failures across courses) | Enough historical reviews to make trends meaningful |

### Future — Nice-to-Have
- Video/audio transcription → deeper media checks (currently flagged "not examinable").
- SSO with the institutional identity provider.
- Multi-college / university-wide rollout (data model already supports it).
- Bulk/batch review of multiple courses.

### Fixed Report Structure (binding — from owner)

**1. Executive Summary** — course name & code · review scope · files examined · files not examinable · overall readiness % · QM compliance level · NELC compliance level · content quality level · accessibility/usability level · religious-political-cultural safety status · findings count by severity (Critical / High / Medium / Low) · final verdict.

**2. Final Verdict** — exactly one of:
| Code | Arabic |
|---|---|
| `READY` | جاهز للنشر |
| `READY_LIMITED_FIXES` | جاهز بعد تحسينات محدودة |
| `NEEDS_SUBSTANTIAL_REVISION` | يحتاج تعديلات جوهرية قبل النشر |
| `NOT_READY` | غير جاهز للنشر |
| `INCOMPLETE_EVIDENCE` | تعذر إصدار حكم مكتمل بسبب نقص الأدلة |

## 5. User Flow

1. Reviewer logs in → lands on **Reviews** list.
2. Clicks **New Review** → uploads Blackboard course export (.zip) → enters course name + code.
3. System extracts the package → shows **examinable vs. not-examinable** file inventory → strips PII.
4. Reviewer clicks **Analyze** → async job runs content through Claude against the built-in rubric → progress shown.
5. Reviewer lands on the **findings screen**: per-dimension levels, severity-tagged findings, suggested recommendations. Reviewer accepts/edits/overrides, adjusts the proposed verdict.
6. Reviewer clicks **Sign off** → review locks.
7. Reviewer clicks **Export** → downloads **PDF + Word** Arabic report.
8. (v1.1) Review is saved to searchable history. (v1.2) It feeds the dashboard.

## 6. Data Model (Prisma-style, multi-tenant-ready)

```prisma
enum Role { REVIEWER ADMIN LEADERSHIP }
enum ReviewStatus { UPLOADED EXTRACTED ANALYZING ANALYZED SIGNED_OFF EXPORTED FAILED }
enum Verdict { READY READY_LIMITED_FIXES NEEDS_SUBSTANTIAL_REVISION NOT_READY INCOMPLETE_EVIDENCE }
enum Severity { CRITICAL HIGH MEDIUM LOW }
enum Framework { QM NELC CONTENT ACCESSIBILITY CULTURAL_SAFETY }
enum SafetyStatus { CLEAR FLAGGED FAILED }
enum ComplianceLevel { HIGH MEDIUM LOW NOT_ASSESSED }

model Org {                       // present now so university-wide rollout needs no rebuild
  id        String   @id @default(cuid())
  name      String
  users     User[]
  reviews   Review[]
}

model User {
  id        String   @id @default(cuid())
  orgId     String
  org       Org      @relation(fields: [orgId], references: [id])
  email     String   @unique
  name      String
  role      Role     @default(REVIEWER)
  reviews   Review[] @relation("ReviewedBy")
  createdAt DateTime @default(now())
}

model Review {
  id                  String          @id @default(cuid())
  orgId               String
  org                 Org             @relation(fields: [orgId], references: [id])
  courseName          String
  courseCode          String
  sourceFileName      String
  status              ReviewStatus    @default(UPLOADED)
  overallReadiness    Int?            // 0-100
  qmLevel             ComplianceLevel?
  nelcLevel           ComplianceLevel?
  contentLevel        ComplianceLevel?
  accessibilityLevel  ComplianceLevel?
  safetyStatus        SafetyStatus?
  verdict             Verdict?
  reviewedById        String?
  reviewedBy          User?           @relation("ReviewedBy", fields: [reviewedById], references: [id])
  signedOffAt         DateTime?
  examinedFiles       ExaminedFile[]
  findings            Finding[]
  exports             ReportExport[]
  createdAt           DateTime        @default(now())
  @@index([orgId, createdAt])
}

model ExaminedFile {
  id          String   @id @default(cuid())
  reviewId    String
  review      Review   @relation(fields: [reviewId], references: [id])
  fileName    String
  fileType    String   // html, pdf, docx, pptx, video, scorm, other
  examinable  Boolean
  reason      String?  // why not examinable
}

model Finding {
  id           String    @id @default(cuid())
  reviewId     String
  review       Review    @relation(fields: [reviewId], references: [id])
  framework    Framework
  criterionRef String?   // links to RubricCriterion.code
  severity     Severity
  descriptionAr String
  recommendationAr String
  location     String?   // file / page reference
  aiGenerated  Boolean   @default(true)
  overridden   Boolean   @default(false)   // reviewer changed it
  accepted     Boolean   @default(true)
  @@index([reviewId, severity])
}

model RubricCriterion {          // the fixed built-in rubric — SEEDED, populated from licensed QM + official NELC
  id        String    @id @default(cuid())
  framework Framework
  code      String    @unique
  titleAr   String
  titleEn   String
  weight    Int
  descAr    String?
}

model ReportExport {
  id          String   @id @default(cuid())
  reviewId    String
  review      Review   @relation(fields: [reviewId], references: [id])
  format      String   // pdf | docx
  filePath    String
  generatedAt DateTime @default(now())
}
```

## 7. Tech Stack Recommendation

> Chosen for: strongest Arabic reasoning, clean Arabic RTL PDF/Word output, single codebase, and smooth Claude Code development. You do not need to understand these — they're the defaults I'll scaffold.

| Layer | Technology | Justification |
|---|---|---|
| Framework | **Next.js (App Router, TypeScript)** | One full-stack codebase, ideal for Claude Code |
| UI | Tailwind CSS + shadcn/ui, RTL-enabled | Fast, clean, native RTL support |
| Database | **PostgreSQL (Supabase)** | Matches your existing Postgres stack; managed |
| Auth | Supabase Auth (email/password) | Simple, single-tenant appropriate |
| Storage | Supabase Storage | Holds uploaded exports + generated reports |
| AI | **Anthropic Claude API** (zero-retention) | Core analysis engine; best Arabic QA |
| File parsing | unzipper + pdf-parse + mammoth (docx) + pptx parser | Reads Blackboard export contents |
| PDF report | Headless HTML→PDF (Playwright) with Arabic fonts (Cairo/Amiri) | Correct RTL, bidi, Western numerals |
| Word report | `docx` (Node) with RTL paragraph settings | Editable Arabic .docx |
| Background jobs | Next.js route + queued async task | Analysis runs without blocking the UI |
| Hosting | Vercel + Supabase (MVP) | Fast to ship — **see Open Question #1 on KSA residency** |

## 8. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | Full course analysis | Async, with progress; typical course < 5 min |
| Security | Auth | Email/password, encrypted storage |
| Privacy | PII handling | Student data stripped before any API call; API set to zero-retention |
| Governance | Authority | AI is advisory only; no verdict issued without human sign-off |
| Arabic output | RTL / bidi / numerals | Correct RTL, proper bidi for embedded English terms, Western numerals |
| Accessibility (the tool UI) | WCAG | AA |
| Availability | Internal tool | Business-hours reliable; no HA requirement at MVP |

## 9. API Surface

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/reviews` | POST | Create review + upload export | ✅ |
| `/api/reviews` | GET | List history | ✅ |
| `/api/reviews/:id` | GET | Review detail + findings | ✅ |
| `/api/reviews/:id/analyze` | POST | Trigger AI analysis | ✅ |
| `/api/reviews/:id/findings/:fid` | PATCH | Accept / override / edit finding | ✅ |
| `/api/reviews/:id/signoff` | POST | Lock + set final verdict | ✅ |
| `/api/reviews/:id/export` | POST | Generate PDF / Word (`?format=`) | ✅ |
| `/api/dashboard` | GET | Aggregate trends (v1.2) | ✅ |

## 10. Open Questions

| # | Question | Impact if Unresolved | Suggested Default |
|---|---|---|---|
| 1 | **Data residency** — is in-Kingdom (KSA) hosting required for production with real course data? | Compliance / procurement blocker | MVP on Vercel+Supabase; migrate to KSA-hosted DB/storage before real production data |
| 2 | **QM licensing** — what is your authorized source for the QM rubric criteria text? | Cannot legally embed QM text without it | You provide licensed/authorized QM content to seed the rubric |
| 3 | **NELC version** — which NELC e-learning quality standard/version to encode? | Wrong criteria = wrong verdicts | Latest official NELC standard you designate |
| 4 | **Cultural/religious/political safety rubric** — who defines the criteria & thresholds? | Highest-sensitivity dimension | Authoritative institutional source + mandatory human sign-off |
| 5 | **Expected volume** — reviews per week / concurrent reviewers? | Drives Claude API cost | Assume low internal volume at MVP |
| 6 | **SSO** — institutional SSO now, or email/password? | Auth scope | Email/password at MVP |
