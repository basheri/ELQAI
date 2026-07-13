# ELQAI — AI-Powered Quality Assurance for E-Courses

منصة ذكية لتدقيق جودة المحتوى التعليمي والمقررات الإلكترونية.

ELQAI ingests a **Blackboard course export**, analyzes it against a fixed **Quality Matters + NELC** rubric using the Claude API, and produces a share-ready **Arabic executive report** (PDF + Word) with an overall readiness score, per-standard compliance, severity-graded findings, and a final verdict — with a **human reviewer as the final authority**.

---

## What's in this repo

| File / Folder | What it is |
|---|---|
| `PRD.md` | Product Requirements Document — the confirmed spec (source of truth). |
| `CLAUDE.md` | Rules & guardrails Claude Code reads automatically. **Read first.** |
| `BUILD_PLAN.md` | Step-by-step build plan. Each step is a ready-to-paste Claude Code prompt. |
| `prisma/schema.prisma` | The database model. |
| `docs/report-structure.md` | The exact Arabic report structure (binding). |
| `docs/rubric-seed-template.md` | Template to populate the QM + NELC criteria. |
| `docs/governance.md` | The non-negotiable governance rules (AI-advisory, PII, sign-off). |
| `.env.example` | Environment variables you'll need to fill in. |

---

## How to build it (with Claude Code)

You don't write code. You run the plan step by step.

1. Open this folder in **Claude Code**.
2. Say: `Read CLAUDE.md and BUILD_PLAN.md, then do Step 0.`
3. When Step 0 finishes and verifies, say: `Do Step 1.` — and so on.
4. Each step in `BUILD_PLAN.md` ends with a **Verify** check. If it passes, move to the next step. If something breaks, paste the error to Claude Code and ask for a fix.

Do the steps **in order**. Don't skip ahead — later steps depend on earlier ones.

---

## Before production (owner action required)

Two decisions must be resolved before ELQAI touches real course data (see `PRD.md` §10):

1. **Data residency** — confirm whether in-Kingdom (KSA) hosting is required.
2. **Cultural/religious/political-safety criteria** — confirm the authoritative source and thresholds for that dimension.

---

## Status

MVP in development. v1.0 = core review loop → v1.1 = history → v1.2 = dashboard.

## Notice

Internal project. The Quality Matters rubric is proprietary and is **not** distributed in this repository; criterion text must be supplied from a licensed source. See `docs/rubric-seed-template.md`.
