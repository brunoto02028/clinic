"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ChevronRight, Info } from "lucide-react";
import { ANATOMY } from "./body-model-paths";
import type { SegmentPathData } from "./body-model-paths";

// ========== Types ==========

interface SegmentScore {
  score: number;
  status: "good" | "fair" | "poor";
  keyIssue: string;
}

interface SegmentScoresData {
  head?: SegmentScore;
  shoulders?: SegmentScore;
  spine?: SegmentScore;
  hips?: SegmentScore;
  knees?: SegmentScore;
  ankles?: SegmentScore;
}

interface Finding {
  area: string;
  finding: string;
  severity: "mild" | "moderate" | "severe";
  recommendation: string;
}

interface InteractiveBodyModelProps {
  segmentScores?: SegmentScoresData | null;
  aiFindings?: Finding[] | null;
  locale?: string;
}

// ========== Helpers ==========

type ViewType = "front" | "back" | "left" | "right";

const SEGMENT_META: Record<string, { en: string; pt: string }> = {
  head: { en: "Head & Neck", pt: "Cabeça e Pescoço" },
  shoulders: { en: "Shoulders", pt: "Ombros" },
  spine: { en: "Spine & Trunk", pt: "Coluna e Tronco" },
  hips: { en: "Hips & Pelvis", pt: "Quadril e Pelve" },
  knees: { en: "Knees & Thighs", pt: "Joelhos e Coxas" },
  ankles: { en: "Lower Legs & Feet", pt: "Pernas e Pés" },
};

const SEGMENT_ICONS: Record<string, string> = {
  head: "🧠", shoulders: "💪", spine: "🦴", hips: "🫁", knees: "🦵", ankles: "🦶",
};

function getColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 70) return "#EAB308";
  if (score >= 60) return "#F97316";
  return "#EF4444";
}

function getGlow(score: number): string {
  const c = score >= 80 ? "34,197,94" : score >= 70 ? "234,179,8" : score >= 60 ? "249,115,22" : "239,68,68";
  return `drop-shadow(0 0 8px rgba(${c},0.6))`;
}

function getGrade(score: number, isPt: boolean): string {
  if (score >= 80) return isPt ? "Bom" : "Good";
  if (score >= 70) return isPt ? "Moderado" : "Moderate";
  if (score >= 60) return isPt ? "Atenção" : "Attention";
  return isPt ? "Crítico" : "Critical";
}

// ========== Segment Detail Panel ==========

