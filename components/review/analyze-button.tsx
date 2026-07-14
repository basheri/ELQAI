"use client";

import { useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { analyzeReview } from "@/actions/analysis";

interface AnalyzeButtonProps {
  reviewId: string;
  label?: string;
  variant?: "default" | "outline";
}

// WHY: starts the async analysis. The action returns immediately after setting
// status ANALYZING; the AnalysisStatus watcher then polls until ANALYZED.
export function AnalyzeButton({
  reviewId,
  label = "بدء التحليل بالذكاء الاصطناعي",
  variant = "default",
}: AnalyzeButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await analyzeReview(reviewId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("بدأ التحليل، سيتم تحديث الصفحة عند اكتماله.");
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending} variant={variant}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          جارٍ البدء…
        </>
      ) : (
        <>
          <Sparkles className="size-4" />
          {label}
        </>
      )}
    </Button>
  );
}
