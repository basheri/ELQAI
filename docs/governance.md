# Governance Rules — ELQAI

These are non-negotiable. They apply to every feature and every build step.

## 1. AI is advisory only
ELQAI never issues a verdict on its own. Every review must pass through explicit human **sign-off** before a report can be generated or exported. Technically: the Export action is disabled until `Review.signedOffAt` is set.

## 2. Human owns the sensitive calls
The **final verdict** and the **religious/political/cultural-safety status** are AI-*suggested* and human-*decided*. The reviewer can override any AI finding; the report reflects the human's version.

## 3. Student PII never leaves the institution
Blackboard exports can contain submissions, grades, discussion posts, and rosters. A pre-processing step removes/excludes all such content **before** any course material is sent to the Claude API. Raw export content is never sent to the API.

## 4. Zero data retention
Anthropic API calls are configured for zero retention. Full course content and full request bodies are never written to application logs.

## 5. No proprietary rubric text in the repo
The Quality Matters rubric is licensed. The repo stores only the criteria *structure*; the text is seeded from an authorized source the owner supplies.

## 6. Secrets are server-side only
API keys, service-role keys, and database URLs are never exposed to the browser.

## 7. Data residency (production gate)
Before ELQAI processes real course data in production, confirm whether in-Kingdom (KSA) hosting of the database and file storage is required, and migrate if so.
