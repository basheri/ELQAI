"use client";

import { useTransition } from "react";
import { FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { signOffReview } from "@/actions/reviews";
import { formatDateAr, VERDICT_LABELS_AR } from "@/lib/review-display";

import type { Review } from "@prisma/client";

export function SignOffControls({ review }: { review: Review }) {
  const [pending, startTransition] = useTransition();

  const isSignedOff = review.signedOffAt !== null;
  const canSignOff =
    !isSignedOff &&
    review.status === "ANALYZED" &&
    review.verdict !== null &&
    review.safetyStatus !== null;

  function handleSignOff() {
    startTransition(async () => {
      const result = await signOffReview(review.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم اعتماد المراجعة بنجاح.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">الاعتماد والتصدير</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSignedOff ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-5 text-green-600" />
            <span>
              تم الاعتماد بتاريخ {formatDateAr(review.signedOffAt!)}
              {review.verdict
                ? ` — ${VERDICT_LABELS_AR[review.verdict]}`
                : ""}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {!canSignOff ? (
              <p className="text-sm text-muted-foreground">
                {review.status !== "ANALYZED"
                  ? "يجب إكمال التحليل أولاً."
                  : "يجب تحديد الحكم النهائي وحالة السلامة قبل الاعتماد."}
              </p>
            ) : null}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!canSignOff || pending}>
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      جارٍ الاعتماد…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      اعتماد المراجعة
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد الاعتماد</AlertDialogTitle>
                  <AlertDialogDescription>
                    بعد الاعتماد لن يمكن تعديل الملاحظات أو الحكم النهائي.
                    هل تريد المتابعة؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOff}>
                    اعتماد
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!isSignedOff}>
            <FileText className="size-4" />
            تصدير PDF
          </Button>
          <Button variant="outline" disabled={!isSignedOff}>
            <FileText className="size-4" />
            تصدير Word
          </Button>
        </div>
        {!isSignedOff ? (
          <p className="text-xs text-muted-foreground">
            التصدير متاح بعد اعتماد المراجعة فقط.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
