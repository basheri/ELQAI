"use server";

import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";

const newReviewSchema = z.object({
  courseName: z.string().min(1, "اسم المقرر مطلوب"),
  courseCode: z.string().min(1, "رمز المقرر مطلوب"),
});

export async function createReview(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "غير مصرح" };

  const parsed = newReviewSchema.safeParse({
    courseName: formData.get("courseName"),
    courseCode: formData.get("courseCode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "يجب رفع ملف تصدير المقرر (.zip)" };
  }

  if (!file.name.endsWith(".zip")) {
    return { error: "يجب أن يكون الملف بصيغة .zip" };
  }

  const supabase = await createClient();
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `exports/${user.orgId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("course-exports")
    .upload(filePath, file);

  if (uploadError) {
    return { error: "فشل رفع الملف. حاول مرة أخرى." };
  }

  const review = await db.review.create({
    data: {
      orgId: user.orgId,
      courseName: parsed.data.courseName,
      courseCode: parsed.data.courseCode,
      sourceFileName: filePath,
      status: "UPLOADED",
    },
  });

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
