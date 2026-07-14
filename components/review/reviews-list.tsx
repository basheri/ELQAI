import { ReviewCard } from "@/components/review/review-card";
import { ReviewsEmptyState } from "@/components/review/reviews-empty-state";

import type { ReviewSummary } from "@/types/review";

interface ReviewsListProps {
  reviews: ReviewSummary[];
}

// WHY: renders the reviews (newest first is decided by the query) or the empty
// state when the org has none.
export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return <ReviewsEmptyState />;
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
