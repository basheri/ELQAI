"use client";

import { useState, useRef } from "react";
import { createReview } from "@/actions/reviews";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default function NewReviewPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    try {
      const file = fileRef.current?.files?.[0];
      if (!file) {
        setError("يجب رفع ملف تصدير المقرر (.zip)");
        setLoading(false);
        return;
      }

      // WHY: the file goes through /api/upload (route handler) because Server
      // Actions cannot reliably carry large multipart bodies
      const uploadData = new FormData();
      uploadData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.storagePath) {
        setError(json?.error ?? "فشل رفع الملف. حاول مرة أخرى.");
        setLoading(false);
        return;
      }

      // WHY: strip the file from the action payload — it is already stored
      formData.delete("file");
      formData.set("storagePath", json.storagePath);

      const result = await createReview(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError("حدث خطأ غير متوقع أثناء الرفع. حاول مرة أخرى.");
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-6">
        <h2 className="text-2xl font-bold">مراجعة جديدة</h2>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="courseName" className="text-sm font-medium">
              اسم المقرر
            </label>
            <input
              id="courseName"
              name="courseName"
              type="text"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="courseCode" className="text-sm font-medium">
              رمز المقرر
            </label>
            <input
              id="courseCode"
              name="courseCode"
              type="text"
              required
              dir="ltr"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="CS101"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              ملف تصدير المقرر
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary"
            >
              <input
                ref={fileRef}
                name="file"
                type="file"
                accept=".zip"
                required
                className="hidden"
                onChange={(e) =>
                  setFileName(e.target.files?.[0]?.name ?? null)
                }
              />
              {fileName ? (
                <p className="text-sm font-medium">{fileName}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  اضغط لاختيار ملف .zip لتصدير Blackboard
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جارٍ الرفع..." : "رفع وبدء المراجعة"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
