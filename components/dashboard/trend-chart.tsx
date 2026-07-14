"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/actions/dashboard";

const LINE_REVIEWS = "hsl(220, 70%, 50%)";
const LINE_READINESS = "hsl(142, 71%, 45%)";

interface TrendChartProps {
  data: TrendPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد بيانات بعد.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          yAxisId="readiness"
          orientation="left"
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          hide
        />
        <Tooltip
          labelFormatter={(label) => `شهر: ${String(label)}`}
          formatter={(value, name) => {
            if (name === "عدد المراجعات") return [`${value}`, name];
            return [`${value}%`, name];
          }}
        />
        <Legend />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="count"
          stroke={LINE_REVIEWS}
          strokeWidth={2}
          name="عدد المراجعات"
          dot={{ r: 4 }}
        />
        <Line
          yAxisId="readiness"
          type="monotone"
          dataKey="avgReadiness"
          stroke={LINE_READINESS}
          strokeWidth={2}
          name="متوسط الجاهزية %"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
