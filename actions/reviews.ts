"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseBlackboardExport } from "@/lib/blackboard-parser";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  ACCEPTED_EXPORT_EXTENSIONS,
  COURSE_EXPORTS_BUCKET,
  exportStoragePath,
  MAX_EXPORT_BYTES,
} from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface CreateReviewState {
  error?: string;
}

// WHY: validate the text fields with Zod before any DB write (CLAUDE.md). The
// uploaded file is validated separately since File constraints don't map cleanly
// onto a shared schema across runtimes.
const CreateReviewSchema = z.object({
  courseName: z.string().trim().min(1, "اسم المقرر مطلوب.").max(200),
  courseCode: z.string().trim().min(1, "رمز المقرر مطلوب.").max(50),
});

function validateExportFile(file: unknown): file is File {
  return file instanceof File && file.size > 0;
}

export async function createReview(
  _prevState: CreateReviewState,
  formData: FormData,
): Promise<CreateReviewState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." };
  }

  // WHY: coalesce missing fields to "" so the Arabic min-length messages fire
  // instead of Zod's default "expected string, received null".
  const parsed = CreateReviewSchema.safeParse({
    courseName: (formData.get("courseName") ?? "").toString(),
    courseCode: (formData.get("courseCode") ?? "").toString(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة." };
  }

  const file = formData.get("file");
  if (!validateExportFile(file)) {
    return { error: "يرجى اختيار ملف حزمة المقرر (‎.zip)." };
  }
  const hasAcceptedExtension = ACCEPTED_EXPORT_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );
  if (!hasAcceptedExtension) {
    return { error: "صيغة الملف غير مدعومة، يجب أن يكون الملف بصيغة ‎.zip." };
  }
  if (file.size > MAX_EXPORT_BYTES) {
    return { error: "حجم الملف يتجاوز الحد المسموح (٢٠٠ ميغابايت)." };
  }

  const { courseName, courseCode } = parsed.data;

  // WHY: create the Review first so the storage path can be keyed by its id. If
  // the upload then fails we roll the row back to avoid an orphan UPLOADED review
  // with no file behind it.
  let reviewId: string;
  try {
    const review = await db.review.create({
      data: {
        orgId: user.orgId,
        courseName,
        courseCode,
        sourceFileName: file.name,
        status: "UPLOADED",
      },
      select: { id: true },
    });
    reviewId = review.id;
  } catch {
    return { error: "تعذّر إنشاء المراجعة، يرجى المحاولة لاحقاً." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(COURSE_EXPORTS_BUCKET)
      .upload(exportStoragePath(user.orgId, reviewId), file, {
        contentType: "application/zip",
        upsert: false,
      });
    if (error) {
      throw error;
    }
  } catch {
    // WHY: best-effort rollback of the row we just created; ignore delete errors
    // so we still surface the upload failure to the reviewer.
    await db.review.delete({ where: { id: reviewId } }).catch(() => undefined);
    return { error: "تعذّر رفع الملف، يرجى المحاولة مرة أخرى." };
  }

  revalidatePath("/");

  // WHY: redirect() throws NEXT_REDIRECT, so it must run outside the try/catch
  // blocks above. `created=1` lets the detail page fire a success toast.
  redirect(`/reviews/${reviewId}?created=1`);
}

export interface ExtractReviewState {
  error?: string;
  total?: number;
}

// WHY: unzip the stored export, classify its content files, and persist the
// inventory (ExaminedFile rows) — moving the review to EXTRACTED. Re-runnable
// while still UPLOADED/EXTRACTED (it replaces the previous inventory).
export async function extractReview(
  reviewId: string,
): Promise<ExtractReviewState> {
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
  if (review.status !== "UPLOADED" && review.status !== "EXTRACTED") {
    return { error: "لا يمكن استخراج الملفات في الحالة الحالية للمراجعة." };
  }

  let classified;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(COURSE_EXPORTS_BUCKET)
      .download(exportStoragePath(user.orgId, reviewId));
    if (error || !data) {
      throw error ?? new Error("empty download");
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    classified = await parseBlackboardExport(buffer);
  } catch {
    return { error: "تعذّر فتح حزمة المقرر أو قراءة محتواها." };
  }

  try {
    // WHY: replace-then-insert in one transaction so a re-run never leaves a
    // half-updated inventory, and the status flips only if the writes succeed.
    await db.$transaction([
      db.examinedFile.deleteMany({ where: { reviewId } }),
      db.examinedFile.createMany({
        data: classified.map((file) => ({
          reviewId,
          fileName: file.fileName,
          fileType: file.fileType,
          examinable: file.examinable,
          reason: file.reason,
        })),
      }),
      db.review.update({
        where: { id: reviewId },
        data: { status: "EXTRACTED" },
      }),
    ]);
  } catch {
    return { error: "تعذّر حفظ نتائج الاستخراج." };
  }

  revalidatePath(`/reviews/${reviewId}`);
  return { total: classified.length };
}
