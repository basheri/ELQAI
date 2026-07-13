import { beforeEach, describe, expect, it, vi } from "vitest";

// WHY: isolate the Server Action from Next runtime + external services so we can
// assert its control flow (validation, DB write, storage upload, redirect).
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const revalidatePathMock = vi.fn();
const getCurrentUserMock = vi.fn();
const reviewCreateMock = vi.fn();
const reviewDeleteMock = vi.fn();
const uploadMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePathMock(path),
}));
vi.mock("@/lib/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    review: {
      create: (args: unknown) => reviewCreateMock(args),
      delete: (args: unknown) => reviewDeleteMock(args),
    },
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: {
      from: () => ({ upload: (...args: unknown[]) => uploadMock(...args) }),
    },
  }),
}));

import { createReview } from "@/actions/reviews";

function zipFile(name = "export.zip"): File {
  return new File([new Uint8Array([80, 75, 3, 4])], name, {
    type: "application/zip",
  });
}

function buildFormData(overrides?: {
  courseName?: string | null;
  courseCode?: string | null;
  file?: File | null;
}): FormData {
  const fd = new FormData();
  const courseName =
    overrides && "courseName" in overrides ? overrides.courseName : "مقدمة في البرمجة";
  const courseCode =
    overrides && "courseCode" in overrides ? overrides.courseCode : "CS101";
  const file = overrides && "file" in overrides ? overrides.file : zipFile();

  if (courseName !== null && courseName !== undefined)
    fd.set("courseName", courseName);
  if (courseCode !== null && courseCode !== undefined)
    fd.set("courseCode", courseCode);
  if (file) fd.set("file", file);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({
    id: "user_1",
    orgId: "org_1",
    email: "reviewer@example.com",
  });
  reviewCreateMock.mockResolvedValue({ id: "rev_1" });
  reviewDeleteMock.mockResolvedValue(undefined);
  uploadMock.mockResolvedValue({ error: null });
});

describe("createReview", () => {
  it("creates a review, uploads the file, and redirects to the detail page", async () => {
    await expect(createReview({}, buildFormData())).rejects.toThrow(
      "REDIRECT:/reviews/rev_1?created=1",
    );

    expect(reviewCreateMock).toHaveBeenCalledOnce();
    const createArg = reviewCreateMock.mock.calls[0][0] as {
      data: { orgId: string; status: string; sourceFileName: string };
    };
    expect(createArg.data.orgId).toBe("org_1");
    expect(createArg.data.status).toBe("UPLOADED");
    expect(createArg.data.sourceFileName).toBe("export.zip");

    expect(uploadMock).toHaveBeenCalledOnce();
    expect(uploadMock.mock.calls[0][0]).toBe("org_1/rev_1/source.zip");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("returns an error and writes nothing when the session is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await createReview({}, buildFormData());

    expect(result.error).toBeTruthy();
    expect(reviewCreateMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects a missing course name without touching the database", async () => {
    const result = await createReview(
      {},
      buildFormData({ courseName: null }),
    );

    expect(result.error).toContain("اسم المقرر");
    expect(reviewCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a non-zip file", async () => {
    const result = await createReview(
      {},
      buildFormData({ file: zipFile("export.txt") }),
    );

    expect(result.error).toBeTruthy();
    expect(reviewCreateMock).not.toHaveBeenCalled();
  });

  it("rolls back the review row when the storage upload fails", async () => {
    uploadMock.mockResolvedValue({ error: { message: "storage down" } });

    const result = await createReview({}, buildFormData());

    expect(result.error).toBeTruthy();
    expect(reviewCreateMock).toHaveBeenCalledOnce();
    expect(reviewDeleteMock).toHaveBeenCalledWith({ where: { id: "rev_1" } });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
