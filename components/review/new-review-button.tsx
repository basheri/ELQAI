import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

// WHY: single source for the "New Review" call-to-action, reused in the page
// header and the empty state. Links to the (Step 4) new-review flow.
export function NewReviewButton() {
  return (
    <Button asChild>
      <Link href="/reviews/new">
        <Plus className="size-4" />
        مراجعة جديدة
      </Link>
    </Button>
  );
}
