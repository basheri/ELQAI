import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const constructorMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    constructor(opts: unknown) {
      constructorMock(opts);
    }
    messages = { create: (...args: unknown[]) => createMock(...args) };
  },
}));

import { analyzeCourse } from "@/lib/claude";

const validResult = {
  overallReadiness: 82,
  qmLevel: "MEDIUM",
  nelcLevel: "HIGH",
  contentLevel: "MEDIUM",
  accessibilityLevel: "LOW",
  safetyStatus: "CLEAR",
  suggestedVerdict: "READY_LIMITED_FIXES",
  verdictRationaleAr: "المقرر جيد مع تحسينات محدودة.",
  findings: [
    {
      framework: "QM",
      criterionRef: "QM-1.1",
      severity: "HIGH",
      descriptionAr: "غياب مخرجات تعلم واضحة.",
      recommendationAr: "أضف مخرجات تعلم قابلة للقياس.",
      location: "lecture01.html",
    },
  ],
};

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

const input = { rubricCriteria: "[]", courseContent: "محتوى تعليمي" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("analyzeCourse", () => {
  it("returns the validated result on a valid JSON response", async () => {
    createMock.mockResolvedValueOnce(textResponse(JSON.stringify(validResult)));

    const result = await analyzeCourse(input);

    expect(result.suggestedVerdict).toBe("READY_LIMITED_FIXES");
    expect(result.overallReadiness).toBe(82);
    expect(result.findings).toHaveLength(1);
    expect(createMock).toHaveBeenCalledOnce();
  });

  it("strips code fences and still parses", async () => {
    createMock.mockResolvedValueOnce(
      textResponse("```json\n" + JSON.stringify(validResult) + "\n```"),
    );

    const result = await analyzeCourse(input);
    expect(result.qmLevel).toBe("MEDIUM");
  });

  it("retries once on invalid JSON, then succeeds", async () => {
    createMock
      .mockResolvedValueOnce(textResponse("not json at all"))
      .mockResolvedValueOnce(textResponse(JSON.stringify(validResult)));

    const result = await analyzeCourse(input);

    expect(result.safetyStatus).toBe("CLEAR");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("throws after two invalid responses", async () => {
    createMock.mockResolvedValue(textResponse("{ not valid }"));

    await expect(analyzeCourse(input)).rejects.toThrow(/invalid output/i);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a schema-invalid result (out-of-range readiness)", async () => {
    const bad = { ...validResult, overallReadiness: 250 };
    createMock.mockResolvedValue(textResponse(JSON.stringify(bad)));

    await expect(analyzeCourse(input)).rejects.toThrow();
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("sets zero-retention header on the Anthropic client", async () => {
    createMock.mockResolvedValueOnce(textResponse(JSON.stringify(validResult)));

    await analyzeCourse(input);

    const opts = constructorMock.mock.calls[0][0] as {
      defaultHeaders: Record<string, string>;
    };
    expect(opts.defaultHeaders["anthropic-no-store"]).toBe("true");
  });
});
