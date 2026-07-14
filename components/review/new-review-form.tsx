"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createReview, type CreateReviewState } from "@/actions/reviews";

const initialState: CreateReviewState = {};

export function NewReviewForm() {
  const [state, formAction, pending] = useActionState(
    createReview,
    initialState,
  );

  // WHY: surface the failure as an error toast (CLAUDE.md UI rule). Success is
  // toasted on the detail page after redirect. Fires per submit because
  // useActionState returns a fresh state object each dispatch.
  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="courseName">اسم المقرر</Label>
        <Input
          id="courseName"
          name="courseName"
          placeholder="مثال: مقدمة في البرمجة"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseCode">رمز المقرر</Label>
        {/* WHY: course codes are Latin/numeric — force LTR for correct bidi. */}
        <Input
          id="courseCode"
          name="courseCode"
          dir="ltr"
          placeholder="CS101"
          maxLength={50}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">حزمة تصدير المقرر من بلاكبورد (‎.zip)</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          required
        />
        <p className="text-xs text-muted-foreground">
          الحد الأقصى للحجم ٢٠٠ ميغابايت.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              جارٍ رفع الملف…
            </>
          ) : (
            "إنشاء المراجعة"
          )}
        </Button>
        {pending ? (
          <span className="text-sm text-muted-foreground" role="status">
            يتم رفع الحزمة، قد يستغرق ذلك بعض الوقت.
          </span>
        ) : null}
      </div>
    </form>
  );
}
