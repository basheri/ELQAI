import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const getCurrentUserMock = vi.fn();
const findingFindFirstMock = vi.fn();
const findingUpdateMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => revalidatePathMock(p),
}));
vi.mock("@/lib/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    finding: {
      findFirst: (a: unknown) => findingFindFirstMock(a),
      update: (a: unknown) => findingUpdateMock(a),
    },
  },
}));

import { setFindingAccepted, updateFinding } from "@/actions/findings";

const baseInput = {
  findingId: "f_1",
  severity: "HIGH" as const,
  descriptionAr: "وصف محدّث",
  recommendationAr: "توصية محدّثة",
  location: "lecture01.html",
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "u1", orgId: "org_1" });
  findingFindFirstMock.mockResolvedValue({
    id: "f_1",
    reviewId: "rev_1",
    accepted: true,
    review: { signedOffAt: null },
  });
  findingUpdateMock.mockResolvedValue({});
});

describe("updateFinding", () => {
  it("persists the edit and marks it overridden + accepted", async () => {
    const result = await updateFinding(baseInput);

    expect(result.error).toBeUndefined();
    expect(findingUpdateMock).toHaveBeenCalledOnce();
    const data = (findingUpdateMock.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.descriptionAr).toBe("وصف محدّث");
    expect(data.overridden).toBe(true);
    expect(data.accepted).toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/reviews/rev_1");
  });

  it("rejects an empty description without writing", async () => {
    const result = await updateFinding({ ...baseInput, descriptionAr: "  " });
    expect(result.error).toContain("وصف");
    expect(findingUpdateMock).not.toHaveBeenCalled();
  });

  it("refuses to edit a signed-off review", async () => {
    findingFindFirstMock.mockResolvedValue({
      id: "f_1",
      reviewId: "rev_1",
      accepted: true,
      review: { signedOffAt: new Date("2026-01-01") },
    });

    const result = await updateFinding(baseInput);
    expect(result.error).toBeTruthy();
    expect(findingUpdateMock).not.toHaveBeenCalled();
  });
});

describe("setFindingAccepted", () => {
  it("excludes a finding from the report", async () => {
    const result = await setFindingAccepted("f_1", false);

    expect(result.error).toBeUndefined();
    expect(findingUpdateMock).toHaveBeenCalledWith({
      where: { id: "f_1" },
      data: { accepted: false },
    });
  });

  it("errors when the finding is not in the user's org", async () => {
    findingFindFirstMock.mockResolvedValue(null);
    const result = await setFindingAccepted("f_1", false);
    expect(result.error).toBeTruthy();
    expect(findingUpdateMock).not.toHaveBeenCalled();
  });
});
