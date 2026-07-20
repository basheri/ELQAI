"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";

export interface DashboardStats {
  totalReviews: number;
  verdictDistribution: Record<string, number>;
  averageReadiness: number;
  severityCounts: Record<string, number>;
  topFailingCriteria: Array<{ criterionRef: string; count: number }>;
  monthlyTrend: Array<{
    month: string;
    count: number;
    avgReadiness: number;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "LEADERSHIP" && user.role !== "ADMIN") return null;

  const reviews = await db.review.findMany({
    where: {
      orgId: user.orgId,
      status: { in: ["ANALYZED", "SIGNED_OFF", "EXPORTED"] },
    },
    include: { findings: true },
    orderBy: { createdAt: "desc" },
  });

  const totalReviews = reviews.length;

  const verdictDistribution: Record<string, number> = {};
  let totalReadiness = 0;
  let readinessCount = 0;

  for (const review of reviews) {
    if (review.verdict) {
      verdictDistribution[review.verdict] =
        (verdictDistribution[review.verdict] ?? 0) + 1;
    }
    if (review.overallReadiness !== null) {
      totalReadiness += review.overallReadiness;
      readinessCount++;
    }
  }

  const averageReadiness =
    readinessCount > 0 ? Math.round(totalReadiness / readinessCount) : 0;

  const severityCounts: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  const criterionCounts: Record<string, number> = {};

  for (const review of reviews) {
    for (const finding of review.findings) {
      if (finding.accepted) {
        severityCounts[finding.severity] =
          (severityCounts[finding.severity] ?? 0) + 1;
        if (finding.criterionRef) {
          criterionCounts[finding.criterionRef] =
            (criterionCounts[finding.criterionRef] ?? 0) + 1;
        }
      }
    }
  }

  const topFailingCriteria = Object.entries(criterionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([criterionRef, count]) => ({ criterionRef, count }));

  const monthlyMap: Record<string, { count: number; totalReadiness: number }> =
    {};

  for (const review of reviews) {
    const month = new Date(review.createdAt).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
    });
    if (!monthlyMap[month]) {
      monthlyMap[month] = { count: 0, totalReadiness: 0 };
    }
    monthlyMap[month].count++;
    monthlyMap[month].totalReadiness += review.overallReadiness ?? 0;
  }

  const monthlyTrend = Object.entries(monthlyMap).map(([month, data]) => ({
    month,
    count: data.count,
    avgReadiness: Math.round(data.totalReadiness / data.count),
  }));

  return {
    totalReviews,
    verdictDistribution,
    averageReadiness,
    severityCounts,
    topFailingCriteria,
    monthlyTrend,
  };
}
