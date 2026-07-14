import {
  COMPLIANCE_LEVEL_LABELS_AR,
  FRAMEWORK_LABELS_AR,
  SAFETY_STATUS_LABELS_AR,
  SEVERITY_LABELS_AR,
  SEVERITY_ORDER,
  VERDICT_LABELS_AR,
} from "@/lib/review-display";

import type {
  ComplianceLevel,
  ExaminedFile,
  Finding,
  Review,
  SafetyStatus,
  Severity,
  Verdict,
} from "@prisma/client";

export interface ReportData {
  review: Review;
  findings: Finding[];
  examinedFiles: ExaminedFile[];
  reviewerName: string;
}

function severityCount(findings: Finding[], severity: Severity): number {
  return findings.filter((f) => f.accepted && f.severity === severity).length;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function complianceLabel(level: ComplianceLevel | null): string {
  return level ? COMPLIANCE_LEVEL_LABELS_AR[level] : "—";
}

// WHY: governance rule #5 — Western (0-9) numerals, Arabic executive prose,
// RTL with correct bidi for embedded English terms. The HTML is self-contained
// with inline CSS so Playwright can render it to PDF without external deps.
export function buildReportHtml(data: ReportData): string {
  const { review, findings, examinedFiles, reviewerName } = data;
  const accepted = findings.filter((f) => f.accepted);
  const examinable = examinedFiles.filter((f) => f.examinable);
  const notExaminable = examinedFiles.filter((f) => !f.examinable);

  const verdictLabel = review.verdict
    ? VERDICT_LABELS_AR[review.verdict as Verdict]
    : "—";
  const safetyLabel = review.safetyStatus
    ? SAFETY_STATUS_LABELS_AR[review.safetyStatus as SafetyStatus]
    : "—";

  const findingsRows = SEVERITY_ORDER.map((sev) => {
    const group = accepted.filter((f) => f.severity === sev);
    if (group.length === 0) return "";
    return group
      .map(
        (f) => `
      <tr>
        <td>${escapeHtml(SEVERITY_LABELS_AR[f.severity])}</td>
        <td>${escapeHtml(FRAMEWORK_LABELS_AR[f.framework])}</td>
        <td>${f.criterionRef ? escapeHtml(f.criterionRef) : "—"}</td>
        <td>${escapeHtml(f.descriptionAr)}</td>
        <td>${escapeHtml(f.recommendationAr)}</td>
        <td>${f.location ? `<span dir="ltr">${escapeHtml(f.location)}</span>` : "—"}</td>
      </tr>`,
      )
      .join("\n");
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>تقرير مراجعة جودة المقرر — ${escapeHtml(review.courseName)}</title>
<style>
@font-face {
  font-family: 'Cairo';
  src: url('file:///app/public/fonts/Cairo.ttf') format('truetype');
  font-weight: 100 900;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 14px; }
body {
  font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
  direction: rtl;
  text-align: right;
  color: #1a1a1a;
  line-height: 1.7;
  padding: 40px 50px;
}
h1 { font-size: 1.6rem; margin-bottom: 8px; color: #111; }
h2 { font-size: 1.2rem; margin: 28px 0 12px; color: #222; border-bottom: 2px solid #e5e5e5; padding-bottom: 6px; }
h3 { font-size: 1rem; margin: 16px 0 8px; color: #333; }
.header { text-align: center; margin-bottom: 32px; }
.header h1 { font-size: 1.8rem; }
.header p { color: #555; font-size: 0.95rem; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 12px 0; }
.meta-grid dt { font-weight: 700; color: #444; }
.meta-grid dd { margin: 0; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.9rem; }
th, td { border: 1px solid #d0d0d0; padding: 8px 10px; text-align: right; }
th { background: #f5f5f5; font-weight: 700; }
tr:nth-child(even) { background: #fafafa; }
.verdict-box {
  border: 2px solid #222;
  border-radius: 8px;
  padding: 16px 20px;
  margin: 16px 0;
  text-align: center;
}
.verdict-box .label { font-size: 0.9rem; color: #555; }
.verdict-box .value { font-size: 1.4rem; font-weight: 700; margin-top: 4px; }
.file-list { list-style: none; padding: 0; }
.file-list li { padding: 2px 0; }
.file-list li::before { content: "— "; color: #999; }
.footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 0.85rem; color: #777; text-align: center; }
@media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <h1>تقرير مراجعة جودة المقرر الإلكتروني</h1>
  <p><span dir="ltr">ELQAI</span> — نظام ضمان الجودة بالذكاء الاصطناعي</p>
</div>

<h2>1. الملخص التنفيذي</h2>
<dl class="meta-grid">
  <dt>اسم المقرر</dt>
  <dd>${escapeHtml(review.courseName)}</dd>
  <dt>رمز المقرر</dt>
  <dd><span dir="ltr">${escapeHtml(review.courseCode)}</span></dd>
  <dt>نطاق المراجعة</dt>
  <dd>${examinedFiles.length} ملف (${examinable.length} قابل للفحص، ${notExaminable.length} غير قابل)</dd>
  <dt>نسبة الجاهزية الإجمالية</dt>
  <dd>${review.overallReadiness ?? "—"} / 100</dd>
  <dt>مستوى التوافق مع <span dir="ltr">Quality Matters</span></dt>
  <dd>${complianceLabel(review.qmLevel)}</dd>
  <dt>مستوى التوافق مع <span dir="ltr">NELC</span></dt>
  <dd>${complianceLabel(review.nelcLevel)}</dd>
  <dt>مستوى جودة المحتوى</dt>
  <dd>${complianceLabel(review.contentLevel)}</dd>
  <dt>مستوى الوصول وسهولة الاستخدام</dt>
  <dd>${complianceLabel(review.accessibilityLevel)}</dd>
  <dt>حالة السلامة الدينية والسياسية والثقافية</dt>
  <dd>${safetyLabel}</dd>
  <dt>عدد الملاحظات</dt>
  <dd>حرجة: ${severityCount(accepted, "CRITICAL")} · عالية: ${severityCount(accepted, "HIGH")} · متوسطة: ${severityCount(accepted, "MEDIUM")} · منخفضة: ${severityCount(accepted, "LOW")}</dd>
</dl>

<h2>2. الحكم النهائي</h2>
<div class="verdict-box">
  <div class="label">الحكم النهائي للمراجع</div>
  <div class="value">${verdictLabel}</div>
</div>

<h2>3. الملاحظات التفصيلية</h2>
${accepted.length === 0
    ? "<p>لم يتم رصد ملاحظات.</p>"
    : `<table>
<thead>
  <tr>
    <th>الخطورة</th>
    <th>الإطار</th>
    <th>المعيار</th>
    <th>الوصف</th>
    <th>التوصية</th>
    <th>الموقع</th>
  </tr>
</thead>
<tbody>
${findingsRows}
</tbody>
</table>`}

<h2>4. الملفات التي أمكن فحصها</h2>
${examinable.length === 0
    ? "<p>لا توجد ملفات قابلة للفحص.</p>"
    : `<ul class="file-list">${examinable.map((f) => `<li><span dir="ltr">${escapeHtml(f.fileName)}</span></li>`).join("\n")}</ul>`}

<h2>5. الملفات التي تعذّر فحصها</h2>
${notExaminable.length === 0
    ? "<p>لا توجد ملفات غير قابلة للفحص.</p>"
    : `<ul class="file-list">${notExaminable.map((f) => `<li><span dir="ltr">${escapeHtml(f.fileName)}</span>${f.reason ? ` — ${escapeHtml(f.reason)}` : ""}</li>`).join("\n")}</ul>`}

<div class="footer">
  <p>المراجع: ${escapeHtml(reviewerName)} · تاريخ الاعتماد: ${review.signedOffAt ? review.signedOffAt.toLocaleDateString("ar", { numberingSystem: "latn", year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
  <p>تم إنشاء هذا التقرير بواسطة نظام <span dir="ltr">ELQAI</span></p>
</div>
</body>
</html>`;
}
