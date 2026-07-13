import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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
    include: { examinedFiles: { orderBy: { fileName: "asc" } } },
  });

  if (!review) {
    notFound();
  }

  const hasInventory = review.examinedFiles.length > 0;
  const canExtract =
    review.status === "UPLOADED" || review.status === "EXTRACTED";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

          {!hasInventory ? (
            <div className="flex flex-col items-start gap-3">
              <p>
                تم رفع الحزمة بنجاح. ابدأ باستخراج محتواها لعرض قائمة الملفات
                القابلة للفحص.
              </p>
              {canExtract ? <ExtractButton reviewId={review.id} /> : null}
            </div>
          ) : (
            canExtract && (
              <div>
                <ExtractButton
                  reviewId={review.id}
                  label="إعادة الاستخراج"
                  variant="outline"
                />
              </div>
            )
          )}
        </CardContent>
      </Card>

      {hasInventory ? <FileInventory files={review.examinedFiles} /> : null}
    </div>
  );
}
