import { z } from "zod";

// WHY: validates the JSON the Claude API returns before anything is persisted
// (docs/analysis-prompt.md wiring note). Enum values mirror the Prisma enums so
// the parsed result maps straight onto Finding/Review writes.
const ComplianceLevelSchema = z.enum(["HIGH", "MEDIUM", "LOW", "NOT_ASSESSED"]);
const SafetyStatusSchema = z.enum(["CLEAR", "FLAGGED", "FAILED"]);
const VerdictSchema = z.enum([
  "READY",
  "READY_LIMITED_FIXES",
  "NEEDS_SUBSTANTIAL_REVISION",
  "NOT_READY",
  "INCOMPLETE_EVIDENCE",
]);
const FrameworkSchema = z.enum([
  "QM",
  "NELC",
  "CONTENT",
  "ACCESSIBILITY",
  "CULTURAL_SAFETY",
]);
const SeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const AnalysisFindingSchema = z.object({
  framework: FrameworkSchema,
  criterionRef: z.string().nullable().optional(),
  severity: SeveritySchema,
  descriptionAr: z.string().min(1),
  recommendationAr: z.string().min(1),
  location: z.string().nullable().optional(),
});

export const AnalysisResultSchema = z.object({
  overallReadiness: z.number().int().min(0).max(100),
  qmLevel: ComplianceLevelSchema,
  nelcLevel: ComplianceLevelSchema,
  contentLevel: ComplianceLevelSchema,
  accessibilityLevel: ComplianceLevelSchema,
  safetyStatus: SafetyStatusSchema,
  suggestedVerdict: VerdictSchema,
  verdictRationaleAr: z.string().min(1),
  findings: z.array(AnalysisFindingSchema),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AnalysisFinding = z.infer<typeof AnalysisFindingSchema>;
