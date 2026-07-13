import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  formatDateAr,
  REVIEW_STATUS_LABELS_AR,
  REVIEW_STATUS_VARIANTS,
} from "@/lib/review-display";

import type { ReviewSummary } from "@/types/review";

interface ReviewCardProps {
  review: ReviewSummary;
}

// WHY: one row in the reviews list — links to the review detail page and shows
// course name/code, a status badge, and the (Western-numeral) creation date.
export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Link
      href={`/reviews/${review.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="transition-colors hover:bg-accent">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">{review.courseName}</CardTitle>
            <CardDescription>
              <span dir="ltr">{review.courseCode}</span>
              {" · "}
              {formatDateAr(review.createdAt)}
            </CardDescription>
          </div>
          <Badge variant={REVIEW_STATUS_VARIANTS[review.status]}>
            {REVIEW_STATUS_LABELS_AR[review.status]}
          </Badge>
        </CardHeader>
      </Card>
    </Link>
  );
}
