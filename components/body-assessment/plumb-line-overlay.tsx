"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Grid3x3,
  Move,
  RotateCcw,
  Eye,
  EyeOff,
  Download,
  Save,
  ZoomIn,
  ZoomOut,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { PoseLandmark, POSE_CONNECTIONS } from "@/hooks/use-pose-detection";

// ========== Types ==========

interface DeviationPoint {
  name: string;
  landmark: string;
  side: "left" | "right" | "center";
  deviationPx: number;
  deviationMm?: number;
  severity: "normal" | "mild" | "moderate" | "severe";
}

interface LevelCheck {
  name: string;
  leftLandmark: string;
  rightLandmark: string;
  diffPx: number;
  diffMm?: number;
  tiltsTo: "left" | "right" | "level";
  severity: "normal" | "mild" | "moderate" | "severe";
}

export interface PlumbLineAnalysis {
  deviations: DeviationPoint[];
  levelChecks: LevelCheck[];
  overallShift: "left" | "right" | "centered";
  overallShiftPx: number;
}

// ========== Props ==========

interface PlumbLineOverlayProps {
  imageUrl: string;
  landmarks?: PoseLandmark[];
  view: "front" | "back" | "left" | "right";
  width?: number;
  height?: number;
  onSave?: (analysis: PlumbLineAnalysis) => void;
  onExport?: (dataUrl: string) => void;
}

// ========== Landmark pairs for level checks ==========

const LEVEL_CHECKS = [
  { name: "Ombros", left: "left_shoulder", right: "right_shoulder" },
  { name: "Quadril", left: "left_hip", right: "right_hip" },
  { name: "Joelhos", left: "left_knee", right: "right_knee" },
  { name: "Tornozelos", left: "left_ankle", right: "right_ankle" },
  { name: "Orelhas", left: "left_ear", right: "right_ear" },
];

// Landmarks to check against plumb line (frontal)
const PLUMB_CHECKPOINTS_FRONTAL = [
  { name: "Nariz", landmark: "nose" },
  { name: "Ombro Médio", landmark: "_mid_shoulder" },
  { name: "Quadril Médio", landmark: "_mid_hip" },
  { name: "Joelho Médio", landmark: "_mid_knee" },
  { name: "Tornozelo Médio", landmark: "_mid_ankle" },
];

// Landmarks for lateral view plumb line
const PLUMB_CHECKPOINTS_LATERAL = [
  { name: "Orelha", landmark: "left_ear" },
  { name: "Ombro", landmark: "left_shoulder" },
  { name: "Quadril", landmark: "left_hip" },
  { name: "Joelho", landmark: "left_knee" },
  { name: "Tornozelo", landmark: "left_ankle" },
];

// ========== Helpers ==========

function getSeverity(devPx: number): "normal" | "mild" | "moderate" | "severe" {
  const abs = Math.abs(devPx);
  if (abs < 8) return "normal";
  if (abs < 20) return "mild";
  if (abs < 35) return "moderate";
  return "severe";
}

function getLevelSeverity(diffPx: number): "normal" | "mild" | "moderate" | "severe" {
  const abs = Math.abs(diffPx);
  if (abs < 5) return "normal";
  if (abs < 12) return "mild";
  if (abs < 25) return "moderate";
  return "severe";
}

const SEVERITY_COLORS = {
  normal: "#34C759",
  mild: "#FFCC00",
  moderate: "#FF9500",
  severe: "#FF3B30",
};

const SEVERITY_LABELS: Record<string, string> = {
  normal: "Normal",
  mild: "Leve",
  moderate: "Moderado",
  severe: "Severo",
};

// ========== Component ==========

