import { AnalysisSummary } from "@/components/review/analysis-summary";
import { DecisionControls } from "@/components/review/decision-controls";
import { FindingItem } from "@/components/review/finding-item";
import { Badge } from "@/components/ui/badge";

import {
  SEVERITY_LABELS_AR,
  SEVERITY_ORDER,
  SEVERITY_VARIANTS,
} from "@/lib/review-display";

import type { Finding, Review } from "@prisma/client";

// WHY: the full findings-review screen (Step 8). Dimension levels are read-only;
// the reviewer edits/excludes findings and adjusts the verdict + safety status.
// `locked` disables all controls once the review is signed off.
export function FindingsReview({
  review,
  findings,
  locked,
}: {
  review: Review;
  findings: Finding[];
  locked: boolean;
}) {
  return (
    <div className="space-y-6">
      <AnalysisSummary review={review} />
      <DecisionControls review={review} locked={locked} />

      <div className="space-y-3">
        <h2 className="text-base font-semibold">
          الملاحظات{" "}
          <span className="text-muted-foreground">({findings.length})</span>
        </h2>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم يتم رصد ملاحظات.</p>
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
                    <FindingItem
                      key={finding.id}
                      finding={finding}
                      locked={locked}
                    />
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
