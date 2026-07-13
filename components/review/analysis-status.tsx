"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// WHY: while the review is ANALYZING, poll the server (router.refresh) every few
// seconds so the reviewer sees the results the moment the async run finishes —
// visible progress without blocking the request.
export function AnalysisStatus() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4 text-sm"
    >
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <div>
        <p className="font-medium">جارٍ تحليل المقرر…</p>
        <p className="text-muted-foreground">
          يتم فحص المحتوى مقابل معايير الجودة. ستظهر النتائج تلقائياً عند الاكتمال.
        </p>
      </div>
    </div>
  );
}