function SegmentDetailPanel({
  segKey, data, findings, isPt, onClose,
}: {
  segKey: string; data: SegmentScore; findings: Finding[]; isPt: boolean; onClose: () => void;
}) {
  const meta = SEGMENT_META[segKey];
  const color = getColor(data.score);

  return (
    <div className="rounded-xl border bg-card/95 backdrop-blur-sm p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{SEGMENT_ICONS[segKey]}</span>
          <span className="text-sm font-bold">{isPt ? meta?.pt : meta?.en}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }} className="text-xs font-bold border">
            {data.score}/100 — {getGrade(data.score, isPt)}
          </Badge>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${data.score}%`, backgroundColor: color }} />
      </div>
      {data.keyIssue && (
        <p className="text-xs text-muted-foreground mb-2">
          <span className="font-medium text-foreground/80">{isPt ? "Achado principal:" : "Key issue:"}</span> {data.keyIssue}
        </p>
      )}
      {findings.length > 0 && (
        <div className="space-y-1.5 mt-2 pt-2 border-t">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{isPt ? "Achados Clínicos" : "Clinical Findings"}</p>
          {findings.slice(0, 4).map((f, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div>
                <span className="font-medium">{f.finding}</span>
                {f.recommendation && <span className="text-muted-foreground"> — {f.recommendation}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Anatomical SVG Renderer ==========

function AnatomicalBody({
  view, segmentScores, selectedSegment, hoveredSegment, onSelect, onHover,
}: {
  view: ViewType;
  segmentScores: SegmentScoresData;
  selectedSegment: string | null;
  hoveredSegment: string | null;
  onSelect: (seg: string | null) => void;
  onHover: (seg: string | null) => void;
}) {
  const viewData = ANATOMY[view];
  if (!viewData) return null;

  return (
    <svg viewBox="0 0 220 520" className="w-full h-full" style={{ maxHeight: "420px" }}>
      <defs>
        {/* Gradients for each segment based on score */}
        {Object.keys(viewData.segments).map((segKey) => {
          const data = (segmentScores as any)[segKey] as SegmentScore | undefined;
          const color = data ? getColor(data.score) : "#64748B";
          return (
            <radialGradient key={`grad-${segKey}`} id={`anat-grad-${view}-${segKey}`} cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="80%" stopColor={color} stopOpacity={0.12} />
              <stop offset="100%" stopColor={color} stopOpacity={0.04} />
            </radialGradient>
          );
        })}
        {/* Glow filter for active/hovered segments */}
        <filter id="anat-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Subtle body shadow */}
        <filter id="body-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Background grid lines (subtle) */}
      <g opacity={0.04} stroke="currentColor">
        <line x1="110" y1="0" x2="110" y2="520" strokeWidth="0.5" strokeDasharray="4,8" />
        {[100, 200, 300, 400].map(y => (
          <line key={y} x1="20" y1={y} x2="200" y2={y} strokeWidth="0.3" strokeDasharray="2,6" />
        ))}
      </g>

      {/* Decorative arms (non-interactive) */}
      <g opacity={0.2}>
        {viewData.arms.map((d, i) => (
          <path key={`arm-${i}`} d={d} fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.2} strokeLinejoin="round" />
        ))}
      </g>

      {/* Body segments — shapes */}
      {Object.entries(viewData.segments).map(([segKey, segData]: [string, SegmentPathData]) => {
        const data = (segmentScores as any)[segKey] as SegmentScore | undefined;
        const color = data ? getColor(data.score) : "#64748B";
        const isActive = selectedSegment === segKey;
        const isHovered = hoveredSegment === segKey;

        return (
          <g
            key={segKey}
            onClick={() => onSelect(isActive ? null : segKey)}
            onMouseEnter={() => onHover(segKey)}
            onMouseLeave={() => onHover(null)}
            className="cursor-pointer"
            style={{ filter: isActive || isHovered ? getGlow(data?.score || 50) : "none" }}
          >
            {/* Filled shapes */}
            {segData.shapes.map((p, pi) => (
              <path
                key={`shape-${pi}`}
                d={p}
                fill={`url(#anat-grad-${view}-${segKey})`}
                stroke={color}
                strokeWidth={isActive ? 2 : isHovered ? 1.5 : 0.8}
                strokeOpacity={isActive ? 1 : isHovered ? 0.8 : 0.4}
                strokeLinejoin="round"
                className="transition-all duration-200"
              />
            ))}

            {/* Internal detail lines (muscle definition) */}
            {segData.details.map((d, di) => (
              <path
                key={`detail-${di}`}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={0.5}
                strokeOpacity={isActive ? 0.4 : isHovered ? 0.3 : 0.12}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="transition-all duration-200 pointer-events-none"
              />
            ))}

            {/* Anatomical landmarks (dots) */}
            {segData.landmarks.map((lm, li) => (
              <circle
                key={`lm-${li}`}
                cx={lm.cx}
                cy={lm.cy}
                r={lm.r}
                fill={color}
                fillOpacity={isActive ? 0.5 : 0.15}
                stroke={color}
                strokeWidth={0.5}
                strokeOpacity={isActive ? 0.8 : 0.25}
                className="transition-all duration-200 pointer-events-none"
              />
            ))}
          </g>
        );
      })}

      {/* Score badges */}
      {Object.entries(viewData.segments).map(([segKey, segData]: [string, SegmentPathData]) => {
        const data = (segmentScores as any)[segKey] as SegmentScore | undefined;
        if (!data) return null;
        const color = getColor(data.score);
        const { x, y } = segData.labelPos;

        return (
          <g key={`badge-${segKey}`} className="pointer-events-none">
            {/* Badge background pill */}
            <rect
              x={x - 14}
              y={y - 8}
              width={28}
              height={16}
              rx={8}
              fill="#0F172A"
              fillOpacity={0.85}
              stroke={color}
              strokeWidth={1}
              strokeOpacity={0.6}
            />
            {/* Score text */}
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fill={color}
              className="select-none"
            >
              {Math.round(data.score)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ========== Main Component ==========

export function InteractiveBodyModel({ segmentScores, aiFindings, locale }: InteractiveBodyModelProps) {
  const isPt = locale === "pt-BR";
  const [view, setView] = useState<ViewType>("front");
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const views: { key: ViewType; label: string }[] = [
    { key: "front", label: isPt ? "Anterior" : "Anterior" },
    { key: "back", label: isPt ? "Posterior" : "Posterior" },
    { key: "left", label: isPt ? "Lateral E" : "Left Lat." },
    { key: "right", label: isPt ? "Lateral D" : "Right Lat." },
  ];

  const getRelatedFindings = useCallback((segKey: string) => {
    if (!aiFindings) return [];
    const area = segKey.toLowerCase();
    return aiFindings.filter(f => {
      const fa = f.area?.toLowerCase() || "";
      if (area === "head") return fa.includes("head") || fa.includes("neck") || fa.includes("cervical") || fa.includes("cabeça") || fa.includes("pescoço");
      if (area === "shoulders") return fa.includes("shoulder") || fa.includes("scapul") || fa.includes("ombro");
      if (area === "spine") return fa.includes("spine") || fa.includes("trunk") || fa.includes("thorac") || fa.includes("lumbar") || fa.includes("coluna") || fa.includes("tronco");
      if (area === "hips") return fa.includes("hip") || fa.includes("pelv") || fa.includes("quadril");
      if (area === "knees") return fa.includes("knee") || fa.includes("joelho") || fa.includes("thigh") || fa.includes("coxa");
      if (area === "ankles") return fa.includes("ankle") || fa.includes("foot") || fa.includes("feet") || fa.includes("calf") || fa.includes("tornozelo") || fa.includes("panturrilha");
      return false;
    });
  }, [aiFindings]);

  if (!segmentScores) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-900/5 to-transparent dark:from-slate-100/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            {isPt ? "Modelo Anatômico Interativo" : "Interactive Anatomical Model"}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Info className="h-2.5 w-2.5" />
            {isPt ? "Clique nas regiões" : "Click regions to inspect"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Body SVG Area */}
          <div className="flex-shrink-0 flex flex-col items-center" style={{ width: "280px" }}>
            {/* View toggle */}
            <div className="flex gap-1 mb-3 bg-muted/60 rounded-lg p-0.5 w-full">
              {views.map(v => (
                <button
                  key={v.key}
                  onClick={() => { setView(v.key); setSelectedSegment(null); }}
                  className={`flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
                    view === v.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Anatomical SVG */}
            <div className="relative w-full bg-gradient-to-b from-muted/20 via-transparent to-muted/20 rounded-xl p-2 border border-dashed border-muted-foreground/10">
              <AnatomicalBody
                view={view}
                segmentScores={segmentScores}
                selectedSegment={selectedSegment}
                hoveredSegment={hoveredSegment}
                onSelect={setSelectedSegment}
                onHover={setHoveredSegment}
              />
            </div>

            {/* View label */}
            <div className="text-center mt-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">
                {views.find(v => v.key === view)?.label} — {isPt ? "Vista" : "View"}
              </span>
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0">
            {selectedSegment && (segmentScores as any)[selectedSegment] ? (
              <SegmentDetailPanel
                segKey={selectedSegment}
                data={(segmentScores as any)[selectedSegment]}
                findings={getRelatedFindings(selectedSegment)}
                isPt={isPt}
                onClose={() => setSelectedSegment(null)}
              />
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center p-4 rounded-xl border border-dashed">
                <Eye className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground mb-3">
                  {isPt
                    ? "Clique em uma região do corpo para ver detalhes clínicos, score e achados."
                    : "Click a body region to see clinical details, score, and findings."}
                </p>

                {/* Quick segment list */}
                <div className="w-full space-y-1">
                  {Object.entries(segmentScores)
                    .filter(([, d]) => d && typeof d === "object" && "score" in d)
                    .sort(([, a], [, b]) => ((a as SegmentScore).score) - ((b as SegmentScore).score))
                    .map(([key, data]) => {
                      const seg = data as SegmentScore;
                      const meta = SEGMENT_META[key];
                      const color = getColor(seg.score);
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedSegment(key)}
                          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted/50 transition-colors group"
                        >
                          <span className="text-xs">{SEGMENT_ICONS[key]}</span>
                          <span className="text-[11px] flex-1 group-hover:text-foreground">{isPt ? meta?.pt : meta?.en}</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${seg.score}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-[11px] font-bold tabular-nums w-6 text-right" style={{ color }}>{seg.score}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InteractiveBodyModel;
