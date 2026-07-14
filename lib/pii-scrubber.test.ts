import { describe, expect, it } from "vitest";

import {
  isStudentDataPath,
  redactPii,
  scrubContent,
} from "@/lib/pii-scrubber";

describe("isStudentDataPath", () => {
  it("flags gradebook, discussion, submission, and roster areas", () => {
    expect(isStudentDataPath("res/gradebook/grades.html")).toBe(true);
    expect(isStudentDataPath("csfiles/discussionboard/thread01.html")).toBe(true);
    expect(isStudentDataPath("attempts/submission_42.pdf")).toBe(true);
    expect(isStudentDataPath("users/roster.csv")).toBe(true);
  });

  it("does not flag genuine instructional content", () => {
    expect(isStudentDataPath("csfiles/home_dir/lecture01.html")).toBe(false);
    expect(isStudentDataPath("content/module1/slides.pptx")).toBe(false);
  });
});

describe("redactPii", () => {
  it("removes student names, emails, national ids, and grades", () => {
    const { text, count } = redactPii(
      "الطالب خالد العتيبي حصل على الدرجة: 95 وبريده khaled@student.edu ورقمه 1012345678.",
      ["خالد العتيبي"],
    );

    expect(text).not.toContain("خالد العتيبي");
    expect(text).not.toContain("khaled@student.edu");
    expect(text).not.toContain("95");
    expect(text).not.toContain("1012345678");
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

describe("scrubContent", () => {
  it("drops student-data items and redacts residual PII from retained content", () => {
    const result = scrubContent(
      [
        {
          path: "csfiles/home_dir/lecture01.html",
          text: "مقدمة في الخوارزميات. للتواصل مع الطالبة سارة sara@student.edu بشأن الدرجة 88.",
        },
        {
          path: "res/discussionboard/thread.html",
          text: "رأي الطالب أحمد حول الموضوع...",
        },
        {
          path: "gradebook/grades.csv",
          text: "خالد, 95\nسارة, 88",
        },
      ],
      { studentIdentifiers: ["سارة"] },
    );

    // Student-data areas excluded wholesale.
    expect(result.excludedPaths).toContain("res/discussionboard/thread.html");
    expect(result.excludedPaths).toContain("gradebook/grades.csv");

    // Instructional content retained.
    expect(result.cleanText).toContain("مقدمة في الخوارزميات");

    // No student names, emails, or grades leak into the payload.
    expect(result.cleanText).not.toContain("sara@student.edu");
    expect(result.cleanText).not.toContain("سارة");
    expect(result.cleanText).not.toContain("88");
    // Names/grades from the excluded items must never appear.
    expect(result.cleanText).not.toContain("أحمد");
    expect(result.cleanText).not.toContain("خالد");
    expect(result.cleanText).not.toContain("95");
  });
});
