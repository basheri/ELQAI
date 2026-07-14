import { AnalysisResultSchema, type AnalysisResult } from "@/lib/analysis-result";

// WHY: OpenRouter model id — defaults to Claude Sonnet via OpenRouter.
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// WHY: ELQAI's own analysis instruction (docs/analysis-prompt.md) — NOT QM
// rubric text. The two runtime variables are injected before the call. The
// scrubbed course content is passed in {{COURSE_CONTENT}}; raw export content is
// never sent (governance rule #3).
const ANALYSIS_SYSTEM_PROMPT = `You are ELQAI's e-course quality analyst. You evaluate an e-course against a fixed rubric
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
{{RUBRIC_CRITERIA}}
- COURSE CONTENT (already stripped of student data) and file inventory:
{{COURSE_CONTENT}}

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

SUGGESTED VERDICT (one only) — guidance, not a hard formula:
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
- Respond with ONLY a single valid JSON object, no markdown, no preamble, in exactly this shape:

{
  "overallReadiness": 0,
  "qmLevel": "HIGH|MEDIUM|LOW|NOT_ASSESSED",
  "nelcLevel": "HIGH|MEDIUM|LOW|NOT_ASSESSED",
  "contentLevel": "HIGH|MEDIUM|LOW|NOT_ASSESSED",
  "accessibilityLevel": "HIGH|MEDIUM|LOW|NOT_ASSESSED",
  "safetyStatus": "CLEAR|FLAGGED|FAILED",
  "suggestedVerdict": "READY|READY_LIMITED_FIXES|NEEDS_SUBSTANTIAL_REVISION|NOT_READY|INCOMPLETE_EVIDENCE",
  "verdictRationaleAr": "سبب مختصر بالعربية",
  "findings": [
    {
      "framework": "QM|NELC|CONTENT|ACCESSIBILITY|CULTURAL_SAFETY",
      "criterionRef": "e.g. QM-1.1 or NELC-DES-1",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "descriptionAr": "وصف الملاحظة بالعربية",
      "recommendationAr": "التوصية بالعربية",
      "location": "file name / page, or null"
    }
  ]
}

If the provided content is insufficient to assess a dimension, set its level to NOT_ASSESSED and
prefer the INCOMPLETE_EVIDENCE verdict rather than guessing.`;

export interface AnalyzeCourseInput {
  rubricCriteria: string;
  courseContent: string;
}

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

// WHY: extract the text from the OpenRouter response and strip any accidental
// code fences the model may wrap around the JSON.
function extractJsonText(content: string): string {
  const text = content.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (fenced ? fenced[1] : text).trim();
}

// WHY: one analysis call — validates the returned JSON with Zod. Returns null on
// invalid output so the caller can retry / fail gracefully. Never logs the
// content or the full request/response body (governance rules #3, #4).
async function attemptAnalysis(
  apiKey: string,
  systemPrompt: string,
): Promise<AnalysisResult | null> {
  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "حلّل المقرر وفق التعليمات، وأعد كائن JSON واحدًا فقط بالبنية المحددة.",
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed: unknown = JSON.parse(extractJsonText(content));
    return AnalysisResultSchema.parse(parsed);
  } catch {
    return null;
  }
}

// WHY: the analysis engine entry point. Retries once on invalid JSON, then
// throws so the caller can mark the review FAILED.
export async function analyzeCourse(
  input: AnalyzeCourseInput,
): Promise<AnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  // WHY: function replacer avoids $& / $` / $' interpolation that
  // String.replace does on literal replacement strings — course content
  // may contain dollar-sign sequences (code, math, shell scripts).
  const systemPrompt = ANALYSIS_SYSTEM_PROMPT.replace(
    "{{RUBRIC_CRITERIA}}",
    () => input.rubricCriteria,
  ).replace("{{COURSE_CONTENT}}", () => input.courseContent);

  const first = await attemptAnalysis(apiKey, systemPrompt);
  if (first) {
    return first;
  }

  const second = await attemptAnalysis(apiKey, systemPrompt);
  if (second) {
    return second;
  }

  throw new Error("Analysis produced invalid output after retry.");
}
