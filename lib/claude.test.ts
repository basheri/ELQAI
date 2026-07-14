import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

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

function jsonResponse(text: string, ok = true) {
  return {
    ok,
    json: async () => ({
      choices: [{ message: { content: text } }],
    }),
  };
}

const input = { rubricCriteria: "[]", courseContent: "محتوى تعليمي" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test-key");
});

describe("analyzeCourse", () => {
  it("returns the validated result on a valid JSON response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(JSON.stringify(validResult)),
    );

    const result = await analyzeCourse(input);

    expect(result.suggestedVerdict).toBe("READY_LIMITED_FIXES");
    expect(result.overallReadiness).toBe(82);
    expect(result.findings).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("strips code fences and still parses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse("```json\n" + JSON.stringify(validResult) + "\n```"),
    );

    const result = await analyzeCourse(input);
    expect(result.qmLevel).toBe("MEDIUM");
  });

  it("retries once on invalid JSON, then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse("not json at all"))
      .mockResolvedValueOnce(jsonResponse(JSON.stringify(validResult)));

    const result = await analyzeCourse(input);

    expect(result.safetyStatus).toBe("CLEAR");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws after two invalid responses", async () => {
    fetchMock.mockResolvedValue(jsonResponse("{ not valid }"));

    await expect(analyzeCourse(input)).rejects.toThrow(/invalid output/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a schema-invalid result (out-of-range readiness)", async () => {
    const bad = { ...validResult, overallReadiness: 250 };
    fetchMock.mockResolvedValue(jsonResponse(JSON.stringify(bad)));

    await expect(analyzeCourse(input)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends the OpenRouter API key as Bearer token", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(JSON.stringify(validResult)),
    );

    await analyzeCourse(input);

    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-or-test-key");
  });

  it("throws when OPENROUTER_API_KEY is not set", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");

    await expect(analyzeCourse(input)).rejects.toThrow(/OPENROUTER_API_KEY/i);
  });
});
