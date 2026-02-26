"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Activity,
} from "lucide-react";

// ========== Types ==========

interface AssessmentSnapshot {
  id: string;
  date: string;
  overallScore: number;
  postureScore: number;
  symmetryScore: number;
  mobilityScore: number;
  segmentScores?: {
    head?: { score: number };
    shoulders?: { score: number };
    spine?: { score: number };
    hips?: { score: number };
    knees?: { score: number };
    ankles?: { score: number };
  };
}

interface ProgressTrackerProps {
  assessments: AssessmentSnapshot[];
  title?: string;
}

// ========== Helpers ==========

function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#EAB308";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ========== SVG Line Chart ==========

type MetricKey = "overall" | "posture" | "symmetry" | "mobility" | "head" | "shoulders" | "spine" | "hips" | "knees" | "ankles";

const METRIC_COLORS: Record<MetricKey, string> = {
  overall: "#06B6D4",
  posture: "#8B5CF6",
  symmetry: "#F59E0B",
  mobility: "#10B981",
  head: "#EC4899",
  shoulders: "#3B82F6",
  spine: "#F97316",
  hips: "#14B8A6",
  knees: "#A855F7",
  ankles: "#EF4444",
};

const METRIC_LABELS: Record<MetricKey, string> = {
  overall: "Overall",
  posture: "Posture",
  symmetry: "Symmetry",
  mobility: "Mobility",
  head: "Head",
  shoulders: "Shoulders",
  spine: "Spine",
  hips: "Hips",
  knees: "Knees",
  ankles: "Ankles",
};

function getMetricValue(a: AssessmentSnapshot, metric: MetricKey): number | null {
  switch (metric) {
    case "overall": return a.overallScore;
    case "posture": return a.postureScore;
    case "symmetry": return a.symmetryScore;
    case "mobility": return a.mobilityScore;
    case "head": return a.segmentScores?.head?.score ?? null;
    case "shoulders": return a.segmentScores?.shoulders?.score ?? null;
    case "spine": return a.segmentScores?.spine?.score ?? null;
    case "hips": return a.segmentScores?.hips?.score ?? null;
    case "knees": return a.segmentScores?.knees?.score ?? null;
    case "ankles": return a.segmentScores?.ankles?.score ?? null;
    default: return null;
  }
}

function LineChart({
  assessments,
  activeMetrics,
  hoveredIndex,
  onHover,
}: {
  assessments: AssessmentSnapshot[];
  activeMetrics: MetricKey[];
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}) {
  const W = 600;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 30, left: 35 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const n = assessments.length;
  if (n === 0) return null;

  const xStep = n > 1 ? chartW / (n - 1) : chartW / 2;

  const yGridLines = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Background */}
      <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="#0F172A" rx={4} />

      {/* Y grid */}
      {yGridLines.map((v) => {
        const y = PAD.top + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1E293B" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#64748B" fontSize={9}>
              {v}
            </text>
          </g>
        );
      })}

      {/* X labels */}
      {assessments.map((a, i) => {
        const x = n > 1 ? PAD.left + i * xStep : PAD.left + chartW / 2;
        return (
          <text key={i} x={x} y={H - 6} textAnchor="middle" fill="#64748B" fontSize={8}>
            {formatDate(a.date)}
          </text>
        );
      })}

      {/* Lines per metric */}
      {activeMetrics.map((metric) => {
        const color = METRIC_COLORS[metric];
        const points: { x: number; y: number; val: number }[] = [];

        assessments.forEach((a, i) => {
          const val = getMetricValue(a, metric);
          if (val !== null) {
            const x = n > 1 ? PAD.left + i * xStep : PAD.left + chartW / 2;
            const y = PAD.top + chartH - (val / 100) * chartH;
            points.push({ x, y, val });
          }
        });

        if (points.length < 2) {
          return points.map((p, i) => (
            <circle key={`${metric}-dot-${i}`} cx={p.x} cy={p.y} r={4} fill={color} />
          ));
        }

        const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

        // Gradient fill area
        const areaD = `${pathD} L${points[points.length - 1].x},${PAD.top + chartH} L${points[0].x},${PAD.top + chartH} Z`;

        return (
          <g key={metric}>
            {/* Area fill */}
            <defs>
              <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#grad-${metric})`} />
            {/* Line */}
            <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots */}
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke="#0F172A" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}

      {/* Hover columns */}
      {assessments.map((_, i) => {
        const x = n > 1 ? PAD.left + i * xStep : PAD.left + chartW / 2;
        return (
          <rect
            key={`hover-${i}`}
            x={x - xStep / 2}
            y={PAD.top}
            width={xStep}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            className="cursor-crosshair"
          />
        );
      })}

      {/* Hover line */}
      {hoveredIndex !== null && (
        <line
          x1={n > 1 ? PAD.left + hoveredIndex * xStep : PAD.left + chartW / 2}
          y1={PAD.top}
          x2={n > 1 ? PAD.left + hoveredIndex * xStep : PAD.left + chartW / 2}
          y2={PAD.top + chartH}
          stroke="#94A3B8"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      )}
    </svg>
  );
}

