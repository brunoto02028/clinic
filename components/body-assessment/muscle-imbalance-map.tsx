"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Snowflake, ChevronRight, Info, Zap, User, Image as ImageIcon } from "lucide-react";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface MuscleHypothesis {
  muscle: string;
  side?: string;
  severity?: string;
  notes?: string;
}

interface MuscleImbalanceMapProps {
  muscleHypotheses?: {
    hypertonic?: MuscleHypothesis[];
    hypotonic?: MuscleHypothesis[];
    analysis?: string;
    summary?: string;
  } | null;
  locale?: string;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
}

// ═══════════════════════════════════════════
// Muscle SVG Paths — Anterior View
// ═══════════════════════════════════════════

const MUSCLES_FRONT: Record<string, { paths: string[]; label: string; ptLabel: string; keywords: string[] }> = {
  sternocleidomastoid: {
    paths: ["M47,18 C46,19 45,22 45,25 L47,25 C47,22 47.5,19 48,18 Z", "M53,18 C54,19 55,22 55,25 L53,25 C53,22 52.5,19 52,18 Z"],
    label: "Sternocleidomastoid", ptLabel: "Esternocleidomastóideo",
    keywords: ["sternocleidomastoid", "scm", "esternocleidomast"],
  },
  upperTrap: {
    paths: ["M42,25 C38,26 35,28 33,31 L36,32 C38,29 40,27 43,26 Z", "M58,25 C62,26 65,28 67,31 L64,32 C62,29 60,27 57,26 Z"],
    label: "Upper Trapezius", ptLabel: "Trapézio Superior",
    keywords: ["upper trap", "trapezius", "trapézio", "trap sup"],
  },
  pectorals: {
    paths: ["M38,32 C36,33 34,35 33,38 C34,40 36,41 39,42 L42,39 C41,37 40,35 40,33 Z",
            "M62,32 C64,33 66,35 67,38 C66,40 64,41 61,42 L58,39 C59,37 60,35 60,33 Z"],
    label: "Pectoralis Major", ptLabel: "Peitoral Maior",
    keywords: ["pectoral", "pec", "peitoral"],
  },
  deltoid: {
    paths: ["M33,31 C30,32 28,34 27,37 C28,39 30,40 33,40 L36,37 C35,35 34,33 34,31 Z",
            "M67,31 C70,32 72,34 73,37 C72,39 70,40 67,40 L64,37 C65,35 66,33 66,31 Z"],
    label: "Deltoid", ptLabel: "Deltóide",
    keywords: ["deltoid", "deltóide", "delt"],
  },
  biceps: {
    paths: ["M30,40 C29,43 28,47 28,50 L31,50 C31,47 31,44 32,41 Z",
            "M70,40 C71,43 72,47 72,50 L69,50 C69,47 69,44 68,41 Z"],
    label: "Biceps Brachii", ptLabel: "Bíceps Braquial",
    keywords: ["bicep", "bíceps"],
  },
  rectusAbdominis: {
    paths: ["M44,42 C43,46 43,50 43,54 C43,58 44,62 45,66 L48,66 C47,62 47,58 47,54 C47,50 47,46 48,42 Z",
            "M56,42 C57,46 57,50 57,54 C57,58 56,62 55,66 L52,66 C53,62 53,58 53,54 C53,50 53,46 52,42 Z"],
    label: "Rectus Abdominis", ptLabel: "Reto Abdominal",
    keywords: ["rectus abdominis", "abdominal", "reto abdominal", "abs", "core"],
  },
  obliques: {
    paths: ["M40,44 C38,48 37,52 37,56 C37,60 38,64 39,67 L43,65 C42,61 42,57 42,53 C42,49 42,46 43,43 Z",
            "M60,44 C62,48 63,52 63,56 C63,60 62,64 61,67 L57,65 C58,61 58,57 58,53 C58,49 58,46 57,43 Z"],
    label: "Obliques", ptLabel: "Oblíquos",
    keywords: ["oblique", "oblíquo"],
  },
  hipFlexor: {
    paths: ["M42,66 C41,68 40,70 39,73 L42,74 C42,72 43,69 44,67 Z",
            "M58,66 C59,68 60,70 61,73 L58,74 C58,72 57,69 56,67 Z"],
    label: "Hip Flexors (Iliopsoas)", ptLabel: "Flexores do Quadril (Iliopsoas)",
    keywords: ["hip flexor", "iliopsoas", "psoas", "flexor do quadril"],
  },
  quadriceps: {
    paths: ["M40,74 C39,78 38,83 37,88 C37,92 37,96 38,100 L42,100 C41,96 41,92 41,88 C42,83 42,79 43,75 Z",
            "M60,74 C61,78 62,83 63,88 C63,92 63,96 62,100 L58,100 C59,96 59,92 59,88 C58,83 58,79 57,75 Z"],
    label: "Quadriceps", ptLabel: "Quadríceps",
    keywords: ["quadricep", "quad", "quadríceps", "vastus", "rectus femoris"],
  },
  tibialis: {
    paths: ["M38,102 C37,107 37,112 37,117 L40,117 C40,112 40,107 41,102 Z",
            "M62,102 C63,107 63,112 63,117 L60,117 C60,112 60,107 59,102 Z"],
    label: "Tibialis Anterior", ptLabel: "Tibial Anterior",
    keywords: ["tibialis", "tibial", "shin"],
  },
  adductors: {
    paths: ["M46,74 C45,79 44,84 44,89 L47,89 C47,84 47,79 48,74 Z",
            "M54,74 C55,79 56,84 56,89 L53,89 C53,84 53,79 52,74 Z"],
    label: "Adductors", ptLabel: "Adutores",
    keywords: ["adductor", "adutor", "inner thigh"],
  },
};