export function PlumbLineOverlay({
  imageUrl,
  landmarks,
  view,
  width = 700,
  height = 900,
  onSave,
  onExport,
}: PlumbLineOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgNatW, setImgNatW] = useState(0);
  const [imgNatH, setImgNatH] = useState(0);

  const [showGrid, setShowGrid] = useState(true);
  const [showPlumbLine, setShowPlumbLine] = useState(true);
  const [showLevelLines, setShowLevelLines] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showDeviations, setShowDeviations] = useState(true);
  const [gridSpacing, setGridSpacing] = useState(40);
  const [plumbLineX, setPlumbLineX] = useState<number | null>(null);
  const [isDraggingPlumb, setIsDraggingPlumb] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [analysis, setAnalysis] = useState<PlumbLineAnalysis | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImgNatW(img.naturalWidth);
      setImgNatH(img.naturalHeight);
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Helper to get landmark position in canvas coords
  const getLandmarkPos = useCallback((name: string, dw: number, dh: number, dx: number, dy: number): { x: number; y: number } | null => {
    if (!landmarks) return null;

    // Handle synthetic midpoint landmarks
    if (name.startsWith("_mid_")) {
      const base = name.replace("_mid_", "");
      const left = landmarks.find((l) => l.name === `left_${base}`);
      const right = landmarks.find((l) => l.name === `right_${base}`);
      if (!left || !right || left.visibility < 0.4 || right.visibility < 0.4) return null;
      return {
        x: dx + ((left.x + right.x) / 2) * dw,
        y: dy + ((left.y + right.y) / 2) * dh,
      };
    }

    // For lateral views, use left landmarks for left view, right for right view
    let adjustedName = name;
    if (view === "right") {
      adjustedName = name.replace("left_", "right_");
    }

    const lm = landmarks.find((l) => l.name === adjustedName);
    if (!lm || lm.visibility < 0.4) return null;
    return { x: dx + lm.x * dw, y: dy + lm.y * dh };
  }, [landmarks, view]);

  // Calculate plumb line position and analysis
  const calculateAnalysis = useCallback((plumbX: number, dw: number, dh: number, dx: number, dy: number) => {
    if (!landmarks) return null;

    const isLateral = view === "left" || view === "right";
    const checkpoints = isLateral ? PLUMB_CHECKPOINTS_LATERAL : PLUMB_CHECKPOINTS_FRONTAL;

    const deviations: DeviationPoint[] = [];
    for (const cp of checkpoints) {
      const pos = getLandmarkPos(cp.landmark, dw, dh, dx, dy);
      if (!pos) continue;
      const devPx = pos.x - plumbX;
      deviations.push({
        name: cp.name,
        landmark: cp.landmark,
        side: devPx > 3 ? "right" : devPx < -3 ? "left" : "center",
        deviationPx: Math.round(devPx * 10) / 10,
        severity: getSeverity(devPx),
      });
    }

    const levelChecks: LevelCheck[] = [];
    if (!isLateral) {
      for (const lc of LEVEL_CHECKS) {
        const leftPos = getLandmarkPos(lc.left, dw, dh, dx, dy);
        const rightPos = getLandmarkPos(lc.right, dw, dh, dx, dy);
        if (!leftPos || !rightPos) continue;
        const diffPx = leftPos.y - rightPos.y;
        levelChecks.push({
          name: lc.name,
          leftLandmark: lc.left,
          rightLandmark: lc.right,
          diffPx: Math.round(diffPx * 10) / 10,
          tiltsTo: Math.abs(diffPx) < 3 ? "level" : diffPx > 0 ? "left" : "right",
          severity: getLevelSeverity(diffPx),
        });
      }
    }

    const avgDev = deviations.length > 0 ? deviations.reduce((s, d) => s + d.deviationPx, 0) / deviations.length : 0;

    return {
      deviations,
      levelChecks,
      overallShift: Math.abs(avgDev) < 5 ? "centered" : avgDev > 0 ? "right" : "left",
      overallShiftPx: Math.round(avgDev * 10) / 10,
    } as PlumbLineAnalysis;
  }, [landmarks, view, getLandmarkPos]);

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = width * zoom;
    const ch = height * zoom;
    canvas.width = cw;
    canvas.height = ch;

    ctx.clearRect(0, 0, cw, ch);

    // Fit image
    const imgAR = imgNatW / imgNatH;
    const canvAR = cw / ch;
    let dw: number, dh: number, dx: number, dy: number;
    if (imgAR > canvAR) {
      dw = cw; dh = cw / imgAR; dx = 0; dy = (ch - dh) / 2;
    } else {
      dh = ch; dw = ch * imgAR; dx = (cw - dw) / 2; dy = 0;
    }
    ctx.drawImage(imageRef.current, dx, dy, dw, dh);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 0.5;
      const gs = gridSpacing * zoom;
      // Vertical lines
      for (let x = dx; x <= dx + dw; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x, dy + dh); ctx.stroke();
      }
      // Horizontal lines
      for (let y = dy; y <= dy + dh; y += gs) {
        ctx.beginPath(); ctx.moveTo(dx, y); ctx.lineTo(dx + dw, y); ctx.stroke();
      }
    }

    // Draw landmarks
    if (showLandmarks && landmarks) {
      ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
      ctx.lineWidth = 1;
      for (const [i, j] of POSE_CONNECTIONS) {
        const a = landmarks[i]; const b = landmarks[j];
        if (!a || !b || a.visibility < 0.4 || b.visibility < 0.4) continue;
        ctx.beginPath();
        ctx.moveTo(dx + a.x * dw, dy + a.y * dh);
        ctx.lineTo(dx + b.x * dw, dy + b.y * dh);
        ctx.stroke();
      }
      for (const lm of landmarks) {
        if (lm.visibility < 0.4) continue;
        ctx.beginPath(); ctx.arc(dx + lm.x * dw, dy + lm.y * dh, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 0, 0.6)"; ctx.fill();
      }
    }

    // Auto-position plumb line if not set
    let plX = plumbLineX;
    if (plX === null && landmarks) {
      // Position at midpoint between ankles (frontal) or at ankle (lateral)
      const isLateral = view === "left" || view === "right";
      if (isLateral) {
        const ankle = getLandmarkPos(view === "left" ? "left_ankle" : "right_ankle", dw, dh, dx, dy);
        plX = ankle ? ankle.x : dx + dw / 2;
      } else {
        const midAnkle = getLandmarkPos("_mid_ankle", dw, dh, dx, dy);
        plX = midAnkle ? midAnkle.x : dx + dw / 2;
      }
      setPlumbLineX(plX);
    }
    if (plX === null) plX = dx + dw / 2;

    // Draw plumb line
    if (showPlumbLine) {
      // Main line
      ctx.strokeStyle = "rgba(0, 120, 255, 0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(plX, dy);
      ctx.lineTo(plX, dy + dh);
      ctx.stroke();

      // Arrow at top
      ctx.fillStyle = "rgba(0, 120, 255, 0.85)";
      ctx.beginPath();
      ctx.moveTo(plX, dy);
      ctx.lineTo(plX - 6, dy + 12);
      ctx.lineTo(plX + 6, dy + 12);
      ctx.closePath();
      ctx.fill();

      // Weight at bottom
      ctx.beginPath();
      ctx.arc(plX, dy + dh - 5, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "rgba(0, 120, 255, 0.9)";
      ctx.textAlign = "center";
      ctx.fillText("PLUMB LINE", plX, dy - 5);
    }

    // Deviation markers and level lines
    const currentAnalysis = calculateAnalysis(plX, dw, dh, dx, dy);
    if (currentAnalysis) {
      setAnalysis(currentAnalysis);

      if (showDeviations) {
        // Draw deviation lines from plumb line to each checkpoint
        for (const dev of currentAnalysis.deviations) {
          const pos = getLandmarkPos(dev.landmark, dw, dh, dx, dy);
          if (!pos) continue;

          // Horizontal deviation line
          ctx.strokeStyle = SEVERITY_COLORS[dev.severity];
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(plX, pos.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Dot at landmark
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = SEVERITY_COLORS[dev.severity];
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Label
          const labelX = pos.x > plX ? pos.x + 10 : pos.x - 10;
          ctx.font = "bold 10px sans-serif";
          ctx.fillStyle = SEVERITY_COLORS[dev.severity];
          ctx.textAlign = pos.x > plX ? "left" : "right";
          ctx.fillText(`${dev.name}: ${dev.deviationPx > 0 ? "+" : ""}${dev.deviationPx}px`, labelX, pos.y - 8);
        }
      }

      if (showLevelLines) {
        // Draw level comparison lines
        for (const lc of currentAnalysis.levelChecks) {
          const leftPos = getLandmarkPos(lc.leftLandmark, dw, dh, dx, dy);
          const rightPos = getLandmarkPos(lc.rightLandmark, dw, dh, dx, dy);
          if (!leftPos || !rightPos) continue;

          // Line connecting the pair
          ctx.strokeStyle = SEVERITY_COLORS[lc.severity];
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(leftPos.x, leftPos.y);
          ctx.lineTo(rightPos.x, rightPos.y);
          ctx.stroke();

          // Ideal horizontal reference
          const midY = (leftPos.y + rightPos.y) / 2;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 0.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(leftPos.x, midY);
          ctx.lineTo(rightPos.x, midY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Dots
          for (const p of [leftPos, rightPos]) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = SEVERITY_COLORS[lc.severity];
            ctx.fill();
          }
        }
      }
    }
  }, [imageLoaded, imgNatW, imgNatH, width, height, zoom, showGrid, showPlumbLine, showLevelLines, showLandmarks, showDeviations, gridSpacing, plumbLineX, landmarks, view, calculateAnalysis, getLandmarkPos]);

  useEffect(() => { render(); }, [render]);

  // Plumb line dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (plumbLineX !== null && Math.abs(x - plumbLineX) < 15) {
      setIsDraggingPlumb(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPlumb) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setPlumbLineX(e.clientX - rect.left);
  };

  const handleMouseUp = () => { setIsDraggingPlumb(false); };

  const resetPlumbLine = () => { setPlumbLineX(null); };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onExport?.(dataUrl);
    const link = document.createElement("a");
    link.download = `plumb-line-${view}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleSave = () => {
    if (analysis) onSave?.(analysis);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          <Button variant={showGrid ? "default" : "ghost"} size="sm" className="h-8 text-xs" onClick={() => setShowGrid((v) => !v)}>
            <Grid3x3 className="h-3.5 w-3.5 mr-1" /> Grid
          </Button>
          <Button variant={showPlumbLine ? "default" : "ghost"} size="sm" className="h-8 text-xs" onClick={() => setShowPlumbLine((v) => !v)}>
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" /> Plumb
          </Button>
          <Button variant={showLevelLines ? "default" : "ghost"} size="sm" className="h-8 text-xs" onClick={() => setShowLevelLines((v) => !v)}>
            <Move className="h-3.5 w-3.5 mr-1" /> Níveis
          </Button>
          <Button variant={showDeviations ? "default" : "ghost"} size="sm" className="h-8 text-xs" onClick={() => setShowDeviations((v) => !v)}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Desvios
          </Button>
          <Button variant={showLandmarks ? "default" : "ghost"} size="sm" className="h-8 text-xs" onClick={() => setShowLandmarks((v) => !v)}>
            {showLandmarks ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />} Pose
          </Button>
        </div>

        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          <span className="text-xs text-muted-foreground">Grid:</span>
          {[20, 40, 60].map((s) => (
            <button key={s} onClick={() => setGridSpacing(s)} className={`w-7 h-7 rounded text-xs ${gridSpacing === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetPlumbLine}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setZoom((z) => Math.min(z + 0.25, 2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" /> PNG
          </Button>
          {onSave && analysis && (
            <Button size="sm" className="h-8 text-xs" onClick={handleSave}>
              <Save className="h-3.5 w-3.5 mr-1" /> Salvar
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Canvas */}
        <div className="border rounded-lg bg-black overflow-auto flex-1" style={{ maxHeight: "70vh" }}>
          <canvas
            ref={canvasRef}
            style={{ width: width * zoom, height: height * zoom, cursor: isDraggingPlumb ? "ew-resize" : "default" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Analysis Panel */}
        {analysis && (
          <div className="w-64 space-y-3 shrink-0">
            {/* Overall */}
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">Alinhamento Geral</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex items-center gap-2">
                  {analysis.overallShift === "centered" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {analysis.overallShift === "centered" ? "Centrado" : `Desvio para ${analysis.overallShift === "right" ? "direita" : "esquerda"}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{analysis.overallShiftPx}px médio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deviations */}
            {analysis.deviations.length > 0 && (
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Desvios da Linha de Prumo</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-1.5">
                  {analysis.deviations.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="truncate">{d.name}</span>
                      <Badge
                        variant="secondary"
                        className="text-xs shrink-0 ml-1"
                        style={{ color: SEVERITY_COLORS[d.severity], borderColor: SEVERITY_COLORS[d.severity] }}
                      >
                        {d.deviationPx > 0 ? "+" : ""}{d.deviationPx}px
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Level Checks */}
            {analysis.levelChecks.length > 0 && (
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Nivelamento Bilateral</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-1.5">
                  {analysis.levelChecks.map((lc) => (
                    <div key={lc.name} className="flex items-center justify-between text-xs">
                      <span>{lc.name}</span>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ color: SEVERITY_COLORS[lc.severity] }}
                        >
                          {lc.tiltsTo === "level" ? "Nivelado" : `${lc.tiltsTo === "left" ? "↙ Esq" : "↘ Dir"} ${Math.abs(lc.diffPx)}px`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground italic">
              Arraste a linha de prumo para reposicionar. Os valores são em pixels relativos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
