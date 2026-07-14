import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const getCurrentUserMock = vi.fn();
const reviewFindFirstMock = vi.fn();
const reviewUpdateMock = vi.fn();
const reportExportCreateMock = vi.fn();
const reportExportDeleteMock = vi.fn();
const reportExportUpdateMock = vi.fn();
const uploadMock = vi.fn();
const createSignedUrlMock = vi.fn();
const generatePdfMock = vi.fn();
const generateWordMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => revalidatePathMock(p),
}));
vi.mock("@/lib/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    review: {
      findFirst: (a: unknown) => reviewFindFirstMock(a),
      update: (a: unknown) => reviewUpdateMock(a),
    },
    reportExport: {
      create: (a: unknown) => reportExportCreateMock(a),
      delete: (a: unknown) => reportExportDeleteMock(a),
      update: (a: unknown) => reportExportUpdateMock(a),
    },
  },
}));
const removeMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => uploadMock(...args),
        createSignedUrl: (...args: unknown[]) => createSignedUrlMock(...args),
        remove: (...args: unknown[]) => removeMock(...args),
      }),
    },
  }),
}));
vi.mock("@/lib/report/pdf-generator", () => ({
  generatePdf: (data: unknown) => generatePdfMock(data),
}));
vi.mock("@/lib/report/word-generator", () => ({
  generateWord: (data: unknown) => generateWordMock(data),
}));

import { exportReport } from "@/actions/exports";

const baseReview = {
  id: "rev_1",
  orgId: "org_1",
  courseName: "مقدمة في البرمجة",
  courseCode: "CS101",
  status: "SIGNED_OFF",
  signedOffAt: new Date("2026-01-15"),
  verdict: "READY",
  safetyStatus: "CLEAR",
  overallReadiness: 85,
  qmLevel: "HIGH",
  nelcLevel: "MEDIUM",
  contentLevel: "HIGH",
  accessibilityLevel: "MEDIUM",
  reviewedBy: { name: "محمد" },
  examinedFiles: [
    { id: "ef_1", fileName: "index.html", fileType: "html", examinable: true, reason: null },
  ],
  findings: [
    {
      id: "f_1",
      framework: "QM",
      severity: "HIGH",
      descriptionAr: "وصف",
      recommendationAr: "توصية",
      location: "index.html",
      criterionRef: "QM-1",
      accepted: true,
      overridden: false,
      aiGenerated: true,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({
    id: "user_1",
    orgId: "org_1",
    email: "reviewer@example.com",
  });
  reviewFindFirstMock.mockResolvedValue(baseReview);
  reportExportCreateMock.mockResolvedValue({ id: "exp_1" });
  reportExportUpdateMock.mockResolvedValue({});
  reportExportDeleteMock.mockResolvedValue(undefined);
  reviewUpdateMock.mockResolvedValue({});
  generatePdfMock.mockResolvedValue(Buffer.from("pdf-data"));
  generateWordMock.mockResolvedValue(Buffer.from("docx-data"));
  uploadMock.mockResolvedValue({ error: null });
  createSignedUrlMock.mockResolvedValue({
    data: { signedUrl: "https://storage.example.com/report.pdf?token=abc" },
  });
});

describe("exportReport", () => {
  it("generates a PDF, uploads it, and returns a download URL", async () => {
    const result = await exportReport("rev_1", "pdf");

    expect(result.error).toBeUndefined();
    expect(result.downloadUrl).toBe(
      "https://storage.example.com/report.pdf?token=abc",
    );
    expect(generatePdfMock).toHaveBeenCalledOnce();
    expect(uploadMock).toHaveBeenCalledOnce();
    expect(reportExportCreateMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/reviews/rev_1");
  });

  it("generates a Word doc when format is docx", async () => {
    const result = await exportReport("rev_1", "docx");

    expect(result.error).toBeUndefined();
    expect(generateWordMock).toHaveBeenCalledOnce();
    expect(generatePdfMock).not.toHaveBeenCalled();
  });

  it("rejects export before sign-off", async () => {
    reviewFindFirstMock.mockResolvedValue({
      ...baseReview,
      signedOffAt: null,
    });

    const result = await exportReport("rev_1", "pdf");

    expect(result.error).toBeTruthy();
    expect(generatePdfMock).not.toHaveBeenCalled();
  });

  it("rejects export without a session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await exportReport("rev_1", "pdf");

    expect(result.error).toBeTruthy();
    expect(reviewFindFirstMock).not.toHaveBeenCalled();
  });

  it("rolls back on storage upload failure", async () => {
    uploadMock.mockResolvedValue({ error: { message: "storage down" } });

    const result = await exportReport("rev_1", "pdf");

    expect(result.error).toBeTruthy();
    expect(reportExportDeleteMock).toHaveBeenCalledWith({
      where: { id: "exp_1" },
    });
  });

  it("transitions review status to EXPORTED", async () => {
    const result = await exportReport("rev_1", "pdf");

    expect(result.error).toBeUndefined();
    expect(reviewUpdateMock).toHaveBeenCalledWith({
      where: { id: "rev_1" },
      data: { status: "EXPORTED" },
    });
  });
});
