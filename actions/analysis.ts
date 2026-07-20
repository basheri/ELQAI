"use server";

import { db } from "@/lib/db";
import { loadCourseExport } from "@/lib/storage";
import { parseBlackboardExport } from "@/lib/blackboard-parser";
import { scrubCourseContent } from "@/lib/pii-scrubber";
import { analyzeCourse } from "@/lib/claude";
import { getCurrentUser } from "@/actions/auth";
import type { ComplianceLevel, SafetyStatus, Framework, Severity } from "@prisma/client";

export async function runAnalysis(reviewId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "غير مصرح" };

  const review = await db.review.findFirst({
    where: { id: reviewId, orgId: user.orgId },
    include: { examinedFiles: true },
  });

  if (!review) return { error: "المراجعة غير موجودة" };
  if (review.status !== "EXTRACTED") {
    return { error: "يجب استخراج المحتوى أولاً" };
  }

  try {
    await db.review.update({
      where: { id: reviewId },
      data: { status: "ANALYZING" },
    });

    const buffer = await loadCourseExport(review.sourceFileName);
    const files = await parseBlackboardExport(buffer);

    const examinableFiles = files.filter((f) => f.examinable && f.content);
    const { cleanContent } = scrubCourseContent(examinableFiles);

    const rubricCriteria = await db.rubricCriterion.findMany();
    const rubricJson = JSON.stringify(rubricCriteria, null, 2);

    const fileInventory = review.examinedFiles
      .map(
        (f) =>
          `${f.fileName} (${f.examinable ? "قابل للفحص" : `غير قابل: ${f.reason}`})`
      )
      .join("\n");

    const fullContent = `ملفات المقرر:\n${fileInventory}\n\nمحتوى الملفات القابلة للفحص:\n${cleanContent}`;

    const result = await analyzeCourse(rubricJson, fullContent);

    await db.$transaction([
      ...result.findings.map((finding) =>
        db.finding.create({
          data: {
            reviewId,
            framework: finding.framework as Framework,
            criterionRef: finding.criterionRef,
            severity: finding.severity as Severity,
            descriptionAr: finding.descriptionAr,
            recommendationAr: finding.recommendationAr,
            location: finding.location,
            aiGenerated: true,
          },
        })
      ),
      db.review.update({
        where: { id: reviewId },
        data: {
          status: "ANALYZED",
          overallReadiness: result.overallReadiness,
          qmLevel: result.qmLevel as ComplianceLevel,
          nelcLevel: result.nelcLevel as ComplianceLevel,
          contentLevel: result.contentLevel as ComplianceLevel,
          accessibilityLevel: result.accessibilityLevel as ComplianceLevel,
          safetyStatus: result.safetyStatus as SafetyStatus,
        },
      }),
    ]);

    return { success: true, suggestedVerdict: result.suggestedVerdict, rationaleAr: result.verdictRationaleAr };
  } catch (err) {
    // WHY: roll back to EXTRACTED (not FAILED) so the reviewer can retry
    // analysis — a transient API failure must not brick the review
    try {
      await db.review.update({
        where: { id: reviewId },
        data: { status: "EXTRACTED" },
      });
    } catch {
      // WHY: if even the rollback fails (DB down), still surface the error
    }
    return {
      error: `فشل التحليل: ${err instanceof Error ? err.message : "خطأ غير معروف"}`,
    };
  }
}
