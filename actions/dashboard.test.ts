import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
const reviewFindManyMock = vi.fn();
const findingGroupByMock = vi.fn();
const criterionFindManyMock = vi.fn();

vi.mock("@/lib/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    review: { findMany: (a: unknown) => reviewFindManyMock(a) },
    finding: { groupBy: (a: unknown) => findingGroupByMock(a) },
    rubricCriterion: { findMany: (a: unknown) => criterionFindManyMock(a) },
  },
}));

import { getDashboardData } from "@/actions/dashboard";

const adminUser = {
  id: "u1",
  orgId: "org_1",
  email: "admin@example.com",
  role: "ADMIN",
};

const reviewerUser = {
  id: "u2",
  orgId: "org_1",
  email: "rev@example.com",
  role: "REVIEWER",
};

const leaderUser = {
  id: "u3",
  orgId: "org_1",
  email: "lead@example.com",
  role: "LEADERSHIP",
};

function makeReview(verdict: string, readiness: number, date: string) {
  return {
    verdict,
    overallReadiness: readiness,
    createdAt: new Date(date),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue(adminUser);
  reviewFindManyMock.mockResolvedValue([]);
  findingGroupByMock.mockResolvedValue([]);
  criterionFindManyMock.mockResolvedValue([]);
});

describe("getDashboardData", () => {
  it("returns error when session is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await getDashboardData();

    expect(result.error).toBeTruthy();
    expect(result.data).toBeUndefined();
  });

  it("rejects REVIEWER role", async () => {
    getCurrentUserMock.mockResolvedValue(reviewerUser);

    const result = await getDashboardData();

    expect(result.error).toContain("صلاحية");
    expect(result.data).toBeUndefined();
  });

  it("allows LEADERSHIP role", async () => {
    getCurrentUserMock.mockResolvedValue(leaderUser);

    const result = await getDashboardData();

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  it("aggregates verdict counts correctly", async () => {
    reviewFindManyMock.mockResolvedValue([
      makeReview("READY", 90, "2026-01-15"),
      makeReview("READY", 85, "2026-01-20"),
      makeReview("NOT_READY", 30, "2026-02-10"),
    ]);

    const result = await getDashboardData();

    const ready = result.data!.verdictCounts.find((v) => v.verdict === "READY");
    const notReady = result.data!.verdictCounts.find((v) => v.verdict === "NOT_READY");
    expect(ready?.count).toBe(2);
    expect(notReady?.count).toBe(1);
  });

  it("distributes readiness into buckets", async () => {
    reviewFindManyMock.mockResolvedValue([
      makeReview("READY", 95, "2026-01-01"),
      makeReview("READY", 82, "2026-01-02"),
      makeReview("NOT_READY", 15, "2026-01-03"),
    ]);

    const result = await getDashboardData();
    const buckets = result.data!.readinessBuckets;

    expect(buckets.find((b) => b.label === "81–100")?.count).toBe(2);
    expect(buckets.find((b) => b.label === "0–20")?.count).toBe(1);
    expect(buckets.find((b) => b.label === "41–60")?.count).toBe(0);
  });

  it("maps failing standards with criterion labels", async () => {
    findingGroupByMock.mockResolvedValue([
      { criterionRef: "QM-1.1", _count: { id: 5 } },
      { criterionRef: "NELC-2.3", _count: { id: 3 } },
    ]);
    criterionFindManyMock.mockResolvedValue([
      { code: "QM-1.1", titleAr: "معيار الجودة 1.1", framework: "QM" },
      { code: "NELC-2.3", titleAr: "معيار نلك 2.3", framework: "NELC" },
    ]);

    const result = await getDashboardData();
    const standards = result.data!.failingStandards;

    expect(standards).toHaveLength(2);
    expect(standards[0].criterionRef).toBe("QM-1.1");
    expect(standards[0].titleAr).toBe("معيار الجودة 1.1");
    expect(standards[0].count).toBe(5);
  });

  it("groups trend by month with average readiness", async () => {
    reviewFindManyMock.mockResolvedValue([
      makeReview("READY", 80, "2026-01-10"),
      makeReview("READY", 90, "2026-01-25"),
      makeReview("NOT_READY", 40, "2026-02-05"),
    ]);

    const result = await getDashboardData();
    const trend = result.data!.trend;

    expect(trend).toHaveLength(2);
    expect(trend[0].month).toBe("2026-01");
    expect(trend[0].count).toBe(2);
    expect(trend[0].avgReadiness).toBe(85);
    expect(trend[1].month).toBe("2026-02");
    expect(trend[1].count).toBe(1);
    expect(trend[1].avgReadiness).toBe(40);
  });

  it("scopes queries to user org", async () => {
    await getDashboardData();

    const reviewArgs = reviewFindManyMock.mock.calls[0][0] as { where: { orgId: string } };
    expect(reviewArgs.where.orgId).toBe("org_1");
  });
});
