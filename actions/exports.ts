"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { generatePdf } from "@/lib/report/pdf-generator";
import { generateWord } from "@/lib/report/word-generator";
import {
  REPORT_EXPORTS_BUCKET,
  reportStoragePath,
} from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import type { ReportData } from "@/lib/report/html-template";

export interface ExportReportState {
  error?: string;
  downloadUrl?: string;
}

const ExportSchema = z.object({
  reviewId: z.string().min(1),
  format: z.enum(["pdf", "docx"]),
});

// WHY: governance rule #1 — export is gated on sign-off. This action loads the
// full review data, generates the report (PDF or Word), uploads it to Supabase
// Storage, creates a ReportExport row, and returns a signed download URL.
export async function exportReport(
  reviewId: string,
  format: "pdf" | "docx",
): Promise<ExportReportState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." };
  }

  const parsed = ExportSchema.safeParse({ reviewId, format });
  if (!parsed.success) {
    return { error: "بيانات التصدير غير صالحة." };
  }

  const review = await db.review.findFirst({
    where: { id: parsed.data.reviewId, orgId: user.orgId },
    include: {
      examinedFiles: { orderBy: { fileName: "asc" } },
      findings: true,
      reviewedBy: { select: { name: true } },
    },
  });
  if (!review) {
    return { error: "المراجعة غير موجودة." };
  }
  if (!review.signedOffAt) {
    return { error: "لا يمكن التصدير قبل اعتماد المراجعة." };
  }

  const reportData: ReportData = {
    review,
    findings: review.findings,
    examinedFiles: review.examinedFiles,
    reviewerName: review.reviewedBy?.name ?? user.email,
  };

  let fileBuffer: Buffer;
  try {
    fileBuffer =
      parsed.data.format === "pdf"
        ? await generatePdf(reportData)
        : await generateWord(reportData);
  } catch {
    return { error: "تعذّر إنشاء التقرير، يرجى المحاولة لاحقاً." };
  }

  let exportId: string;
  try {
    const exportRow = await db.reportExport.create({
      data: {
        reviewId: review.id,
        format: parsed.data.format,
        filePath: "",
      },
      select: { id: true },
    });
    exportId = exportRow.id;
  } catch {
    return { error: "تعذّر حفظ سجل التصدير." };
  }

  const storagePath = reportStoragePath(
    user.orgId,
    review.id,
    exportId,
    parsed.data.format,
  );

  try {
    const supabase = createSupabaseAdminClient();
    const contentType =
      parsed.data.format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const { error } = await supabase.storage
      .from(REPORT_EXPORTS_BUCKET)
      .upload(storagePath, fileBuffer, { contentType, upsert: false });
    if (error) throw error;

    await db.reportExport.update({
      where: { id: exportId },
      data: { filePath: storagePath },
    });

    const { data: signedUrl } = await supabase.storage
      .from(REPORT_EXPORTS_BUCKET)
      .createSignedUrl(storagePath, 60 * 10);

    if (!signedUrl?.signedUrl) {
      return { error: "تم إنشاء التقرير لكن تعذّر الحصول على رابط التنزيل." };
    }

    if (review.status !== "EXPORTED") {
      await db.review.update({
        where: { id: review.id },
        data: { status: "EXPORTED" },
      });
    }

    revalidatePath(`/reviews/${review.id}`);
    return { downloadUrl: signedUrl.signedUrl };
  } catch {
    const supabaseCleanup = createSupabaseAdminClient();
    await supabaseCleanup.storage
      .from(REPORT_EXPORTS_BUCKET)
      .remove([storagePath])
      .catch(() => undefined);
    await db.reportExport
      .delete({ where: { id: exportId } })
      .catch(() => undefined);
    return { error: "تعذّر رفع التقرير إلى التخزين." };
  }
}
