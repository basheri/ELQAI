import Link from "next/link";

import { NewReviewForm } from "@/components/review/new-review-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewReviewPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/"
        className="inline-block text-sm text-muted-foreground hover:underline"
      >
        العودة إلى المراجعات
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>مراجعة جديدة</CardTitle>
          <CardDescription>
            أدخل بيانات المقرر وارفع حزمة التصدير من بلاكبورد لبدء المراجعة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewReviewForm />
        </CardContent>
      </Card>
    </div>
  );
}
