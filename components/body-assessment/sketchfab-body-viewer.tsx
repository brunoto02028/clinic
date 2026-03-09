"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  RotateCcw,
  Camera,
  ChevronRight,
  Loader2,
  Maximize2,
  Info,
  X,
} from "lucide-react";

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

interface SketchfabBodyViewerProps {
  segmentScores?: SegmentScoresData | null;
  aiFindings?: Finding[] | null;
  locale?: string;
  modelUid?: string;
}

// ========== Constants ==========

const DEFAULT_MODEL_UID = "faf0f3eaec554bcf854be2038993024f";

const SEGMENT_META: Record<string, { en: string; pt: string; icon: string }> = {
  head: { en: "Head & Neck", pt: "Cabeça e Pescoço", icon: "🧠" },
  shoulders: { en: "Shoulders", pt: "Ombros", icon: "💪" },
  spine: { en: "Spine & Trunk", pt: "Coluna e Tronco", icon: "🦴" },
  hips: { en: "Hips & Pelvis", pt: "Quadril e Pelve", icon: "🫁" },
  knees: { en: "Knees & Thighs", pt: "Joelhos e Coxas", icon: "🦵" },
  ankles: { en: "Lower Legs & Feet", pt: "Pernas e Pés", icon: "🦶" },
};

// Keywords to match material/node names to body segments
const SEGMENT_KEYWORDS: Record<string, string[]> = {
  head: ["head", "skull", "cranium", "jaw", "mandible", "cervical", "neck", "face", "cranio", "cabeca", "pescoco"],
  shoulders: ["shoulder", "scapula", "clavicle", "deltoid", "trapezius", "ombro", "escapula", "clavicula"],
  spine: ["spine", "thoracic", "lumbar", "rib", "sternum", "vertebra", "torso", "trunk", "chest", "abdomen", "pectoral", "rectus", "oblique", "coluna", "costela", "tronco", "peito"],
  hips: ["hip", "pelvis", "iliac", "sacrum", "sacral", "gluteus", "glute", "quadril", "pelve", "gluteo"],
  knees: ["knee", "femur", "thigh", "quadricep", "patella", "hamstring", "joelho", "coxa", "femoral"],
  ankles: ["ankle", "tibia", "fibula", "foot", "feet", "calf", "calcaneus", "metatarsal", "toe", "shin", "gastrocnemius", "soleus", "tornozelo", "pe", "panturrilha", "canela"],
};

// Camera presets: [position, target]
const CAMERA_PRESETS: Record<string, { position: number[]; target: number[] }> = {
  anterior: { position: [0, 1, 3], target: [0, 1, 0] },
  posterior: { position: [0, 1, -3], target: [0, 1, 0] },
  left: { position: [-3, 1, 0], target: [0, 1, 0] },
  right: { position: [3, 1, 0], target: [0, 1, 0] },
};

function getColor(score: number): [number, number, number] {
  if (score >= 80) return [0.13, 0.77, 0.37]; // green
  if (score >= 70) return [0.92, 0.70, 0.03]; // yellow
  if (score >= 60) return [0.98, 0.45, 0.09]; // orange
  return [0.94, 0.27, 0.27]; // red
}

function getColorHex(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 70) return "#EAB308";
  if (score >= 60) return "#F97316";
  return "#EF4444";
}

function getGrade(score: number, isPt: boolean): string {
  if (score >= 80) return isPt ? "Bom" : "Good";
  if (score >= 70) return isPt ? "Moderado" : "Moderate";
  if (score >= 60) return isPt ? "Atenção" : "Attention";
  return isPt ? "Crítico" : "Critical";
}

function matchSegment(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [segment, keywords] of Object.entries(SEGMENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return segment;
  }
  return null;
}

// ========== Sketchfab API type declarations ==========

