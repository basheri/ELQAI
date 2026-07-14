"use server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

import type { ReviewSummary } from "@/types/review";

const PAGE_SIZE = 20;

const ListSchema = z.object({
  query: z.string().trim().max(200).optional(),
  verdict: z
    .enum([
      "READY",
      "READY_LIMITED_FIXES",
      "NEEDS_SUBSTANTIAL_REVISION",
      "NOT_READY",
      "INCOMPLETE_EVIDENCE",
    ])
    .optional(),
  cursor: z.string().optional(),
});

export type ListReviewsInput = z.infer<typeof ListSchema>;

export interface ListReviewsResult {
  error?: string;
  reviews?: ReviewSummary[];
  nextCursor?: string;
}

// WHY: cursor-based pagination over the reviews list (Step 11). The cursor is
// the last review's createdAt+id, ensuring stable ordering even under inserts.
// Filters by course name/code (substring) and verdict.
export async function listReviews(
  input: ListReviewsInput,
): Promise<ListReviewsResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." };
  }

  const parsed = ListSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "بيانات البحث غير صحيحة." };
  }

  const { query, verdict, cursor } = parsed.data;

  const where: Record<string, unknown> = { orgId: user.orgId };

  if (query) {
    where.OR = [
      { courseName: { contains: query, mode: "insensitive" } },
      { courseCode: { contains: query, mode: "insensitive" } },
    ];
  }

  if (verdict) {
    where.verdict = verdict;
  }

  const reviews = await db.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      courseName: true,
      courseCode: true,
      status: true,
      verdict: true,
      createdAt: true,
    },
  });

  const hasMore = reviews.length > PAGE_SIZE;
  const page = hasMore ? reviews.slice(0, PAGE_SIZE) : reviews;
  const nextCursor = hasMore ? page[page.length - 1].id : undefined;

  return { reviews: page, nextCursor };
}
