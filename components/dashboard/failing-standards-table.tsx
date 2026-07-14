"use client";

import { Badge } from "@/components/ui/badge";
import { FRAMEWORK_LABELS_AR } from "@/lib/review-display";

import type { FailingStandard } from "@/actions/dashboard";

interface FailingStandardsTableProps {
  data: FailingStandard[];
}

export function FailingStandardsTable({ data }: FailingStandardsTableProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد بيانات بعد.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-2 text-start font-medium">#</th>
            <th className="pb-2 text-start font-medium">المعيار</th>
            <th className="pb-2 text-start font-medium">الإطار</th>
            <th className="pb-2 text-start font-medium">عدد الملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s, i) => (
            <tr key={s.criterionRef} className="border-b last:border-b-0">
              <td className="py-2 tabular-nums">{i + 1}</td>
              <td className="py-2">
                <span className="font-medium">{s.titleAr}</span>
                <span className="mr-2 text-xs text-muted-foreground" dir="ltr">
                  ({s.criterionRef})
                </span>
              </td>
              <td className="py-2">
                <Badge variant="outline">{FRAMEWORK_LABELS_AR[s.framework]}</Badge>
              </td>
              <td className="py-2 tabular-nums">{s.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