interface SketchfabAPI {
  start: (cb?: () => void) => void;
  addEventListener: (event: string, cb: (...args: any[]) => void) => void;
  getMaterialList: (cb: (err: any, materials: any[]) => void) => void;
  setMaterial: (material: any, cb?: () => void) => void;
  getNodeMap: (cb: (err: any, nodes: Record<string, any>) => void) => void;
  setCameraLookAt: (
    position: number[],
    target: number[],
    duration?: number,
    cb?: () => void
  ) => void;
  recenterCamera: (cb?: () => void) => void;
  getScreenShot: (
    size: [number, number],
    mime: string,
    cb: (err: any, result: string) => void
  ) => void;
  show: (instanceId: number, cb?: () => void) => void;
  hide: (instanceId: number, cb?: () => void) => void;
  setBackground: (options: any, cb?: () => void) => void;
  setPostProcessing: (settings: any, cb?: () => void) => void;
  createAnnotation: (
    posStart: number[],
    posEnd: number[],
    eye: number[],
    target: number[],
    title: string,
    text: string,
    cb?: (err: any, index: number) => void
  ) => void;
}

// ========== Component ==========

export function SketchfabBodyViewer({
  segmentScores,
  aiFindings,
  locale,
  modelUid,
}: SketchfabBodyViewerProps) {
  const isPt = locale === "pt-BR";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const apiRef = useRef<SketchfabAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [materialMap, setMaterialMap] = useState<Record<string, any[]>>({});
  const [activeView, setActiveView] = useState("anterior");
  const [isCapturing, setIsCapturing] = useState(false);

  const uid = modelUid || DEFAULT_MODEL_UID;

  // Load Sketchfab script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).Sketchfab) return;

    const script = document.createElement("script");
    script.src = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
    script.async = true;
    script.onload = () => {
      initViewer();
    };
    script.onerror = () => {
      setError(isPt ? "Erro ao carregar o viewer 3D" : "Failed to load 3D viewer");
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Init viewer when script is loaded
  useEffect(() => {
    if ((window as any).Sketchfab && !apiRef.current && iframeRef.current) {
      initViewer();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initViewer = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const SketchfabClass = (window as any).Sketchfab;
    if (!SketchfabClass) return;

    const client = new SketchfabClass(iframe);

    client.init(uid, {
      success: (api: SketchfabAPI) => {
        apiRef.current = api;
        api.start();
        api.addEventListener("viewerready", () => {
          setIsLoading(false);
          setIsReady(true);

          // Set dark background
          api.setBackground(
            { color: [0.06, 0.09, 0.13, 1] },
            () => {}
          );

          // Discover and map materials to body segments
          discoverMaterials(api);
        });
      },
      error: () => {
        setError(
          isPt
            ? "Erro ao inicializar o modelo 3D"
            : "Failed to initialize 3D model"
        );
        setIsLoading(false);
      },
      autostart: 0,
      ui_stop: 0,
      ui_inspector: 0,
      ui_watermark: 0,
      ui_watermark_link: 0,
      ui_controls: 1,
      ui_general_controls: 1,
      ui_settings: 0,
      ui_annotations: 0,
      ui_fullscreen: 0,
      ui_help: 0,
      ui_hint: 0,
      ui_infos: 0,
      ui_vr: 0,
      transparent: 0,
      scrollwheel: 1,
      double_click: 0,
      orbit_constraint_pitch_down: -0.2,
    });
  }, [uid, isPt]);

  const discoverMaterials = useCallback(
    (api: SketchfabAPI) => {
      api.getMaterialList((err: any, materials: any[]) => {
        if (err || !materials) return;

        const mapping: Record<string, any[]> = {};

        materials.forEach((mat) => {
          const name = mat.name || "";
          const segment = matchSegment(name);
          if (segment) {
            if (!mapping[segment]) mapping[segment] = [];
            mapping[segment].push(mat);
          }
        });

        setMaterialMap(mapping);

        // Apply score-based colors to matched materials
        if (segmentScores) {
          applyScoreColors(api, materials, segmentScores);
        }
      });
    },
    [segmentScores]
  );

  const applyScoreColors = useCallback(
    (
      api: SketchfabAPI,
      materials: any[],
      scores: SegmentScoresData
    ) => {
      materials.forEach((mat) => {
        const name = mat.name || "";
        const segment = matchSegment(name);
        if (!segment) return;

        const segData = (scores as any)[segment] as SegmentScore | undefined;
        if (!segData) return;

        const [r, g, b] = getColor(segData.score);

        // Modify the material color
        const updatedMat = { ...mat };
        if (updatedMat.channels) {
          // Try AlbedoPBR first (PBR workflow)
          if (updatedMat.channels.AlbedoPBR) {
            updatedMat.channels.AlbedoPBR.color = [r, g, b];
            updatedMat.channels.AlbedoPBR.enable = true;
          }
          // Also try DiffuseColor (classic workflow)
          if (updatedMat.channels.DiffuseColor) {
            updatedMat.channels.DiffuseColor.color = [r, g, b];
            updatedMat.channels.DiffuseColor.enable = true;
          }
          // Add slight emissive glow for emphasis
          if (updatedMat.channels.EmitColor) {
            updatedMat.channels.EmitColor.color = [r * 0.15, g * 0.15, b * 0.15];
            updatedMat.channels.EmitColor.enable = true;
          }
        }

        api.setMaterial(updatedMat);
      });
    },
    []
  );

  // Camera presets
  const setCameraView = useCallback(
    (view: string) => {
      const api = apiRef.current;
      if (!api) return;
      const preset = CAMERA_PRESETS[view];
      if (!preset) return;
      api.setCameraLookAt(preset.position, preset.target, 1.5);
      setActiveView(view);
    },
    []
  );

  const resetCamera = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    api.recenterCamera();
    setActiveView("anterior");
  }, []);

  // Screenshot
  const captureScreenshot = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    setIsCapturing(true);
    api.getScreenShot([1920, 1080], "image/png", (err: any, result: string) => {
      setIsCapturing(false);
      if (err || !result) return;
      // Download the screenshot
      const link = document.createElement("a");
      link.href = result;
      link.download = `body-assessment-3d-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }, []);

  // Get related findings for a segment
  const getRelatedFindings = useCallback(
    (segKey: string) => {
      if (!aiFindings) return [];
      const keywords = SEGMENT_KEYWORDS[segKey] || [];
      return aiFindings.filter((f) => {
        const fa = f.area?.toLowerCase() || "";
        return keywords.some((kw) => fa.includes(kw));
      });
    },
    [aiFindings]
  );

  const views = [
    { key: "anterior", label: isPt ? "Anterior" : "Anterior" },
    { key: "posterior", label: isPt ? "Posterior" : "Posterior" },
    { key: "left", label: isPt ? "Lateral E" : "Left Lat." },
    { key: "right", label: isPt ? "Lateral D" : "Right Lat." },
  ];

  if (!segmentScores) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-900/5 to-transparent dark:from-slate-100/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            {isPt ? "Modelo Anatômico 3D" : "3D Anatomical Model"}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isReady && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[10px]"
                  onClick={captureScreenshot}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                  {isPt ? "Capturar" : "Screenshot"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[10px]"
                  onClick={resetCamera}
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              </>
            )}
            <Badge variant="outline" className="text-[10px] gap-1">
              <Maximize2 className="h-2.5 w-2.5" />
              {isPt ? "Rotacione o modelo" : "Rotate the model"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 3D Viewer Area */}
          <div className="flex-1 min-w-0">
            {/* Camera presets */}
            {isReady && (
              <div className="flex gap-1 mb-2 bg-muted/60 rounded-lg p-0.5">
                {views.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setCameraView(v.key)}
                    className={`flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
                      activeView === v.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {/* Iframe container */}
            <div className="relative rounded-xl overflow-hidden bg-[#0F172A] border border-muted-foreground/10" style={{ aspectRatio: "4/3" }}>
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0F172A]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="text-xs text-muted-foreground">
                    {isPt ? "Carregando modelo 3D..." : "Loading 3D model..."}
                  </p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0F172A]">
                  <p className="text-xs text-red-400 mb-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      initViewer();
                    }}
                  >
                    {isPt ? "Tentar novamente" : "Try again"}
                  </Button>
                </div>
              )}

              {/* Sketchfab iframe */}
              <iframe
                ref={iframeRef}
                id="sketchfab-body-viewer"
                title="3D Body Model"
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
                style={{ minHeight: "400px" }}
              />
            </div>

            {/* Attribution */}
            <p className="text-[9px] text-muted-foreground/50 mt-1 text-center">
              3D model via Sketchfab — CC BY License
            </p>
          </div>

          {/* Side panel — Segment scores & detail */}
          <div className="w-full lg:w-72 flex-shrink-0">
            {/* Selected segment detail */}
            {selectedSegment && (segmentScores as any)[selectedSegment] ? (
              <div className="rounded-xl border bg-card/95 backdrop-blur-sm p-4 shadow-lg animate-in fade-in slide-in-from-right-2 duration-200 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {SEGMENT_META[selectedSegment]?.icon}
                    </span>
                    <span className="text-sm font-bold">
                      {isPt
                        ? SEGMENT_META[selectedSegment]?.pt
                        : SEGMENT_META[selectedSegment]?.en}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSegment(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {(() => {
                  const data = (segmentScores as any)[
                    selectedSegment
                  ] as SegmentScore;
                  const color = getColorHex(data.score);
                  const findings = getRelatedFindings(selectedSegment);

                  return (
                    <>
                      <Badge
                        style={{
                          backgroundColor: `${color}20`,
                          color,
                          borderColor: `${color}40`,
                        }}
                        className="text-xs font-bold border mb-2"
                      >
                        {data.score}/100 — {getGrade(data.score, isPt)}
                      </Badge>

                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${data.score}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>

                      {data.keyIssue && (
                        <p className="text-xs text-muted-foreground mb-2">
                          <span className="font-medium text-foreground/80">
                            {isPt ? "Achado principal:" : "Key issue:"}
                          </span>{" "}
                          {data.keyIssue}
                        </p>
                      )}

                      {findings.length > 0 && (
                        <div className="space-y-1.5 mt-2 pt-2 border-t">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {isPt ? "Achados Clínicos" : "Clinical Findings"}
                          </p>
                          {findings.slice(0, 3).map((f, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-1.5 text-[11px]"
                            >
                              <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                              <div>
                                <span className="font-medium">{f.finding}</span>
                                {f.recommendation && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    — {f.recommendation}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : null}

            {/* Segment list */}
            <div className="rounded-xl border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                {isPt ? "Scores por Segmento" : "Segment Scores"}
              </p>
              <div className="space-y-1">
                {Object.entries(segmentScores)
                  .filter(
                    ([, d]) => d && typeof d === "object" && "score" in d
                  )
                  .sort(
                    ([, a], [, b]) =>
                      (a as SegmentScore).score - (b as SegmentScore).score
                  )
                  .map(([key, data]) => {
                    const seg = data as SegmentScore;
                    const meta = SEGMENT_META[key];
                    const color = getColorHex(seg.score);
                    const isActive = selectedSegment === key;
                    const hasMaterials =
                      materialMap[key] && materialMap[key].length > 0;

                    return (
                      <button
                        key={key}
                        onClick={() =>
                          setSelectedSegment(isActive ? null : key)
                        }
                        className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                          isActive
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-xs">{meta?.icon}</span>
                        <span className="text-[11px] flex-1">
                          {isPt ? meta?.pt : meta?.en}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {hasMaterials && (
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: color }}
                              title={
                                isPt ? "Modelo 3D mapeado" : "3D model mapped"
                              }
                            />
                          )}
                          <div className="w-10 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${seg.score}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                          <span
                            className="text-[11px] font-bold tabular-nums w-6 text-right"
                            style={{ color }}
                          >
                            {seg.score}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  <span className="text-[9px] text-muted-foreground">{"<70"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                  <span className="text-[9px] text-muted-foreground">60-69</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
                  <span className="text-[9px] text-muted-foreground">70-79</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span className="text-[9px] text-muted-foreground">≥80</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SketchfabBodyViewer;
