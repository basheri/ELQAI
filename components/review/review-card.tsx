import Link from "next/link";
import type { Review, User } from "@/types";
import { VERDICT_LABELS } from "@/types";

interface ReviewCardProps {
  review: Review & { reviewedBy: User | null };
}

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: "تم الرفع",
  EXTRACTED: "تم الاستخراج",
  ANALYZING: "جارٍ التحليل",
  ANALYZED: "تم التحليل",
  SIGNED_OFF: "تم الاعتماد",
  EXPORTED: "تم التصدير",
  FAILED: "فشل",
};

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Link href={`/reviews/${review.id}`}>
      <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold">{review.courseName}</h3>
            <p className="text-sm text-muted-foreground" dir="ltr">
              {review.courseCode}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              {STATUS_LABELS[review.status] ?? review.status}
            </span>
            {review.verdict && (
              <span className="text-xs text-muted-foreground">
                {VERDICT_LABELS[review.verdict]}
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            {new Date(review.createdAt).toLocaleDateString("ar-SA", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          {review.overallReadiness !== null && (
            <span>الجاهزية: {review.overallReadiness}%</span>
          )}
        </div>
      </div>
    </Link>
  );
}
