import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const findingSchema = z.object({
  framework: z.enum(["QM", "NELC", "CONTENT", "ACCESSIBILITY", "CULTURAL_SAFETY"]),
  criterionRef: z.string().nullable(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  descriptionAr: z.string(),
  recommendationAr: z.string(),
  location: z.string().nullable(),
});

const analysisResultSchema = z.object({
  overallReadiness: z.number().int().min(0).max(100),
  qmLevel: z.enum(["HIGH", "MEDIUM", "LOW", "NOT_ASSESSED"]),
  nelcLevel: z.enum(["HIGH", "MEDIUM", "LOW", "NOT_ASSESSED"]),
  contentLevel: z.enum(["HIGH", "MEDIUM", "LOW", "NOT_ASSESSED"]),
  accessibilityLevel: z.enum(["HIGH", "MEDIUM", "LOW", "NOT_ASSESSED"]),
  safetyStatus: z.enum(["CLEAR", "FLAGGED", "FAILED"]),
  suggestedVerdict: z.enum([
    "READY",
    "READY_LIMITED_FIXES",
    "NEEDS_SUBSTANTIAL_REVISION",
    "NOT_READY",
    "INCOMPLETE_EVIDENCE",
  ]),
  verdictRationaleAr: z.string(),
  findings: z.array(findingSchema),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

function buildPrompt(rubricCriteria: string, courseContent: string): string {
  return `You are ELQAI's e-course quality analyst. You evaluate an e-course against a fixed rubric
(Quality Matters, NELC, content quality, accessibility, and cultural/religious/political safety)
and return a structured, evidence-based assessment.

ROLE & AUTHORITY
- You are ADVISORY ONLY. You SUGGEST a verdict; a human reviewer makes the final decision.
- Base every finding on evidence actually present in the provided content. Never invent, assume,
  or infer beyond the evidence. If evidence is missing, say so — do not guess.
- For the cultural/religious/political-safety dimension: flag concerns for human review; do NOT
  issue definitive religious or political rulings. When in doubt, FLAG rather than pass or fail.

INPUTS
- RUBRIC CRITERIA (evaluate against these only):
${rubricCriteria}
- COURSE CONTENT (already stripped of student data) and file inventory:
${courseContent}

WHAT TO PRODUCE
For each rubric dimension, assess compliance and record specific findings tied to a criterion and,
where possible, a file/page location. Then set per-dimension levels, a safety status, an overall
readiness score, and a SUGGESTED verdict with a short Arabic rationale.

SEVERITY (per finding)
- CRITICAL: violates a hard requirement (safety/legal/copyright, or a missing element that blocks publication).
- HIGH: a significant QM/NELC gap that materially harms quality or learning.
- MEDIUM: a real issue that should be fixed but does not block publication.
- LOW: minor, cosmetic, or enhancement-only.

DIMENSION LEVEL (qm / nelc / content / accessibility)
- HIGH: meets nearly all criteria in that dimension.
- MEDIUM: meets most; some gaps.
- LOW: many gaps.
- NOT_ASSESSED: not enough examinable evidence to judge this dimension.

SAFETY STATUS (cultural/religious/political)
- CLEAR: nothing of concern found.
- FLAGGED: potential concern requiring human judgment.
- FAILED: clear violation of values/regulations.

OVERALL READINESS: integer 0-100, reflecting how publication-ready the course is overall.

SUGGESTED VERDICT (one only):
- READY: no Critical/High findings; only minor Low items; readiness ~90+.
- READY_LIMITED_FIXES: mostly sound; a few Medium and easily-fixed High items; readiness ~75-89.
- NEEDS_SUBSTANTIAL_REVISION: multiple High findings or a fixable Critical; readiness ~50-74.
- NOT_READY: Critical failures and/or safetyStatus FAILED; readiness <50.
- INCOMPLETE_EVIDENCE: too much content not examinable / insufficient evidence to judge.
SAFETY OVERRIDE: if safetyStatus = FAILED, the suggested verdict must not exceed NOT_READY; if
safetyStatus = FLAGGED, do not suggest READY (cap at READY_LIMITED_FIXES pending human review).

LANGUAGE & FORMAT
- All human-readable text (descriptions, recommendations, rationale) in clear Modern Standard Arabic.
- Use Western numerals (0-9).
- Respond with ONLY a single valid JSON object, no markdown, no preamble.`;
}

export async function analyzeCourse(
  rubricCriteria: string,
  courseContent: string
): Promise<AnalysisResult> {
  const prompt = buildPrompt(rubricCriteria, courseContent);

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
    metadata: {
      user_id: "elqai-system",
    },
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = analysisResultSchema.safeParse(JSON.parse(text));

  if (!parsed.success) {
    // WHY: retry once on invalid JSON per docs/analysis-prompt.md wiring notes
    const retryResponse = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: text },
        {
          role: "user",
          content:
            "The JSON you returned was invalid. Please return ONLY a valid JSON object matching the exact schema described above. No markdown, no preamble.",
        },
      ],
      metadata: {
        user_id: "elqai-system",
      },
    });

    const retryText =
      retryResponse.content[0].type === "text"
        ? retryResponse.content[0].text
        : "";

    const retryParsed = analysisResultSchema.safeParse(JSON.parse(retryText));
    if (!retryParsed.success) {
      throw new Error("فشل تحليل استجابة الذكاء الاصطناعي بعد محاولتين");
    }
    return retryParsed.data;
  }

  return parsed.data;
}
