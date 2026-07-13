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
  FRAMEWORK_LABELS_AR,
  SAFETY_STATUS_LABELS_AR,
  SAFETY_STATUS_VARIANTS,
  SEVERITY_LABELS_AR,
  SEVERITY_ORDER,
  SEVERITY_VARIANTS,
  VERDICT_LABELS_AR,
} from "@/lib/review-display";

import type { Finding, Review } from "@prisma/client";

interface AnalysisResultsProps {
  review: Review;
  findings: Finding[];
}

const DIMENSIONS: {
  key: "qmLevel" | "nelcLevel" | "contentLevel" | "accessibilityLevel";
  labelAr: string;
}[] = [
  { key: "qmLevel", labelAr: "Quality Matters" },
  { key: "nelcLevel", labelAr: "NELC" },
  { key: "contentLevel", labelAr: "جودة المحتوى" },
  { key: "accessibilityLevel", labelAr: "إتاحة الوصول" },
];

// WHY: renders the AI analysis output. The suggested verdict is clearly marked
// as advisory (governance rule #1) — the binding verdict is set only at human
// sign-off, in a later step.
export function AnalysisResults({ review, findings }: AnalysisResultsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">نتيجة التحليل الأولية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div>
              <p className="text-sm text-muted-foreground">الجاهزية الإجمالية</p>
              <p className="text-3xl font-bold">
                {review.overallReadiness ?? "—"}
                <span className="text-lg text-muted-foreground"> / 100</span>
              </p>
            </div>
            {review.safetyStatus ? (
              <div>
                <p className="text-sm text-muted-foreground">
                  السلامة الثقافية والدينية
                </p>
                <Badge variant={SAFETY_STATUS_VARIANTS[review.safetyStatus]}>
                  {SAFETY_STATUS_LABELS_AR[review.safetyStatus]}
                </Badge>
              </div>
            ) : null}
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

          {review.suggestedVerdict ? (
            <div className="rounded-lg border border-dashed p-4">
              <p className="text-sm text-muted-foreground">
                الحكم المقترح (اقتراح آلي — غير مُلزم حتى اعتماد المراجع)
              </p>
              <p className="mt-1 font-semibold">
                {VERDICT_LABELS_AR[review.suggestedVerdict]}
              </p>
              {review.verdictRationaleAr ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {review.verdictRationaleAr}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">
          الملاحظات{" "}
          <span className="text-muted-foreground">({findings.length})</span>
        </h2>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لم يتم رصد ملاحظات.
          </p>
        ) : (
          SEVERITY_ORDER.map((severity) => {
            const group = findings.filter((f) => f.severity === severity);
            if (group.length === 0) {
              return null;
            }
            return (
              <div key={severity} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={SEVERITY_VARIANTS[severity]}>
                    {SEVERITY_LABELS_AR[severity]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({group.length})
                  </span>
                </div>
                <ul className="space-y-2">
                  {group.map((finding) => (
                    <li key={finding.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{FRAMEWORK_LABELS_AR[finding.framework]}</span>
                        {finding.criterionRef ? (
                          <span dir="ltr">· {finding.criterionRef}</span>
                        ) : null}
                        {finding.location ? (
                          <span dir="ltr">· {finding.location}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm">{finding.descriptionAr}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        التوصية: {finding.recommendationAr}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
