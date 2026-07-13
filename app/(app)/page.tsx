import { redirect } from "next/navigation";

import { NewReviewButton } from "@/components/review/new-review-button";
import { ReviewsList } from "@/components/review/reviews-list";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

import type { ReviewSummary } from "@/types/review";

export default async function ReviewsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // WHY: newest first, scoped to the current org. Capped at 20 for the MVP list;
  // Step 11 adds cursor-based pagination + search over the full history.
  const reviews: ReviewSummary[] = await db.review.findMany({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      courseName: true,
      courseCode: true,
      status: true,
      verdict: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">المراجعات</h1>
          <p className="text-sm text-muted-foreground">
            مراجعات جودة المقررات الإلكترونية لجهتك، الأحدث أولاً.
          </p>
        </div>
        <NewReviewButton />
      </div>

      <ReviewsList reviews={reviews} />
    </div>
  );
}
