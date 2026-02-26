"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Footprints,
  Timer,
  Ruler,
  Activity,
  ArrowUp,
  ArrowDown,
  Gauge,
  RotateCcw,
  TrendingUp,
  Info,
} from "lucide-react";

// ========== Types ==========

interface GaitMetricsData {
  groundContactTimeMs: number;
  timeOfFlightMs: number;
  strideLengthCm: number;
  cadenceSpm: number;
  verticalOscillationCm: number;
  footStrikeAngle: number;
  pronationAngle: number;
  overstridePercent?: number;
  notes?: string;
}

interface GaitMetricsProps {
  metrics: GaitMetricsData;
  compact?: boolean;
}

// ========== Reference Ranges ==========

interface RefRange {
  label: string;
  unit: string;
  icon: any;
  color: string;
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
  description: string;
  lowerBetter?: boolean;
}

const METRIC_REFS: Record<string, RefRange> = {
  groundContactTimeMs: {
    label: "Ground Contact",
    unit: "ms",
    icon: Timer,
    color: "#06B6D4",
    min: 150,
    max: 400,
    idealMin: 200,
    idealMax: 280,
    description: "Time foot is in contact with ground per stride",
  },
  timeOfFlightMs: {
    label: "Flight Time",
    unit: "ms",
    icon: ArrowUp,
    color: "#8B5CF6",
    min: 50,
    max: 250,
    idealMin: 80,
    idealMax: 180,
    description: "Time both feet are off the ground",
  },
  strideLengthCm: {
    label: "Stride Length",
    unit: "cm",
    icon: Ruler,
    color: "#F59E0B",
    min: 80,
    max: 200,
    idealMin: 120,
    idealMax: 170,
    description: "Distance covered in one full stride cycle",
  },
  cadenceSpm: {
    label: "Cadence",
    unit: "spm",
    icon: Activity,
    color: "#10B981",
    min: 140,
    max: 200,
    idealMin: 170,
    idealMax: 185,
    description: "Steps per minute — optimal range reduces injury risk",
  },
  verticalOscillationCm: {
    label: "Vertical Oscillation",
    unit: "cm",
    icon: TrendingUp,
    color: "#EC4899",
    min: 2,
    max: 14,
    idealMin: 4,
    idealMax: 8,
    description: "Vertical bounce per stride — less is more efficient",
    lowerBetter: true,
  },
  footStrikeAngle: {
    label: "Foot Strike Angle",
    unit: "°",
    icon: Footprints,
    color: "#3B82F6",
    min: -15,
    max: 25,
    idealMin: -5,
    idealMax: 10,
    description: "Angle of foot at initial ground contact",
  },
  pronationAngle: {
    label: "Pronation",
    unit: "°",
    icon: RotateCcw,
    color: "#F97316",
    min: -5,
    max: 20,
    idealMin: 2,
    idealMax: 8,
    description: "Inward roll of the foot — excessive increases injury risk",
  },
  overstridePercent: {
    label: "Overstride",
    unit: "%",
    icon: ArrowDown,
    color: "#EF4444",
    min: 0,
    max: 30,
    idealMin: 0,
    idealMax: 8,
    description: "Foot landing ahead of center of mass — should be minimal",
    lowerBetter: true,
  },
};

function getStatus(value: number, ref: RefRange): "optimal" | "acceptable" | "concern" {
  if (value >= ref.idealMin && value <= ref.idealMax) return "optimal";
  if (value >= ref.min && value <= ref.max) return "acceptable";
  return "concern";
}

function getStatusColor(status: string): string {
  switch (status) {
    case "optimal": return "#22C55E";
    case "acceptable": return "#EAB308";
    case "concern": return "#EF4444";
    default: return "#64748B";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "optimal": return "Optimal";
    case "acceptable": return "Acceptable";
    case "concern": return "Needs Attention";
    default: return "Unknown";
  }
}

// ========== Gauge Component ==========

function MetricGauge({ value, refRange }: { value: number; refRange: RefRange }) {
  const status = getStatus(value, refRange);
  const statusColor = getStatusColor(status);
  const range = refRange.max - refRange.min;
  const normalizedValue = Math.max(0, Math.min(1, (value - refRange.min) / range));
  const normalizedIdealMin = (refRange.idealMin - refRange.min) / range;
  const normalizedIdealMax = (refRange.idealMax - refRange.min) / range;

  return (
    <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
      {/* Ideal zone */}
      <div
        className="absolute h-full rounded-full opacity-30"
        style={{
          left: `${normalizedIdealMin * 100}%`,
          width: `${(normalizedIdealMax - normalizedIdealMin) * 100}%`,
          background: "#22C55E",
        }}
      />
      {/* Value marker */}
      <div
        className="absolute top-0 h-full w-1.5 rounded-full transition-all duration-500"
        style={{
          left: `${Math.max(0, Math.min(98, normalizedValue * 100))}%`,
          background: statusColor,
          boxShadow: `0 0 6px ${statusColor}60`,
        }}
      />
    </div>
  );
}

// ========== Metric Card ==========

function MetricCard({
  metricKey,
  value,
}: {
  metricKey: string;
  value: number;
}) {
  const ref = METRIC_REFS[metricKey];
  if (!ref) return null;

  const Icon = ref.icon;
  const status = getStatus(value, ref);
  const statusColor = getStatusColor(status);

  return (
    <div className="rounded-xl bg-muted/30 border p-3.5 hover:border-foreground/20 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${ref.color}15`, border: `1px solid ${ref.color}30` }}
          >
            <Icon className="w-4 h-4" style={{ color: ref.color }} />
          </div>
          <div>
            <p className="text-xs font-medium">{ref.label}</p>
            <p className="text-[9px] text-muted-foreground/70">{ref.description}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0"
          style={{ borderColor: statusColor, color: statusColor }}
        >
          {getStatusLabel(status)}
        </Badge>
      </div>

      <div className="flex items-end gap-1.5 mb-2">
        <span className="text-2xl font-bold" style={{ color: ref.color }}>
          {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        </span>
        <span className="text-xs text-muted-foreground mb-1">{ref.unit}</span>
      </div>

      <MetricGauge value={value} refRange={ref} />

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[9px] text-muted-foreground/60">{ref.min}{ref.unit}</span>
        <span className="text-[9px] text-emerald-400/50">
          ideal: {ref.idealMin}–{ref.idealMax}{ref.unit}
        </span>
        <span className="text-[9px] text-muted-foreground/60">{ref.max}{ref.unit}</span>
      </div>
    </div>
  );
}

// ========== Main Component ==========

export function GaitMetrics({ metrics, compact = false }: GaitMetricsProps) {
  const metricKeys = Object.entries(metrics).filter(
    ([key, val]) => key !== "notes" && typeof val === "number" && val !== 0 && METRIC_REFS[key]
  );

  const optimalCount = metricKeys.filter(([key, val]) => {
    const ref = METRIC_REFS[key];
    return ref && getStatus(val as number, ref) === "optimal";
  }).length;

  if (metricKeys.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            Gait & Running Metrics
          </CardTitle>
          <Badge variant="outline" className="text-[10px] px-2 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            {optimalCount}/{metricKeys.length} optimal
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"}`}>
          {metricKeys.map(([key, val]) => (
            <MetricCard key={key} metricKey={key} value={val as number} />
          ))}
        </div>

        {metrics.notes && (
          <div className="mt-3 rounded-lg bg-muted/50 border p-2.5 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{metrics.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GaitMetrics;
