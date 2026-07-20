export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/actions/auth";
import { getReviewsForOrg } from "@/actions/reviews";
import { AppShell } from "@/components/app-shell";
import { ReviewsList } from "@/components/review/reviews-list";

interface Props {
  searchParams: Promise<{ search?: string; verdict?: string; cursor?: string }>;
}

export default async function ReviewsPage({ searchParams }: Props) {
  const user = await getCurrentUser();

  const params = await searchParams;
  const take = 20;

  let reviews: Awaited<ReturnType<typeof getReviewsForOrg>> = [];
  try {
    reviews = await getReviewsForOrg(user?.orgId ?? "", {
      search: params.search,
      verdict: params.verdict,
      cursor: params.cursor,
      take,
    });
  } catch {
    // WHY: DB may not be connected in dev — show empty state
  }

  const hasMore = reviews.length > take;
  const displayReviews = hasMore ? reviews.slice(0, take) : reviews;
  const nextCursor = hasMore
    ? displayReviews[displayReviews.length - 1].id
    : null;

  return (
    <AppShell userName={user?.name}>
      <ReviewsList
        reviews={displayReviews}
        search={params.search}
        verdict={params.verdict}
        nextCursor={nextCursor}
      />
    </AppShell>
  );
}
