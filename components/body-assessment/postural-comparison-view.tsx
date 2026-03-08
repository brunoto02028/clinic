"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Ruler, Target, ArrowLeftRight, Loader2 } from "lucide-react";
import { PoseLandmark, POSE_LANDMARKS, POSE_CONNECTIONS } from "@/hooks/use-pose-detection";

// ═══════ MediaPipe Static Image Detection ═══════
let poseLandmarkerInstance: any = null;
let initPromise: Promise<any> | null = null;

async function getOrInitPoseLandmarker() {
  if (poseLandmarkerInstance) return poseLandmarkerInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { PoseLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      poseLandmarkerInstance = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.4,
        minPosePresenceConfidence: 0.4,
      });

      return poseLandmarkerInstance;
    } catch (err) {
      console.error("Failed to init PoseLandmarker for static images:", err);
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

async function detectLandmarksFromImage(img: HTMLImageElement): Promise<PoseLandmark[] | null> {
  const landmarker = await getOrInitPoseLandmarker();
  if (!landmarker) return null;

  try {
    const result = landmarker.detect(img);
    if (!result?.landmarks?.[0]) return null;

    return result.landmarks[0].map((lm: any, i: number) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z || 0,
      visibility: lm.visibility ?? 0.9,
      name: POSE_LANDMARKS[i] || `landmark_${i}`,
    }));
  } catch (err) {
    console.error("Pose detection failed:", err);
    return null;
  }
}

// ═══════ Types ═══════

interface PosturalComparisonViewProps {
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  frontLandmarks?: PoseLandmark[] | null;
  backLandmarks?: PoseLandmark[] | null;
  deviationLabels?: any[];
  idealComparison?: any[];
  segmentScores?: any;
  postureScore?: number | null;
  locale?: string;
  compact?: boolean;
}

// ═══════ Helpers ═══════

function getLmPos(landmarks: PoseLandmark[], name: string, w: number, h: number): { x: number; y: number } | null {
  const idx = POSE_LANDMARKS.indexOf(name);
  if (idx < 0 || !landmarks[idx]) return null;
  const lm = landmarks[idx];
  if (lm.visibility < 0.25) return null;
  return { x: lm.x * w, y: lm.y * h };
}

