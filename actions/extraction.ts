"use server";

import { db } from "@/lib/db";
import { loadCourseExport } from "@/lib/storage";
import { parseBlackboardExport } from "@/lib/blackboard-parser";
import { getCurrentUser } from "@/actions/auth";

export async function extractCourseContent(reviewId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "غير مصرح" };

  const review = await db.review.findFirst({
    where: { id: reviewId, orgId: user.orgId },
  });

  if (!review) return { error: "المراجعة غير موجودة" };
  if (review.status !== "UPLOADED") return { error: "تم استخراج المحتوى مسبقاً" };

  try {
    const buffer = await loadCourseExport(review.sourceFileName);
    const files = await parseBlackboardExport(buffer);

    await db.$transaction([
      ...files.map((file) =>
        db.examinedFile.create({
          data: {
            reviewId,
            fileName: file.fileName,
            fileType: file.fileType,
            examinable: file.examinable,
            reason: file.reason,
          },
        })
      ),
      db.review.update({
        where: { id: reviewId },
        data: { status: "EXTRACTED" },
      }),
    ]);

    return { success: true };
  } catch (err) {
    // WHY: keep status UPLOADED so the reviewer can retry extraction —
    // a transient failure must not brick the review
    return { error: `فشل استخراج المحتوى: ${err instanceof Error ? err.message : "خطأ غير معروف"}` };
  }
}
