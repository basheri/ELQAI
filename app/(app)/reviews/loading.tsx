import { Skeleton } from "@/components/ui/skeleton";

// WHY: loading state for /reviews/new and /reviews/[id] so navigation doesn't
// briefly show the (parent) reviews-list skeleton.
export default function ReviewSegmentLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
