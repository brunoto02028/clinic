"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const Mannequin3D = dynamic(
  () => import("@/components/body-assessment/mannequin-3d"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" style={{ width: 500, height: 650 }}>
        <p className="text-muted-foreground">Loading 3D model...</p>
      </div>
    ),
  }
);

const DEMO_MOTOR_POINTS = [
  { id: "1", name: "Right Deltoid", bodyRegion: "shoulder", x: 0.35, y: 0.18, status: "normal" as const, severity: 2, notes: "Normal tone" },
  { id: "2", name: "Left Deltoid", bodyRegion: "shoulder", x: 0.65, y: 0.18, status: "hypertonic" as const, severity: 7, notes: "Elevated tension" },
  { id: "3", name: "Right Pec Major", bodyRegion: "chest", x: 0.4, y: 0.24, status: "trigger_point" as const, severity: 8, notes: "Active trigger point" },
  { id: "4", name: "Left Biceps", bodyRegion: "arm", x: 0.68, y: 0.3, status: "normal" as const, severity: 1 },
  { id: "5", name: "Right Quad", bodyRegion: "leg", x: 0.42, y: 0.55, status: "hypotonic" as const, severity: 5, notes: "Reduced activation" },
  { id: "6", name: "Left Quad", bodyRegion: "leg", x: 0.58, y: 0.55, status: "normal" as const, severity: 2 },
  { id: "7", name: "Right Gastroc", bodyRegion: "leg", x: 0.43, y: 0.75, status: "hypertonic" as const, severity: 6, notes: "Calf tightness" },
  { id: "8", name: "Abdominals", bodyRegion: "trunk", x: 0.5, y: 0.35, status: "normal" as const, severity: 1 },
];

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

export default function Preview3DPage() {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            3D Body Map Preview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Interactive 3D mannequin with motor point markers — drag to rotate, scroll to zoom
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          {/* 3D Mannequin */}
          <div className="relative">
            <Mannequin3D
              motorPoints={DEMO_MOTOR_POINTS}
              onPointClick={(point) => setSelectedPoint(point)}
              interactive={true}
              width={500}
              height={650}
            />

            {/* Selected point info */}
            {selectedPoint && (
              <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg max-w-[220px] z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{selectedPoint.name}</p>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs ml-2"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[selectedPoint.status] }}
                  />
                  <span className="text-xs">{STATUS_LABELS[selectedPoint.status]}</span>
                </div>
                <p className="text-xs text-slate-500">Region: {selectedPoint.bodyRegion}</p>
                <p className="text-xs text-slate-500">Severity: {selectedPoint.severity}/10</p>
                {selectedPoint.notes && (
                  <p className="text-xs italic text-slate-400 mt-1">{selectedPoint.notes}</p>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[key] }}
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 max-w-md text-center">
            <p className="text-xs text-slate-500">
              Demo motor points are displayed on the mannequin. Click on colored markers to see details.
              Drag to rotate the model, scroll to zoom in/out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
