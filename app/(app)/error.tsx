"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// WHY: user-facing error state for the authenticated routes (e.g. a failed DB
// read). Keeps the app usable with a retry instead of a blank crash.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // WHY: never log full content/bodies (governance rule #3); the message is
    // enough to diagnose without leaking course data.
    console.error("App route error:", error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">حدث خطأ غير متوقع</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          تعذّر تحميل هذه الصفحة. يرجى المحاولة مرة أخرى.
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        إعادة المحاولة
      </Button>
    </div>
  );
}
