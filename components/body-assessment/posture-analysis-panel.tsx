"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Ruler,
  Download,
  Crosshair,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Maximize2,
  Grid3x3,
} from "lucide-react";
import { PoseLandmark, POSE_LANDMARKS, POSE_CONNECTIONS } from "@/hooks/use-pose-detection";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

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

interface PostureAnalysisPanelProps {
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  leftImageUrl?: string | null;
  rightImageUrl?: string | null;
  frontLandmarks?: PoseLandmark[] | null;
  backLandmarks?: PoseLandmark[] | null;
  leftLandmarks?: PoseLandmark[] | null;
  rightLandmarks?: PoseLandmark[] | null;
  deviationLabels?: DeviationLabel[];
  idealComparison?: IdealComparison[];
  postureAnalysis?: any;
  overallScore?: number | null;
  postureScore?: number | null;
  symmetryScore?: number | null;
  patientName?: string;
  assessmentNumber?: string;
  assessmentDate?: string;
  locale?: string;
}

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const VIEW_CONFIG: { key: string; en: string; pt: string; short: string }[] = [
  { key: "front", en: "ANTERIOR", pt: "ANTERIOR", short: "Rt → Lt" },
  { key: "left", en: "LEFT LATERAL", pt: "LATERAL ESQ.", short: "F → B" },
  { key: "right", en: "RIGHT LATERAL", pt: "LATERAL DIR.", short: "F → B" },
  { key: "back", en: "POSTERIOR", pt: "POSTERIOR", short: "Lt → Rt" },
];

const SEVERITY_COLORS: Record<string, { stroke: string; fill: string; text: string }> = {
  mild: { stroke: "#EAB308", fill: "#EAB30830", text: "#FDE047" },
  moderate: { stroke: "#F97316", fill: "#F9731630", text: "#FDBA74" },
  severe: { stroke: "#EF4444", fill: "#EF444430", text: "#FCA5A5" },
};

// Joint angle definitions for each view
const ANGLE_DEFS: { name: string; enLabel: string; ptLabel: string; l1: string; v: string; l2: string; views: string[] }[] = [
  { name: "headTilt", enLabel: "Head Tilt", ptLabel: "Incl. Cabeça", l1: "left_ear", v: "nose", l2: "right_ear", views: ["front"] },
  { name: "lShoulder", enLabel: "L Shoulder", ptLabel: "Ombro E", l1: "left_elbow", v: "left_shoulder", l2: "left_hip", views: ["front", "left"] },
  { name: "rShoulder", enLabel: "R Shoulder", ptLabel: "Ombro D", l1: "right_elbow", v: "right_shoulder", l2: "right_hip", views: ["front", "right"] },
  { name: "shoulderDiff", enLabel: "Shoulder Height", ptLabel: "Alt. Ombros", l1: "left_shoulder", v: "right_shoulder", l2: "left_shoulder", views: ["front", "back"] },
  { name: "lElbow", enLabel: "L Elbow", ptLabel: "Cotovelo E", l1: "left_shoulder", v: "left_elbow", l2: "left_wrist", views: ["front", "left"] },
  { name: "rElbow", enLabel: "R Elbow", ptLabel: "Cotovelo D", l1: "right_shoulder", v: "right_elbow", l2: "right_wrist", views: ["front", "right"] },
  { name: "lHip", enLabel: "L Hip", ptLabel: "Quadril E", l1: "left_shoulder", v: "left_hip", l2: "left_knee", views: ["front", "left"] },
  { name: "rHip", enLabel: "R Hip", ptLabel: "Quadril D", l1: "right_shoulder", v: "right_hip", l2: "right_knee", views: ["front", "right"] },
  { name: "lKnee", enLabel: "L Knee", ptLabel: "Joelho E", l1: "left_hip", v: "left_knee", l2: "left_ankle", views: ["front", "left"] },
  { name: "rKnee", enLabel: "R Knee", ptLabel: "Joelho D", l1: "right_hip", v: "right_knee", l2: "right_ankle", views: ["front", "right"] },
  { name: "lAnkle", enLabel: "L Ankle", ptLabel: "Tornozelo E", l1: "left_knee", v: "left_ankle", l2: "left_foot_index", views: ["front", "left"] },
  { name: "rAnkle", enLabel: "R Ankle", ptLabel: "Tornozelo D", l1: "right_knee", v: "right_ankle", l2: "right_foot_index", views: ["front", "right"] },
  { name: "headForward", enLabel: "Head Forward", ptLabel: "Cabeça Anterior", l1: "left_ear", v: "left_shoulder", l2: "left_hip", views: ["left", "right"] },
  { name: "trunkLean", enLabel: "Trunk Lean", ptLabel: "Incl. Tronco", l1: "left_shoulder", v: "left_hip", l2: "left_knee", views: ["left", "right"] },
];

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function getLmPos(lms: PoseLandmark[], name: string, w: number, h: number): { x: number; y: number } | null {
  const idx = POSE_LANDMARKS.indexOf(name);
  if (idx < 0 || !lms[idx] || lms[idx].visibility < 0.25) return null;
  return { x: lms[idx].x * w, y: lms[idx].y * h };
}

