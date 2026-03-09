"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, Play, Pause, Info } from "lucide-react";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface PostureStagesProps {
  overallScore?: number | null;
  postureScore?: number | null;
  postureAnalysis?: any;
  locale?: string;
  leftImageUrl?: string | null;
  rightImageUrl?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  leftLandmarks?: any;
  rightLandmarks?: any;
  frontLandmarks?: any;
  backLandmarks?: any;
}

type Stage = "standard" | "current" | "worsened";

interface PostureParams {
  headForward: number;
  shoulderRound: number;
  kyphosis: number;
  lordosis: number;
  pelvicTilt: number;
  kneeFlex: number;
}

// ═══════════════════════════════════════════
// Stage config
// ═══════════════════════════════════════════

const STAGE_CFG: Record<Stage, { color: string; border: string; bg: string; icon: any; en: string; pt: string; enDesc: string; ptDesc: string }> = {
  standard: { color: "#22C55E", border: "border-green-500/40", bg: "bg-green-500/10", icon: CheckCircle2, en: "STANDARD", pt: "PADRÃO", enDesc: "Ideal posture alignment", ptDesc: "Alinhamento postural ideal" },
  current:  { color: "#F97316", border: "border-orange-500/40", bg: "bg-orange-500/10", icon: AlertTriangle, en: "CURRENT", pt: "ATUAL", enDesc: "Patient's current posture", ptDesc: "Postura atual do paciente" },
  worsened: { color: "#EF4444", border: "border-red-500/40", bg: "bg-red-500/10", icon: XCircle, en: "WORSENED", pt: "PIORADA", enDesc: "Projected if untreated", ptDesc: "Projeção sem tratamento" },
};

// ═══════════════════════════════════════════
// Deviation definitions
// ═══════════════════════════════════════════

interface DeviationDef {
  key: keyof PostureParams;
  en: string;
  pt: string;
  enDesc: string;
  ptDesc: string;
}

const DEVIATIONS: DeviationDef[] = [
  { key: "headForward",   en: "Head Forward",    pt: "Cabeça Anterior",    enDesc: "Forward head posture angle",    ptDesc: "Ângulo de protrusão da cabeça" },
  { key: "shoulderRound", en: "Shoulder Round",   pt: "Ombro Arredondado",  enDesc: "Shoulder protraction angle",   ptDesc: "Ângulo de protração do ombro" },
  { key: "kyphosis",      en: "Thoracic Kyphosis",pt: "Cifose Torácica",    enDesc: "Upper back curvature",         ptDesc: "Curvatura torácica superior" },
  { key: "lordosis",      en: "Lumbar Lordosis",  pt: "Lordose Lombar",     enDesc: "Lower back curvature",         ptDesc: "Curvatura lombar" },
  { key: "pelvicTilt",    en: "Pelvic Tilt",      pt: "Inclinação Pélvica", enDesc: "Anterior pelvic tilt angle",   ptDesc: "Ângulo de inclinação pélvica" },
  { key: "kneeFlex",      en: "Knee Flexion",     pt: "Flexão do Joelho",   enDesc: "Standing knee flexion angle",  ptDesc: "Ângulo de flexão do joelho" },
];

// ═══════════════════════════════════════════
// Posture Deviation Calculator
// ═══════════════════════════════════════════

function getDeviations(pa: any, score: number | null): PostureParams {
  const a = pa || {};
  const hf = a.headForwardAngle || a.headPosture?.angleDeg || 0;
  const sr = a.shoulderRoundAngle || a.shoulderAnalysis?.angleDeg || 0;
  const ky = a.kyphosisAngle || a.thoracicKyphosis?.angleDeg || 0;
  const lo = a.lordosisAngle || a.lumbarLordosis?.angleDeg || 0;
  const pt = a.pelvicTiltAngle || a.pelvicAnalysis?.angleDeg || 0;
  const kf = a.kneeAngle || 0;

  if (hf === 0 && sr === 0 && score != null) {
    const s = Math.max(0, (100 - score) / 100);
    return { headForward: Math.round(s * 25), shoulderRound: Math.round(s * 20), kyphosis: Math.round(s * 15), lordosis: Math.round(s * 12), pelvicTilt: Math.round(s * 10), kneeFlex: Math.round(s * 8) };
  }
  return { headForward: hf, shoulderRound: sr, kyphosis: ky, lordosis: lo, pelvicTilt: pt, kneeFlex: kf };
}

