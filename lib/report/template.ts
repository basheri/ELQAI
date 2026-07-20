import type { Review, Finding, ExaminedFile, User } from "@/types";
import {
  VERDICT_LABELS,
  SEVERITY_LABELS,
  COMPLIANCE_LABELS,
  SAFETY_LABELS,
  FRAMEWORK_LABELS,
} from "@/types";

interface ReportData {
  review: Review & {
    findings: Finding[];
    examinedFiles: ExaminedFile[];
    reviewedBy: User | null;
  };
}

function severityCount(findings: Finding[], severity: string): number {
  return findings.filter((f) => f.accepted && f.severity === severity).length;
}

export function generateReportHtml({ review }: ReportData): string {
  const examinable = review.examinedFiles.filter((f) => f.examinable);
  const notExaminable = review.examinedFiles.filter((f) => !f.examinable);
  const acceptedFindings = review.findings.filter((f) => f.accepted);

  const findingsByFramework = acceptedFindings.reduce(
    (acc, f) => {
      const key = f.framework;
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    },
    {} as Record<string, Finding[]>
  );

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>تقرير مراجعة جودة المقرر — ${review.courseName}</title>
  <style>
    @font-face {
      font-family: 'Cairo';
      src: url('/fonts/cairo-arabic.woff2') format('woff2');
      font-display: swap;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
      line-height: 1.8;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; margin-bottom: 8px; color: #111; }
    h2 { font-size: 18px; margin: 24px 0 12px; color: #222; border-bottom: 2px solid #e5e5e5; padding-bottom: 4px; }
    h3 { font-size: 15px; margin: 16px 0 8px; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: right; font-size: 14px; }
    th { background: #f5f5f5; font-weight: 600; }
    .verdict-box {
      background: #f0f9ff; border: 2px solid #0284c7; border-radius: 8px;
      padding: 16px; margin: 16px 0; text-align: center;
    }
    .verdict-box .label { font-size: 14px; color: #666; }
    .verdict-box .value { font-size: 20px; font-weight: 700; color: #0284c7; }
    .severity-critical { color: #dc2626; font-weight: 700; }
    .severity-high { color: #ea580c; font-weight: 600; }
    .severity-medium { color: #ca8a04; }
    .severity-low { color: #65a30d; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
    .finding-card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px; margin: 8px 0; }
    .finding-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <h1>تقرير مراجعة جودة المقرر الإلكتروني</h1>
  <p style="color: #666; font-size: 14px;">ELQAI — ضمان جودة المقررات الإلكترونية بالذكاء الاصطناعي</p>

  <h2>1. الملخص التنفيذي</h2>
  <table>
    <tr><th>اسم المقرر</th><td>${review.courseName}</td></tr>
    <tr><th>رمز المقرر</th><td dir="ltr">${review.courseCode}</td></tr>
    <tr><th>نطاق المراجعة</th><td>${review.examinedFiles.length} ملف (${examinable.length} قابل للفحص، ${notExaminable.length} غير قابل)</td></tr>
    <tr><th>نسبة الجاهزية</th><td>${review.overallReadiness ?? 0}%</td></tr>
    <tr><th>مستوى التوافق مع QM</th><td>${COMPLIANCE_LABELS[review.qmLevel ?? "NOT_ASSESSED"]}</td></tr>
    <tr><th>مستوى التوافق مع NELC</th><td>${COMPLIANCE_LABELS[review.nelcLevel ?? "NOT_ASSESSED"]}</td></tr>
    <tr><th>مستوى جودة المحتوى</th><td>${COMPLIANCE_LABELS[review.contentLevel ?? "NOT_ASSESSED"]}</td></tr>
    <tr><th>مستوى الوصول وسهولة الاستخدام</th><td>${COMPLIANCE_LABELS[review.accessibilityLevel ?? "NOT_ASSESSED"]}</td></tr>
    <tr><th>حالة السلامة</th><td>${SAFETY_LABELS[review.safetyStatus ?? "CLEAR"]}</td></tr>
    <tr><th>الملاحظات</th><td>حرجة: ${severityCount(acceptedFindings, "CRITICAL")} | عالية: ${severityCount(acceptedFindings, "HIGH")} | متوسطة: ${severityCount(acceptedFindings, "MEDIUM")} | منخفضة: ${severityCount(acceptedFindings, "LOW")}</td></tr>
  </table>

  <h2>2. الحكم النهائي</h2>
  <div class="verdict-box">
    <div class="label">الحكم النهائي</div>
    <div class="value">${VERDICT_LABELS[review.verdict ?? "INCOMPLETE_EVIDENCE"]}</div>
  </div>
  ${review.reviewedBy ? `<p style="font-size: 13px; color: #666;">اعتمد بواسطة: ${review.reviewedBy.name} — ${review.signedOffAt ? new Date(review.signedOffAt).toLocaleDateString("ar-SA") : ""}</p>` : ""}

  <h2>3. الملفات التي أمكن فحصها</h2>
  <table>
    <tr><th>اسم الملف</th><th>النوع</th></tr>
    ${examinable.map((f) => `<tr><td dir="ltr">${f.fileName}</td><td>${f.fileType}</td></tr>`).join("")}
  </table>

  <h2>4. الملفات التي تعذّر فحصها</h2>
  ${
    notExaminable.length > 0
      ? `<table>
    <tr><th>اسم الملف</th><th>السبب</th></tr>
    ${notExaminable.map((f) => `<tr><td dir="ltr">${f.fileName}</td><td>${f.reason}</td></tr>`).join("")}
  </table>`
      : "<p>لا توجد ملفات غير قابلة للفحص.</p>"
  }

  <h2>5. الملاحظات التفصيلية</h2>
  ${Object.entries(findingsByFramework)
    .map(
      ([framework, findings]) => `
    <h3>${FRAMEWORK_LABELS[framework] ?? framework}</h3>
    ${findings
      .map(
        (f) => `
    <div class="finding-card">
      <div class="finding-header">
        <span class="severity-${f.severity.toLowerCase()}">${SEVERITY_LABELS[f.severity]}</span>
        <span style="font-size: 12px; color: #999;">${f.criterionRef ?? ""} ${f.location ? `| ${f.location}` : ""}</span>
      </div>
      <p><strong>الملاحظة:</strong> ${f.descriptionAr}</p>
      <p><strong>التوصية:</strong> ${f.recommendationAr}</p>
    </div>`
      )
      .join("")}`
    )
    .join("")}

  <div class="footer">
    <p>تم إنشاء هذا التقرير بواسطة نظام ELQAI — ${new Date().toLocaleDateString("ar-SA")}</p>
    <p>هذا التقرير استشاري وقد تم اعتماده من المراجع المختص.</p>
  </div>
</body>
</html>`;
}
