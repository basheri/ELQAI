export {
  Role,
  ReviewStatus,
  Verdict,
  Severity,
  Framework,
  SafetyStatus,
  ComplianceLevel,
} from "@prisma/client";

export type {
  Org,
  User,
  Review,
  ExaminedFile,
  Finding,
  RubricCriterion,
  ReportExport,
} from "@prisma/client";

export const VERDICT_LABELS: Record<string, string> = {
  READY: "جاهز للنشر",
  READY_LIMITED_FIXES: "جاهز بعد تحسينات محدودة",
  NEEDS_SUBSTANTIAL_REVISION: "يحتاج تعديلات جوهرية قبل النشر",
  NOT_READY: "غير جاهز للنشر",
  INCOMPLETE_EVIDENCE: "تعذر إصدار حكم مكتمل بسبب نقص الأدلة",
};

export const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: "حرجة",
  HIGH: "عالية",
  MEDIUM: "متوسطة",
  LOW: "منخفضة",
};

export const COMPLIANCE_LABELS: Record<string, string> = {
  HIGH: "عالي",
  MEDIUM: "متوسط",
  LOW: "منخفض",
  NOT_ASSESSED: "لم يُقيَّم",
};

export const SAFETY_LABELS: Record<string, string> = {
  CLEAR: "سليم",
  FLAGGED: "يحتاج مراجعة",
  FAILED: "غير مجتاز",
};

export const FRAMEWORK_LABELS: Record<string, string> = {
  QM: "Quality Matters",
  NELC: "NELC",
  CONTENT: "جودة المحتوى",
  ACCESSIBILITY: "الوصول وسهولة الاستخدام",
  CULTURAL_SAFETY: "السلامة الدينية والسياسية والثقافية",
};
