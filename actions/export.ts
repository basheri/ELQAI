"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";
import { generatePdf } from "@/lib/report/pdf-generator";
import { generateWord } from "@/lib/report/word-generator";
import { createClient } from "@/lib/supabase/server";

export async function exportReport(reviewId: string, format: "pdf" | "docx") {
  const user = await getCurrentUser();
  if (!user) return { error: "غير مصرح" };

  const review = await db.review.findFirst({
    where: { id: reviewId, orgId: user.orgId },
    include: {
      findings: true,
      examinedFiles: true,
      reviewedBy: true,
    },
  });

  if (!review) return { error: "المراجعة غير موجودة" };

  if (!review.signedOffAt) {
    return { error: "يجب اعتماد المراجعة قبل التصدير" };
  }

  try {
    const buffer =
      format === "pdf"
        ? await generatePdf({ review })
        : await generateWord({ review });

    const fileName = `report-${review.courseCode}-${Date.now()}.${format}`;
    const filePath = `reports/${review.orgId}/${fileName}`;

    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from("course-exports")
      .upload(filePath, buffer, {
        contentType:
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    if (uploadError) {
      return { error: "فشل حفظ التقرير" };
    }

    await db.$transaction([
      db.reportExport.create({
        data: {
          reviewId,
          format,
          filePath,
        },
      }),
      db.review.update({
        where: { id: reviewId },
        data: { status: "EXPORTED" },
      }),
    ]);

    const { data: urlData } = await supabase.storage
      .from("course-exports")
      .createSignedUrl(filePath, 3600);

    return { success: true, downloadUrl: urlData?.signedUrl };
  } catch (err) {
    return {
      error: `فشل إنشاء التقرير: ${err instanceof Error ? err.message : "خطأ غير معروف"}`,
    };
  }
}
