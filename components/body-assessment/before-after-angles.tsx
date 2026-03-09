"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
  Ruler,
  Crosshair,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PoseLandmark, POSE_LANDMARKS, POSE_CONNECTIONS } from "@/hooks/use-pose-detection";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface AssessmentSnapshot {
  id: string;
  date: string;
  assessmentNumber: string;
  overallScore: number | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  leftImageUrl?: string | null;
  rightImageUrl?: string | null;
  frontLandmarks?: PoseLandmark[] | null;
  backLandmarks?: PoseLandmark[] | null;
  leftLandmarks?: PoseLandmark[] | null;
  rightLandmarks?: PoseLandmark[] | null;
}

interface BeforeAfterAnglesProps {
  assessments: AssessmentSnapshot[];
  currentId?: string;
  locale?: string;
}

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

type ViewKey = "front" | "back" | "left" | "right";

const VIEW_LABELS: Record<ViewKey, { en: string; pt: string }> = {
  front: { en: "Anterior", pt: "Anterior" },
  back: { en: "Posterior", pt: "Posterior" },
  left: { en: "Left Lateral", pt: "Lateral Esq." },
  right: { en: "Right Lateral", pt: "Lateral Dir." },
};

const ANGLE_DEFS: { name: string; en: string; pt: string; l1: string; v: string; l2: string; views: ViewKey[] }[] = [
  { name: "headTilt", en: "Head Tilt", pt: "Incl. Cabeça", l1: "left_ear", v: "nose", l2: "right_ear", views: ["front"] },
  { name: "shoulderLevel", en: "Shoulder Level", pt: "Nível Ombros", l1: "left_shoulder", v: "right_shoulder", l2: "left_shoulder", views: ["front", "back"] },
  { name: "lShoulder", en: "L Shoulder", pt: "Ombro E", l1: "left_elbow", v: "left_shoulder", l2: "left_hip", views: ["front", "left"] },
  { name: "rShoulder", en: "R Shoulder", pt: "Ombro D", l1: "right_elbow", v: "right_shoulder", l2: "right_hip", views: ["front", "right"] },
  { name: "lHip", en: "L Hip", pt: "Quadril E", l1: "left_shoulder", v: "left_hip", l2: "left_knee", views: ["front", "left"] },
  { name: "rHip", en: "R Hip", pt: "Quadril D", l1: "right_shoulder", v: "right_hip", l2: "right_knee", views: ["front", "right"] },
  { name: "lKnee", en: "L Knee (HKA)", pt: "Joelho E (HKA)", l1: "left_hip", v: "left_knee", l2: "left_ankle", views: ["front", "left"] },
  { name: "rKnee", en: "R Knee (HKA)", pt: "Joelho D (HKA)", l1: "right_hip", v: "right_knee", l2: "right_ankle", views: ["front", "right"] },
  { name: "headForward", en: "Head Forward", pt: "Cabeça Anterior", l1: "left_ear", v: "left_shoulder", l2: "left_hip", views: ["left", "right"] },
  { name: "trunkLean", en: "Trunk Lean", pt: "Incl. Tronco", l1: "left_shoulder", v: "left_hip", l2: "left_knee", views: ["left", "right"] },
  { name: "lAnkle", en: "L Ankle", pt: "Tornozelo E", l1: "left_knee", v: "left_ankle", l2: "left_foot_index", views: ["front", "left"] },
  { name: "rAnkle", en: "R Ankle", pt: "Tornozelo D", l1: "right_knee", v: "right_ankle", l2: "right_foot_index", views: ["front", "right"] },
];

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function getLmPos(lms: PoseLandmark[], name: string, w: number, h: number): { x: number; y: number } | null {
  const idx = POSE_LANDMARKS.indexOf(name);
  if (idx < 0 || !lms[idx] || lms[idx].visibility < 0.25) return null;
  return { x: lms[idx].x * w, y: lms[idx].y * h };
}

