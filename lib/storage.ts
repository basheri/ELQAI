// WHY: single source of truth for where Blackboard exports live in Supabase
// Storage. The object path is fully deterministic from org + review ids and a
// fixed object name, so later steps (extraction) can locate the file without a
// dedicated DB column. A fixed object name also avoids sanitizing arbitrary
// (Arabic/spaced) upload filenames into storage keys.
export const COURSE_EXPORTS_BUCKET = "course-exports";

export const EXPORT_OBJECT_NAME = "source.zip";

export function exportStoragePath(orgId: string, reviewId: string): string {
  return `${orgId}/${reviewId}/${EXPORT_OBJECT_NAME}`;
}

// WHY: guardrails for the upload — reject non-zip files and cap size to protect
// server memory (the file is buffered in the Server Action).
export const MAX_EXPORT_BYTES = 200 * 1024 * 1024; // 200 MB

export const ACCEPTED_EXPORT_EXTENSIONS = [".zip"] as const;

export const REPORT_EXPORTS_BUCKET = "report-exports";

export function reportStoragePath(
  orgId: string,
  reviewId: string,
  exportId: string,
  format: "pdf" | "docx",
): string {
  return `${orgId}/${reviewId}/${exportId}.${format}`;
}