// ═══════════════════════════════════════════
// Muscle SVG Paths — Posterior View
// ═══════════════════════════════════════════

const MUSCLES_BACK: Record<string, { paths: string[]; label: string; ptLabel: string; keywords: string[] }> = {
  upperTrap: {
    paths: ["M42,25 C38,26 35,28 33,31 L36,32 C38,29 40,27 43,26 Z", "M58,25 C62,26 65,28 67,31 L64,32 C62,29 60,27 57,26 Z"],
    label: "Upper Trapezius", ptLabel: "Trapézio Superior",
    keywords: ["upper trap", "trapezius", "trapézio"],
  },
  midTrap: {
    paths: ["M43,33 C42,36 42,39 42,42 L46,42 C46,39 46,36 46,33 Z", "M57,33 C58,36 58,39 58,42 L54,42 C54,39 54,36 54,33 Z"],
    label: "Middle Trapezius", ptLabel: "Trapézio Médio",
    keywords: ["mid trap", "middle trap", "rhomboid", "rombóide"],
  },
  lowerTrap: {
    paths: ["M44,42 C43,45 43,48 44,51 L48,50 C47,47 47,44 47,42 Z", "M56,42 C57,45 57,48 56,51 L52,50 C53,47 53,44 53,42 Z"],
    label: "Lower Trapezius", ptLabel: "Trapézio Inferior",
    keywords: ["lower trap", "trapézio inf"],
  },
  latissimus: {
    paths: ["M37,38 C36,42 35,46 35,50 C36,54 37,57 39,60 L43,58 C41,55 40,52 40,48 C40,44 40,41 41,38 Z",
            "M63,38 C64,42 65,46 65,50 C64,54 63,57 61,60 L57,58 C59,55 60,52 60,48 C60,44 60,41 59,38 Z"],
    label: "Latissimus Dorsi", ptLabel: "Grande Dorsal",
    keywords: ["latissimus", "lat", "dorsal", "grande dorsal"],
  },
  erectorSpinae: {
    paths: ["M46,33 C46,40 46,47 46,54 C46,60 47,65 47,70 L50,70 C50,65 50,60 50,54 C50,47 50,40 50,33 Z",
            "M54,33 C54,40 54,47 54,54 C54,60 53,65 53,70 L50,70 C50,65 50,60 50,54 C50,47 50,40 50,33 Z"],
    label: "Erector Spinae", ptLabel: "Eretores da Espinha",
    keywords: ["erector", "spinae", "paraspinal", "paraespinhal", "eretor"],
  },
  gluteMax: {
    paths: ["M39,70 C38,73 37,76 37,79 C38,82 40,84 43,85 L46,82 C44,80 42,78 41,75 C41,73 40,71 40,70 Z",
            "M61,70 C62,73 63,76 63,79 C62,82 60,84 57,85 L54,82 C56,80 58,78 59,75 C59,73 60,71 60,70 Z"],
    label: "Gluteus Maximus", ptLabel: "Glúteo Máximo",
    keywords: ["gluteus", "gluteal", "glúteo", "glute"],
  },
  gluteMed: {
    paths: ["M37,66 C35,68 34,70 34,73 L38,73 C38,70 38,68 39,66 Z",
            "M63,66 C65,68 66,70 66,73 L62,73 C62,70 62,68 61,66 Z"],
    label: "Gluteus Medius", ptLabel: "Glúteo Médio",
    keywords: ["gluteus medius", "glúteo médio", "glute med"],
  },
  hamstrings: {
    paths: ["M40,85 C39,90 38,95 38,100 C38,104 38,107 39,110 L43,110 C42,107 42,104 42,100 C42,95 42,90 43,86 Z",
            "M60,85 C61,90 62,95 62,100 C62,104 62,107 61,110 L57,110 C58,107 58,104 58,100 C58,95 58,90 57,86 Z"],
    label: "Hamstrings", ptLabel: "Isquiotibiais",
    keywords: ["hamstring", "isquiotibial", "biceps femoris", "semitendinosus"],
  },
  calves: {
    paths: ["M39,112 C38,117 38,122 38,126 L42,126 C42,122 41,117 41,112 Z",
            "M61,112 C62,117 62,122 62,126 L58,126 C58,122 59,117 59,112 Z"],
    label: "Gastrocnemius / Soleus", ptLabel: "Gastrocnêmio / Sóleo",
    keywords: ["gastroc", "calf", "calves", "soleus", "sóleo", "panturrilha"],
  },
};

