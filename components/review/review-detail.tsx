"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { extractCourseContent } from "@/actions/extraction";
import { runAnalysis } from "@/actions/analysis";
import { signOffReview, updateReviewVerdict } from "@/actions/findings";
import { exportReport } from "@/actions/export";
import { FindingsPanel } from "@/components/review/findings-panel";
import type { Review, ExaminedFile, Finding, User, ReportExport } from "@/types";
import {
  VERDICT_LABELS,
  COMPLIANCE_LABELS,
  SAFETY_LABELS,
} from "@/types";

interface Props {
  review: Review & {
    examinedFiles: ExaminedFile[];
    findings: Finding[];
    exports: ReportExport[];
    reviewedBy: User | null;
  };
  userId: string;
}

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: "تم الرفع",
  EXTRACTED: "تم الاستخراج",
  ANALYZING: "جارٍ التحليل...",
  ANALYZED: "تم التحليل",
  SIGNED_OFF: "تم الاعتماد",
  EXPORTED: "تم التصدير",
  FAILED: "فشل",
};

export function ReviewDetail({ review, userId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedVerdict, setSuggestedVerdict] = useState<string | null>(null);
  const [selectedVerdict, setSelectedVerdict] = useState<string>(
    review.verdict ?? ""
  );

  const isLocked = !!review.signedOffAt;
  const examinable = review.examinedFiles.filter((f) => f.examinable);
  const notExaminable = review.examinedFiles.filter((f) => !f.examinable);

  async function handleExtract() {
    setLoading(true);
    setError(null);
    const result = await extractCourseContent(review.id);
    if (result.error) setError(result.error);
    setLoading(false);
    router.refresh();
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    const result = await runAnalysis(review.id);
    if (result?.error) {
      setError(result.error);
    } else if (result?.suggestedVerdict) {
      setSuggestedVerdict(result.suggestedVerdict);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleVerdictChange(verdict: string) {
    setSelectedVerdict(verdict);
    await updateReviewVerdict({
      reviewId: review.id,
      verdict: verdict as "READY" | "READY_LIMITED_FIXES" | "NEEDS_SUBSTANTIAL_REVISION" | "NOT_READY" | "INCOMPLETE_EVIDENCE",
    });
    router.refresh();
  }

  async function handleSignOff() {
    setLoading(true);
    setError(null);
    const result = await signOffReview(review.id);
    if (result.error) setError(result.error);
    setLoading(false);
    router.refresh();
  }

  async function handleExport(format: "pdf" | "docx") {
    setLoading(true);
    setError(null);
    const result = await exportReport(review.id, format);
    if (result.error) {
      setError(result.error);
    } else if (result.downloadUrl) {
      window.open(result.downloadUrl, "_blank");
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{review.courseName}</h2>
          <p className="text-sm text-muted-foreground" dir="ltr">
            {review.courseCode}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium">
          {STATUS_LABELS[review.status] ?? review.status}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 5: Extract */}
      {review.status === "UPLOADED" && (
        <div className="rounded-lg border p-6 text-center space-y-3">
          <p className="text-muted-foreground">
            الملف جاهز للاستخراج. اضغط لبدء تحليل محتوى المقرر.
          </p>
          <Button onClick={handleExtract} disabled={loading}>
            {loading ? "جارٍ الاستخراج..." : "استخراج المحتوى"}
          </Button>
        </div>
      )}

      {/* File inventory */}
      {review.examinedFiles.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">
              الملفات التي أمكن فحصها ({examinable.length})
            </h3>
            <ul className="space-y-1 text-sm">
              {examinable.map((f) => (
                <li key={f.id} className="text-muted-foreground" dir="ltr">
                  {f.fileName}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">
              الملفات التي تعذّر فحصها ({notExaminable.length})
            </h3>
            <ul className="space-y-1 text-sm">
              {notExaminable.map((f) => (
                <li key={f.id}>
                  <span className="text-muted-foreground" dir="ltr">
                    {f.fileName}
                  </span>
                  {f.reason && (
                    <span className="mr-2 text-xs text-muted-foreground">
                      — {f.reason}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Step 7: Analyze */}
      {review.status === "EXTRACTED" && (
        <div className="rounded-lg border p-6 text-center space-y-3">
          <p className="text-muted-foreground">
            تم استخراج المحتوى. اضغط لبدء التحليل بالذكاء الاصطناعي.
          </p>
          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? "جارٍ التحليل..." : "بدء التحليل"}
          </Button>
        </div>
      )}

      {/* Compliance levels */}
      {(review.status === "ANALYZED" ||
        review.status === "SIGNED_OFF" ||
        review.status === "EXPORTED") && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "QM", value: review.qmLevel },
            { label: "NELC", value: review.nelcLevel },
            { label: "المحتوى", value: review.contentLevel },
            { label: "الوصول", value: review.accessibilityLevel },
            { label: "السلامة", value: review.safetyStatus, isSafety: true },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-semibold">
                {item.isSafety
                  ? SAFETY_LABELS[item.value ?? "CLEAR"]
                  : COMPLIANCE_LABELS[item.value ?? "NOT_ASSESSED"]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Readiness */}
      {review.overallReadiness !== null && (
        <div className="rounded-lg border p-4 text-center">
          <p className="text-sm text-muted-foreground">نسبة الجاهزية</p>
          <p className="text-3xl font-bold">{review.overallReadiness}%</p>
        </div>
      )}

      {/* Suggested verdict from AI */}
      {suggestedVerdict && !review.verdict && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm text-muted-foreground">
            الحكم المقترح من الذكاء الاصطناعي
          </p>
          <p className="mt-1 font-semibold">
            {VERDICT_LABELS[suggestedVerdict]}
          </p>
        </div>
      )}

      {/* Step 8: Findings review */}
      {review.findings.length > 0 && (
        <FindingsPanel
          findings={review.findings}
          locked={isLocked}
        />
      )}

      {/* Step 8+9: Verdict selection + Sign-off */}
      {review.status === "ANALYZED" && !isLocked && (
        <div className="space-y-4 rounded-lg border p-6">
          <h3 className="font-semibold">الحكم النهائي</h3>
          <select
            value={selectedVerdict}
            onChange={(e) => handleVerdictChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">اختر الحكم النهائي</option>
            {Object.entries(VERDICT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <Button
            onClick={handleSignOff}
            disabled={loading || !selectedVerdict}
            className="w-full"
          >
            {loading ? "جارٍ الاعتماد..." : "اعتماد المراجعة"}
          </Button>
        </div>
      )}

      {/* Sign-off info */}
      {isLocked && review.reviewedBy && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <p className="font-semibold">
            الحكم النهائي: {VERDICT_LABELS[review.verdict ?? ""]}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            اعتمد بواسطة {review.reviewedBy.name} في{" "}
            {new Date(review.signedOffAt!).toLocaleDateString("ar-SA")}
          </p>
        </div>
      )}

      {/* Step 10: Export */}
      {isLocked && (
        <div className="flex gap-3">
          <Button
            onClick={() => handleExport("pdf")}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "جارٍ التصدير..." : "تصدير PDF"}
          </Button>
          <Button
            onClick={() => handleExport("docx")}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            {loading ? "جارٍ التصدير..." : "تصدير Word"}
          </Button>
        </div>
      )}

      {/* Export is disabled before sign-off (governance rule #1) */}
      {!isLocked &&
        (review.status === "ANALYZED" || review.status === "EXPORTED") && (
          <p className="text-center text-sm text-muted-foreground">
            يجب اعتماد المراجعة قبل تصدير التقرير
          </p>
        )}
    </div>
  );
}
