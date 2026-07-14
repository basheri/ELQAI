import { FileSearch } from "lucide-react";

import { NewReviewButton } from "@/components/review/new-review-button";

// WHY: shown when the org has no reviews yet — guides the reviewer to start
// their first review instead of showing an empty page.
export function ReviewsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileSearch className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">لا توجد مراجعات بعد</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          ابدأ بإنشاء مراجعة جديدة لرفع حزمة مقرر من بلاكبورد وتحليل جودته.
        </p>
      </div>
      <NewReviewButton />
    </div>
  );
}
