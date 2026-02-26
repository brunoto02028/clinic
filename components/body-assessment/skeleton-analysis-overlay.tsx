"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Ruler,
  Tag,
  Target,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
} from "lucide-react";
import { PoseLandmark, POSE_LANDMARKS, POSE_CONNECTIONS } from "@/hooks/use-pose-detection";

// ========== Types ==========

interface DeviationLabel {
  joint: string;
  label: string;
  severity: "mild" | "moderate" | "severe";
  angleDeg: number;
  direction: string;
  description: string;
}

interface IdealComparison {
  segment: string;
  landmark: string;
  currentAngle: number;
  idealAngle: number;
  deviationDeg: number;
  status: string;
  plane?: string;
}

interface JointAngle {
  landmark1: string;
  vertex: string;
  landmark2: string;
  angle: number;
  label?: string;
}

interface SkeletonAnalysisOverlayProps {
  imageUrl: string;
  landmarks?: PoseLandmark[];
  deviationLabels?: DeviationLabel[];
  idealComparison?: IdealComparison[];
  jointAngles?: any;
  view: "front" | "back" | "left" | "right";
  width?: number;
  height?: number;
  onExport?: (dataUrl: string) => void;
}

// ========== roundRect polyfill ==========

if (typeof window !== "undefined" && typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, w: number, h: number, radii?: number | number[]) {
    const r = typeof radii === "number" ? radii : Array.isArray(radii) ? radii[0] ?? 0 : 0;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.arcTo(x + w, y, x + w, y + r, r);
    this.lineTo(x + w, y + h - r);
    this.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.lineTo(x + r, y + h);
    this.arcTo(x, y + h, x, y + h - r, r);
    this.lineTo(x, y + r);
    this.arcTo(x, y, x + r, y, r);
    this.closePath();
  };
}

// ========== Landmark Position Resolver ==========

function getLandmarkPos(
  landmarks: PoseLandmark[],
  name: string,
  w: number,
  h: number
): { x: number; y: number } | null {
  const idx = POSE_LANDMARKS.indexOf(name);
  if (idx < 0 || !landmarks[idx]) return null;
  const lm = landmarks[idx];
  if (lm.visibility < 0.3) return null;
  return { x: lm.x * w, y: lm.y * h };
}

