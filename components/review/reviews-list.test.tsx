import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReviewsEmptyState } from "@/components/review/reviews-empty-state";
import { ReviewsList } from "@/components/review/reviews-list";

import type { ReviewSummary } from "@/types/review";

const sampleReview: ReviewSummary = {
  id: "rev_1",
  courseName: "مقدمة في البرمجة",
  courseCode: "CS101",
  status: "UPLOADED",
  verdict: null,
  createdAt: new Date("2026-03-15T10:00:00Z"),
};

describe("ReviewsEmptyState", () => {
  it("shows the empty message and a working New Review link", () => {
    render(<ReviewsEmptyState />);

    expect(screen.getByText("لا توجد مراجعات بعد")).toBeTruthy();
    const link = screen.getByRole("link", { name: /مراجعة جديدة/ });
    expect(link.getAttribute("href")).toBe("/reviews/new");
  });
});

describe("ReviewsList", () => {
  it("renders the empty state when there are no reviews", () => {
    render(<ReviewsList reviews={[]} />);
    expect(screen.getByText("لا توجد مراجعات بعد")).toBeTruthy();
  });

  it("renders a card per review linking to its detail page", () => {
    render(<ReviewsList reviews={[sampleReview]} />);

    expect(screen.getByText("مقدمة في البرمجة")).toBeTruthy();
    const link = screen.getByRole("link", { name: /مقدمة في البرمجة/ });
    expect(link.getAttribute("href")).toBe("/reviews/rev_1");
  });

  it("shows the Arabic status label and a Western-numeral date", () => {
    render(<ReviewsList reviews={[sampleReview]} />);

    expect(screen.getByText("تم الرفع")).toBeTruthy();
    // WHY: governance rule #5 — the date must use Western (0-9) numerals.
    expect(screen.getByText(/2026/)).toBeTruthy();
  });
});