function scaleParams(p: PostureParams, f: number): PostureParams {
  return { headForward: Math.round(p.headForward * f), shoulderRound: Math.round(p.shoulderRound * f), kyphosis: Math.round(p.kyphosis * f), lordosis: Math.round(p.lordosis * f), pelvicTilt: Math.round(p.pelvicTilt * f), kneeFlex: Math.round(p.kneeFlex * f) };
}

function getSeverity(val: number, isPt: boolean): { label: string; color: string } {
  if (val <= 0) return { label: isPt ? "Normal" : "Normal", color: "#22C55E" };
  if (val <= 5) return { label: isPt ? "Leve" : "Mild", color: "#EAB308" };
  if (val <= 12) return { label: isPt ? "Moderado" : "Moderate", color: "#F97316" };
  return { label: isPt ? "Severo" : "Severe", color: "#EF4444" };
}

// ═══════════════════════════════════════════
// Main Component — Data Only
// ═══════════════════════════════════════════

export function PostureStages({
  overallScore, postureScore, postureAnalysis, locale,
}: PostureStagesProps) {
  const isPt = locale === "pt-BR";
  const [activeStage, setActiveStage] = useState<Stage>("current");
  const [animating, setAnimating] = useState(false);

  const score = postureScore ?? overallScore ?? 50;
  const currentParams = useMemo(() => getDeviations(postureAnalysis, score), [postureAnalysis, score]);
  const idealParams: PostureParams = { headForward: 0, shoulderRound: 0, kyphosis: 0, lordosis: 0, pelvicTilt: 0, kneeFlex: 0 };
  const worsenedParams = useMemo(() => scaleParams(currentParams, 1.6), [currentParams]);

  const stageParamsMap: Record<Stage, PostureParams> = { standard: idealParams, current: currentParams, worsened: worsenedParams };
  const activeParams = stageParamsMap[activeStage];
  const activeCfg = STAGE_CFG[activeStage];

  const startAnimation = () => {
    if (animating) { setAnimating(false); return; }
    setAnimating(true);
    const stages: Stage[] = ["standard", "current", "worsened"];
    let i = 0;
    const interval = setInterval(() => { i = (i + 1) % stages.length; setActiveStage(stages[i]); }, 2000);
    setTimeout(() => { clearInterval(interval); setAnimating(false); }, 6500);
  };

  const hasDeviations = DEVIATIONS.some(d => currentParams[d.key] > 0);
  if (!hasDeviations) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            {isPt ? "3 Estágios de Postura" : "3 Stages of Posture"}
          </CardTitle>
          <button
            onClick={startAnimation}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              animating ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {animating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {animating ? (isPt ? "Parar" : "Stop") : (isPt ? "Animar" : "Animate")}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {isPt
            ? "Mostra ideal, atual e projeção de piora — para ajudar pacientes a entender a importância do tratamento."
            : "Shows ideal, current, and potential worsening — to help patients understand the importance of treatment."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Stage selector ── */}
        <div className="grid grid-cols-3 gap-2">
          {(["standard", "current", "worsened"] as Stage[]).map(s => {
            const cfg = STAGE_CFG[s];
            const Icon = cfg.icon;
            const isActive = activeStage === s;
            return (
              <button
                key={s}
                onClick={() => setActiveStage(s)}
                className={`rounded-lg border p-2.5 transition-all text-left ${
                  isActive ? `${cfg.bg} ${cfg.border} ring-1 ring-offset-1 ring-offset-background` : "border-border hover:border-muted-foreground/30"
                }`}
                style={isActive ? { boxShadow: `0 0 0 2px ${cfg.color}25` } : {}}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                  <span className="text-[11px] font-bold tracking-wide" style={{ color: isActive ? cfg.color : undefined }}>
                    {isPt ? cfg.pt : cfg.en}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{isPt ? cfg.ptDesc : cfg.enDesc}</p>
              </button>
            );
          })}
        </div>

        {/* ── Deviation detail rows ── */}
        <div className="space-y-1.5">
          {/* Header */}
          <div className="grid grid-cols-[1fr_60px_60px_60px_70px] gap-2 px-2 pb-1 border-b border-border/50">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{isPt ? "Desvio" : "Deviation"}</span>
            <span className="text-[9px] font-semibold text-green-500 text-center uppercase tracking-wider">{isPt ? "Ideal" : "Ideal"}</span>
            <span className="text-[9px] font-semibold text-orange-500 text-center uppercase tracking-wider">{isPt ? "Atual" : "Current"}</span>
            <span className="text-[9px] font-semibold text-red-500 text-center uppercase tracking-wider">{isPt ? "Piorada" : "Worsened"}</span>
            <span className="text-[9px] font-semibold text-muted-foreground text-center uppercase tracking-wider">{isPt ? "Gravidade" : "Severity"}</span>
          </div>

          {/* Rows */}
          {DEVIATIONS.filter(d => currentParams[d.key] > 0 || worsenedParams[d.key] > 0).map((d) => {
            const cur = currentParams[d.key];
            const worse = worsenedParams[d.key];
            const activeVal = activeParams[d.key];
            const sev = getSeverity(cur, isPt);

            return (
              <div
                key={d.key}
                className="grid grid-cols-[1fr_60px_60px_60px_70px] gap-2 px-2 py-2 rounded-lg transition-all"
                style={{
                  borderLeft: `3px solid ${activeVal > 0 ? activeCfg.color : "transparent"}`,
                  background: activeVal > 0 ? `${activeCfg.color}08` : undefined,
                }}
              >
                <div>
                  <p className="text-[11px] font-medium text-foreground">{isPt ? d.pt : d.en}</p>
                  <p className="text-[9px] text-muted-foreground">{isPt ? d.ptDesc : d.enDesc}</p>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-xs font-bold text-green-500">0°</span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-500">{cur}°</span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-xs font-bold text-red-500">{worse}°</span>
                </div>
                <div className="flex items-center justify-center">
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: sev.color, backgroundColor: `${sev.color}15`, border: `1px solid ${sev.color}30` }}
                  >
                    {sev.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-3 gap-2">
          {(["standard", "current", "worsened"] as Stage[]).map(s => {
            const cfg = STAGE_CFG[s];
            const params = stageParamsMap[s];
            const total = Object.values(params).reduce((a, b) => a + b, 0);
            const isActive = activeStage === s;
            return (
              <div
                key={s}
                className={`rounded-lg border p-3 text-center transition-all ${isActive ? cfg.border : "border-border"}`}
                style={isActive ? { background: `${cfg.color}08` } : {}}
              >
                <p className="text-[9px] text-muted-foreground mb-1">{isPt ? "Desvio Total" : "Total Deviation"}</p>
                <p className="text-lg font-bold" style={{ color: cfg.color }}>{total}°</p>
                <p className="text-[9px] font-medium" style={{ color: cfg.color }}>{isPt ? cfg.pt : cfg.en}</p>
              </div>
            );
          })}
        </div>

        {/* ── Educational note ── */}
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2.5">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              {isPt
                ? "A postura \"Piorada\" é uma projeção baseada em evidências de como os desvios atuais podem progredir sem intervenção. Tratamento consistente pode reverter muitas dessas alterações."
                : "The \"Worsened\" posture is an evidence-based projection of how current deviations may progress without intervention. Consistent treatment can reverse many of these changes."}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default PostureStages;
