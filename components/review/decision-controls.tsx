"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { updateReviewDecision } from "@/actions/reviews";
import {
  SAFETY_STATUS_LABELS_AR,
  VERDICT_LABELS_AR,
} from "@/lib/review-display";

import type { Review, SafetyStatus, Verdict } from "@prisma/client";

const VERDICT_OPTIONS = Object.keys(VERDICT_LABELS_AR) as Verdict[];
const SAFETY_OPTIONS = Object.keys(SAFETY_STATUS_LABELS_AR) as SafetyStatus[];

// WHY: the reviewer adjusts the proposed final verdict + safety status. Defaults
// to the human's saved value, falling back to the AI suggestion.
export function DecisionControls({
  review,
  locked,
}: {
  review: Review;
  locked: boolean;
}) {
  const [verdict, setVerdict] = useState<Verdict | undefined>(
    review.verdict ?? review.suggestedVerdict ?? undefined,
  );
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus | undefined>(
    review.safetyStatus ?? undefined,
  );
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!verdict || !safetyStatus) {
      toast.error("يرجى اختيار الحكم وحالة السلامة.");
      return;
    }
    startTransition(async () => {
      const result = await updateReviewDecision({
        reviewId: review.id,
        verdict,
        safetyStatus,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم حفظ الحكم وحالة السلامة.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">الحكم النهائي وحالة السلامة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {review.suggestedVerdict ? (
          <p className="text-sm text-muted-foreground">
            الاقتراح الآلي: {VERDICT_LABELS_AR[review.suggestedVerdict]}
            {review.verdictRationaleAr ? ` — ${review.verdictRationaleAr}` : ""}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="verdict">الحكم النهائي</Label>
            <Select
              value={verdict}
              onValueChange={(value) => setVerdict(value as Verdict)}
              disabled={locked}
            >
              <SelectTrigger id="verdict">
                <SelectValue placeholder="اختر الحكم" />
              </SelectTrigger>
              <SelectContent>
                {VERDICT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {VERDICT_LABELS_AR[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="safety">حالة السلامة الثقافية والدينية</Label>
            <Select
              value={safetyStatus}
              onValueChange={(value) => setSafetyStatus(value as SafetyStatus)}
              disabled={locked}
            >
              <SelectTrigger id="safety">
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                {SAFETY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {SAFETY_STATUS_LABELS_AR[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!locked ? (
          <Button onClick={handleSave} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جارٍ الحفظ…
              </>
            ) : (
              "حفظ الحكم"
            )}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
