import { redirect } from "next/navigation";

import { FailingStandardsTable } from "@/components/dashboard/failing-standards-table";
import { ReadinessChart } from "@/components/dashboard/readiness-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { VerdictChart } from "@/components/dashboard/verdict-chart";

import { getDashboardData } from "@/actions/dashboard";
import { getCurrentUser } from "@/lib/current-user";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN" && user.role !== "LEADERSHIP") {
    redirect("/");
  }

  const result = await getDashboardData();

  if (result.error || !result.data) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-destructive">
          {result.error ?? "حدث خطأ غير متوقع."}
        </p>
      </div>
    );
  }

  const { totalReviews, verdictCounts, readinessBuckets, failingStandards, trend } =
    result.data;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">لوحة المؤشرات</h1>
        <p className="text-sm text-muted-foreground">
          نظرة شاملة على جودة المقررات الإلكترونية لجهتك.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">إجمالي المراجعات المكتملة</p>
        <p className="text-4xl font-bold tabular-nums">{totalReviews}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">توزيع الأحكام</h2>
          <VerdictChart data={verdictCounts} />
        </section>

        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">توزيع الجاهزية</h2>
          <ReadinessChart data={readinessBuckets} />
        </section>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">أكثر المعايير تكرارًا في الملاحظات</h2>
        <FailingStandardsTable data={failingStandards} />
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">الاتجاه الزمني</h2>
        <TrendChart data={trend} />
      </section>
    </div>
  );
}
