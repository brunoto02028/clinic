"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Grid3x3, ZoomIn, ZoomOut,
  Crosshair, Type,
} from "lucide-react";

// ── Types ──

interface PosturalGridOverlayProps {
  imageUrl: string;
  landmarks?: any[];
  view: "front" | "back" | "left" | "right";
  locale?: string;
  onExport?: (dataUrl: string) => void;
}

// ── Body zone labels per view ──

const BODY_ZONES: Record<string, { label: string; labelPt: string; yPct: number }[]> = {
  front: [
    { label: "Head", labelPt: "Cabeça", yPct: 8 },
    { label: "Shoulders", labelPt: "Ombros", yPct: 22 },
    { label: "Thorax", labelPt: "Tórax", yPct: 35 },
    { label: "Pelvis", labelPt: "Pelve", yPct: 50 },
    { label: "Knees", labelPt: "Joelhos", yPct: 70 },
    { label: "Ankles", labelPt: "Tornozelos", yPct: 88 },
  ],
  back: [
    { label: "Head", labelPt: "Cabeça", yPct: 8 },
    { label: "Scapulae", labelPt: "Escápulas", yPct: 25 },
    { label: "Spine", labelPt: "Coluna", yPct: 40 },
    { label: "Pelvis", labelPt: "Pelve", yPct: 50 },
    { label: "Knees", labelPt: "Joelhos", yPct: 70 },
    { label: "Feet", labelPt: "Pés", yPct: 90 },
  ],
  left: [
    { label: "Head", labelPt: "Cabeça", yPct: 8 },
    { label: "Cervical", labelPt: "Cervical", yPct: 18 },
    { label: "Thoracic", labelPt: "Torácica", yPct: 32 },
    { label: "Lumbar", labelPt: "Lombar", yPct: 45 },
    { label: "Hip", labelPt: "Quadril", yPct: 55 },
    { label: "Knee", labelPt: "Joelho", yPct: 72 },
    { label: "Ankle", labelPt: "Tornozelo", yPct: 90 },
  ],
  right: [
    { label: "Head", labelPt: "Cabeça", yPct: 8 },
    { label: "Cervical", labelPt: "Cervical", yPct: 18 },
    { label: "Thoracic", labelPt: "Torácica", yPct: 32 },
    { label: "Lumbar", labelPt: "Lombar", yPct: 45 },
    { label: "Hip", labelPt: "Quadril", yPct: 55 },
    { label: "Knee", labelPt: "Joelho", yPct: 72 },
    { label: "Ankle", labelPt: "Tornozelo", yPct: 90 },
  ],
};

const VIEW_LABELS: Record<string, { en: string; pt: string }> = {
  front: { en: "ANTERIOR VIEW", pt: "VISTA ANTERIOR" },
  back: { en: "POSTERIOR VIEW", pt: "VISTA POSTERIOR" },
  left: { en: "LEFT LATERAL", pt: "LATERAL ESQUERDA" },
  right: { en: "RIGHT LATERAL", pt: "LATERAL DIREITA" },
};

// ════════════════════════════════════════════════════════════════
// Component — uses <img> + absolute CSS overlays (no canvas)
// ════════════════════════════════════════════════════════════════

