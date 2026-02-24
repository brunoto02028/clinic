"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Columns2,
  Rows2,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Grid3x3,
  Maximize2,
  ArrowLeftRight,
} from "lucide-react";
import { PoseLandmark, POSE_CONNECTIONS } from "@/hooks/use-pose-detection";

// ========== Types ==========

interface ImageData {
  label: string;
  url: string | null;
  landmarks?: PoseLandmark[];
  date?: string;
}

interface ImageComparisonProps {
  images: ImageData[];
  title?: string;
  onExport?: (dataUrl: string) => void;
}

type Layout = "side-by-side" | "stacked" | "overlay" | "slider";

// ========== Component ==========

export function ImageComparison({ images, title, onExport }: ImageComparisonProps) {
  const [layout, setLayout] = useState<Layout>("side-by-side");
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(Math.min(1, images.length - 1));
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(50);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leftImgRef = useRef<HTMLImageElement | null>(null);
  const rightImgRef = useRef<HTMLImageElement | null>(null);
  const [leftLoaded, setLeftLoaded] = useState(false);
  const [rightLoaded, setRightLoaded] = useState(false);

  const leftImage = images[leftIndex];
  const rightImage = images[rightIndex];

  // Load images
  useEffect(() => {
    setLeftLoaded(false);
    if (!leftImage?.url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { leftImgRef.current = img; setLeftLoaded(true); };
    img.src = leftImage.url;
  }, [leftImage?.url]);

  useEffect(() => {
    setRightLoaded(false);
    if (!rightImage?.url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { rightImgRef.current = img; setRightLoaded(true); };
    img.src = rightImage.url;
  }, [rightImage?.url]);

  const drawImageWithOverlays = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    landmarks: PoseLandmark[] | undefined,
    x: number, y: number, w: number, h: number,
    clipX?: number, clipW?: number,
    opacity?: number
  ) => {
    ctx.save();
    if (clipX !== undefined && clipW !== undefined) {
      ctx.beginPath();
      ctx.rect(clipX, 0, clipW, ctx.canvas.height);
      ctx.clip();
    }
    if (opacity !== undefined) ctx.globalAlpha = opacity / 100;

    // Fit image maintaining aspect ratio
    const imgAR = img.naturalWidth / img.naturalHeight;
    const boxAR = w / h;
    let dw: number, dh: number, dx: number, dy: number;
    if (imgAR > boxAR) {
      dw = w; dh = w / imgAR; dx = x; dy = y + (h - dh) / 2;
    } else {
      dh = h; dw = h * imgAR; dx = x + (w - dw) / 2; dy = y;
    }
    ctx.drawImage(img, dx, dy, dw, dh);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 0.5;
      const gs = 40 * zoom;
      for (let gx = dx; gx <= dx + dw; gx += gs) {
        ctx.beginPath(); ctx.moveTo(gx, dy); ctx.lineTo(gx, dy + dh); ctx.stroke();
      }
      for (let gy = dy; gy <= dy + dh; gy += gs) {
        ctx.beginPath(); ctx.moveTo(dx, gy); ctx.lineTo(dx + dw, gy); ctx.stroke();
      }
    }

    // Landmarks
    if (showLandmarks && landmarks) {
      ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
      ctx.lineWidth = 1.5;
      for (const [i, j] of POSE_CONNECTIONS) {
        const a = landmarks[i]; const b = landmarks[j];
        if (!a || !b || a.visibility < 0.5 || b.visibility < 0.5) continue;
        ctx.beginPath();
        ctx.moveTo(dx + a.x * dw, dy + a.y * dh);
        ctx.lineTo(dx + b.x * dw, dy + b.y * dh);
        ctx.stroke();
      }
      for (const lm of landmarks) {
        if (lm.visibility < 0.5) continue;
        ctx.beginPath();
        ctx.arc(dx + lm.x * dw, dy + lm.y * dh, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
        ctx.fill();
      }
    }

    ctx.restore();
  }, [showGrid, showLandmarks, zoom]);

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const baseW = 700;
    const baseH = 900;

    if (layout === "side-by-side") {
      const cw = baseW * 2 * zoom;
      const ch = baseH * zoom;
      canvas.width = cw;
      canvas.height = ch;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, cw, ch);

      // Divider
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cw / 2, 0);
      ctx.lineTo(cw / 2, ch);
      ctx.stroke();

      if (leftLoaded && leftImgRef.current) {
        drawImageWithOverlays(ctx, leftImgRef.current, leftImage?.landmarks, 0, 0, cw / 2, ch);
      }
      if (rightLoaded && rightImgRef.current) {
        drawImageWithOverlays(ctx, rightImgRef.current, rightImage?.landmarks, cw / 2, 0, cw / 2, ch);
      }

      // Labels
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText(leftImage?.label || "Left", cw / 4, 20);
      ctx.fillText(rightImage?.label || "Right", (cw * 3) / 4, 20);
      if (leftImage?.date) ctx.fillText(leftImage.date, cw / 4, 38);
      if (rightImage?.date) ctx.fillText(rightImage.date, (cw * 3) / 4, 38);

    } else if (layout === "stacked") {
      const cw = baseW * zoom;
      const ch = baseH * 2 * zoom;
      canvas.width = cw;
      canvas.height = ch;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, cw, ch);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ch / 2);
      ctx.lineTo(cw, ch / 2);
      ctx.stroke();

      if (leftLoaded && leftImgRef.current) {
        drawImageWithOverlays(ctx, leftImgRef.current, leftImage?.landmarks, 0, 0, cw, ch / 2);
      }
      if (rightLoaded && rightImgRef.current) {
        drawImageWithOverlays(ctx, rightImgRef.current, rightImage?.landmarks, 0, ch / 2, cw, ch / 2);
      }

      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText(leftImage?.label || "Top", cw / 2, 20);
      ctx.fillText(rightImage?.label || "Bottom", cw / 2, ch / 2 + 20);

    } else if (layout === "overlay") {
      const cw = baseW * zoom;
      const ch = baseH * zoom;
      canvas.width = cw;
      canvas.height = ch;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, cw, ch);

      if (leftLoaded && leftImgRef.current) {
        drawImageWithOverlays(ctx, leftImgRef.current, leftImage?.landmarks, 0, 0, cw, ch, undefined, undefined, 100);
      }
      if (rightLoaded && rightImgRef.current) {
        drawImageWithOverlays(ctx, rightImgRef.current, rightImage?.landmarks, 0, 0, cw, ch, undefined, undefined, overlayOpacity);
      }

      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText(`${leftImage?.label} (base)`, 10, 20);
      ctx.textAlign = "right";
      ctx.fillText(`${rightImage?.label} (${overlayOpacity}%)`, cw - 10, 20);

    } else if (layout === "slider") {
      const cw = baseW * zoom;
      const ch = baseH * zoom;
      canvas.width = cw;
      canvas.height = ch;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, cw, ch);

      const splitX = (sliderPosition / 100) * cw;

      if (leftLoaded && leftImgRef.current) {
        drawImageWithOverlays(ctx, leftImgRef.current, leftImage?.landmarks, 0, 0, cw, ch, 0, splitX);
      }
      if (rightLoaded && rightImgRef.current) {
        drawImageWithOverlays(ctx, rightImgRef.current, rightImage?.landmarks, 0, 0, cw, ch, splitX, cw - splitX);
      }

      // Slider line
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, ch);
      ctx.stroke();

      // Slider handle
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(splitX, ch / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⟺", splitX, ch / 2 + 4);

      // Labels
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(leftImage?.label || "Left", 10, 20);
      ctx.textAlign = "right";
      ctx.fillText(rightImage?.label || "Right", cw - 10, 20);
    }
  }, [layout, leftLoaded, rightLoaded, leftImage, rightImage, showLandmarks, showGrid, zoom, sliderPosition, overlayOpacity, drawImageWithOverlays]);

  useEffect(() => { render(); }, [render]);

  // Slider drag
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (layout !== "slider") return;
    setIsDraggingSlider(true);
    updateSlider(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSlider || layout !== "slider") return;
    updateSlider(e);
  };

  const updateSlider = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(pct);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onExport?.(dataUrl);
    const link = document.createElement("a");
    link.download = `comparison-${leftImage?.label}-vs-${rightImage?.label}.png`;
    link.href = dataUrl;
    link.click();
  };

  const availableImages = images.filter((img) => img.url);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg">
        {/* Image selectors */}
        <div className="flex items-center gap-2 border-r pr-2 mr-1">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-medium">Esq:</span>
            <Select value={String(leftIndex)} onValueChange={(v) => setLeftIndex(Number(v))}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableImages.map((img, i) => (
                  <SelectItem key={i} value={String(images.indexOf(img))} className="text-xs">
                    {img.label}{img.date ? ` (${img.date})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-medium">Dir:</span>
            <Select value={String(rightIndex)} onValueChange={(v) => setRightIndex(Number(v))}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableImages.map((img, i) => (
                  <SelectItem key={i} value={String(images.indexOf(img))} className="text-xs">
                    {img.label}{img.date ? ` (${img.date})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Layout buttons */}
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          <Button variant={layout === "side-by-side" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setLayout("side-by-side")} title="Lado a lado">
            <Columns2 className="h-4 w-4" />
          </Button>
          <Button variant={layout === "stacked" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setLayout("stacked")} title="Empilhado">
            <Rows2 className="h-4 w-4" />
          </Button>
          <Button variant={layout === "overlay" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setLayout("overlay")} title="Sobreposição">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant={layout === "slider" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setLayout("slider")} title="Slider">
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Toggle options */}
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          <Button variant={showLandmarks ? "default" : "ghost"} size="sm" className="h-8 text-xs" onClick={() => setShowLandmarks((v) => !v)}>
            {showLandmarks ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />} Pose
          </Button>
          <Button variant={showGrid ? "default" : "ghost"} size="sm" className="h-8 text-xs" onClick={() => setShowGrid((v) => !v)}>
            <Grid3x3 className="h-3.5 w-3.5 mr-1" /> Grid
          </Button>
        </div>

        {/* Overlay opacity */}
        {layout === "overlay" && (
          <div className="flex items-center gap-2 border-r pr-2 mr-1">
            <span className="text-xs text-muted-foreground">Opacidade:</span>
            <input
              type="range" min="0" max="100" value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(Number(e.target.value))}
              className="w-20 h-1.5"
            />
            <span className="text-xs w-8">{overlayOpacity}%</span>
          </div>
        )}

        {/* Zoom & export */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(z - 0.1, 0.3))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(1)}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="border rounded-lg bg-black overflow-auto" style={{ maxHeight: "75vh" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={() => setIsDraggingSlider(false)}
          onMouseLeave={() => setIsDraggingSlider(false)}
          style={{ cursor: layout === "slider" ? "ew-resize" : "default" }}
        />
      </div>
    </div>
  );
}
