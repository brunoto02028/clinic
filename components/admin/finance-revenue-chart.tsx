"use client";

// 12-month income/expense trend for the Finance Dashboard (activity 073) —
// replaces the "% of max in this period" progress bars, which never showed
// a trend, only a single period's category breakdown (that view stays,
// this is additive). Same recharts pattern already established in
// components/body-assessment/assessment-progress-chart.tsx (the only
// other time-series chart in the project), not the component itself —
// different dataset (monthly totals, not per-assessment scores).

import {
  ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export interface MonthlyTrendPoint {
  month: string; // "2026-09"
  income: number;
  expense: number;
}

function monthLabel(key: string, isPt: boolean): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(isPt ? "pt-BR" : "en-GB", { month: "short", year: "2-digit" });
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold" style={{ color: entry.color }}>£{Number(entry.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export default function FinanceRevenueChart({ data, isPt }: { data: MonthlyTrendPoint[]; isPt?: boolean }) {
  const hasAnyData = data.some((d) => d.income > 0 || d.expense > 0);
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month, !!isPt) }));

  if (!hasAnyData) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        {isPt ? "Sem receita ou despesa registrada nos últimos 12 meses ainda." : "No income or expenses recorded in the last 12 months yet."}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `£${v}`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Bar dataKey="income" name={isPt ? "Receita" : "Income"} fill="#4F7361" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name={isPt ? "Despesa" : "Expense"} fill="#C0554A" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
