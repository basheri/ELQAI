"use server";

import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
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
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from("course-exports")
      .download(review.sourceFileName);

    if (error || !data) {
      return { error: "فشل تحميل ملف التصدير" };
    }

    const buffer = Buffer.from(await data.arrayBuffer());
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
    await db.review.update({
      where: { id: reviewId },
      data: { status: "FAILED" },
    });
    return { error: `فشل استخراج المحتوى: ${err instanceof Error ? err.message : "خطأ غير معروف"}` };
  }
}
