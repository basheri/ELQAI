"use client";

import type { DashboardStats } from "@/actions/dashboard";
import { VERDICT_LABELS, SEVERITY_LABELS } from "@/types";

interface Props {
  stats: DashboardStats;
}

export function DashboardView({ stats }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">لوحة مؤشرات الجودة</h2>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي المراجعات" value={String(stats.totalReviews)} />
        <StatCard
          label="متوسط الجاهزية"
          value={`${stats.averageReadiness}%`}
        />
        <StatCard
          label="ملاحظات حرجة"
          value={String(stats.severityCounts.CRITICAL ?? 0)}
          variant={stats.severityCounts.CRITICAL > 0 ? "danger" : "default"}
        />
        <StatCard
          label="ملاحظات عالية"
          value={String(stats.severityCounts.HIGH ?? 0)}
        />
      </div>

      {/* Verdict distribution */}
      <div className="rounded-lg border p-6">
        <h3 className="mb-4 font-semibold">توزيع الأحكام</h3>
        <div className="space-y-3">
          {Object.entries(VERDICT_LABELS).map(([key, label]) => {
            const count = stats.verdictDistribution[key] ?? 0;
            const pct =
              stats.totalReviews > 0
                ? Math.round((count / stats.totalReviews) * 100)
                : 0;
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="text-muted-foreground">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Severity distribution */}
      <div className="rounded-lg border p-6">
        <h3 className="mb-4 font-semibold">توزيع الملاحظات حسب الشدة</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-lg bg-secondary p-4">
              <p className="text-2xl font-bold">
                {stats.severityCounts[key] ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top failing criteria */}
      {stats.topFailingCriteria.length > 0 && (
        <div className="rounded-lg border p-6">
          <h3 className="mb-4 font-semibold">
            أكثر المعايير تكراراً في الملاحظات
          </h3>
          <div className="space-y-2">
            {stats.topFailingCriteria.map((item) => (
              <div
                key={item.criterionRef}
                className="flex items-center justify-between rounded-lg bg-secondary p-3"
              >
                <span className="text-sm font-medium" dir="ltr">
                  {item.criterionRef}
                </span>
                <span className="rounded-full bg-background px-3 py-1 text-sm">
                  {item.count} ملاحظة
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly trend */}
      {stats.monthlyTrend.length > 0 && (
        <div className="rounded-lg border p-6">
          <h3 className="mb-4 font-semibold">الاتجاه الشهري</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-right font-medium">الشهر</th>
                  <th className="p-2 text-right font-medium">عدد المراجعات</th>
                  <th className="p-2 text-right font-medium">
                    متوسط الجاهزية
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.monthlyTrend.map((item) => (
                  <tr key={item.month} className="border-b">
                    <td className="p-2">{item.month}</td>
                    <td className="p-2">{item.count}</td>
                    <td className="p-2">{item.avgReadiness}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "danger";
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${variant === "danger" ? "text-destructive" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