function getMid(landmarks: PoseLandmark[], n1: string, n2: string, w: number, h: number) {
  const p1 = getLmPos(landmarks, n1, w, h);
  const p2 = getLmPos(landmarks, n2, w, h);
  if (!p1 || !p2) return null;
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function scoreColor(v: number) {
  if (v >= 80) return "#22C55E";
  if (v >= 60) return "#EAB308";
  return "#EF4444";
}

// Key joints to draw for postural analysis
const POSTURE_JOINTS = [
  "nose", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder",
  "left_elbow", "right_elbow",
  "left_wrist", "right_wrist",
  "left_hip", "right_hip",
  "left_knee", "right_knee",
  "left_ankle", "right_ankle",
];

// Alignment check pairs (for drawing horizontal reference lines)
const ALIGNMENT_PAIRS = [
  { left: "left_shoulder", right: "right_shoulder", label: "Shoulders" },
  { left: "left_hip", right: "right_hip", label: "Hips" },
  { left: "left_knee", right: "right_knee", label: "Knees" },
];

// ═══════ Canvas Drawer ═══════

function drawPosturalAnalysis(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  landmarks: PoseLandmark[] | null,
  options: {
    showSkeleton: boolean;
    showPlumbLine: boolean;
    showAlignmentLines: boolean;
    showIdealOverlay: boolean;
    segmentScores?: any;
  }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;

  // Draw image
  ctx.drawImage(img, 0, 0, w, h);

  if (!landmarks || landmarks.length === 0) return;

  const lw = Math.max(2, w * 0.004); // line width scaled to image

  // ─── Skeleton connections ───
  if (options.showSkeleton) {
    ctx.strokeStyle = "rgba(0, 255, 136, 0.6)";
    ctx.lineWidth = lw;
    for (const [s, e] of POSE_CONNECTIONS) {
      const start = landmarks[s];
      const end = landmarks[e];
      if (start && end && start.visibility > 0.35 && end.visibility > 0.35) {
        ctx.beginPath();
        ctx.moveTo(start.x * w, start.y * h);
        ctx.lineTo(end.x * w, end.y * h);
        ctx.stroke();
      }
    }

    // Joint dots with color coding by segment score
    for (const jointName of POSTURE_JOINTS) {
      const pos = getLmPos(landmarks, jointName, w, h);
      if (!pos) continue;

      let color = "#00FF88";
      if (options.segmentScores) {
        if (jointName.includes("shoulder") || jointName.includes("elbow") || jointName.includes("wrist")) {
          const ss = options.segmentScores.shoulders;
          if (ss) color = scoreColor(ss.score);
        } else if (jointName.includes("hip")) {
          const ss = options.segmentScores.hips;
          if (ss) color = scoreColor(ss.score);
        } else if (jointName.includes("knee")) {
          const ss = options.segmentScores.knees;
          if (ss) color = scoreColor(ss.score);
        } else if (jointName.includes("ankle")) {
          const ss = options.segmentScores.ankles;
          if (ss) color = scoreColor(ss.score);
        } else if (jointName === "nose" || jointName.includes("ear")) {
          const ss = options.segmentScores.head;
          if (ss) color = scoreColor(ss.score);
        }
      }

      const r = Math.max(4, w * 0.008);
      // Outer glow
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = color + "40";
      ctx.fill();
      // Main dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      // White border
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ─── Vertical Plumb Line (ideal alignment) ───
  if (options.showPlumbLine) {
    const midShoulder = getMid(landmarks, "left_shoulder", "right_shoulder", w, h);
    const midHip = getMid(landmarks, "left_hip", "right_hip", w, h);
    const midAnkle = getMid(landmarks, "left_ankle", "right_ankle", w, h);
    const nose = getLmPos(landmarks, "nose", w, h);

    if (midAnkle) {
      const topY = (nose?.y || midShoulder?.y || 0) - h * 0.03;
      const botY = midAnkle.y + h * 0.02;
      const idealX = midAnkle.x;

      // Ideal vertical line (green dashed)
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = lw * 0.8;
      ctx.setLineDash([10, 6]);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(idealX, topY);
      ctx.lineTo(idealX, botY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Actual center line (current posture - yellow/orange)
      if (midShoulder && midHip) {
        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = lw * 0.8;
        ctx.setLineDash([6, 4]);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        if (nose) ctx.moveTo(nose.x, nose.y);
        else ctx.moveTo(midShoulder.x, topY);
        ctx.lineTo(midShoulder.x, midShoulder.y);
        ctx.lineTo(midHip.x, midHip.y);
        ctx.lineTo(midAnkle.x, midAnkle.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Legend at top
      const fontSize = Math.max(10, w * 0.02);
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

      // Green label
      ctx.fillStyle = "#0F172A";
      ctx.globalAlpha = 0.7;
      ctx.fillRect(8, 8, 90, fontSize * 2 + 12);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#22C55E";
      ctx.fillText("── Ideal", 14, 8 + fontSize + 2);
      ctx.fillStyle = "#F59E0B";
      ctx.fillText("── Current", 14, 8 + fontSize * 2 + 6);
    }
  }

  // ─── Horizontal Alignment Lines ───
  if (options.showAlignmentLines) {
    const fontSize = Math.max(9, w * 0.018);
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

    for (const pair of ALIGNMENT_PAIRS) {
      const left = getLmPos(landmarks, pair.left, w, h);
      const right = getLmPos(landmarks, pair.right, w, h);
      if (!left || !right) continue;

      const diff = Math.abs(left.y - right.y);
      const diffPx = diff;
      const isAligned = diffPx < h * 0.015; // < 1.5% of image height = aligned
      const color = isAligned ? "#22C55E" : diffPx < h * 0.03 ? "#F59E0B" : "#EF4444";

      // Horizontal line between points
      ctx.strokeStyle = color;
      ctx.lineWidth = lw * 0.7;
      ctx.setLineDash([4, 3]);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();

      // Ideal horizontal reference (dashed)
      const avgY = (left.y + right.y) / 2;
      ctx.strokeStyle = "#22C55E40";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.min(left.x, right.x) - 10, avgY);
      ctx.lineTo(Math.max(left.x, right.x) + 10, avgY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Label
      const labelX = Math.max(left.x, right.x) + 8;
      const labelText = isAligned ? `${pair.label} ✓` : `${pair.label} Δ${Math.round(diffPx)}px`;
      ctx.fillStyle = "#0F172A";
      ctx.globalAlpha = 0.8;
      const tm = ctx.measureText(labelText);
      ctx.fillRect(labelX - 2, avgY - fontSize / 2 - 2, tm.width + 6, fontSize + 4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.fillText(labelText, labelX + 1, avgY + fontSize / 3);
    }
  }
}

// ═══════ Single View Canvas Component ═══════

function PosturalCanvas({
  imageUrl,
  landmarks,
  label,
  segmentScores,
  showSkeleton,
  showPlumbLine,
  showAlignmentLines,
}: {
  imageUrl: string;
  landmarks: PoseLandmark[] | null;
  label: string;
  segmentScores?: any;
  showSkeleton: boolean;
  showPlumbLine: boolean;
  showAlignmentLines: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [detectedLandmarks, setDetectedLandmarks] = useState<PoseLandmark[] | null>(null);

  // Effective landmarks: provided > auto-detected
  const effectiveLandmarks = landmarks && landmarks.length > 0 ? landmarks : detectedLandmarks;

  useEffect(() => {
    if (!imageUrl) return;
    setImgLoaded(false);
    setDetectedLandmarks(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Auto-detect landmarks when image loads and no landmarks provided
  useEffect(() => {
    if (!imgLoaded || !imgRef.current) return;
    if (landmarks && landmarks.length > 0) return;

    let cancelled = false;
    setDetecting(true);
    detectLandmarksFromImage(imgRef.current).then((result) => {
      if (!cancelled) {
        setDetectedLandmarks(result);
        setDetecting(false);
      }
    });
    return () => { cancelled = true; };
  }, [imgLoaded, landmarks]);

  // Draw when landmarks or toggles change
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current) return;
    drawPosturalAnalysis(canvasRef.current, imgRef.current, effectiveLandmarks || null, {
      showSkeleton,
      showPlumbLine,
      showAlignmentLines,
      showIdealOverlay: false,
      segmentScores,
    });
  }, [imgLoaded, effectiveLandmarks, showSkeleton, showPlumbLine, showAlignmentLines, segmentScores]);

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-center mb-1.5 text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="relative rounded-lg overflow-hidden bg-black/80 border border-white/10">
        {imageUrl ? (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ display: imgLoaded ? "block" : "none" }}
            />
            {detecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-1.5">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-[9px] text-muted-foreground">Detecting pose...</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="aspect-[3/4] flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
        {imageUrl && !imgLoaded && (
          <div className="aspect-[3/4] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════ Main Component ═══════

export function PosturalComparisonView({
  frontImageUrl,
  backImageUrl,
  frontLandmarks,
  backLandmarks,
  segmentScores,
  postureScore,
  locale = "en",
  compact = false,
}: PosturalComparisonViewProps) {
  const isPt = locale === "pt-BR";
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showPlumbLine, setShowPlumbLine] = useState(true);
  const [showAlignmentLines, setShowAlignmentLines] = useState(true);

  const hasFront = !!frontImageUrl;
  const hasBack = !!backImageUrl;

  if (!hasFront && !hasBack) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          {isPt ? "Nenhuma imagem capturada ainda." : "No images captured yet."}
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex gap-2">
        {hasFront && (
          <PosturalCanvas
            imageUrl={frontImageUrl!}
            landmarks={frontLandmarks || null}
            label={isPt ? "Frente" : "Front"}
            segmentScores={segmentScores}
            showSkeleton={true}
            showPlumbLine={true}
            showAlignmentLines={false}
          />
        )}
        {hasBack && (
          <PosturalCanvas
            imageUrl={backImageUrl!}
            landmarks={backLandmarks || null}
            label={isPt ? "Costas" : "Back"}
            segmentScores={segmentScores}
            showSkeleton={true}
            showPlumbLine={true}
            showAlignmentLines={false}
          />
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            {isPt ? "Análise Postural Comparativa" : "Postural Alignment Analysis"}
          </CardTitle>
          {postureScore != null && (
            <Badge
              variant="outline"
              className="text-xs font-bold px-2"
              style={{ borderColor: scoreColor(postureScore), color: scoreColor(postureScore) }}
            >
              {postureScore}/100
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Toggle Controls */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showSkeleton ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-border text-muted-foreground"
            }`}
          >
            {showSkeleton ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {isPt ? "Esqueleto" : "Skeleton"}
          </button>
          <button
            onClick={() => setShowPlumbLine(!showPlumbLine)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showPlumbLine ? "border-green-500/40 text-green-400 bg-green-500/10" : "border-border text-muted-foreground"
            }`}
          >
            <Ruler className="w-3 h-3" />
            {isPt ? "Linha de Prumo" : "Plumb Line"}
          </button>
          <button
            onClick={() => setShowAlignmentLines(!showAlignmentLines)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
              showAlignmentLines ? "border-blue-500/40 text-blue-400 bg-blue-500/10" : "border-border text-muted-foreground"
            }`}
          >
            <Target className="w-3 h-3" />
            {isPt ? "Alinhamento" : "Alignment"}
          </button>
        </div>

        {/* Side-by-side Canvases */}
        <div className="flex gap-3">
          {hasFront && (
            <PosturalCanvas
              imageUrl={frontImageUrl!}
              landmarks={frontLandmarks || null}
              label={isPt ? "Vista Frontal" : "Front View"}
              segmentScores={segmentScores}
              showSkeleton={showSkeleton}
              showPlumbLine={showPlumbLine}
              showAlignmentLines={showAlignmentLines}
            />
          )}
          {hasBack && (
            <PosturalCanvas
              imageUrl={backImageUrl!}
              landmarks={backLandmarks || null}
              label={isPt ? "Vista Posterior" : "Back View"}
              segmentScores={segmentScores}
              showSkeleton={showSkeleton}
              showPlumbLine={showPlumbLine}
              showAlignmentLines={showAlignmentLines}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-white/5">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-green-500 inline-block" style={{ borderTop: "2px dashed #22C55E" }} />
            {isPt ? "Alinhamento Ideal" : "Ideal Alignment"}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-500 inline-block" style={{ borderTop: "2px dashed #F59E0B" }} />
            {isPt ? "Postura Atual" : "Current Posture"}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {isPt ? "Bom" : "Good"}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            {isPt ? "Moderado" : "Moderate"}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {isPt ? "Atenção" : "Attention"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default PosturalComparisonView;
