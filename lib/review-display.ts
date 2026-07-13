import type { ReviewStatus } from "@prisma/client";

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
