"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { VERDICT_LABELS_AR } from "@/lib/review-display";

import type { VerdictCount } from "@/actions/dashboard";

const COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(173, 58%, 39%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 84%, 60%)",
  "hsl(220, 14%, 60%)",
];

interface VerdictChartProps {
  data: VerdictCount[];
}

export function VerdictChart({ data }: VerdictChartProps) {
  const chartData = data.map((d) => ({
    name: VERDICT_LABELS_AR[d.verdict],
    value: d.count,
    verdict: d.verdict,
  }));

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد بيانات بعد.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) =>
            `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={entry.verdict}
              fill={COLORS[index % COLORS.length]}
              aria-label={`${entry.name}: ${entry.value}`}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value} مراجعة`, name]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
