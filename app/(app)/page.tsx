import { redirect } from "next/navigation";

import { NewReviewButton } from "@/components/review/new-review-button";
import { ReviewsSearch } from "@/components/review/reviews-search";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

import type { ReviewSummary } from "@/types/review";

const PAGE_SIZE = 20;

export default async function ReviewsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const rows = await db.review.findMany({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      courseName: true,
      courseCode: true,
      status: true,
      verdict: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const reviews: ReviewSummary[] = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? reviews[reviews.length - 1].id : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">المراجعات</h1>
          <p className="text-sm text-muted-foreground">
            مراجعات جودة المقررات الإلكترونية لجهتك.
          </p>
        </div>
        <NewReviewButton />
      </div>

      <ReviewsSearch
        initialReviews={reviews}
        initialCursor={nextCursor}
      />
    </div>
  );
}
