import type { ReviewStatus, Verdict } from "@prisma/client";

// WHY: the minimal review shape the list/card need — decoupled from the full
// Prisma model so presentational components stay easy to render and test.
export interface ReviewSummary {
  id: string;
  courseName: string;
  courseCode: string;
  status: ReviewStatus;
  verdict: Verdict | null;
  createdAt: Date;
}