function getMidpoint(lms: PoseLandmark[], n1: string, n2: string, w: number, h: number): { x: number; y: number } | null {
  const p1 = getLmPos(lms, n1, w, h);
  const p2 = getLmPos(lms, n2, w, h);
  if (!p1 || !p2) return null;
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function computeAngle(p1: { x: number; y: number }, vertex: { x: number; y: number }, p2: { x: number; y: number }): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const m2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
  if (m1 === 0 || m2 === 0) return 0;
  return Math.round((Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180) / Math.PI);
}

function heightDiffDeg(lms: PoseLandmark[], n1: string, n2: string, w: number, h: number): number | null {
  const p1 = getLmPos(lms, n1, w, h);
  const p2 = getLmPos(lms, n2, w, h);
  if (!p1 || !p2) return null;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
}

function scoreColor(v: number): string {
  if (v >= 80) return "#22C55E";
  if (v >= 60) return "#EAB308";
  if (v >= 40) return "#F97316";
  return "#EF4444";
}

// ═══════════════════════════════════════════
// Single View Canvas
// ═══════════════════════════════════════════

function ViewCanvas({
  imageUrl,
  landmarks,
  view,
  deviationLabels,
  showSkeleton,
  showAngles,
  showPlumbLine,
  showDeviations,
  showGrid,
  isPt,
}: {
  imageUrl: string;
  landmarks?: PoseLandmark[] | null;
  view: string;
  deviationLabels: DeviationLabel[];
  showSkeleton: boolean;
  showAngles: boolean;
  showPlumbLine: boolean;
  showDeviations: boolean;
  showGrid: boolean;
  isPt: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState({ w: 400, h: 600 });

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

  // Compute angles for this view
  const computedAngles = useMemo(() => {
    if (!landmarks || landmarks.length === 0) return [];
    const results: { name: string; label: string; angle: number; vertex: { x: number; y: number }; p1: { x: number; y: number }; p2: { x: number; y: number } }[] = [];
    const { w, h } = imgSize;

    for (const def of ANGLE_DEFS) {
      if (!def.views.includes(view)) continue;
      if (def.name === "shoulderDiff") {
        // Special: height difference
        const deg = heightDiffDeg(landmarks, def.l1, def.v, w, h);
        if (deg !== null) {
          const p = getMidpoint(landmarks, def.l1, def.v, w, h);
          if (p) results.push({ name: def.name, label: isPt ? def.ptLabel : def.enLabel, angle: Math.abs(deg), vertex: p, p1: p, p2: p });
        }
        continue;
      }
      const p1 = getLmPos(landmarks, def.l1, w, h);
      const v = getLmPos(landmarks, def.v, w, h);
      const p2 = getLmPos(landmarks, def.l2, w, h);
      if (p1 && v && p2) {
        const angle = computeAngle(p1, v, p2);
        results.push({ name: def.name, label: isPt ? def.ptLabel : def.enLabel, angle, vertex: v, p1, p2 });
      }
    }
    return results;
  }, [landmarks, imgSize, view, isPt]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = imgSize;
    canvas.width = w;
    canvas.height = h;

    // Draw image
    ctx.drawImage(img, 0, 0, w, h);

    // Slight dark overlay for contrast
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, 0, w, h);

    // ─── Postural Grid ───
    if (showGrid) {
      const gridColor = "rgba(0,229,255,0.18)";
      const gridColorCenter = "rgba(0,229,255,0.35)";
      const cols = 8;
      const rows = 12;
      const cellW = w / cols;
      const cellH = h / rows;

      ctx.lineWidth = 0.8;
      // Vertical lines
      for (let i = 0; i <= cols; i++) {
        const x = i * cellW;
        const isCenter = i === cols / 2;
        ctx.strokeStyle = isCenter ? gridColorCenter : gridColor;
        ctx.lineWidth = isCenter ? 1.5 : 0.8;
        if (isCenter) {
          ctx.setLineDash([]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      // Horizontal lines
      for (let i = 0; i <= rows; i++) {
        const y = i * cellH;
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    const lms = landmarks;
    if (!lms || lms.length === 0) return;

    // ─── Plumb Line ───
    if (showPlumbLine) {
      const top = view === "front" || view === "back"
        ? getMidpoint(lms, "left_ear", "right_ear", w, h) || getMidpoint(lms, "left_shoulder", "right_shoulder", w, h)
        : getLmPos(lms, view === "left" ? "left_ear" : "right_ear", w, h);
      const bottom = view === "front" || view === "back"
        ? getMidpoint(lms, "left_ankle", "right_ankle", w, h)
        : getLmPos(lms, view === "left" ? "left_ankle" : "right_ankle", w, h);

      if (top && bottom) {
        // Ideal vertical line (through midpoint of ears/ankles)
        const idealX = (view === "front" || view === "back") ? (top.x + bottom.x) / 2 : top.x;
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = Math.max(1.5, w * 0.003);
        ctx.setLineDash([8, 6]);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(idealX, Math.min(top.y, bottom.y) - h * 0.03);
        ctx.lineTo(idealX, Math.max(top.y, bottom.y) + h * 0.02);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Actual line (through landmark positions)
        ctx.strokeStyle = "#FF6B6B";
        ctx.lineWidth = Math.max(1.5, w * 0.003);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y - h * 0.02);
        ctx.lineTo(bottom.x, bottom.y + h * 0.01);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ─── Skeleton ───
    if (showSkeleton) {
      // Connections with gradient-like effect
      for (const [s, e] of POSE_CONNECTIONS) {
        const start = lms[s];
        const end = lms[e];
        if (!start || !end || start.visibility < 0.35 || end.visibility < 0.35) continue;
        
        ctx.strokeStyle = "#00E5FF";
        ctx.lineWidth = Math.max(2, w * 0.004);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(start.x * w, start.y * h);
        ctx.lineTo(end.x * w, end.y * h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Landmark dots with numbered labels
      let landmarkIdx = 0;
      for (let i = 0; i < lms.length; i++) {
        const lm = lms[i];
        if (!lm || lm.visibility < 0.35) continue;
        const x = lm.x * w;
        const y = lm.y * h;
        const r = Math.max(3, w * 0.005);

        // Outer glow
        ctx.fillStyle = "rgba(0,229,255,0.15)";
        ctx.beginPath();
        ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.fillStyle = lm.visibility > 0.7 ? "#00E5FF" : lm.visibility > 0.5 ? "#FFD700" : "#FF6B6B";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Number label (small)
        const fontSize = Math.max(7, w * 0.014);
        ctx.font = `bold ${fontSize}px system-ui`;
        ctx.fillStyle = "#FFFFFF";
        ctx.globalAlpha = 0.5;
        ctx.fillText(`${i}`, x + r + 2, y - r);
        ctx.globalAlpha = 1;

        landmarkIdx++;
      }
    }

    // ─── Angle Arcs + Labels ───
    if (showAngles && computedAngles.length > 0) {
      const fontSize = Math.max(11, w * 0.024);
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

      for (const { label, angle, vertex, p1, p2 } of computedAngles) {
        const r = Math.max(18, w * 0.035);

        // Arc
        const startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
        const endAngle = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
        ctx.strokeStyle = "#06B6D4";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, r, startAngle, endAngle);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Label background pill
        const text = `${angle}°`;
        const metrics = ctx.measureText(text);
        const px = 5;
        const py = 3;
        const labelX = vertex.x > w / 2 ? vertex.x - r - metrics.width - px * 2 - 5 : vertex.x + r + 5;
        const labelY = vertex.y - fontSize / 2;

        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "#0C1222";
        ctx.beginPath();
        const bw = metrics.width + px * 2;
        const bh = fontSize + py * 2;
        ctx.roundRect(labelX, labelY - py, bw, bh, 4);
        ctx.fill();
        ctx.strokeStyle = "#06B6D4";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = "#22D3EE";
        ctx.fillText(text, labelX + px, labelY + fontSize - 2);
      }
    }

    // ─── Deviation Labels ───
    if (showDeviations) {
      const viewDevs = deviationLabels.filter(d => {
        const pos = getLmPos(lms, d.joint, w, h);
        return pos !== null;
      });

      const fontSize = Math.max(9, w * 0.02);
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

      for (const dev of viewDevs) {
        const pos = getLmPos(lms, dev.joint, w, h);
        if (!pos) continue;

        const colors = SEVERITY_COLORS[dev.severity] || SEVERITY_COLORS.mild;
        const text = `${dev.label} ${dev.angleDeg ? dev.angleDeg + "°" : ""}`;
        const metrics = ctx.measureText(text);
        const pad = 4;

        const isRight = pos.x > w / 2;
        const offsetX = isRight ? -(metrics.width + pad * 2 + 20) : 20;
        const lx = pos.x + offsetX;
        const ly = pos.y - fontSize / 2 - pad;

        // Connector
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(lx + (isRight ? metrics.width + pad * 2 : 0), pos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Background
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = "#0C1222";
        ctx.beginPath();
        ctx.roundRect(lx, ly, metrics.width + pad * 2, fontSize + pad * 2, 3);
        ctx.fill();
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Severity indicator dot
        ctx.fillStyle = colors.stroke;
        ctx.beginPath();
        ctx.arc(lx + (isRight ? metrics.width + pad * 2 + 5 : -5), pos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.text;
        ctx.fillText(text, lx + pad, ly + fontSize + pad / 2);
      }
    }

    // ─── View Label ───
    const viewLabel = VIEW_CONFIG.find(v => v.key === view);
    if (viewLabel) {
      const vFontSize = Math.max(10, w * 0.022);
      ctx.font = `bold ${vFontSize}px system-ui`;
      ctx.fillStyle = "#FFFFFF";
      ctx.globalAlpha = 0.4;
      ctx.fillText(isPt ? viewLabel.pt : viewLabel.en, 8, h - 8);
      ctx.globalAlpha = 1;
    }
  }, [imgLoaded, imgSize, landmarks, showSkeleton, showAngles, showPlumbLine, showDeviations, showGrid, computedAngles, deviationLabels, view, isPt]);

  useEffect(() => { draw(); }, [draw]);

  const aspect = imgSize.h / imgSize.w;

  return (
    <div className="relative rounded-lg overflow-hidden bg-black border border-white/10 group">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ aspectRatio: `${imgSize.w}/${imgSize.h}` }}
      />
      {/* View label badge */}
      <div className="absolute top-1.5 left-1.5">
        <span className="text-[9px] font-bold bg-black/70 text-white/80 px-1.5 py-0.5 rounded">
          {isPt ? VIEW_CONFIG.find(v => v.key === view)?.pt : VIEW_CONFIG.find(v => v.key === view)?.en}
        </span>
      </div>
      {/* Angle count */}
      {computedAngles.length > 0 && (
        <div className="absolute top-1.5 right-1.5">
          <span className="text-[8px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
            {computedAngles.length} {isPt ? "ângulos" : "angles"}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════

export function PostureAnalysisPanel({
  frontImageUrl,
  backImageUrl,
  leftImageUrl,
  rightImageUrl,
  frontLandmarks,
  backLandmarks,
  leftLandmarks,
  rightLandmarks,
  deviationLabels = [],
  idealComparison = [],
  postureAnalysis,
  overallScore,
  postureScore,
  symmetryScore,
  patientName,
  assessmentNumber,
  assessmentDate,
  locale,
}: PostureAnalysisPanelProps) {
  const isPt = locale === "pt-BR";
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showPlumbLine, setShowPlumbLine] = useState(true);
  const [showDeviations, setShowDeviations] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [fullscreenView, setFullscreenView] = useState<string | null>(null);

  const views = useMemo(() => {
    const arr: { key: string; imageUrl: string; landmarks: PoseLandmark[] | null }[] = [];
    if (frontImageUrl) arr.push({ key: "front", imageUrl: frontImageUrl, landmarks: Array.isArray(frontLandmarks) ? frontLandmarks : null });
    if (leftImageUrl) arr.push({ key: "left", imageUrl: leftImageUrl, landmarks: Array.isArray(leftLandmarks) ? leftLandmarks : null });
    if (rightImageUrl) arr.push({ key: "right", imageUrl: rightImageUrl, landmarks: Array.isArray(rightLandmarks) ? rightLandmarks : null });
    if (backImageUrl) arr.push({ key: "back", imageUrl: backImageUrl, landmarks: Array.isArray(backLandmarks) ? backLandmarks : null });
    return arr;
  }, [frontImageUrl, backImageUrl, leftImageUrl, rightImageUrl, frontLandmarks, backLandmarks, leftLandmarks, rightLandmarks]);

  if (views.length === 0) return null;

  // Risk index from postureAnalysis
  const pa = postureAnalysis || {};
  const riskScore = pa.proprietaryScores?.biomechanicalRiskScore;
  const gpi = pa.proprietaryScores?.globalPosturalIndex;

  // Key measurements summary
  const keyMeasurements: { label: string; value: string; severity: string }[] = [];
  if (pa.headPosture) {
    const hp = typeof pa.headPosture === "string" ? pa.headPosture : pa.headPosture?.description;
    if (hp) keyMeasurements.push({ label: isPt ? "Postura da Cabeça" : "Head Posture", value: hp, severity: pa.headPosture?.severity || "mild" });
  }
  if (pa.shoulderAnalysis) {
    const sa = typeof pa.shoulderAnalysis === "string" ? pa.shoulderAnalysis : pa.shoulderAnalysis?.description;
    if (sa) keyMeasurements.push({ label: isPt ? "Ombros" : "Shoulders", value: sa, severity: pa.shoulderAnalysis?.severity || "mild" });
  }
  if (pa.spineAnalysis) {
    const sp = typeof pa.spineAnalysis === "string" ? pa.spineAnalysis : pa.spineAnalysis?.description;
    if (sp) keyMeasurements.push({ label: isPt ? "Coluna" : "Spine", value: sp, severity: pa.spineAnalysis?.severity || "mild" });
  }
  if (pa.pelvicAnalysis) {
    const pv = typeof pa.pelvicAnalysis === "string" ? pa.pelvicAnalysis : pa.pelvicAnalysis?.description;
    if (pv) keyMeasurements.push({ label: isPt ? "Pelve" : "Pelvis", value: pv, severity: pa.pelvicAnalysis?.severity || "mild" });
  }
  if (pa.kneeAnalysis) {
    const kn = typeof pa.kneeAnalysis === "string" ? pa.kneeAnalysis : pa.kneeAnalysis?.description;
    if (kn) keyMeasurements.push({ label: isPt ? "Joelhos" : "Knees", value: kn, severity: pa.kneeAnalysis?.severity || "mild" });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-cyan-400" />
              {isPt ? "Análise Postural Completa" : "Complete Posture Analysis"}
            </CardTitle>
            <div className="flex items-center gap-3 mt-1">
              {patientName && <span className="text-[10px] text-slate-400">{patientName}</span>}
              {assessmentNumber && <span className="text-[10px] text-slate-500">#{assessmentNumber}</span>}
              {assessmentDate && <span className="text-[10px] text-slate-500">{new Date(assessmentDate).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Risk Index */}
            {overallScore != null && (
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: scoreColor(overallScore) }}>
                  {Math.round(overallScore)}
                </div>
                <div className="text-[8px] text-slate-400 uppercase tracking-wider">{isPt ? "Score Geral" : "Overall Score"}</div>
              </div>
            )}
            {riskScore != null && (
              <div className="text-center border-l border-slate-700 pl-3">
                <div className="text-2xl font-black" style={{ color: scoreColor(100 - riskScore) }}>
                  {Math.round(riskScore)}
                </div>
                <div className="text-[8px] text-slate-400 uppercase tracking-wider">{isPt ? "Risco" : "Risk"}</div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3 bg-slate-950">
        {/* Toggle controls */}
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setShowSkeleton(!showSkeleton)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showSkeleton ? "border-cyan-500/40 text-cyan-400 bg-cyan-500/10" : "border-slate-700 text-slate-500"
            }`}>
            {showSkeleton ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Skeleton
          </button>
          <button onClick={() => setShowAngles(!showAngles)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showAngles ? "border-cyan-500/40 text-cyan-400 bg-cyan-500/10" : "border-slate-700 text-slate-500"
            }`}>
            <Ruler className="w-3 h-3" />
            {isPt ? "Ângulos" : "Angles"}
          </button>
          <button onClick={() => setShowPlumbLine(!showPlumbLine)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showPlumbLine ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10" : "border-slate-700 text-slate-500"
            }`}>
            <Crosshair className="w-3 h-3" />
            {isPt ? "Linha de Prumo" : "Plumb Line"}
          </button>
          <button onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showGrid ? "border-cyan-500/40 text-cyan-400 bg-cyan-500/10" : "border-slate-700 text-slate-500"
            }`}>
            <Grid3x3 className="w-3 h-3" />
            Grid
          </button>
          <button onClick={() => setShowDeviations(!showDeviations)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showDeviations ? "border-orange-500/40 text-orange-400 bg-orange-500/10" : "border-slate-700 text-slate-500"
            }`}>
            <AlertTriangle className="w-3 h-3" />
            {isPt ? "Desvios" : "Deviations"} ({deviationLabels.length})
          </button>
        </div>

        {/* Multi-view grid */}
        <div className={`grid gap-2 ${views.length === 4 ? "grid-cols-4" : views.length === 3 ? "grid-cols-3" : views.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {views.map(v => (
            <ViewCanvas
              key={v.key}
              imageUrl={v.imageUrl}
              landmarks={v.landmarks}
              view={v.key}
              deviationLabels={deviationLabels}
              showSkeleton={showSkeleton}
              showAngles={showAngles}
              showPlumbLine={showPlumbLine}
              showDeviations={showDeviations}
              showGrid={showGrid}
              isPt={isPt}
            />
          ))}
        </div>

        {/* Plumb line legend */}
        <div className="flex items-center gap-4 px-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-yellow-500" style={{ borderTop: "2px dashed #FFD700" }} />
            <span className="text-[9px] text-slate-400">{isPt ? "Linha Ideal" : "Ideal Line"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-red-400" />
            <span className="text-[9px] text-slate-400">{isPt ? "Linha Atual" : "Actual Line"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className="text-[9px] text-slate-400">Landmarks</span>
          </div>
        </div>

        {/* Key measurements summary */}
        {keyMeasurements.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              {isPt ? "Medições Chave" : "Key Measurements"}
            </h4>
            <div className="space-y-1.5">
              {keyMeasurements.map((m, i) => {
                const sevColors = SEVERITY_COLORS[m.severity] || SEVERITY_COLORS.mild;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sevColors.stroke }} />
                    <span className="text-[10px] font-medium text-slate-300 w-24 flex-shrink-0">{m.label}</span>
                    <span className="text-[10px] text-slate-400 truncate">{m.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Deviation labels table */}
        {deviationLabels.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              {isPt ? "Desvios Detectados" : "Detected Deviations"} ({deviationLabels.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {deviationLabels.map((d, i) => {
                const sevColors = SEVERITY_COLORS[d.severity] || SEVERITY_COLORS.mild;
                return (
                  <div key={i} className="flex items-center gap-2 rounded px-2 py-1 bg-slate-800/40">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sevColors.stroke }} />
                    <span className="text-[10px] font-medium flex-1" style={{ color: sevColors.text }}>{d.label}</span>
                    {d.angleDeg > 0 && <span className="text-[10px] text-cyan-400 font-bold">{d.angleDeg}°</span>}
                    <Badge variant="outline" className="text-[8px] px-1 py-0 capitalize" style={{ borderColor: sevColors.stroke, color: sevColors.text }}>
                      {d.severity}
                    </Badge>
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

export default PostureAnalysisPanel;
