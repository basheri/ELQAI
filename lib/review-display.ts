import type {
  ComplianceLevel,
  Framework,
  ReviewStatus,
  SafetyStatus,
  Severity,
  Verdict,
} from "@prisma/client";

// WHY: Arabic labels for each review status, shown on the status badge. Keeping
// the map here (not in the component) makes it reusable and testable.
export const REVIEW_STATUS_LABELS_AR: Record<ReviewStatus, string> = {
  UPLOADED: "تم الرفع",
  EXTRACTED: "تم الاستخراج",
  ANALYZING: "قيد التحليل",
  ANALYZED: "تم التحليل",
  SIGNED_OFF: "تم الاعتماد",
  EXPORTED: "تم التصدير",
  FAILED: "فشل",
};

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

// WHY: map status to a badge variant so state reads at a glance (in-progress =
// muted, terminal-success = solid, failure = destructive).
export const REVIEW_STATUS_VARIANTS: Record<ReviewStatus, BadgeVariant> = {
  UPLOADED: "secondary",
  EXTRACTED: "secondary",
  ANALYZING: "outline",
  ANALYZED: "default",
  SIGNED_OFF: "default",
  EXPORTED: "default",
  FAILED: "destructive",
};

// WHY: governance rule #5 — Western (0-9) numerals everywhere, even in Arabic
// UI. `numberingSystem: latn` forces Latin digits while keeping Arabic month
// names, so dates render correctly RTL without Arabic-Indic numerals.
const dateFormatter = new Intl.DateTimeFormat("ar", {
  numberingSystem: "latn",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatDateAr(date: Date): string {
  return dateFormatter.format(date);
}

// WHY: Arabic labels + badge variants for the analysis output dimensions.
export const COMPLIANCE_LEVEL_LABELS_AR: Record<ComplianceLevel, string> = {
  HIGH: "مرتفع",
  MEDIUM: "متوسط",
  LOW: "منخفض",
  NOT_ASSESSED: "لم يُقيَّم",
};

export const COMPLIANCE_LEVEL_VARIANTS: Record<ComplianceLevel, BadgeVariant> = {
  HIGH: "default",
  MEDIUM: "secondary",
  LOW: "destructive",
  NOT_ASSESSED: "outline",
};

export const SAFETY_STATUS_LABELS_AR: Record<SafetyStatus, string> = {
  CLEAR: "سليم",
  FLAGGED: "بحاجة لمراجعة بشرية",
  FAILED: "مخالفة واضحة",
};

export const SAFETY_STATUS_VARIANTS: Record<SafetyStatus, BadgeVariant> = {
  CLEAR: "default",
  FLAGGED: "secondary",
  FAILED: "destructive",
};

export const SEVERITY_LABELS_AR: Record<Severity, string> = {
  CRITICAL: "حرجة",
  HIGH: "عالية",
  MEDIUM: "متوسطة",
  LOW: "منخفضة",
};

export const SEVERITY_VARIANTS: Record<Severity, BadgeVariant> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
};

// WHY: severity display + grouping order (most severe first).
export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const VERDICT_LABELS_AR: Record<Verdict, string> = {
  READY: "جاهز للنشر",
  READY_LIMITED_FIXES: "جاهز بعد تحسينات محدودة",
  NEEDS_SUBSTANTIAL_REVISION: "يحتاج تعديلات جوهرية قبل النشر",
  NOT_READY: "غير جاهز للنشر",
  INCOMPLETE_EVIDENCE: "تعذّر إصدار حكم مكتمل بسبب نقص الأدلة",
};

// WHY: framework labels for grouping/labelling findings.
export const FRAMEWORK_LABELS_AR: Record<Framework, string> = {
  QM: "Quality Matters",
  NELC: "المركز الوطني للتعلم الإلكتروني (NELC)",
  CONTENT: "جودة المحتوى",
  ACCESSIBILITY: "إتاحة الوصول",
  CULTURAL_SAFETY: "السلامة الثقافية والدينية",
};
