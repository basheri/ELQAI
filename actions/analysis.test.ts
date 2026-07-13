import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const afterMock = vi.fn();
const analyzeCourseMock = vi.fn();
const extractMock = vi.fn();
const downloadMock = vi.fn();
const reviewFindUniqueMock = vi.fn();
const rubricFindManyMock = vi.fn();
const findingDeleteManyMock = vi.fn();
const findingCreateManyMock = vi.fn();
const reviewUpdateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => revalidatePathMock(p),
}));
vi.mock("next/server", () => ({
  after: (fn: () => void) => afterMock(fn),
}));
vi.mock("@/lib/claude", () => ({
  analyzeCourse: (input: unknown) => analyzeCourseMock(input),
}));
vi.mock("@/lib/content-extractor", () => ({
  extractInstructionalContent: (...args: unknown[]) => extractMock(...args),
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: { from: () => ({ download: (...a: unknown[]) => downloadMock(...a) }) },
  }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    review: {
      findUnique: (a: unknown) => reviewFindUniqueMock(a),
      update: (a: unknown) => reviewUpdateMock(a),
    },
    rubricCriterion: { findMany: (a: unknown) => rubricFindManyMock(a) },
    finding: {
      deleteMany: (a: unknown) => findingDeleteManyMock(a),
      createMany: (a: unknown) => findingCreateManyMock(a),
    },
    $transaction: (ops: unknown) => transactionMock(ops),
  },
}));

import { runAnalysis } from "@/actions/analysis";

const validResult = {
  overallReadiness: 82,
  qmLevel: "MEDIUM",
  nelcLevel: "HIGH",
  contentLevel: "MEDIUM",
  accessibilityLevel: "LOW",
  safetyStatus: "CLEAR",
  suggestedVerdict: "READY_LIMITED_FIXES",
  verdictRationaleAr: "المقرر جيد.",
  findings: [
    {
      framework: "QM",
      criterionRef: "QM-1.1",
      severity: "HIGH",
      descriptionAr: "وصف",
      recommendationAr: "توصية",
      location: "lecture01.html",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  reviewFindUniqueMock.mockResolvedValue({
    id: "rev_1",
    orgId: "org_1",
    examinedFiles: [
      { fileName: "lecture01.html", fileType: "html", examinable: true, reason: null },
      { fileName: "intro.mp4", fileType: "video", examinable: false, reason: "فيديو" },
    ],
  });
  downloadMock.mockResolvedValue({
    data: { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    error: null,
  });
  extractMock.mockResolvedValue([
    { path: "lecture01.html", text: "مقدمة في الخوارزميات" },
  ]);
  rubricFindManyMock.mockResolvedValue([
    { framework: "QM", code: "QM-1.1", titleAr: "", titleEn: "", weight: 3, descAr: "" },
  ]);
  analyzeCourseMock.mockResolvedValue(validResult);
  transactionMock.mockResolvedValue([]);
  reviewUpdateMock.mockResolvedValue({});
});

describe("runAnalysis", () => {
  it("scrubs, analyzes, and persists findings + suggested verdict; status ANALYZED", async () => {
    await runAnalysis("rev_1");

    // analysis received rubric JSON + scrubbed instructional content
    expect(analyzeCourseMock).toHaveBeenCalledOnce();
    const analyzeArg = analyzeCourseMock.mock.calls[0][0] as {
      rubricCriteria: string;
      courseContent: string;
    };
    expect(analyzeArg.courseContent).toContain("مقدمة في الخوارزميات");
    expect(analyzeArg.rubricCriteria).toContain("QM-1.1");

    // findings written and review updated with the suggested verdict + ANALYZED
    expect(findingCreateManyMock).toHaveBeenCalledOnce();
    const updateArg = reviewUpdateMock.mock.calls.find(
      (c) => (c[0] as { data?: { status?: string } }).data?.status === "ANALYZED",
    );
    expect(updateArg).toBeTruthy();
    const data = (updateArg![0] as { data: Record<string, unknown> }).data;
    expect(data.suggestedVerdict).toBe("READY_LIMITED_FIXES");
    expect(data.overallReadiness).toBe(82);
    // governance: the binding verdict is NOT set by analysis
    expect(data.verdict).toBeUndefined();
  });

  it("sets status FAILED when analysis throws", async () => {
    analyzeCourseMock.mockRejectedValue(new Error("api down"));

    await runAnalysis("rev_1");

    const failedUpdate = reviewUpdateMock.mock.calls.find(
      (c) => (c[0] as { data?: { status?: string } }).data?.status === "FAILED",
    );
    expect(failedUpdate).toBeTruthy();
    expect(findingCreateManyMock).not.toHaveBeenCalled();
  });
});
