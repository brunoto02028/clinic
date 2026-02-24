"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Minus,
  Triangle,
  Circle,
  MousePointer2,
  Undo2,
  Redo2,
  Trash2,
  Save,
  ZoomIn,
  ZoomOut,
  Pencil,
  Type,
  Ruler,
  RotateCcw,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { PoseLandmark, POSE_LANDMARKS, POSE_CONNECTIONS } from "@/hooks/use-pose-detection";

// ========== Types ==========

export type AnnotationTool = "select" | "line" | "angle" | "marker" | "freehand" | "text" | "ruler";

interface Point {
  x: number;
  y: number;
}

interface LineAnnotation {
  type: "line";
  id: string;
  start: Point;
  end: Point;
  color: string;
  width: number;
  label?: string;
}

interface AngleAnnotation {
  type: "angle";
  id: string;
  vertex: Point;
  arm1: Point;
  arm2: Point;
  color: string;
  width: number;
  angleDeg: number;
  label?: string;
}

interface MarkerAnnotation {
  type: "marker";
  id: string;
  position: Point;
  color: string;
  radius: number;
  label?: string;
}

interface FreehandAnnotation {
  type: "freehand";
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface TextAnnotation {
  type: "text";
  id: string;
  position: Point;
  text: string;
  color: string;
  fontSize: number;
}

interface RulerAnnotation {
  type: "ruler";
  id: string;
  start: Point;
  end: Point;
  color: string;
  width: number;
  lengthPx: number;
}

export type Annotation =
  | LineAnnotation
  | AngleAnnotation
  | MarkerAnnotation
  | FreehandAnnotation
  | TextAnnotation
  | RulerAnnotation;

interface AutoAngle {
  name: string;
  landmark1: string;
  vertex: string;
  landmark2: string;
  normalRange: [number, number];
  description: string;
}

// Pre-defined clinical angles to auto-calculate from landmarks
const CLINICAL_ANGLES: AutoAngle[] = [
  { name: "Cervical Angle", landmark1: "right_ear", vertex: "right_shoulder", landmark2: "right_hip", normalRange: [40, 55], description: "Ângulo cervical (flexão anterior da cabeça)" },
  { name: "Thoracic Kyphosis", landmark1: "right_shoulder", vertex: "right_hip", landmark2: "right_knee", normalRange: [160, 180], description: "Cifose torácica" },
  { name: "L Knee Angle", landmark1: "left_hip", vertex: "left_knee", landmark2: "left_ankle", normalRange: [170, 180], description: "Ângulo do joelho esquerdo" },
  { name: "R Knee Angle", landmark1: "right_hip", vertex: "right_knee", landmark2: "right_ankle", normalRange: [170, 180], description: "Ângulo do joelho direito" },
  { name: "L Elbow Angle", landmark1: "left_shoulder", vertex: "left_elbow", landmark2: "left_wrist", normalRange: [160, 180], description: "Ângulo do cotovelo esquerdo" },
  { name: "R Elbow Angle", landmark1: "right_shoulder", vertex: "right_elbow", landmark2: "right_wrist", normalRange: [160, 180], description: "Ângulo do cotovelo direito" },
  { name: "L Hip Angle", landmark1: "left_shoulder", vertex: "left_hip", landmark2: "left_knee", normalRange: [165, 180], description: "Ângulo do quadril esquerdo" },
  { name: "R Hip Angle", landmark1: "right_shoulder", vertex: "right_hip", landmark2: "right_knee", normalRange: [165, 180], description: "Ângulo do quadril direito" },
  { name: "L Ankle Angle", landmark1: "left_knee", vertex: "left_ankle", landmark2: "left_foot_index", normalRange: [85, 100], description: "Ângulo do tornozelo esquerdo" },
  { name: "R Ankle Angle", landmark1: "right_knee", vertex: "right_ankle", landmark2: "right_foot_index", normalRange: [85, 100], description: "Ângulo do tornozelo direito" },
  { name: "Shoulder Level", landmark1: "left_shoulder", vertex: "nose", landmark2: "right_shoulder", normalRange: [170, 180], description: "Nível dos ombros (simetria)" },
  { name: "Hip Level", landmark1: "left_hip", vertex: "nose", landmark2: "right_hip", normalRange: [170, 180], description: "Nível do quadril (simetria)" },
];

const COLORS = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF", "#AF52DE", "#FF2D55", "#FFFFFF"];

// ========== Component Props ==========

interface ImageAnnotatorProps {
  imageUrl: string;
  landmarks?: PoseLandmark[];
  annotations?: Annotation[];
  onSave?: (annotations: Annotation[], autoAngles: { name: string; angle: number; inRange: boolean }[]) => void;
  onExport?: (dataUrl: string) => void;
  readOnly?: boolean;
  width?: number;
  height?: number;
}

// ========== Helpers ==========

function calcAngle(p1: Point, vertex: Point, p2: Point): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round((Math.acos(cosAngle) * 180) / Math.PI * 10) / 10;
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function uid(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ========== Main Component ==========

export function ImageAnnotator({
  imageUrl,
  landmarks,
  annotations: initialAnnotations,
  onSave,
  onExport,
  readOnly = false,
  width = 800,
  height = 600,
}: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<AnnotationTool>("select");
  const [color, setColor] = useState("#FF3B30");
  const [lineWidth, setLineWidth] = useState(2);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations || []);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[][]>([]);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showAutoAngles, setShowAutoAngles] = useState(true);
  const [autoAngles, setAutoAngles] = useState<{ name: string; angle: number; inRange: boolean; vertex: Point; arm1: Point; arm2: Point }[]>([]);
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgNatW, setImgNatW] = useState(0);
  const [imgNatH, setImgNatH] = useState(0);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<Point[]>([]);
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([]);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<Point | null>(null);

  // Scale helpers
  const scaleRef = useRef({ sx: 1, sy: 1, ox: 0, oy: 0 });

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

  // Calculate auto angles from landmarks
  useEffect(() => {
    if (!landmarks || landmarks.length === 0) return;
    const results: typeof autoAngles = [];

    for (const ca of CLINICAL_ANGLES) {
      const l1 = landmarks.find((l) => l.name === ca.landmark1);
      const v = landmarks.find((l) => l.name === ca.vertex);
      const l2 = landmarks.find((l) => l.name === ca.landmark2);
      if (!l1 || !v || !l2) continue;
      if (l1.visibility < 0.5 || v.visibility < 0.5 || l2.visibility < 0.5) continue;

      const angle = calcAngle(
        { x: l1.x * width, y: l1.y * height },
        { x: v.x * width, y: v.y * height },
        { x: l2.x * width, y: l2.y * height }
      );
      const inRange = angle >= ca.normalRange[0] && angle <= ca.normalRange[1];
      results.push({
        name: ca.name,
        angle,
        inRange,
        vertex: { x: v.x * width, y: v.y * height },
        arm1: { x: l1.x * width, y: l1.y * height },
        arm2: { x: l2.x * width, y: l2.y * height },
      });
    }
    setAutoAngles(results);
  }, [landmarks, width, height]);

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay || !imageRef.current) return;

    const ctx = canvas.getContext("2d");
    const octx = overlay.getContext("2d");
    if (!ctx || !octx) return;

    const cw = width * zoom;
    const ch = height * zoom;
    canvas.width = cw;
    canvas.height = ch;
    overlay.width = cw;
    overlay.height = ch;

    // Draw image
    ctx.clearRect(0, 0, cw, ch);

    // Fit image into canvas maintaining aspect ratio
    const imgAR = imgNatW / imgNatH;
    const canvAR = cw / ch;
    let dw: number, dh: number, dx: number, dy: number;
    if (imgAR > canvAR) {
      dw = cw;
      dh = cw / imgAR;
      dx = 0;
      dy = (ch - dh) / 2;
    } else {
      dh = ch;
      dw = ch * imgAR;
      dx = (cw - dw) / 2;
      dy = 0;
    }
    ctx.drawImage(imageRef.current, dx, dy, dw, dh);
    scaleRef.current = { sx: dw / imgNatW, sy: dh / imgNatH, ox: dx, oy: dy };

    // Draw landmarks
    if (showLandmarks && landmarks && landmarks.length > 0) {
      const sx = dw;
      const sy = dh;

      // Connections
      ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
      ctx.lineWidth = 1.5;
      for (const [i, j] of POSE_CONNECTIONS) {
        const a = landmarks[i];
        const b = landmarks[j];
        if (!a || !b || a.visibility < 0.5 || b.visibility < 0.5) continue;
        ctx.beginPath();
        ctx.moveTo(dx + a.x * sx, dy + a.y * sy);
        ctx.lineTo(dx + b.x * sx, dy + b.y * sy);
        ctx.stroke();
      }

      // Points
      for (const lm of landmarks) {
        if (lm.visibility < 0.5) continue;
        const px = dx + lm.x * sx;
        const py = dy + lm.y * sy;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = lm.visibility > 0.8 ? "rgba(0, 255, 0, 0.8)" : "rgba(255, 255, 0, 0.6)";
        ctx.fill();
      }
    }

    // Draw auto angles
    if (showAutoAngles && autoAngles.length > 0) {
      for (const aa of autoAngles) {
        const v = { x: aa.vertex.x * zoom, y: aa.vertex.y * zoom };
        const a1 = { x: aa.arm1.x * zoom, y: aa.arm1.y * zoom };
        const a2 = { x: aa.arm2.x * zoom, y: aa.arm2.y * zoom };

        // Draw angle arms
        ctx.strokeStyle = aa.inRange ? "rgba(52, 199, 89, 0.7)" : "rgba(255, 59, 48, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(a1.x, a1.y);
        ctx.lineTo(v.x, v.y);
        ctx.lineTo(a2.x, a2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw arc
        const radius = 20;
        const angle1 = Math.atan2(a1.y - v.y, a1.x - v.x);
        const angle2 = Math.atan2(a2.y - v.y, a2.x - v.x);
        ctx.beginPath();
        ctx.arc(v.x, v.y, radius, angle1, angle2);
        ctx.strokeStyle = aa.inRange ? "rgba(52, 199, 89, 0.9)" : "rgba(255, 59, 48, 0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        const midAngle = (angle1 + angle2) / 2;
        const labelX = v.x + Math.cos(midAngle) * (radius + 15);
        const labelY = v.y + Math.sin(midAngle) * (radius + 15);
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = aa.inRange ? "#34C759" : "#FF3B30";
        ctx.textAlign = "center";
        ctx.fillText(`${aa.angle}°`, labelX, labelY);
      }
    }

    // Draw user annotations on overlay
    octx.clearRect(0, 0, cw, ch);
    for (const ann of annotations) {
      drawAnnotation(octx, ann, zoom);
    }

    // Draw in-progress drawing
    if (isDrawing && drawPoints.length > 0) {
      drawInProgress(octx, tool, drawPoints, color, lineWidth, zoom);
    }
    if (isDrawing && tool === "freehand" && freehandPoints.length > 0) {
      octx.strokeStyle = color;
      octx.lineWidth = lineWidth;
      octx.lineCap = "round";
      octx.lineJoin = "round";
      octx.beginPath();
      octx.moveTo(freehandPoints[0].x * zoom, freehandPoints[0].y * zoom);
      for (let i = 1; i < freehandPoints.length; i++) {
        octx.lineTo(freehandPoints[i].x * zoom, freehandPoints[i].y * zoom);
      }
      octx.stroke();
    }
  }, [imageLoaded, imgNatW, imgNatH, width, height, zoom, landmarks, showLandmarks, showAutoAngles, autoAngles, annotations, isDrawing, drawPoints, freehandPoints, tool, color, lineWidth]);

  useEffect(() => {
    render();
  }, [render]);

  // Draw annotation helper
  function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation, z: number) {
    switch (ann.type) {
      case "line": {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ann.start.x * z, ann.start.y * z);
        ctx.lineTo(ann.end.x * z, ann.end.y * z);
        ctx.stroke();
        if (ann.label) {
          const mx = ((ann.start.x + ann.end.x) / 2) * z;
          const my = ((ann.start.y + ann.end.y) / 2) * z - 8;
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = ann.color;
          ctx.textAlign = "center";
          ctx.fillText(ann.label, mx, my);
        }
        break;
      }
      case "angle": {
        const v = { x: ann.vertex.x * z, y: ann.vertex.y * z };
        const a1 = { x: ann.arm1.x * z, y: ann.arm1.y * z };
        const a2 = { x: ann.arm2.x * z, y: ann.arm2.y * z };
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a1.x, a1.y);
        ctx.lineTo(v.x, v.y);
        ctx.lineTo(a2.x, a2.y);
        ctx.stroke();
        // Arc
        const r = 25;
        const ang1 = Math.atan2(a1.y - v.y, a1.x - v.x);
        const ang2 = Math.atan2(a2.y - v.y, a2.x - v.x);
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, ang1, ang2);
        ctx.stroke();
        // Degree label
        const mid = (ang1 + ang2) / 2;
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = ann.color;
        ctx.textAlign = "center";
        ctx.fillText(`${ann.angleDeg}°`, v.x + Math.cos(mid) * (r + 16), v.y + Math.sin(mid) * (r + 16));
        if (ann.label) {
          ctx.font = "11px sans-serif";
          ctx.fillText(ann.label, v.x, v.y - r - 8);
        }
        // Vertex dot
        ctx.beginPath();
        ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ann.color;
        ctx.fill();
        break;
      }
      case "marker": {
        ctx.beginPath();
        ctx.arc(ann.position.x * z, ann.position.y * z, ann.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ann.position.x * z, ann.position.y * z, 3, 0, Math.PI * 2);
        ctx.fillStyle = ann.color;
        ctx.fill();
        if (ann.label) {
          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = ann.color;
          ctx.textAlign = "center";
          ctx.fillText(ann.label, ann.position.x * z, ann.position.y * z - ann.radius - 5);
        }
        break;
      }
      case "freehand": {
        if (ann.points.length < 2) return;
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x * z, ann.points[0].y * z);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x * z, ann.points[i].y * z);
        }
        ctx.stroke();
        break;
      }
      case "text": {
        ctx.font = `bold ${ann.fontSize}px sans-serif`;
        ctx.fillStyle = ann.color;
        ctx.textAlign = "left";
        ctx.fillText(ann.text, ann.position.x * z, ann.position.y * z);
        break;
      }
      case "ruler": {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.width;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(ann.start.x * z, ann.start.y * z);
        ctx.lineTo(ann.end.x * z, ann.end.y * z);
        ctx.stroke();
        ctx.setLineDash([]);
        // End markers
        const perpAngle = Math.atan2(ann.end.y - ann.start.y, ann.end.x - ann.start.x) + Math.PI / 2;
        const tickLen = 6;
        for (const p of [ann.start, ann.end]) {
          ctx.beginPath();
          ctx.moveTo(p.x * z + Math.cos(perpAngle) * tickLen, p.y * z + Math.sin(perpAngle) * tickLen);
          ctx.lineTo(p.x * z - Math.cos(perpAngle) * tickLen, p.y * z - Math.sin(perpAngle) * tickLen);
          ctx.stroke();
        }
        // Length label
        const mx = ((ann.start.x + ann.end.x) / 2) * z;
        const my = ((ann.start.y + ann.end.y) / 2) * z - 10;
        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = ann.color;
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(ann.lengthPx)}px`, mx, my);
        break;
      }
    }
  }

  function drawInProgress(ctx: CanvasRenderingContext2D, t: AnnotationTool, pts: Point[], c: string, w: number, z: number) {
    if (t === "line" || t === "ruler") {
      if (pts.length === 2) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.setLineDash(t === "ruler" ? [6, 3] : []);
        ctx.beginPath();
        ctx.moveTo(pts[0].x * z, pts[0].y * z);
        ctx.lineTo(pts[1].x * z, pts[1].y * z);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (t === "angle") {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x * z, pts[0].y * z);
        ctx.lineTo(pts[1].x * z, pts[1].y * z);
        ctx.stroke();
      }
      if (pts.length === 3) {
        ctx.beginPath();
        ctx.moveTo(pts[1].x * z, pts[1].y * z);
        ctx.lineTo(pts[2].x * z, pts[2].y * z);
        ctx.stroke();
        const angle = calcAngle(
          { x: pts[0].x * z, y: pts[0].y * z },
          { x: pts[1].x * z, y: pts[1].y * z },
          { x: pts[2].x * z, y: pts[2].y * z }
        );
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = c;
        ctx.textAlign = "center";
        ctx.fillText(`${angle}°`, pts[1].x * z + 30, pts[1].y * z - 10);
      }
    }
    // Draw dots at each point
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x * z, p.y * z, 4, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    }
  }

  // Mouse event handlers
  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    const p = getCanvasPoint(e);

    if (tool === "marker") {
      pushUndo();
      const label = prompt("Nome do marcador (opcional):");
      setAnnotations((prev) => [
        ...prev,
        { type: "marker", id: uid(), position: p, color, radius: 10, label: label || undefined },
      ]);
      return;
    }

    if (tool === "text") {
      setTextPos(p);
      const txt = prompt("Texto:");
      if (txt) {
        pushUndo();
        setAnnotations((prev) => [
          ...prev,
          { type: "text", id: uid(), position: p, text: txt, color, fontSize: 14 },
        ]);
      }
      return;
    }

    if (tool === "freehand") {
      setIsDrawing(true);
      setFreehandPoints([p]);
      return;
    }

    if (tool === "line" || tool === "ruler") {
      if (drawPoints.length === 0) {
        setIsDrawing(true);
        setDrawPoints([p]);
      }
      return;
    }

    if (tool === "angle") {
      if (drawPoints.length < 2) {
        setIsDrawing(true);
        setDrawPoints((prev) => [...prev, p]);
      }
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const p = getCanvasPoint(e);

    if (tool === "freehand") {
      setFreehandPoints((prev) => [...prev, p]);
      return;
    }

    if ((tool === "line" || tool === "ruler") && drawPoints.length === 1) {
      setDrawPoints([drawPoints[0], p]);
      return;
    }

    if (tool === "angle" && drawPoints.length >= 1) {
      const pts = [...drawPoints];
      if (pts.length === 1) pts.push(p);
      else if (pts.length === 2) pts[1] = p;
      else pts[2] = p;
      setDrawPoints(pts);
      return;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const p = getCanvasPoint(e);

    if (tool === "freehand") {
      pushUndo();
      setAnnotations((prev) => [
        ...prev,
        { type: "freehand", id: uid(), points: [...freehandPoints, p], color, width: lineWidth },
      ]);
      setFreehandPoints([]);
      setIsDrawing(false);
      return;
    }

    if (tool === "line") {
      if (drawPoints.length >= 1) {
        pushUndo();
        const start = drawPoints[0];
        setAnnotations((prev) => [
          ...prev,
          { type: "line", id: uid(), start, end: p, color, width: lineWidth },
        ]);
        setDrawPoints([]);
        setIsDrawing(false);
      }
      return;
    }

    if (tool === "ruler") {
      if (drawPoints.length >= 1) {
        pushUndo();
        const start = drawPoints[0];
        setAnnotations((prev) => [
          ...prev,
          { type: "ruler", id: uid(), start, end: p, color, width: lineWidth, lengthPx: dist(start, p) },
        ]);
        setDrawPoints([]);
        setIsDrawing(false);
      }
      return;
    }

    if (tool === "angle") {
      const pts = [...drawPoints];
      if (pts.length < 2) {
        pts.push(p);
        setDrawPoints(pts);
        return; // Need 3 points total
      }
      // Third point finishes the angle
      pushUndo();
      const angleDeg = calcAngle(pts[0], pts[1], p);
      setAnnotations((prev) => [
        ...prev,
        { type: "angle", id: uid(), arm1: pts[0], vertex: pts[1], arm2: p, color, width: lineWidth, angleDeg },
      ]);
      setDrawPoints([]);
      setIsDrawing(false);
      return;
    }
  };

  // Undo/Redo
  const pushUndo = () => {
    setUndoStack((prev) => [...prev, [...annotations]]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((rs) => [...rs, [...annotations]]);
    setAnnotations(prev);
    setUndoStack((us) => us.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((us) => [...us, [...annotations]]);
    setAnnotations(next);
    setRedoStack((rs) => rs.slice(0, -1));
  };

  const clearAll = () => {
    if (annotations.length === 0) return;
    pushUndo();
    setAnnotations([]);
  };

  // Export composite image
  const exportImage = () => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, 0);
    ctx.drawImage(overlay, 0, 0);
    const dataUrl = exportCanvas.toDataURL("image/png");
    onExport?.(dataUrl);

    // Also download
    const link = document.createElement("a");
    link.download = "annotated-assessment.png";
    link.href = dataUrl;
    link.click();
  };

  const handleSave = () => {
    const angleResults = autoAngles.map((a) => ({ name: a.name, angle: a.angle, inRange: a.inRange }));
    onSave?.(annotations, angleResults);
  };

  const tools: { id: AnnotationTool; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Selecionar" },
    { id: "line", icon: Minus, label: "Linha" },
    { id: "angle", icon: Triangle, label: "Ângulo" },
    { id: "ruler", icon: Ruler, label: "Régua" },
    { id: "marker", icon: Circle, label: "Marcador" },
    { id: "freehand", icon: Pencil, label: "Desenho Livre" },
    { id: "text", icon: Type, label: "Texto" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg">
          {/* Tools */}
          <div className="flex items-center gap-1 border-r pr-2 mr-1">
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <Button
                  key={t.id}
                  variant={tool === t.id ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setTool(t.id);
                    setDrawPoints([]);
                    setIsDrawing(false);
                  }}
                  title={t.label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1 border-r pr-2 mr-1">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-125" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          {/* Line width */}
          <div className="flex items-center gap-1 border-r pr-2 mr-1">
            {[1, 2, 3, 5].map((w) => (
              <button
                key={w}
                className={`flex items-center justify-center w-7 h-7 rounded text-xs ${lineWidth === w ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setLineWidth(w)}
              >
                {w}px
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={undoStack.length === 0} title="Desfazer">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={redoStack.length === 0} title="Refazer">
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearAll} title="Limpar tudo">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowLandmarks((v) => !v)} title={showLandmarks ? "Ocultar landmarks" : "Mostrar landmarks"}>
              {showLandmarks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(z + 0.25, 3))} title="Zoom +">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} title="Zoom -">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(1)} title="Reset zoom">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={exportImage} title="Exportar PNG">
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
            {onSave && (
              <Button size="sm" className="h-8" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative overflow-auto border rounded-lg bg-black"
        style={{ maxHeight: "70vh" }}
      >
        <canvas ref={canvasRef} style={{ width: width * zoom, height: height * zoom }} />
        <canvas
          ref={overlayRef}
          className="absolute top-0 left-0"
          style={{ width: width * zoom, height: height * zoom, cursor: readOnly ? "default" : tool === "select" ? "default" : "crosshair" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDrawing && tool === "freehand") {
              handleMouseUp({} as any);
            }
          }}
        />
      </div>

      {/* Auto-calculated angles panel */}
      {autoAngles.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Ângulos Automáticos (MediaPipe)</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowAutoAngles((v) => !v)}
            >
              {showAutoAngles ? "Ocultar" : "Mostrar"} no canvas
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {autoAngles.map((a) => (
              <div
                key={a.name}
                className={`flex items-center justify-between p-2 rounded-md text-xs ${
                  a.inRange ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"
                }`}
              >
                <span className="font-medium truncate mr-2">{a.name}</span>
                <Badge
                  variant={a.inRange ? "secondary" : "destructive"}
                  className="text-xs shrink-0"
                >
                  {a.angle}°
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annotations count */}
      {annotations.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {annotations.length} anotação(ões) — {annotations.filter((a) => a.type === "angle").length} ângulo(s), {annotations.filter((a) => a.type === "line").length} linha(s), {annotations.filter((a) => a.type === "marker").length} marcador(es)
        </p>
      )}
    </div>
  );
}
