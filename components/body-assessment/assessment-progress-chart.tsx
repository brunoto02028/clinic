"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

// ========== Types ==========

interface AssessmentSnapshot {
  id: string;
  assessmentNumber: string;
  createdAt: string;
  overallScore: number | null;
  postureScore: number | null;
  symmetryScore: number | null;
  mobilityScore: number | null;
  segmentScores?: any;
}

interface AssessmentProgressChartProps {
  assessments: AssessmentSnapshot[];
  locale?: string;
}

// ========== Helpers ==========

function getTrend(current: number, previous: number) {
  const delta = current - previous;
  if (delta > 2) return { icon: TrendingUp, color: "text-green-400", label: `+${delta}`, bg: "bg-green-500/10" };
  if (delta < -2) return { icon: TrendingDown, color: "text-red-400", label: `${delta}`, bg: "bg-red-500/10" };
  return { icon: Minus, color: "text-muted-foreground", label: "0", bg: "bg-muted/30" };
}

// ========== Custom Tooltip ==========

function ChartTooltip({ active, payload, label, isPt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold" style={{ color: entry.color }}>{entry.value != null ? Math.round(entry.value) : "—"}</span>
        </div>
      ))}
    </div>
  );
}

// ========== Main Component ==========

export function AssessmentProgressChart({ assessments, locale }: AssessmentProgressChartProps) {
  const isPt = locale === "pt-BR";

  const chartData = useMemo(() => {
    if (!assessments || assessments.length === 0) return [];

    return assessments
      .filter(a => a.overallScore != null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(a => ({
        date: new Date(a.createdAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short" }),
        number: a.assessmentNumber,
        [isPt ? "Geral" : "Overall"]: a.overallScore,
        [isPt ? "Postura" : "Posture"]: a.postureScore,
        [isPt ? "Simetria" : "Symmetry"]: a.symmetryScore,
        [isPt ? "Mobilidade" : "Mobility"]: a.mobilityScore,
      }));
  }, [assessments, isPt]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    const key = isPt ? "Geral" : "Overall";
    const latest = chartData[chartData.length - 1][key] as number;
    const previous = chartData[chartData.length - 2][key] as number;
    if (latest == null || previous == null) return null;
    const delta = Math.round(latest - previous);
    return { delta, latest: Math.round(latest), previous: Math.round(previous) };
  }, [chartData, isPt]);

  if (chartData.length < 2) return null;

  const overallKey = isPt ? "Geral" : "Overall";
  const postureKey = isPt ? "Postura" : "Posture";
  const symmetryKey = isPt ? "Simetria" : "Symmetry";
  const mobilityKey = isPt ? "Mobilidade" : "Mobility";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            {isPt ? "Evolução do Tratamento" : "Treatment Progress"}
          </CardTitle>
          {trend && (
            <div className="flex items-center gap-2">
              {trend.delta > 0 ? (
                <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{trend.delta} {isPt ? "pontos" : "points"}
                </Badge>
              ) : trend.delta < 0 ? (
                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {trend.delta} {isPt ? "pontos" : "points"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Minus className="h-3 w-3" />
                  {isPt ? "Estável" : "Stable"}
                </Badge>
              )}
            </div>
          )}
        </div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">
            {isPt
              ? `${chartData.length} avaliações · Score atual: ${trend.latest}/100`
              : `${chartData.length} assessments · Current score: ${trend.latest}/100`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradOverall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<ChartTooltip isPt={isPt} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey={overallKey}
                stroke="#8B5CF6"
                strokeWidth={2.5}
                fill="url(#gradOverall)"
                dot={{ r: 4, fill: "#8B5CF6", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line type="monotone" dataKey={postureKey} stroke="#F59E0B" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
              <Line type="monotone" dataKey={symmetryKey} stroke="#06B6D4" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
              <Line type="monotone" dataKey={mobilityKey} stroke="#22C55E" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Score comparison cards */}
        {trend && chartData.length >= 2 && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { key: overallKey, label: isPt ? "Geral" : "Overall", color: "#8B5CF6" },
              { key: postureKey, label: isPt ? "Postura" : "Posture", color: "#F59E0B" },
              { key: symmetryKey, label: isPt ? "Simetria" : "Symmetry", color: "#06B6D4" },
              { key: mobilityKey, label: isPt ? "Mobilidade" : "Mobility", color: "#22C55E" },
            ].map(({ key, label, color }) => {
              const latest = chartData[chartData.length - 1][key] as number;
              const first = chartData[0][key] as number;
              const delta = latest != null && first != null ? Math.round(latest - first) : null;
              return (
                <div key={key} className="rounded-lg border px-2.5 py-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold" style={{ color }}>{latest != null ? Math.round(latest) : "—"}</p>
                  {delta !== null && (
                    <p className={`text-[10px] font-medium ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {delta > 0 ? "+" : ""}{delta}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AssessmentProgressChart;
