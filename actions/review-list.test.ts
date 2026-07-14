import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
const reviewFindManyMock = vi.fn();

vi.mock("@/lib/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    review: {
      findMany: (a: unknown) => reviewFindManyMock(a),
    },
  },
}));

import { listReviews } from "@/actions/review-list";

const makeReview = (id: string) => ({
  id,
  courseName: `مقرر ${id}`,
  courseCode: `CS${id}`,
  status: "ANALYZED" as const,
  verdict: "READY" as const,
  createdAt: new Date("2026-01-01"),
});

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({
    id: "u1",
    orgId: "org_1",
    email: "r@example.com",
  });
  reviewFindManyMock.mockResolvedValue([makeReview("r1")]);
});

describe("listReviews", () => {
  it("returns reviews for the current org", async () => {
    const result = await listReviews({});

    expect(result.error).toBeUndefined();
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews![0].id).toBe("r1");
    const args = reviewFindManyMock.mock.calls[0][0] as { where: { orgId: string } };
    expect(args.where.orgId).toBe("org_1");
  });

  it("passes query filter for course name/code search", async () => {
    await listReviews({ query: "CS101" });

    const args = reviewFindManyMock.mock.calls[0][0] as { where: { OR: unknown[] } };
    expect(args.where.OR).toHaveLength(2);
  });

  it("passes verdict filter", async () => {
    await listReviews({ verdict: "READY" });

    const args = reviewFindManyMock.mock.calls[0][0] as { where: { verdict: string } };
    expect(args.where.verdict).toBe("READY");
  });

  it("returns nextCursor when more results exist", async () => {
    const many = Array.from({ length: 21 }, (_, i) => makeReview(`r${i}`));
    reviewFindManyMock.mockResolvedValue(many);

    const result = await listReviews({});

    expect(result.reviews).toHaveLength(20);
    expect(result.nextCursor).toBe("r19");
  });

  it("returns no cursor when results fit in one page", async () => {
    const result = await listReviews({});

    expect(result.nextCursor).toBeUndefined();
  });

  it("uses cursor for pagination", async () => {
    await listReviews({ cursor: "r5" });

    const args = reviewFindManyMock.mock.calls[0][0] as {
      cursor: { id: string };
      skip: number;
    };
    expect(args.cursor).toEqual({ id: "r5" });
    expect(args.skip).toBe(1);
  });

  it("errors when session is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await listReviews({});

    expect(result.error).toBeTruthy();
    expect(reviewFindManyMock).not.toHaveBeenCalled();
  });

  it("returns empty list with no results", async () => {
    reviewFindManyMock.mockResolvedValue([]);

    const result = await listReviews({});

    expect(result.reviews).toHaveLength(0);
    expect(result.nextCursor).toBeUndefined();
  });

  it("rejects invalid verdict value", async () => {
    const result = await listReviews({ verdict: "INVALID" as never });

    expect(result.error).toBeTruthy();
    expect(reviewFindManyMock).not.toHaveBeenCalled();
  });

  it("trims and limits query length", async () => {
    const result = await listReviews({ query: "a".repeat(201) });

    expect(result.error).toBeTruthy();
    expect(reviewFindManyMock).not.toHaveBeenCalled();
  });

  it("handles combined query and verdict filter", async () => {
    await listReviews({ query: "CS", verdict: "READY" });

    const args = reviewFindManyMock.mock.calls[0][0] as {
      where: { orgId: string; OR: unknown[]; verdict: string };
    };
    expect(args.where.orgId).toBe("org_1");
    expect(args.where.OR).toHaveLength(2);
    expect(args.where.verdict).toBe("READY");
  });

  it("does not apply OR filter when query is empty string", async () => {
    await listReviews({ query: "" });

    const args = reviewFindManyMock.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(args.where.OR).toBeUndefined();
  });

  it("does not apply OR filter when query is only whitespace", async () => {
    await listReviews({ query: "   " });

    const args = reviewFindManyMock.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(args.where.OR).toBeUndefined();
  });

  it("sets correct take value for fetch-N+1 pattern", async () => {
    await listReviews({});

    const args = reviewFindManyMock.mock.calls[0][0] as { take: number };
    expect(args.take).toBe(21);
  });

  it("orders by createdAt descending", async () => {
    await listReviews({});

    const args = reviewFindManyMock.mock.calls[0][0] as { orderBy: { createdAt: string } };
    expect(args.orderBy.createdAt).toBe("desc");
  });

  it("does not set cursor or skip without cursor input", async () => {
    await listReviews({});

    const args = reviewFindManyMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.cursor).toBeUndefined();
    expect(args.skip).toBeUndefined();
  });

  it("returns exactly PAGE_SIZE items when more exist", async () => {
    const many = Array.from({ length: 25 }, (_, i) => makeReview(`r${i}`));
    reviewFindManyMock.mockResolvedValue(many);

    const result = await listReviews({});

    expect(result.reviews).toHaveLength(20);
    expect(result.nextCursor).toBeDefined();
  });
});
