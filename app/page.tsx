export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getReviewsForOrg } from "@/actions/reviews";
import { AppShell } from "@/components/app-shell";
import { ReviewsList } from "@/components/review/reviews-list";

interface Props {
  searchParams: Promise<{ search?: string; verdict?: string; cursor?: string }>;
}

export default async function ReviewsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const take = 20;

  const reviews = await getReviewsForOrg(user.orgId, {
    search: params.search,
    verdict: params.verdict,
    cursor: params.cursor,
    take,
  });

  const hasMore = reviews.length > take;
  const displayReviews = hasMore ? reviews.slice(0, take) : reviews;
  const nextCursor = hasMore
    ? displayReviews[displayReviews.length - 1].id
    : null;

  return (
    <AppShell userName={user.name}>
      <ReviewsList
        reviews={displayReviews}
        search={params.search}
        verdict={params.verdict}
        nextCursor={nextCursor}
      />
    </AppShell>
  );
}
