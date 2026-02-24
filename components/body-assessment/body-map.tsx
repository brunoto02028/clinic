"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";

const Mannequin3D = dynamic(
  () => import("@/components/body-assessment/mannequin-3d"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl animate-pulse"
        style={{ width: 400, height: 550 }}
      >
        <div className="text-sm text-muted-foreground">Loading 3D model...</div>
      </div>
    ),
  }
);

interface MotorPoint {
  id: string;
  name: string;
  bodyRegion: string;
  x: number;
  y: number;
  status: "normal" | "hypertonic" | "hypotonic" | "trigger_point";
  severity: number;
  notes?: string;
}

interface BodyMapProps {
  motorPoints?: MotorPoint[];
  view?: "front" | "back";
  width?: number;
  height?: number;
  interactive?: boolean;
  onPointClick?: (point: MotorPoint) => void;
  alignmentData?: any;
  showLabels?: boolean;
  gender?: "male" | "female";
}

const STATUS_COLORS: Record<string, string> = {
  normal: "#22C55E",
  hypertonic: "#EF4444",
  hypotonic: "#3B82F6",
  trigger_point: "#F59E0B",
};

const STATUS_LABELS: Record<string, string> = {
  normal: "Normal",
  hypertonic: "Hypertonic",
  hypotonic: "Hypotonic",
  trigger_point: "Trigger Point",
};

export function BodyMap({
  motorPoints = [],
  view = "front",
  width = 400,
  height = 550,
  interactive = true,
  onPointClick,
  alignmentData,
  showLabels = false,
  gender = "male",
}: BodyMapProps) {
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  const handlePointClick = (point: MotorPoint) => {
    setSelectedPoint(point.id === selectedPoint ? null : point.id);
    onPointClick?.(point);
  };

  return (
    <div className="relative inline-block">
      <Mannequin3D
        motorPoints={motorPoints}
        onPointClick={handlePointClick}
        interactive={interactive}
        width={width}
        height={height}
        gender={gender}
      />

      {/* Selected point info panel */}
      {selectedPoint && motorPoints.find((p) => p.id === selectedPoint) && (
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg max-w-[200px] z-10">
          {(() => {
            const point = motorPoints.find((p) => p.id === selectedPoint)!;
            const color = STATUS_COLORS[point.status] || "#94A3B8";
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{point.name}</p>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs">{STATUS_LABELS[point.status]}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Region: {point.bodyRegion}
                </p>
                <p className="text-xs text-muted-foreground">
                  Severity: {point.severity}/10
                </p>
                {point.notes && (
                  <p className="text-xs italic text-muted-foreground">
                    {point.notes}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Status legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: STATUS_COLORS[key] }}
            />
            <span className="text-[11px] text-muted-foreground font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Score display component
export function AssessmentScores({
  postureScore,
  symmetryScore,
  mobilityScore,
  overallScore,
}: {
  postureScore?: number | null;
  symmetryScore?: number | null;
  mobilityScore?: number | null;
  overallScore?: number | null;
}) {
  const scores = [
    { label: "Posture", value: postureScore, color: "bg-blue-500" },
    { label: "Symmetry", value: symmetryScore, color: "bg-purple-500" },
    { label: "Mobility", value: mobilityScore, color: "bg-green-500" },
    { label: "Overall", value: overallScore, color: "bg-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {scores.map((score) => (
        <Card key={score.label}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{score.label}</p>
            <div className="relative inline-flex items-center justify-center">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="5"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  fill="none"
                  stroke={
                    (score.value || 0) >= 80
                      ? "#22C55E"
                      : (score.value || 0) >= 60
                      ? "#F59E0B"
                      : "#EF4444"
                  }
                  strokeWidth="5"
                  strokeDasharray={`${
                    ((score.value || 0) / 100) * 157
                  } 157`}
                  strokeLinecap="round"
                  transform="rotate(-90, 30, 30)"
                />
                <text
                  x="30"
                  y="34"
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                  fill="currentColor"
                >
                  {score.value != null ? Math.round(score.value) : "—"}
                </text>
              </svg>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
