"use server";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

import type { Framework, Verdict } from "@prisma/client";

export interface VerdictCount {
  verdict: Verdict;
  count: number;
}

export interface ReadinessBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface FailingStandard {
  criterionRef: string;
  titleAr: string;
  framework: Framework;
  count: number;
}

export interface TrendPoint {
  month: string;
  count: number;
  avgReadiness: number;
}

export interface DashboardData {
  totalReviews: number;
  verdictCounts: VerdictCount[];
  readinessBuckets: ReadinessBucket[];
  failingStandards: FailingStandard[];
  trend: TrendPoint[];
}

export interface DashboardResult {
  error?: string;
  data?: DashboardData;
}

const READINESS_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "0–20", min: 0, max: 20 },
  { label: "21–40", min: 21, max: 40 },
  { label: "41–60", min: 41, max: 60 },
  { label: "61–80", min: 61, max: 80 },
  { label: "81–100", min: 81, max: 100 },
];

export async function getDashboardData(): Promise<DashboardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." };
  }

  if (user.role !== "ADMIN" && user.role !== "LEADERSHIP") {
    return { error: "ليس لديك صلاحية لعرض لوحة المؤشرات." };
  }

  const completedWhere = {
    orgId: user.orgId,
    verdict: { not: null as unknown as undefined },
    status: { in: ["SIGNED_OFF" as const, "EXPORTED" as const] },
  };

  const [reviews, findingGroups, criterionLookup] = await Promise.all([
    db.review.findMany({
      where: completedWhere,
      select: {
        verdict: true,
        overallReadiness: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.finding.groupBy({
      by: ["criterionRef"],
      where: {
        review: completedWhere,
        accepted: true,
        criterionRef: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    db.rubricCriterion.findMany({
      select: { code: true, titleAr: true, framework: true },
    }),
  ]);

  const totalReviews = reviews.length;

  const verdictMap = new Map<Verdict, number>();
  for (const r of reviews) {
    if (r.verdict) {
      verdictMap.set(r.verdict, (verdictMap.get(r.verdict) ?? 0) + 1);
    }
  }
  const verdictCounts: VerdictCount[] = Array.from(verdictMap.entries()).map(
    ([verdict, count]) => ({ verdict, count }),
  );

  const readinessBuckets: ReadinessBucket[] = READINESS_BUCKETS.map((b) => ({
    ...b,
    count: reviews.filter(
      (r) =>
        r.overallReadiness !== null &&
        r.overallReadiness >= b.min &&
        r.overallReadiness <= b.max,
    ).length,
  }));

  const criterionMap = new Map(
    criterionLookup.map((c) => [c.code, { titleAr: c.titleAr, framework: c.framework }]),
  );
  const failingStandards: FailingStandard[] = findingGroups
    .filter((g) => g.criterionRef !== null)
    .map((g) => {
      const ref = g.criterionRef!;
      const criterion = criterionMap.get(ref);
      return {
        criterionRef: ref,
        titleAr: criterion?.titleAr ?? ref,
        framework: criterion?.framework ?? ("QM" as Framework),
        count: g._count.id,
      };
    });

  const monthMap = new Map<string, { count: number; totalReadiness: number }>();
  for (const r of reviews) {
    const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key) ?? { count: 0, totalReadiness: 0 };
    entry.count += 1;
    entry.totalReadiness += r.overallReadiness ?? 0;
    monthMap.set(key, entry);
  }
  const trend: TrendPoint[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      count: data.count,
      avgReadiness: Math.round(data.totalReadiness / data.count),
    }));

  return {
    data: {
      totalReviews,
      verdictCounts,
      readinessBuckets,
      failingStandards,
      trend,
    },
  };
}
