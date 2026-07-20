"use server";

import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";

const newReviewSchema = z.object({
  courseName: z.string().min(1, "اسم المقرر مطلوب"),
  courseCode: z.string().min(1, "رمز المقرر مطلوب"),
  storagePath: z.string().min(1, "ملف التصدير مطلوب"),
});

export async function createReview(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "غير مصرح" };

  const parsed = newReviewSchema.safeParse({
    courseName: formData.get("courseName"),
    courseCode: formData.get("courseCode"),
    storagePath: formData.get("storagePath"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // WHY: the file itself was uploaded via /api/upload; only accept a path
  // inside this org's folder so one org can never reference another's export
  const { storagePath } = parsed.data;
  if (
    !storagePath.startsWith(`exports/${user.orgId}/`) ||
    storagePath.includes("..")
  ) {
    return { error: "مسار الملف غير صالح" };
  }

  let review;
  try {
    review = await db.review.create({
      data: {
        orgId: user.orgId,
        courseName: parsed.data.courseName,
        courseCode: parsed.data.courseCode,
        sourceFileName: storagePath,
        status: "UPLOADED",
      },
    });
  } catch {
    return { error: "فشل إنشاء المراجعة. تأكد من اتصال قاعدة البيانات." };
  }

  redirect(`/reviews/${review.id}`);
}

export async function getReview(reviewId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  return db.review.findFirst({
    where: { id: reviewId, orgId: user.orgId },
    include: {
      examinedFiles: true,
      findings: { orderBy: { severity: "asc" } },
      exports: { orderBy: { generatedAt: "desc" } },
      reviewedBy: true,
    },
  });
}

export async function getReviewsForOrg(
  orgId: string,
  options?: {
    cursor?: string;
    search?: string;
    verdict?: string;
    take?: number;
  }
) {
  const take = options?.take ?? 20;

  return db.review.findMany({
    where: {
      orgId,
      ...(options?.search && {
        OR: [
          { courseName: { contains: options.search, mode: "insensitive" } },
          { courseCode: { contains: options.search, mode: "insensitive" } },
        ],
      }),
      ...(options?.verdict && {
        verdict: options.verdict as never,
      }),
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(options?.cursor && {
      cursor: { id: options.cursor },
      skip: 1,
    }),
    include: { reviewedBy: true },
  });
}