export function PosturalGridOverlay({
  imageUrl,
  view,
  locale = "en",
}: PosturalGridOverlayProps) {
  const isPt = locale === "pt-BR";

  const [showGrid, setShowGrid] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [gridDensity, setGridDensity] = useState<number>(40);
  const [gridOpacity, setGridOpacity] = useState(25);
  const [zoom, setZoom] = useState(100);
  const [imgError, setImgError] = useState(false);

  const zones = useMemo(() => BODY_ZONES[view] || BODY_ZONES.front, [view]);
  const viewLabel = useMemo(() => {
    const vl = VIEW_LABELS[view] || VIEW_LABELS.front;
    return isPt ? vl.pt : vl.en;
  }, [view, isPt]);

  // Generate SVG grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return null;
    const lines: JSX.Element[] = [];
    const majorEvery = 5;
    let idx = 0;
    // Vertical lines
    for (let x = gridDensity; x < 100; x += (gridDensity / 10)) {
      idx++;
      const isMajor = idx % majorEvery === 0;
      lines.push(
        <line key={`v${x}`} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%"
          stroke="white" strokeWidth={isMajor ? 1 : 0.5}
          opacity={isMajor ? gridOpacity / 100 : (gridOpacity / 100) * 0.5}
        />
      );
    }
    idx = 0;
    // Horizontal lines
    for (let y = gridDensity; y < 100; y += (gridDensity / 10)) {
      idx++;
      const isMajor = idx % majorEvery === 0;
      lines.push(
        <line key={`h${y}`} x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`}
          stroke="white" strokeWidth={isMajor ? 1 : 0.5}
          opacity={isMajor ? gridOpacity / 100 : (gridOpacity / 100) * 0.5}
        />
      );
    }
    return lines;
  }, [showGrid, gridDensity, gridOpacity]);

  if (imgError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-8 text-center space-y-2">
        <p className="text-sm text-red-500 font-medium">{isPt ? "Erro ao carregar imagem" : "Failed to load image"}</p>
        <p className="text-xs text-muted-foreground break-all">{imageUrl}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          <Button variant={showGrid ? "default" : "ghost"} size="sm" className="h-7 text-[11px] px-2" onClick={() => setShowGrid(v => !v)}>
            <Grid3x3 className="h-3 w-3 mr-1" /> {isPt ? "Grade" : "Grid"}
          </Button>
          <Button variant={showCrosshair ? "default" : "ghost"} size="sm" className="h-7 text-[11px] px-2" onClick={() => setShowCrosshair(v => !v)}>
            <Crosshair className="h-3 w-3 mr-1" /> {isPt ? "Centro" : "Center"}
          </Button>
          <Button variant={showZones ? "default" : "ghost"} size="sm" className="h-7 text-[11px] px-2" onClick={() => setShowZones(v => !v)}>
            <Type className="h-3 w-3 mr-1" /> {isPt ? "Zonas" : "Zones"}
          </Button>
        </div>

        {/* Grid density */}
        <div className="flex items-center gap-1.5 border-r pr-2 mr-1">
          <span className="text-[10px] text-muted-foreground">{isPt ? "Densidade:" : "Density:"}</span>
          {[{ v: 25, l: "S" }, { v: 40, l: "M" }, { v: 60, l: "L" }].map(d => (
            <button key={d.v} onClick={() => setGridDensity(d.v)}
              className={`w-6 h-6 rounded text-[10px] ${gridDensity === d.v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {d.l}
            </button>
          ))}
        </div>

        {/* Grid opacity */}
        <div className="flex items-center gap-1.5 border-r pr-2 mr-1 min-w-[100px]">
          <span className="text-[10px] text-muted-foreground">{isPt ? "Opac:" : "Opac:"}</span>
          <Slider
            value={[gridOpacity]}
            onValueChange={([v]) => setGridOpacity(v)}
            min={5} max={60} step={5}
            className="w-16"
          />
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setZoom(z => Math.min(z + 25, 200))}>
            <ZoomIn className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">{zoom}%</span>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setZoom(z => Math.max(z - 25, 50))}>
            <ZoomOut className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Image + overlay container */}
      <div className="border rounded-lg bg-black overflow-auto" style={{ maxHeight: "75vh" }}>
        <div className="relative inline-block" style={{ width: `${zoom}%`, minWidth: 300 }}>
          {/* The actual patient photo */}
          <img
            src={imageUrl}
            alt={`${view} view`}
            className="block w-full h-auto"
            onError={() => setImgError(true)}
            draggable={false}
          />

          {/* SVG overlay — grid + crosshair */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            {/* Grid lines */}
            {gridLines}

            {/* Border */}
            {showGrid && (
              <rect x="0" y="0" width="100%" height="100%"
                fill="none" stroke="white" strokeWidth="1.5"
                opacity={gridOpacity / 100 * 1.5}
              />
            )}

            {/* Crosshair — vertical red (plumb line) */}
            {showCrosshair && (
              <>
                <line x1="50%" y1="0%" x2="50%" y2="100%"
                  stroke="#ef4444" strokeWidth="2" strokeDasharray="8 4" opacity="0.7"
                />
                <line x1="0%" y1="50%" x2="100%" y2="50%"
                  stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.5"
                />
                <circle cx="50%" cy="50%" r="4" fill="#ef4444" stroke="white" strokeWidth="1" opacity="0.8" />
              </>
            )}

            {/* Zone horizontal guides */}
            {showZones && zones.map((z, i) => (
              <line key={i} x1="0%" y1={`${z.yPct}%`} x2="100%" y2={`${z.yPct}%`}
                stroke="#a855f7" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.25"
              />
            ))}
          </svg>

          {/* View label (top-left) */}
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[11px] font-bold px-2 py-0.5 rounded pointer-events-none">
            {viewLabel}
          </div>

          {/* Zone labels (right side) */}
          {showZones && zones.map((z, i) => (
            <div key={i}
              className="absolute right-0 translate-x-0 pointer-events-none"
              style={{ top: `${z.yPct}%`, transform: "translateY(-50%)" }}
            >
              <div className="bg-black/60 text-purple-400 text-[9px] font-bold px-1.5 py-0.5 rounded-l whitespace-nowrap">
                {isPt ? z.labelPt : z.label}
              </div>
            </div>
          ))}

          {/* Crosshair label */}
          {showCrosshair && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0 pointer-events-none">
              <div className="bg-black/60 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-b">
                CENTER
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
