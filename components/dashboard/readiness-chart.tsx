"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ReadinessBucket } from "@/actions/dashboard";

const BAR_COLOR = "hsl(173, 58%, 39%)";

interface ReadinessChartProps {
  data: ReadinessBucket[];
}

export function ReadinessChart({ data }: ReadinessChartProps) {
  if (data.every((b) => b.count === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد بيانات بعد.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => [`${value} مراجعة`, "العدد"]}
          labelFormatter={(label) => `نسبة الجاهزية: ${String(label)}%`}
        />
        <Bar
          dataKey="count"
          fill={BAR_COLOR}
          radius={[4, 4, 0, 0]}
          name="عدد المراجعات"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
