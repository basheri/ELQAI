export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getReview } from "@/actions/reviews";
import { AppShell } from "@/components/app-shell";
import { ReviewDetail } from "@/components/review/review-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const user = await getCurrentUser();

  const { id } = await params;

  let review: Awaited<ReturnType<typeof getReview>> = null;
  try {
    review = await getReview(id);
  } catch {
    // WHY: DB may not be connected in dev
  }

  if (!review) redirect("/");

  return (
    <AppShell userName={user?.name}>
      <ReviewDetail review={review} userId={user?.id ?? ""} />
    </AppShell>
  );
}