// ═══════════════════════════════════════════
// Matching Logic
// ═══════════════════════════════════════════

function matchMuscle(hypothesis: MuscleHypothesis, muscleMap: Record<string, { keywords: string[] }>): string | null {
  const name = hypothesis.muscle.toLowerCase();
  for (const [key, { keywords }] of Object.entries(muscleMap)) {
    for (const kw of keywords) {
      if (name.includes(kw) || kw.includes(name.split(" ")[0])) return key;
    }
  }
  return null;
}

// ═══════════════════════════════════════════
// Detail Panel
// ═══════════════════════════════════════════

function MuscleDetail({
  muscleName,
  type,
  hypotheses,
  isPt,
  onClose,
}: {
  muscleName: string;
  type: "hypertonic" | "hypotonic";
  hypotheses: MuscleHypothesis[];
  isPt: boolean;
  onClose: () => void;
}) {
  const color = type === "hypertonic" ? "#EF4444" : "#3B82F6";
  const bgColor = type === "hypertonic" ? "bg-red-500/10 border-red-500/30" : "bg-blue-500/10 border-blue-500/30";

  return (
    <div className={`rounded-xl border p-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200 ${bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {type === "hypertonic" ? <Flame className="h-4 w-4 text-red-400" /> : <Snowflake className="h-4 w-4 text-blue-400" />}
          <span className="text-sm font-bold">{muscleName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }} className="text-[10px] border">
            {type === "hypertonic"
              ? (isPt ? "HIPERTÔNICO — Tenso" : "HYPERTONIC — Tight")
              : (isPt ? "HIPOTÔNICO — Fraco" : "HYPOTONIC — Weak")}
          </Badge>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>
      </div>

      <p className="text-xs mb-2" style={{ color }}>
        {type === "hypertonic"
          ? (isPt ? "→ Precisa de alongamento e liberação miofascial" : "→ Needs stretching & myofascial release")
          : (isPt ? "→ Precisa de fortalecimento e ativação" : "→ Needs strengthening & activation")}
      </p>

      {hypotheses.length > 0 && (
        <div className="space-y-1 mt-2 pt-2 border-t border-white/10">
          {hypotheses.map((h, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                <strong>{h.muscle}</strong>
                {h.side && <span className="text-muted-foreground/60"> ({h.side})</span>}
                {h.severity && <Badge variant="outline" className="ml-1 text-[8px] px-1 py-0 capitalize">{h.severity}</Badge>}
                {h.notes && <span className="block text-muted-foreground/70 mt-0.5">{h.notes}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════

export function MuscleImbalanceMap({ muscleHypotheses, locale, frontImageUrl, backImageUrl }: MuscleImbalanceMapProps) {
  const isPt = locale === "pt-BR";
  const [viewSide, setViewSide] = useState<"front" | "back">("front");
  const [selectedMuscle, setSelectedMuscle] = useState<{ key: string; type: "hypertonic" | "hypotonic" } | null>(null);
  const hasPhotos = !!(frontImageUrl || backImageUrl);
  const [viewMode, setViewMode] = useState<"model" | "photo">(hasPhotos ? "photo" : "model");
  const currentPhoto = viewSide === "front" ? frontImageUrl : backImageUrl;

  const hypertonic = muscleHypotheses?.hypertonic || [];
  const hypotonic = muscleHypotheses?.hypotonic || [];

  if (hypertonic.length === 0 && hypotonic.length === 0) return null;

  const muscles = viewSide === "front" ? MUSCLES_FRONT : MUSCLES_BACK;

  // Match hypotheses to SVG muscles
  const hyperMatches = useMemo(() => {
    const map: Record<string, MuscleHypothesis[]> = {};
    for (const h of hypertonic) {
      const key = matchMuscle(h, muscles);
      if (key) { if (!map[key]) map[key] = []; map[key].push(h); }
    }
    return map;
  }, [hypertonic, muscles]);

  const hypoMatches = useMemo(() => {
    const map: Record<string, MuscleHypothesis[]> = {};
    for (const h of hypotonic) {
      const key = matchMuscle(h, muscles);
      if (key) { if (!map[key]) map[key] = []; map[key].push(h); }
    }
    return map;
  }, [hypotonic, muscles]);

  const getMuscleColor = (key: string): string | null => {
    if (hyperMatches[key]) return "#EF4444"; // Red — tight
    if (hypoMatches[key]) return "#3B82F6"; // Blue — weak
    return null;
  };

  const getMuscleOpacity = (key: string): number => {
    const isSelected = selectedMuscle?.key === key;
    if (isSelected) return 0.85;
    if (hyperMatches[key] || hypoMatches[key]) return 0.55;
    return 0.08;
  };

  // Find selected muscle detail
  const selectedDetail = useMemo(() => {
    if (!selectedMuscle) return null;
    const m = muscles[selectedMuscle.key];
    if (!m) return null;
    const hypotheses = selectedMuscle.type === "hypertonic" ? (hyperMatches[selectedMuscle.key] || []) : (hypoMatches[selectedMuscle.key] || []);
    return { name: isPt ? m.ptLabel : m.label, type: selectedMuscle.type, hypotheses };
  }, [selectedMuscle, muscles, hyperMatches, hypoMatches, isPt]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            {isPt ? "Mapa de Desequilíbrio Muscular" : "Muscle Imbalance Map"}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {hasPhotos && (
              <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("photo")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                    viewMode === "photo" ? "bg-purple-500/15 text-purple-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  {isPt ? "Foto" : "Photo"}
                </button>
                <button
                  onClick={() => setViewMode("model")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                    viewMode === "model" ? "bg-purple-500/15 text-purple-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="w-3 h-3" />
                  {isPt ? "Modelo" : "Model"}
                </button>
              </div>
            )}
            <Badge variant="outline" className="text-[10px] gap-1">
              <Info className="h-2.5 w-2.5" />
              Janda + Anatomy Trains
            </Badge>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          <span className="text-red-400 font-bold">{isPt ? "Vermelho" : "Red"}</span> = {isPt ? "Tenso (alongar)" : "Tight (stretch)"}
          {" · "}
          <span className="text-blue-400 font-bold">{isPt ? "Azul" : "Blue"}</span> = {isPt ? "Fraco (fortalecer)" : "Weak (strengthen)"}
        </p>
      </CardHeader>
      <CardContent>
        {/* View toggle: Anterior / Posterior */}
        <div className="flex justify-center mb-4">
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => { setViewSide("front"); setSelectedMuscle(null); }}
              className={`px-5 py-1.5 text-[10px] font-bold rounded-md transition-all tracking-wider ${viewSide === "front" ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {isPt ? "Anterior" : "Anterior"}
            </button>
            <button
              onClick={() => { setViewSide("back"); setSelectedMuscle(null); }}
              className={`px-5 py-1.5 text-[10px] font-bold rounded-md transition-all tracking-wider ${viewSide === "back" ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {isPt ? "Posterior" : "Posterior"}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* LEFT — Visual (Photo OR SVG model, never overlaid) */}
          <div className="flex-shrink-0 flex flex-col items-center">
            {viewMode === "photo" && currentPhoto ? (
              /* ── Clean patient photo (no SVG overlay) ── */
              <div className="relative rounded-lg overflow-hidden border border-slate-700/40 bg-slate-900" style={{ maxWidth: 260 }}>
                <img
                  src={currentPhoto}
                  alt={viewSide === "front" ? "Patient anterior" : "Patient posterior"}
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: 420 }}
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                  <span className="text-[10px] text-white/80 uppercase tracking-wider font-medium">
                    {viewSide === "front" ? (isPt ? "Vista Anterior" : "Anterior View") : (isPt ? "Vista Posterior" : "Posterior View")}
                  </span>
                </div>
              </div>
            ) : (
              /* ── Clean SVG anatomical model with muscle highlights ── */
              <div className="w-full" style={{ maxWidth: 220 }}>
                <svg viewBox="0 0 100 135" className="w-full">
                  <defs>
                    <filter id="glow-red"><feGaussianBlur stdDeviation="2" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <filter id="glow-blue"><feGaussianBlur stdDeviation="2" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>

                  {/* Body outline */}
                  <path d="M50,5 C44,5 40,9 39,14 C38,18 39,22 41,25 L44,28 L42,30 C38,31 33,33 30,35 C27,37 26,39 27,42 L29,44 C30,43 32,42 35,41 L38,40 L37,45 C36,50 36,56 36,62 C36,68 37,73 38,76 L39,78 C38,80 36,83 35,86 C34,90 34,94 35,98 C36,103 37,108 38,112 L39,116 C38,120 38,124 38,128 C38,132 39,135 40,135 L44,135 C44,133 44,130 44,127 L44,122 C45,118 45,114 45,110 L46,104 C46,100 46,96 47,92 L48,86 L50,86 L52,86 L53,92 C54,96 54,100 54,104 L55,110 C55,114 55,118 56,122 L56,127 C56,130 56,133 56,135 L60,135 C61,135 62,132 62,128 C62,124 62,120 61,116 L62,112 C63,108 64,103 65,98 C66,94 66,90 65,86 C64,83 62,80 61,78 L62,76 C63,73 64,68 64,62 C64,56 64,50 63,45 L62,40 L65,41 C68,42 70,43 71,44 L73,42 C74,39 73,37 70,35 C67,33 62,31 58,30 L56,28 L59,25 C61,22 62,18 61,14 C60,9 56,5 50,5 Z"
                    fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" />

                  {/* Muscle groups */}
                  {Object.entries(muscles).map(([key, muscle]) => {
                    const color = getMuscleColor(key);
                    const opacity = getMuscleOpacity(key);
                    const isActive = selectedMuscle?.key === key;
                    const isHyper = !!hyperMatches[key];
                    const isHypo = !!hypoMatches[key];
                    const fillColor = color || "currentColor";
                    const filter = isActive ? (isHyper ? "url(#glow-red)" : "url(#glow-blue)") : "none";

                    return (
                      <g
                        key={key}
                        className={`cursor-pointer transition-all duration-200 ${(isHyper || isHypo) ? "" : "pointer-events-none"}`}
                        onClick={() => {
                          if (isHyper) setSelectedMuscle(isActive ? null : { key, type: "hypertonic" });
                          else if (isHypo) setSelectedMuscle(isActive ? null : { key, type: "hypotonic" });
                        }}
                        filter={filter}
                      >
                        {muscle.paths.map((p, pi) => (
                          <path
                            key={pi}
                            d={p}
                            fill={fillColor}
                            fillOpacity={opacity}
                            stroke={color || "transparent"}
                            strokeWidth={isActive ? 1.5 : 0.8}
                            strokeOpacity={color ? (isActive ? 1 : 0.6) : 0}
                            className="transition-all duration-200"
                          />
                        ))}
                      </g>
                    );
                  })}

                  {/* Centerline */}
                  <line x1="50" y1="14" x2="50" y2="86" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.08" strokeDasharray="2,3" />
                </svg>
                <div className="text-center mt-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {viewSide === "front" ? (isPt ? "Vista Anterior" : "Anterior View") : (isPt ? "Vista Posterior" : "Posterior View")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Muscle information panel */}
          <div className="flex-1 min-w-0 space-y-3">
            {selectedDetail ? (
              <MuscleDetail
                muscleName={selectedDetail.name}
                type={selectedDetail.type}
                hypotheses={selectedDetail.hypotheses}
                isPt={isPt}
                onClose={() => setSelectedMuscle(null)}
              />
            ) : (
              <>
                {/* Instruction */}
                <p className="text-[10px] text-muted-foreground">
                  {viewMode === "model"
                    ? (isPt ? "Clique nos músculos coloridos para ver detalhes" : "Click colored muscles for details")
                    : (isPt ? "Veja os músculos afetados na lista abaixo" : "See affected muscles in the list below")}
                </p>

                {/* Hypertonic list */}
                {hypertonic.length > 0 && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Flame className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-[11px] font-bold text-red-400">{isPt ? "HIPERTÔNICOS (Tensos)" : "HYPERTONIC (Tight)"}</span>
                    </div>
                    <div className="space-y-1">
                      {hypertonic.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                          <span>{h.muscle}</span>
                          {h.side && <span className="text-muted-foreground/50">({h.side})</span>}
                          {h.severity && <Badge variant="outline" className="text-[8px] px-1.5 py-0 ml-auto text-red-400 border-red-500/30">{h.severity}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hypotonic list */}
                {hypotonic.length > 0 && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Snowflake className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-[11px] font-bold text-blue-400">{isPt ? "HIPOTÔNICOS (Fracos)" : "HYPOTONIC (Weak)"}</span>
                    </div>
                    <div className="space-y-1">
                      {hypotonic.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                          <span>{h.muscle}</span>
                          {h.side && <span className="text-muted-foreground/50">({h.side})</span>}
                          {h.severity && <Badge variant="outline" className="text-[8px] px-1.5 py-0 ml-auto text-blue-400 border-blue-500/30">{h.severity}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis text */}
                {(muscleHypotheses?.analysis || muscleHypotheses?.summary) && (
                  <div className="rounded-lg bg-muted/30 border p-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {muscleHypotheses.analysis || muscleHypotheses.summary}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MuscleImbalanceMap;
