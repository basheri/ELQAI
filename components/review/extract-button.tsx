"use client";

import { useTransition } from "react";
import { FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { extractReview } from "@/actions/reviews";

interface ExtractButtonProps {
  reviewId: string;
  label?: string;
  variant?: "default" | "outline";
}

// WHY: triggers extraction and reports the outcome via toast. revalidatePath in
// the action refreshes the detail page with the resulting inventory.
export function ExtractButton({
  reviewId,
  label = "استخراج الملفات",
  variant = "default",
}: ExtractButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await extractReview(reviewId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`تم فحص الحزمة وإدراج ${result.total ?? 0} ملفاً.`);
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending} variant={variant}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          جارٍ الاستخراج…
        </>
      ) : (
        <>
          <FileSearch className="size-4" />
          {label}
        </>
      )}
    </Button>
  );
}
