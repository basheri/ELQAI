export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/actions/auth";
import { getDashboardStats, type DashboardStats } from "@/actions/dashboard";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  let stats: DashboardStats | null = null;
  try {
    stats = await getDashboardStats();
  } catch {
    // WHY: DB may not be connected in dev
  }

  const emptyStats: DashboardStats = {
    totalReviews: 0,
    verdictDistribution: {},
    averageReadiness: 0,
    severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    topFailingCriteria: [],
    monthlyTrend: [],
  };

  return (
    <AppShell userName={user?.name}>
      <DashboardView stats={stats ?? emptyStats} />
    </AppShell>
  );
}
