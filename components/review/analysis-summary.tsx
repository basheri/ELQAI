import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  COMPLIANCE_LEVEL_LABELS_AR,
  COMPLIANCE_LEVEL_VARIANTS,
} from "@/lib/review-display";

import type { Review } from "@prisma/client";

const DIMENSIONS: {
  key: "qmLevel" | "nelcLevel" | "contentLevel" | "accessibilityLevel";
  labelAr: string;
}[] = [
  { key: "qmLevel", labelAr: "Quality Matters" },
  { key: "nelcLevel", labelAr: "NELC" },
  { key: "contentLevel", labelAr: "جودة المحتوى" },
  { key: "accessibilityLevel", labelAr: "إتاحة الوصول" },
];

// WHY: read-only overview of the AI's dimension assessment. Levels + readiness
// are informational (Step 8 only lets the reviewer adjust the verdict + safety).
export function AnalysisSummary({ review }: { review: Review }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">ملخّص التقييم</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">الجاهزية الإجمالية</p>
          <p className="text-3xl font-bold">
            {review.overallReadiness ?? "—"}
            <span className="text-lg text-muted-foreground"> / 100</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {DIMENSIONS.map((dimension) => {
            const level = review[dimension.key];
            return (
              <div key={dimension.key} className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {dimension.labelAr}
                </p>
                {level ? (
                  <Badge variant={COMPLIANCE_LEVEL_VARIANTS[level]}>
                    {COMPLIANCE_LEVEL_LABELS_AR[level]}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
