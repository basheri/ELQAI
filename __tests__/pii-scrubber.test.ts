import { describe, it, expect } from "vitest";
import { scrubPii, isStudentContent, scrubCourseContent } from "@/lib/pii-scrubber";

describe("scrubPii", () => {
  it("redacts email addresses", () => {
    const input = "Contact student@university.edu.sa for details";
    expect(scrubPii(input)).not.toContain("student@university.edu.sa");
    expect(scrubPii(input)).toContain("[REDACTED]");
  });

  it("redacts Saudi national IDs", () => {
    const input = "Student ID: 1098765432";
    expect(scrubPii(input)).not.toContain("1098765432");
  });

  it("redacts phone numbers", () => {
    const input = "Call 0512345678 or +966512345678";
    const result = scrubPii(input);
    expect(result).not.toContain("0512345678");
    expect(result).not.toContain("+966512345678");
  });

  it("redacts grade patterns", () => {
    const input = "Grade: 85% for the assignment";
    expect(scrubPii(input)).not.toContain("Grade: 85%");
  });

  it("preserves non-PII content", () => {
    const input = "This is a lesson about programming in Python.";
    expect(scrubPii(input)).toBe(input);
  });
});

describe("isStudentContent", () => {
  it("detects student submission files", () => {
    expect(isStudentContent("student_submission_123.html")).toBe(true);
    expect(isStudentContent("attempt_01/response.html")).toBe(true);
    expect(isStudentContent("gradebook.xml")).toBe(true);
    expect(isStudentContent("roster.csv")).toBe(true);
  });

  it("allows instructional content files", () => {
    expect(isStudentContent("lesson_01.html")).toBe(false);
    expect(isStudentContent("syllabus.pdf")).toBe(false);
  });
});

describe("scrubCourseContent", () => {
  it("excludes student content files entirely", () => {
    const files = [
      { fileName: "lesson.html", content: "Welcome to the course" },
      {
        fileName: "student_submission_1.html",
        content: "My name is Ahmed, my grade is 95",
      },
    ];

    const result = scrubCourseContent(files);
    expect(result.cleanContent).toContain("Welcome to the course");
    expect(result.cleanContent).not.toContain("Ahmed");
    expect(result.studentFilesExcluded).toContain(
      "student_submission_1.html"
    );
  });

  it("scrubs PII from instructional content", () => {
    const files = [
      {
        fileName: "syllabus.html",
        content: "Instructor: dr@uni.edu.sa, Office: 123",
      },
    ];

    const result = scrubCourseContent(files);
    expect(result.cleanContent).not.toContain("dr@uni.edu.sa");
    expect(result.piiRemoved).toBe(true);
  });
});
