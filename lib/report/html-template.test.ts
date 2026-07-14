import { describe, expect, it } from "vitest";

import { buildReportHtml } from "@/lib/report/html-template";

import type { ReportData } from "@/lib/report/html-template";
import type {
  ExaminedFile,
  Finding,
  Review,
} from "@prisma/client";

const review: Review = {
  id: "rev_1",
  orgId: "org_1",
  courseName: "مقدمة في البرمجة",
  courseCode: "CS101",
  sourceFileName: "export.zip",
  status: "SIGNED_OFF",
  overallReadiness: 85,
  qmLevel: "HIGH",
  nelcLevel: "MEDIUM",
  contentLevel: "HIGH",
  accessibilityLevel: "MEDIUM",
  safetyStatus: "CLEAR",
  suggestedVerdict: "READY",
  verdictRationaleAr: null,
  verdict: "READY_LIMITED_FIXES",
  reviewedById: "user_1",
  signedOffAt: new Date("2026-01-15T10:00:00Z"),
  createdAt: new Date("2026-01-10T08:00:00Z"),
};

const findings: Finding[] = [
  {
    id: "f_1",
    reviewId: "rev_1",
    framework: "QM",
    criterionRef: "QM-1",
    severity: "HIGH",
    descriptionAr: "ملاحظة عالية الخطورة",
    recommendationAr: "توصية للمعالجة",
    location: "index.html",
    aiGenerated: true,
    overridden: false,
    accepted: true,
  },
  {
    id: "f_2",
    reviewId: "rev_1",
    framework: "NELC",
    criterionRef: null,
    severity: "LOW",
    descriptionAr: "ملاحظة منخفضة",
    recommendationAr: "تحسين اختياري",
    location: null,
    aiGenerated: true,
    overridden: false,
    accepted: false,
  },
];

const examinedFiles: ExaminedFile[] = [
  { id: "ef_1", reviewId: "rev_1", fileName: "index.html", fileType: "html", examinable: true, reason: null },
  { id: "ef_2", reviewId: "rev_1", fileName: "intro.mp4", fileType: "video", examinable: false, reason: "فيديو — لا يمكن تقييمه آلياً" },
];

const reportData: ReportData = {
  review,
  findings,
  examinedFiles,
  reviewerName: "محمد أحمد",
};

describe("buildReportHtml", () => {
  it("renders RTL Arabic HTML with the correct report sections", () => {
    const html = buildReportHtml(reportData);

    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("تقرير مراجعة جودة المقرر الإلكتروني");
  });

  it("includes the executive summary fields with Western numerals", () => {
    const html = buildReportHtml(reportData);

    expect(html).toContain("مقدمة في البرمجة");
    expect(html).toContain("CS101");
    expect(html).toContain("85");
    expect(html).toContain("/ 100");
  });

  it("renders the human verdict, not the AI suggestion", () => {
    const html = buildReportHtml(reportData);

    expect(html).toContain("جاهز بعد تحسينات محدودة");
  });

  it("includes only accepted findings in the table", () => {
    const html = buildReportHtml(reportData);

    expect(html).toContain("ملاحظة عالية الخطورة");
    expect(html).not.toContain("ملاحظة منخفضة");
  });

  it("lists examinable and not-examinable files separately", () => {
    const html = buildReportHtml(reportData);

    expect(html).toContain("index.html");
    expect(html).toContain("intro.mp4");
    expect(html).toContain("فيديو — لا يمكن تقييمه آلياً");
  });

  it("shows the reviewer name and sign-off date", () => {
    const html = buildReportHtml(reportData);

    expect(html).toContain("محمد أحمد");
  });
});
