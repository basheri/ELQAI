import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AnalysisResults } from "@/components/review/analysis-results";
import { AnalysisStatus } from "@/components/review/analysis-status";
import { AnalyzeButton } from "@/components/review/analyze-button";
import { CreatedToast } from "@/components/review/created-toast";
import { ExtractButton } from "@/components/review/extract-button";
import { FileInventory } from "@/components/review/file-inventory";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  formatDateAr,
  REVIEW_STATUS_LABELS_AR,
  REVIEW_STATUS_VARIANTS,
} from "@/lib/review-display";

interface ReviewDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

export default async function ReviewDetailPage({
  params,
  searchParams,
}: ReviewDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { created } = await searchParams;

  // WHY: scope by orgId so a reviewer can only open their own org's reviews.
  const review = await db.review.findFirst({
    where: { id, orgId: user.orgId },
    include: {
      examinedFiles: { orderBy: { fileName: "asc" } },
      findings: true,
    },
  });

  if (!review) {
    notFound();
  }

  const hasInventory = review.examinedFiles.length > 0;
  const hasExaminable = review.examinedFiles.some((f) => f.examinable);
  const canExtract =
    review.status === "UPLOADED" || review.status === "EXTRACTED";
  const canAnalyze =
    hasExaminable &&
    (review.status === "EXTRACTED" ||
      review.status === "ANALYZED" ||
      review.status === "FAILED");
  const isAnalyzing = review.status === "ANALYZING";
  const isAnalyzed =
    review.status === "ANALYZED" ||
    review.status === "SIGNED_OFF" ||
    review.status === "EXPORTED";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {created === "1" ? <CreatedToast /> : null}

      <Link
        href="/"
        className="inline-block text-sm text-muted-foreground hover:underline"
      >
        العودة إلى المراجعات
      </Link>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-2xl">{review.courseName}</CardTitle>
            <Badge variant={REVIEW_STATUS_VARIANTS[review.status]}>
              {REVIEW_STATUS_LABELS_AR[review.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <span dir="ltr">{review.courseCode}</span>
            {" · "}
            {formatDateAr(review.createdAt)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            الملف المصدر: <span dir="ltr">{review.sourceFileName}</span>
          </p>

          {review.status === "FAILED" ? (
            <p className="text-destructive">
              تعذّر إكمال العملية. يمكنك إعادة المحاولة أدناه.
            </p>
          ) : null}

          {!hasInventory ? (
            <div className="flex flex-col items-start gap-3">
              <p>
                تم رفع الحزمة بنجاح. ابدأ باستخراج محتواها لعرض قائمة الملفات
                القابلة للفحص.
              </p>
              {canExtract ? <ExtractButton reviewId={review.id} /> : null}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {canExtract ? (
                <ExtractButton
                  reviewId={review.id}
                  label="إعادة الاستخراج"
                  variant="outline"
                />
              ) : null}
              {canAnalyze ? (
                <AnalyzeButton
                  reviewId={review.id}
                  label={isAnalyzed ? "إعادة التحليل" : undefined}
                  variant={isAnalyzed ? "outline" : "default"}
                />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {isAnalyzing ? <AnalysisStatus /> : null}

      {isAnalyzed ? (
        <AnalysisResults review={review} findings={review.findings} />
      ) : null}

      {hasInventory ? <FileInventory files={review.examinedFiles} /> : null}
    </div>
  );
}
