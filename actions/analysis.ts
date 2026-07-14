"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { analyzeCourse } from "@/lib/claude";
import { extractInstructionalContent } from "@/lib/content-extractor";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { scrubContent, type ContentItem } from "@/lib/pii-scrubber";
import { COURSE_EXPORTS_BUCKET, exportStoragePath } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AnalyzeReviewState {
  error?: string;
  started?: boolean;
}

// WHY: an Arabic one-line-per-file inventory the model sees alongside the
// content, so "not examinable" coverage informs readiness / NOT_ASSESSED.
function buildInventorySummary(
  files: { fileName: string; fileType: string; examinable: boolean; reason: string | null }[],
): string {
  const examinable = files.filter((f) => f.examinable);
  const notExaminable = files.filter((f) => !f.examinable);

  const lines: string[] = ["=== جرد ملفات الحزمة ==="];
  lines.push(`الملفات التي أمكن فحصها (${examinable.length}):`);
  for (const f of examinable) {
    lines.push(`- ${f.fileName} (${f.fileType})`);
  }
  lines.push(`الملفات التي تعذّر فحصها (${notExaminable.length}):`);
  for (const f of notExaminable) {
    lines.push(`- ${f.fileName} (${f.fileType})${f.reason ? ` — ${f.reason}` : ""}`);
  }
  return lines.join("\n");
}

// WHY: the full analysis pipeline. Runs after the response (never blocks the
// request). Downloads the export, extracts + SCRUBS content (mandatory before
// any API call), calls Claude, and persists findings + levels + the SUGGESTED
// verdict. Exported for unit testing. On any failure it sets status FAILED.
export async function runAnalysis(reviewId: string): Promise<void> {
  try {
    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: { examinedFiles: true },
    });
    if (!review) {
      return;
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(COURSE_EXPORTS_BUCKET)
      .download(exportStoragePath(review.orgId, review.id));
    if (error || !data) {
      throw error ?? new Error("empty download");
    }
    const zipBuffer = Buffer.from(await data.arrayBuffer());

    const examinable = review.examinedFiles.filter((f) => f.examinable);
    const extracted = await extractInstructionalContent(
      zipBuffer,
      examinable.map((f) => ({ fileName: f.fileName, fileType: f.fileType })),
    );

    // WHY: GOVERNANCE — strip student PII before anything is sent to the API.
    const items: ContentItem[] = extracted.map((c) => ({
      path: c.path,
      text: c.text,
    }));
    const scrubbed = scrubContent(items);

    const rubric = await db.rubricCriterion.findMany({
      select: {
        framework: true,
        code: true,
        titleAr: true,
        titleEn: true,
        weight: true,
        descAr: true,
      },
    });

    const courseContent = `${buildInventorySummary(review.examinedFiles)}\n\n=== المحتوى التعليمي (بعد إزالة بيانات الطلبة) ===\n${scrubbed.cleanText}`;

    const result = await analyzeCourse({
      rubricCriteria: JSON.stringify(rubric),
      courseContent,
    });

    // WHY: replace findings + write dimension levels/safety/readiness and the
    // SUGGESTED verdict in one transaction. `verdict` is left untouched — it is
    // set only at human sign-off (governance rule #1).
    await db.$transaction([
      db.finding.deleteMany({ where: { reviewId } }),
      db.finding.createMany({
        data: result.findings.map((f) => ({
          reviewId,
          framework: f.framework,
          criterionRef: f.criterionRef ?? null,
          severity: f.severity,
          descriptionAr: f.descriptionAr,
          recommendationAr: f.recommendationAr,
          location: f.location ?? null,
          aiGenerated: true,
        })),
      }),
      db.review.update({
        where: { id: reviewId },
        data: {
          overallReadiness: result.overallReadiness,
          qmLevel: result.qmLevel,
          nelcLevel: result.nelcLevel,
          contentLevel: result.contentLevel,
          accessibilityLevel: result.accessibilityLevel,
          safetyStatus: result.safetyStatus,
          suggestedVerdict: result.suggestedVerdict,
          verdictRationaleAr: result.verdictRationaleAr,
          status: "ANALYZED",
        },
      }),
    ]);
  } catch {
    // WHY: never log the content/body (governance rule #3); flag the review so
    // the reviewer can retry.
    await db.review
      .update({ where: { id: reviewId }, data: { status: "FAILED" } })
      .catch(() => undefined);
  } finally {
    revalidatePath(`/reviews/${reviewId}`);
  }
}

// WHY: reviewer-triggered entry point. Sets status ANALYZING synchronously so
// the UI shows progress immediately, then runs the heavy analysis AFTER the
// response returns (BACKEND RULE: long-running analysis never blocks the request).
export async function analyzeReview(
  reviewId: string,
): Promise<AnalyzeReviewState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." };
  }

  const review = await db.review.findFirst({
    where: { id: reviewId, orgId: user.orgId },
    select: { id: true, status: true },
  });
  if (!review) {
    return { error: "المراجعة غير موجودة." };
  }
  if (
    review.status !== "EXTRACTED" &&
    review.status !== "ANALYZED" &&
    review.status !== "FAILED"
  ) {
    return { error: "لا يمكن بدء التحليل في الحالة الحالية للمراجعة." };
  }

  try {
    await db.review.update({
      where: { id: reviewId },
      data: { status: "ANALYZING" },
    });
  } catch {
    return { error: "تعذّر بدء التحليل، يرجى المحاولة لاحقاً." };
  }

  revalidatePath(`/reviews/${reviewId}`);

  // WHY: process after the response is sent so the request isn't blocked.
  after(async () => {
    await runAnalysis(reviewId);
  });

  return { started: true };
}