function getMid(lms: PoseLandmark[], n1: string, n2: string, w: number, h: number): { x: number; y: number } | null {
  const p1 = getLmPos(lms, n1, w, h);
  const p2 = getLmPos(lms, n2, w, h);
  if (!p1 || !p2) return null;
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function computeAngle(p1: { x: number; y: number }, v: { x: number; y: number }, p2: { x: number; y: number }): number {
  const v1 = { x: p1.x - v.x, y: p1.y - v.y };
  const v2 = { x: p2.x - v.x, y: p2.y - v.y };
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
  return Math.abs(Math.round(Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI));
}

function computeAnglesForView(lms: PoseLandmark[], view: ViewKey, w: number, h: number): Record<string, number> {
  const results: Record<string, number> = {};
  for (const def of ANGLE_DEFS) {
    if (!def.views.includes(view)) continue;
    if (def.name === "shoulderLevel") {
      const deg = heightDiffDeg(lms, def.l1, def.v, w, h);
      if (deg !== null) results[def.name] = deg;
      continue;
    }
    const p1 = getLmPos(lms, def.l1, w, h);
    const v = getLmPos(lms, def.v, w, h);
    const p2 = getLmPos(lms, def.l2, w, h);
    if (p1 && v && p2) results[def.name] = computeAngle(p1, v, p2);
  }
  return results;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ═══════════════════════════════════════════
// Canvas — draws photo + skeleton + angles
// ═══════════════════════════════════════════

function ComparisonCanvas({
  imageUrl,
  landmarks,
  view,
  label,
  showSkeleton,
  showPlumb,
}: {
  imageUrl: string;
  landmarks: PoseLandmark[] | null;
  view: ViewKey;
  label: string;
  showSkeleton: boolean;
  showPlumb: boolean;
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
    img.onload = () => { imgRef.current = img; setImgSize({ w: img.naturalWidth, h: img.naturalHeight }); setImgLoaded(true); };
    img.src = imageUrl;
  }, [imageUrl]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = imgSize;
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(img, 0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, w, h);

    const lms = landmarks;
    if (!lms || lms.length === 0) return;

    // Plumb line
    if (showPlumb) {
      const top = (view === "front" || view === "back")
        ? getMid(lms, "left_ear", "right_ear", w, h)
        : getLmPos(lms, view === "left" ? "left_ear" : "right_ear", w, h);
      const bottom = (view === "front" || view === "back")
        ? getMid(lms, "left_ankle", "right_ankle", w, h)
        : getLmPos(lms, view === "left" ? "left_ankle" : "right_ankle", w, h);
      if (top && bottom) {
        const idealX = (top.x + bottom.x) / 2;
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = Math.max(1.5, w * 0.003);
        ctx.setLineDash([6, 5]);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(idealX, Math.min(top.y, bottom.y) - h * 0.02);
        ctx.lineTo(idealX, Math.max(top.y, bottom.y) + h * 0.01);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    // Skeleton
    if (showSkeleton) {
      for (const [s, e] of POSE_CONNECTIONS) {
        const start = lms[s];
        const end = lms[e];
        if (!start || !end || start.visibility < 0.35 || end.visibility < 0.35) continue;
        ctx.strokeStyle = "#00E5FF";
        ctx.lineWidth = Math.max(2, w * 0.004);
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(start.x * w, start.y * h);
        ctx.lineTo(end.x * w, end.y * h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const lm of lms) {
        if (!lm || lm.visibility < 0.35) continue;
        ctx.fillStyle = "#00E5FF";
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, Math.max(2.5, w * 0.004), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Angles
    const angles = computeAnglesForView(lms, view, w, h);
    const fontSize = Math.max(10, w * 0.022);
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

    for (const def of ANGLE_DEFS) {
      if (!def.views.includes(view)) continue;
      const angle = angles[def.name];
      if (angle === undefined) continue;

      let pos: { x: number; y: number } | null = null;
      if (def.name === "shoulderLevel") {
        pos = getMid(lms, def.l1, def.v, w, h);
      } else {
        pos = getLmPos(lms, def.v, w, h);
      }
      if (!pos) continue;

      const text = `${angle}°`;
      const metrics = ctx.measureText(text);
      const pad = 4;
      const isRight = pos.x > w / 2;
      const lx = isRight ? pos.x - metrics.width - pad * 2 - 12 : pos.x + 12;
      const ly = pos.y - fontSize / 2 - pad;

      // Connector
      ctx.strokeStyle = "#06B6D4";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(lx + (isRight ? metrics.width + pad * 2 : 0), pos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Background
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#0C1222";
      ctx.beginPath();
      ctx.roundRect(lx, ly, metrics.width + pad * 2, fontSize + pad * 2, 3);
      ctx.fill();
      ctx.strokeStyle = "#06B6D4";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = "#22D3EE";
      ctx.fillText(text, lx + pad, ly + fontSize + pad / 2);
    }

    // Label
    const lFontSize = Math.max(11, w * 0.025);
    ctx.font = `bold ${lFontSize}px system-ui`;
    ctx.fillStyle = "#FFFFFF";
    ctx.globalAlpha = 0.5;
    ctx.fillText(label, 8, h - 8);
    ctx.globalAlpha = 1;
  }, [imgLoaded, imgSize, landmarks, view, label, showSkeleton, showPlumb]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black border border-white/10">
      <canvas ref={canvasRef} className="w-full" style={{ aspectRatio: `${imgSize.w}/${imgSize.h}` }} />
    </div>
  );
}

// ═══════════════════════════════════════════
// Delta Row
// ═══════════════════════════════════════════

function DeltaRow({ label, before, after, isPt }: { label: string; before: number; after: number; isPt: boolean }) {
  const delta = after - before;
  // For most angles, closer to 180° (straight) is better for knees/hips. 
  // For shoulder level/head tilt, closer to 0° is better.
  // We show delta as-is and let the color indicate direction.
  const improved = Math.abs(delta) >= 2;
  const color = !improved ? "text-muted-foreground" : delta > 0 ? "text-emerald-400" : "text-amber-400";
  const icon = !improved ? <Minus className="w-3 h-3" /> : delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;

  return (
    <div className="flex items-center gap-2 py-1 border-b border-slate-800 last:border-0">
      <span className="text-[10px] text-slate-400 flex-1">{label}</span>
      <span className="text-[10px] font-bold text-cyan-400 w-10 text-center">{before}°</span>
      <div className={`w-14 flex items-center justify-center gap-0.5 text-[10px] font-bold ${color}`}>
        {icon}
        {improved ? (delta > 0 ? `+${delta}°` : `${delta}°`) : "—"}
      </div>
      <span className="text-[10px] font-bold text-cyan-400 w-10 text-center">{after}°</span>
    </div>
  );
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════

export function BeforeAfterAngles({ assessments, currentId, locale }: BeforeAfterAnglesProps) {
  const isPt = locale === "pt-BR";

  const sorted = useMemo(
    () => [...assessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [assessments]
  );

  const defaultA = currentId ? sorted.findIndex(a => a.id === currentId) : 0;
  const defaultB = defaultA >= 0 && sorted.length > 1 ? (defaultA === 0 ? 1 : 0) : -1;

  const [selectedA, setSelectedA] = useState(sorted[defaultB >= 0 ? defaultB : Math.min(1, sorted.length - 1)]?.id || "");
  const [selectedB, setSelectedB] = useState(sorted[defaultA >= 0 ? defaultA : 0]?.id || "");
  const [view, setView] = useState<ViewKey>("front");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showPlumb, setShowPlumb] = useState(true);

  const assessA = sorted.find(a => a.id === selectedA);
  const assessB = sorted.find(a => a.id === selectedB);

  if (sorted.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ArrowLeftRight className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{isPt ? "Precisa de pelo menos 2 avaliações com fotos." : "Need at least 2 assessments with photos."}</p>
        </CardContent>
      </Card>
    );
  }

  const getImgUrl = (a: AssessmentSnapshot | undefined, v: ViewKey) => {
    if (!a) return null;
    return v === "front" ? a.frontImageUrl : v === "back" ? a.backImageUrl : v === "left" ? a.leftImageUrl : a.rightImageUrl;
  };
  const getLms = (a: AssessmentSnapshot | undefined, v: ViewKey) => {
    if (!a) return null;
    const raw = v === "front" ? a.frontLandmarks : v === "back" ? a.backLandmarks : v === "left" ? a.leftLandmarks : a.rightLandmarks;
    return Array.isArray(raw) ? raw : null;
  };

  const imgA = getImgUrl(assessA, view);
  const imgB = getImgUrl(assessB, view);
  const lmsA = getLms(assessA, view);
  const lmsB = getLms(assessB, view);

  // Compute angle deltas
  const anglesA = lmsA ? computeAnglesForView(lmsA, view, 1000, 1000) : {};
  const anglesB = lmsB ? computeAnglesForView(lmsB, view, 1000, 1000) : {};

  const overallDelta = assessA && assessB && assessA.overallScore != null && assessB.overallScore != null
    ? Math.round(assessB.overallScore - assessA.overallScore)
    : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
            {isPt ? "Antes/Depois — Comparação com Ângulos" : "Before/After — Angle Comparison"}
          </CardTitle>
          {overallDelta !== null && (
            <Badge className={`text-xs ${overallDelta > 0 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : overallDelta < 0 ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-slate-700 text-slate-400"}`}>
              {overallDelta > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : overallDelta < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
              {overallDelta > 0 ? `+${overallDelta}` : overallDelta} {isPt ? "pts" : "pts"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3 bg-slate-950">
        {/* Selectors */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
          <Select value={selectedA} onValueChange={setSelectedA}>
            <SelectTrigger className="text-xs h-8 bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sorted.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">
                  {a.assessmentNumber} — {formatDate(a.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-red-400 font-bold px-2">{isPt ? "ANTES" : "BEFORE"}</span>
          <span className="text-[10px] text-green-400 font-bold px-2 text-right">{isPt ? "DEPOIS" : "AFTER"}</span>
        </div>
        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
          <div />
          <ArrowLeftRight className="w-4 h-4 text-slate-600" />
          <Select value={selectedB} onValueChange={setSelectedB}>
            <SelectTrigger className="text-xs h-8 bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sorted.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">
                  {a.assessmentNumber} — {formatDate(a.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View + toggle controls */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {(["front", "back", "left", "right"] as ViewKey[]).map(v => {
            const hasImg = getImgUrl(assessA, v) || getImgUrl(assessB, v);
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                disabled={!hasImg}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all ${
                  view === v ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : "text-slate-500 border border-slate-700 hover:text-slate-300"
                } ${!hasImg ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                {isPt ? VIEW_LABELS[v].pt : VIEW_LABELS[v].en}
              </button>
            );
          })}
          <div className="ml-auto flex gap-1">
            <button onClick={() => setShowSkeleton(!showSkeleton)}
              className={`px-2 py-1 text-[9px] rounded border transition-all ${showSkeleton ? "border-cyan-500/30 text-cyan-400" : "border-slate-700 text-slate-600"}`}>
              {showSkeleton ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button onClick={() => setShowPlumb(!showPlumb)}
              className={`px-2 py-1 text-[9px] rounded border transition-all ${showPlumb ? "border-yellow-500/30 text-yellow-400" : "border-slate-700 text-slate-600"}`}>
              <Crosshair className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Side by side photos */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-red-400 uppercase">{isPt ? "ANTES" : "BEFORE"}</span>
              <span className="text-[8px] text-slate-500">{assessA ? formatDate(assessA.date) : ""}</span>
            </div>
            {imgA ? (
              <ComparisonCanvas imageUrl={imgA} landmarks={lmsA} view={view} label={assessA?.assessmentNumber || ""} showSkeleton={showSkeleton} showPlumb={showPlumb} />
            ) : (
              <div className="aspect-[3/4] bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800">
                <span className="text-[10px] text-slate-600">{isPt ? "Sem imagem" : "No image"}</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-green-400 uppercase">{isPt ? "DEPOIS" : "AFTER"}</span>
              <span className="text-[8px] text-slate-500">{assessB ? formatDate(assessB.date) : ""}</span>
            </div>
            {imgB ? (
              <ComparisonCanvas imageUrl={imgB} landmarks={lmsB} view={view} label={assessB?.assessmentNumber || ""} showSkeleton={showSkeleton} showPlumb={showPlumb} />
            ) : (
              <div className="aspect-[3/4] bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800">
                <span className="text-[10px] text-slate-600">{isPt ? "Sem imagem" : "No image"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Angle delta table */}
        {Object.keys(anglesA).length > 0 || Object.keys(anglesB).length > 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{isPt ? "Comparação de Ângulos" : "Angle Comparison"}</span>
            </div>
            <div className="flex items-center gap-2 text-[8px] text-slate-600 uppercase tracking-wider mb-1 px-0.5">
              <span className="flex-1" />
              <span className="w-10 text-center">{isPt ? "Antes" : "Before"}</span>
              <span className="w-14 text-center">{isPt ? "Δ Mudança" : "Δ Change"}</span>
              <span className="w-10 text-center">{isPt ? "Depois" : "After"}</span>
            </div>
            {ANGLE_DEFS.filter(d => d.views.includes(view)).map(def => {
              const a = anglesA[def.name];
              const b = anglesB[def.name];
              if (a === undefined && b === undefined) return null;
              return (
                <DeltaRow
                  key={def.name}
                  label={isPt ? def.pt : def.en}
                  before={a ?? 0}
                  after={b ?? 0}
                  isPt={isPt}
                />
              );
            })}
          </div>
        ) : null}

        {/* Legend */}
        <div className="flex items-center gap-4 px-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5" style={{ borderTop: "2px dashed #FFD700" }} />
            <span className="text-[8px] text-slate-500">{isPt ? "Linha de Prumo" : "Plumb Line"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-500" />
            <span className="text-[8px] text-slate-500">Landmarks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[8px] text-slate-500">{isPt ? "Melhoria ≥ 2°" : "Improvement ≥ 2°"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BeforeAfterAngles;