function getMidpoint(
  landmarks: PoseLandmark[],
  name1: string,
  name2: string,
  w: number,
  h: number
): { x: number; y: number } | null {
  const p1 = getLandmarkPos(landmarks, name1, w, h);
  const p2 = getLandmarkPos(landmarks, name2, w, h);
  if (!p1 || !p2) return null;
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

// ========== Severity Colors ==========

const SEVERITY_COLORS = {
  mild: { stroke: "#EAB308", fill: "#EAB30830", text: "#FDE047" },
  moderate: { stroke: "#F97316", fill: "#F9731630", text: "#FDBA74" },
  severe: { stroke: "#EF4444", fill: "#EF444430", text: "#FCA5A5" },
};

// ========== Computed Joint Angles from Landmarks ==========

function computeAngle(
  p1: { x: number; y: number },
  vertex: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

const ANGLE_DEFINITIONS: {
  name: string;
  landmark1: string;
  vertex: string;
  landmark2: string;
  views: string[];
}[] = [
  { name: "L Shoulder", landmark1: "left_elbow", vertex: "left_shoulder", landmark2: "left_hip", views: ["front", "back", "left"] },
  { name: "R Shoulder", landmark1: "right_elbow", vertex: "right_shoulder", landmark2: "right_hip", views: ["front", "back", "right"] },
  { name: "L Elbow", landmark1: "left_shoulder", vertex: "left_elbow", landmark2: "left_wrist", views: ["front", "back", "left"] },
  { name: "R Elbow", landmark1: "right_shoulder", vertex: "right_elbow", landmark2: "right_wrist", views: ["front", "back", "right"] },
  { name: "L Hip", landmark1: "left_shoulder", vertex: "left_hip", landmark2: "left_knee", views: ["front", "back", "left"] },
  { name: "R Hip", landmark1: "right_shoulder", vertex: "right_hip", landmark2: "right_knee", views: ["front", "back", "right"] },
  { name: "L Knee", landmark1: "left_hip", vertex: "left_knee", landmark2: "left_ankle", views: ["front", "back", "left"] },
  { name: "R Knee", landmark1: "right_hip", vertex: "right_knee", landmark2: "right_ankle", views: ["front", "back", "right"] },
  { name: "L Ankle", landmark1: "left_knee", vertex: "left_ankle", landmark2: "left_foot_index", views: ["front", "left"] },
  { name: "R Ankle", landmark1: "right_knee", vertex: "right_ankle", landmark2: "right_foot_index", views: ["front", "right"] },
];

// ========== Component ==========

export function SkeletonAnalysisOverlay({
  imageUrl,
  landmarks,
  deviationLabels = [],
  idealComparison = [],
  jointAngles,
  view,
  width = 400,
  height = 600,
  onExport,
}: SkeletonAnalysisOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: width, h: height });
  const [zoom, setZoom] = useState(1);

  // Toggle states
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showDeviations, setShowDeviations] = useState(true);
  const [showIdealOverlay, setShowIdealOverlay] = useState(false);

  // Load image
  useEffect(() => {
    if (!imageUrl) return;
    setImgLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Compute visible joint angles
  const computedAngles = useMemo(() => {
    if (!landmarks || landmarks.length === 0) return [];
    const results: { name: string; angle: number; vertex: { x: number; y: number } }[] = [];
    const w = imgSize.w;
    const h = imgSize.h;

    for (const def of ANGLE_DEFINITIONS) {
      if (!def.views.includes(view)) continue;
      const p1 = getLandmarkPos(landmarks, def.landmark1, w, h);
      const v = getLandmarkPos(landmarks, def.vertex, w, h);
      const p2 = getLandmarkPos(landmarks, def.landmark2, w, h);
      if (p1 && v && p2) {
        const angle = computeAngle(p1, v, p2);
        results.push({ name: def.name, angle, vertex: v });
      }
    }
    return results;
  }, [landmarks, imgSize, view]);

  // Draw everything on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = imgSize.w;
    const h = imgSize.h;
    canvas.width = w;
    canvas.height = h;

    // Draw image
    ctx.drawImage(img, 0, 0, w, h);

    if (!landmarks || landmarks.length === 0) return;

    // Draw skeleton
    if (showSkeleton) {
      // Connections
      ctx.strokeStyle = "#00FF88";
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.globalAlpha = 0.7;
      for (const [s, e] of POSE_CONNECTIONS) {
        const start = landmarks[s];
        const end = landmarks[e];
        if (start && end && start.visibility > 0.4 && end.visibility > 0.4) {
          ctx.beginPath();
          ctx.moveTo(start.x * w, start.y * h);
          ctx.lineTo(end.x * w, end.y * h);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Landmark dots
      for (const lm of landmarks) {
        if (lm.visibility < 0.4) continue;
        const x = lm.x * w;
        const y = lm.y * h;
        const r = Math.max(3, w * 0.006);

        ctx.fillStyle = lm.visibility > 0.8 ? "#00FF88" : lm.visibility > 0.5 ? "#FFD700" : "#FF4444";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw joint angles
    if (showAngles && computedAngles.length > 0) {
      const fontSize = Math.max(11, w * 0.025);
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

      for (const { name, angle, vertex } of computedAngles) {
        const r = Math.max(20, w * 0.04);

        // Draw arc
        ctx.strokeStyle = "#06B6D4";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, r, 0, (angle * Math.PI) / 180);
        ctx.stroke();

        // Draw angle label background
        const labelX = vertex.x + r + 4;
        const labelY = vertex.y - 4;
        const text = `${angle}°`;
        const metrics = ctx.measureText(text);
        const padding = 3;

        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#0F172A";
        ctx.beginPath();
        ctx.roundRect(
          labelX - padding,
          labelY - fontSize + padding,
          metrics.width + padding * 2,
          fontSize + padding,
          3
        );
        ctx.fill();

        ctx.strokeStyle = "#06B6D4";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw angle text
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#22D3EE";
        ctx.fillText(text, labelX, labelY);
      }
    }

    // Draw deviation labels
    if (showDeviations && deviationLabels.length > 0) {
      const fontSize = Math.max(10, w * 0.022);
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

      for (const dev of deviationLabels) {
        const pos = getLandmarkPos(landmarks, dev.joint, w, h);
        if (!pos) continue;

        const colors = SEVERITY_COLORS[dev.severity] || SEVERITY_COLORS.mild;
        const text = dev.label;
        const angleText = dev.angleDeg ? ` ${dev.angleDeg}°` : "";
        const fullText = text + angleText;
        const metrics = ctx.measureText(fullText);
        const padding = 5;
        const boxH = fontSize + padding * 2;

        // Offset label to the side
        const offsetX = pos.x > w / 2 ? -(metrics.width + padding * 2 + 15) : 15;
        const labelX = pos.x + offsetX;
        const labelY = pos.y - boxH / 2;

        // Connector line
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(labelX + (offsetX > 0 ? 0 : metrics.width + padding * 2), pos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label background
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#0F172A";
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, metrics.width + padding * 2, boxH, 4);
        ctx.fill();

        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Severity dot
        ctx.fillStyle = colors.stroke;
        ctx.beginPath();
        ctx.arc(labelX + padding + 3, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Label text
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.text;
        ctx.fillText(fullText, labelX + padding + 10, pos.y + fontSize / 3);
      }
    }

    // Draw ideal posture overlay (green dashed skeleton)
    if (showIdealOverlay && idealComparison.length > 0) {
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = Math.max(2, w * 0.003);
      ctx.setLineDash([8, 4]);
      ctx.globalAlpha = 0.5;

      // Draw an ideal vertical reference line
      const midShoulder = getMidpoint(landmarks, "left_shoulder", "right_shoulder", w, h);
      const midAnkle = getMidpoint(landmarks, "left_ankle", "right_ankle", w, h);
      if (midShoulder && midAnkle) {
        ctx.beginPath();
        ctx.moveTo(midShoulder.x, midShoulder.y - h * 0.05);
        ctx.lineTo(midAnkle.x, midAnkle.y + h * 0.02);
        ctx.stroke();
      }

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Draw ideal angle labels
      const fontSize = Math.max(9, w * 0.018);
      ctx.font = `${fontSize}px system-ui, sans-serif`;

      for (const comp of idealComparison) {
        const pos = getLandmarkPos(landmarks, comp.landmark, w, h);
        if (!pos) continue;

        const isDeviation = Math.abs(comp.deviationDeg) > 5;
        const color = isDeviation ? "#F97316" : "#22C55E";

        // Small badge showing ideal vs actual
        const text = `${comp.currentAngle}° → ${comp.idealAngle}°`;
        const metrics = ctx.measureText(text);
        const padding = 3;

        const labelX = pos.x - metrics.width / 2 - padding;
        const labelY = pos.y + 15;

        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#0F172A";
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, metrics.width + padding * 2, fontSize + padding * 2, 3);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.fillText(text, labelX + padding, labelY + fontSize + padding / 2);
      }
    }
  }, [imgLoaded, imgSize, landmarks, showSkeleton, showAngles, showDeviations, showIdealOverlay, computedAngles, deviationLabels, idealComparison, view]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleExport = useCallback(() => {
    if (!canvasRef.current || !onExport) return;
    onExport(canvasRef.current.toDataURL("image/png"));
  }, [onExport]);

  // Calculate display dimensions
  const displayW = Math.min(width, 600);
  const aspect = imgSize.h / imgSize.w;
  const displayH = displayW * aspect;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-primary" />
            Skeleton Analysis — {view.charAt(0).toUpperCase() + view.slice(1)} View
          </CardTitle>
          <div className="flex items-center gap-1">
            {onExport && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={handleExport}>
                <Download className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Toggle controls */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showSkeleton ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10" : "border-border text-muted-foreground"
            }`}
          >
            {showSkeleton ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Skeleton
          </button>
          <button
            onClick={() => setShowAngles(!showAngles)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showAngles ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"
            }`}
          >
            <Ruler className="w-3 h-3" />
            Angles ({computedAngles.length})
          </button>
          <button
            onClick={() => setShowDeviations(!showDeviations)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showDeviations ? "border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" : "border-border text-muted-foreground"
            }`}
          >
            <Tag className="w-3 h-3" />
            Deviations ({deviationLabels.length})
          </button>
          {idealComparison.length > 0 && (
            <button
              onClick={() => setShowIdealOverlay(!showIdealOverlay)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                showIdealOverlay ? "border-green-500/40 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10" : "border-border text-muted-foreground"
              }`}
            >
              <Target className="w-3 h-3" />
              Ideal Posture
            </button>
          )}
        </div>

        {/* Canvas */}
        <div
          className="relative rounded-lg overflow-hidden bg-black/80 border"
          style={{ width: displayW, height: displayH * zoom, maxWidth: "100%" }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          />
        </div>

        {/* Deviation labels legend */}
        {showDeviations && deviationLabels.length > 0 && (
          <div className="space-y-1">
            {deviationLabels.map((dev, i) => {
              const colors = SEVERITY_COLORS[dev.severity] || SEVERITY_COLORS.mild;
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.stroke }} />
                  <span className="font-medium" style={{ color: colors.text }}>{dev.label}</span>
                  {dev.angleDeg > 0 && <span className="text-muted-foreground">{dev.angleDeg}°</span>}
                  <span className="text-muted-foreground/50">—</span>
                  <span className="text-muted-foreground truncate">{dev.description}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Angle values table */}
        {showAngles && computedAngles.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {computedAngles.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] text-muted-foreground">{a.name}</span>
                <span className="text-xs font-bold text-primary">{a.angle}°</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SkeletonAnalysisOverlay;