// ========== Score Delta Badge ==========

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  if (delta === 0) return <Minus className="w-3 h-3 text-white/30" />;

  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
      {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

// ========== Main Component ==========

export function ProgressTracker({ assessments, title }: ProgressTrackerProps) {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["overall"]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sort by date ascending
  const sorted = useMemo(
    () => [...assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [assessments]
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const toggleMetric = (m: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const allMetrics: MetricKey[] = ["overall", "posture", "symmetry", "mobility"];
  const segmentMetrics: MetricKey[] = ["head", "shoulders", "spine", "hips", "knees", "ankles"];
  const hasSegments = sorted.some((a) => a.segmentScores != null);

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No assessment history available yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Complete more assessments to track progress.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {title || "Progress Over Time"}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{sorted.length} assessments</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score summary cards */}
        {latest && (
          <div className="grid grid-cols-4 gap-2">
            {(["overallScore", "postureScore", "symmetryScore", "mobilityScore"] as const).map((key) => {
              const label = key.replace("Score", "");
              const val = latest[key];
              const prevVal = previous ? previous[key] : null;
              return (
                <div
                  key={key}
                  className="rounded-lg bg-muted/50 border p-2.5 text-center"
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide capitalize">{label}</p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: getScoreColor(val || 0) }}>
                    {val ?? "—"}
                  </p>
                  {prevVal != null && val != null && (
                    <div className="mt-0.5 flex justify-center">
                      <DeltaBadge current={val} previous={prevVal} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Metric toggles */}
        <div className="flex flex-wrap gap-1.5">
          {allMetrics.map((m) => (
            <button
              key={m}
              onClick={() => toggleMetric(m)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                activeMetrics.includes(m)
                  ? "border-foreground/30 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              style={activeMetrics.includes(m) ? { borderColor: METRIC_COLORS[m], color: METRIC_COLORS[m] } : {}}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ background: activeMetrics.includes(m) ? METRIC_COLORS[m] : "#94A3B8" }}
              />
              {METRIC_LABELS[m]}
            </button>
          ))}
          {hasSegments && (
            <>
              <span className="text-muted-foreground/30 mx-1">|</span>
              {segmentMetrics.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMetric(m)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                    activeMetrics.includes(m)
                      ? "border-foreground/30 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  style={activeMetrics.includes(m) ? { borderColor: METRIC_COLORS[m], color: METRIC_COLORS[m] } : {}}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ background: activeMetrics.includes(m) ? METRIC_COLORS[m] : "#94A3B8" }}
                  />
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Chart */}
        <div className="rounded-lg bg-muted/30 border p-2">
          <LineChart
            assessments={sorted}
            activeMetrics={activeMetrics}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
          />
        </div>

        {/* Hover tooltip */}
        {hoveredIndex !== null && sorted[hoveredIndex] && (
          <div className="rounded-lg bg-muted/50 border p-3">
            <p className="text-xs text-muted-foreground mb-1.5">{formatDateFull(sorted[hoveredIndex].date)}</p>
            <div className="flex flex-wrap gap-3">
              {activeMetrics.map((m) => {
                const val = getMetricValue(sorted[hoveredIndex], m);
                return (
                  <div key={m} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: METRIC_COLORS[m] }} />
                    <span className="text-xs text-muted-foreground">{METRIC_LABELS[m]}:</span>
                    <span className="text-xs font-bold" style={{ color: val ? getScoreColor(val) : "#64748B" }}>
                      {val ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProgressTracker;
