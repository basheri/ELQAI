"use server";

import { z } from "zod/v4";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";
import type { Severity, Verdict, SafetyStatus } from "@prisma/client";

const updateFindingSchema = z.object({
  findingId: z.string(),
  descriptionAr: z.string().optional(),
  recommendationAr: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  accepted: z.boolean().optional(),
});

export async function updateFinding(data: z.infer<typeof updateFindingSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "غير مصرح" };

  const parsed = updateFindingSchema.safeParse(data);
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const finding = await db.finding.findUnique({
    where: { id: parsed.data.findingId },
    include: { review: true },
  });

  if (!finding || finding.review.orgId !== user.orgId) {
    return { error: "الملاحظة غير موجودة" };
  }

  if (finding.review.signedOffAt) {
    return { error: "لا يمكن التعديل بعد الاعتماد" };
  }

  await db.finding.update({
    where: { id: parsed.data.findingId },
    data: {
      ...(parsed.data.descriptionAr !== undefined && {
        descriptionAr: parsed.data.descriptionAr,
      }),
      ...(parsed.data.recommendationAr !== undefined && {
        recommendationAr: parsed.data.recommendationAr,
      }),
      ...(parsed.data.severity !== undefined && {
        severity: parsed.data.severity as Severity,
      }),
      ...(parsed.data.accepted !== undefined && {
        accepted: parsed.data.accepted,
      }),
      overridden: true,
    },
  });

  return { success: true };
}

const updateReviewVerdictSchema = z.object({
  reviewId: z.string(),
  verdict: z.enum([
    "READY",
    "READY_LIMITED_FIXES",
    "NEEDS_SUBSTANTIAL_REVISION",
    "NOT_READY",
    "INCOMPLETE_EVIDENCE",
  ]),
  safetyStatus: z.enum(["CLEAR", "FLAGGED", "FAILED"]).optional(),
});

export async function updateReviewVerdict(
  data: z.infer<typeof updateReviewVerdictSchema>
) {
  const user = await getCurrentUser();
  if (!user) return { error: "غير مصرح" };

  const parsed = updateReviewVerdictSchema.safeParse(data);
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const review = await db.review.findFirst({
    where: { id: parsed.data.reviewId, orgId: user.orgId },
  });

  if (!review) return { error: "المراجعة غير موجودة" };
  if (review.signedOffAt) return { error: "لا يمكن التعديل بعد الاعتماد" };

  await db.review.update({
    where: { id: parsed.data.reviewId },
    data: {
      verdict: parsed.data.verdict as Verdict,
      ...(parsed.data.safetyStatus !== undefined && {
        safetyStatus: parsed.data.safetyStatus as SafetyStatus,
      }),
    },
  });

  return { success: true };
}

export async function signOffReview(reviewId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "غير مصرح" };

  const review = await db.review.findFirst({
    where: { id: reviewId, orgId: user.orgId },
    include: { findings: true },
  });

  if (!review) return { error: "المراجعة غير موجودة" };
  if (review.status !== "ANALYZED") {
    return { error: "يجب إكمال التحليل أولاً" };
  }
  if (!review.verdict) {
    return { error: "يجب تحديد الحكم النهائي قبل الاعتماد" };
  }
  if (review.signedOffAt) {
    return { error: "تم الاعتماد مسبقاً" };
  }

  await db.review.update({
    where: { id: reviewId },
    data: {
      signedOffAt: new Date(),
      reviewedById: user.id,
      status: "SIGNED_OFF",
    },
  });

  return { success: true };
}
