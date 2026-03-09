"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, TrendingUp, Shield, Heart, Activity, Target, Zap } from "lucide-react";

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

interface PatientReportSummaryProps {
  patientName?: string;
  assessmentDate?: string;
  assessmentNumber?: string;
  overallScore?: number | null;
  postureScore?: number | null;
  symmetryScore?: number | null;
  mobilityScore?: number | null;
  segmentScores?: SegmentScoresData | null;
  aiFindings?: Finding[] | null;
  locale?: string;
}

// ========== Helpers ==========

const SEGMENT_LABELS: Record<string, { en: string; pt: string }> = {
  head: { en: "Head & Neck", pt: "Cabeça e Pescoço" },
  shoulders: { en: "Shoulders", pt: "Ombros" },
  spine: { en: "Spine & Trunk", pt: "Coluna e Tronco" },
  hips: { en: "Hips & Pelvis", pt: "Quadril e Pelve" },
  knees: { en: "Knees", pt: "Joelhos" },
  ankles: { en: "Ankles & Feet", pt: "Tornozelos e Pés" },
};

// Translate common technical terms to patient-friendly language
const SIMPLE_TERMS: Record<string, { en: string; pt: string }> = {
  "forward head posture": { en: "Head tilting forward", pt: "Cabeça inclinada para frente" },
  "anterior head": { en: "Head tilting forward", pt: "Cabeça inclinada para frente" },
  "scapular asymmetry": { en: "Uneven shoulders", pt: "Ombros desalinhados" },
  "shoulder asymmetry": { en: "Uneven shoulders", pt: "Ombros desalinhados" },
  "increased kyphosis": { en: "Rounded upper back", pt: "Costas superiores arredondadas" },
  "thoracic kyphosis": { en: "Rounded upper back", pt: "Costas superiores arredondadas" },
  "lumbar lordosis": { en: "Lower back curvature", pt: "Curvatura lombar acentuada" },
  "increased lordosis": { en: "Excessive lower back curve", pt: "Curvatura lombar excessiva" },
  "pelvic tilt": { en: "Tilted pelvis", pt: "Pelve desalinhada" },
  "anterior pelvic tilt": { en: "Pelvis tilting forward", pt: "Pelve inclinada para frente" },
  "posterior pelvic tilt": { en: "Pelvis tilting backward", pt: "Pelve inclinada para trás" },
  "genu valgum": { en: "Knees angling inward", pt: "Joelhos voltados para dentro" },
  "genu varum": { en: "Knees angling outward", pt: "Joelhos voltados para fora" },
  "knee valgus": { en: "Knees angling inward", pt: "Joelhos voltados para dentro" },
  "flat feet": { en: "Flat feet", pt: "Pés planos" },
  "pes planus": { en: "Flat feet", pt: "Pés planos" },
  "overpronation": { en: "Feet rolling inward", pt: "Pés rolando para dentro" },
  "scoliosis": { en: "Sideways spine curve", pt: "Curvatura lateral da coluna" },
  "muscle imbalance": { en: "Muscle imbalance", pt: "Desequilíbrio muscular" },
  "upper crossed syndrome": { en: "Rounded shoulders & forward head pattern", pt: "Padrão de ombros arredondados e cabeça para frente" },
  "lower crossed syndrome": { en: "Tight hip flexors & weak core pattern", pt: "Padrão de flexores tensos e core fraco" },
};

function simplifyIssue(issue: string, isPt: boolean): string {
  const lower = issue.toLowerCase();
  for (const [term, translation] of Object.entries(SIMPLE_TERMS)) {
    if (lower.includes(term)) {
      return isPt ? translation.pt : translation.en;
    }
  }
  return issue;
}

function getVerdict(score: number, isPt: boolean) {
  if (score >= 85) return { text: isPt ? "Excelente" : "Excellent", desc: isPt ? "Sua postura está ótima! Continue com os exercícios." : "Your posture is great! Keep up with your exercises.", color: "text-green-400", ring: "#22C55E", bg: "from-green-500/20 to-emerald-500/10" };
  if (score >= 70) return { text: isPt ? "Bom" : "Good", desc: isPt ? "Sua postura está boa, mas algumas áreas podem melhorar." : "Your posture is good, but some areas can improve.", color: "text-emerald-400", ring: "#34D399", bg: "from-emerald-500/20 to-teal-500/10" };
  if (score >= 55) return { text: isPt ? "Regular" : "Fair", desc: isPt ? "Algumas áreas precisam de atenção. Siga as recomendações." : "Some areas need attention. Follow the recommendations.", color: "text-yellow-400", ring: "#EAB308", bg: "from-yellow-500/20 to-orange-500/10" };
  return { text: isPt ? "Precisa Atenção" : "Needs Attention", desc: isPt ? "Várias áreas precisam de tratamento. Agende uma consulta." : "Several areas need treatment. Schedule an appointment.", color: "text-red-400", ring: "#EF4444", bg: "from-red-500/20 to-orange-500/10" };
}

// ========== Score Ring (large) ==========

function LargeScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const verdict = getVerdict(score, false);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/20" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={verdict.ring} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: verdict.ring }}>{Math.round(score)}</span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

// ========== Category Bar ==========

function CategoryBar({ label, score, icon: Icon }: { label: string; score: number; icon: any }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = score >= 80 ? "bg-green-500" : score >= 70 ? "bg-emerald-500" : score >= 55 ? "bg-yellow-500" : "bg-red-500";
  const textColor = score >= 80 ? "text-green-400" : score >= 70 ? "text-emerald-400" : score >= 55 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${textColor}`} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className={`text-xs font-bold ${textColor}`}>{Math.round(score)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ========== Attention Area ==========

function AttentionItem({ rank, label, score, issue, isPt }: { rank: number; label: string; score: number; issue: string; isPt: boolean }) {
  const dotColor = score < 70 ? "bg-red-500" : score < 80 ? "bg-yellow-500" : "bg-green-500";
  const priorityText = score < 70
    ? (isPt ? "Prioridade" : "Priority")
    : score < 80
      ? (isPt ? "Moderado" : "Moderate")
      : (isPt ? "Bom" : "Good");
  const priorityColor = score < 70 ? "text-red-400" : score < 80 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <span className={`text-xs font-semibold ${priorityColor}`}>({score})</span>
          <span className={`text-[10px] ${priorityColor} ml-auto`}>{priorityText}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{simplifyIssue(issue, isPt)}</p>
      </div>
    </div>
  );
}

// ========== Main Component ==========

export function PatientReportSummary({
  patientName,
  assessmentDate,
  assessmentNumber,
  overallScore,
  postureScore,
  symmetryScore,
  mobilityScore,
  segmentScores,
  aiFindings,
  locale,
}: PatientReportSummaryProps) {
  const isPt = locale === "pt-BR";

  const attentionAreas = useMemo(() => {
    if (!segmentScores) return [];
    return Object.entries(segmentScores)
      .filter(([_, data]) => data && typeof data === "object" && "score" in data)
      .map(([key, data]) => {
        const seg = data as SegmentScore;
        return {
          key,
          label: isPt ? SEGMENT_LABELS[key]?.pt || key : SEGMENT_LABELS[key]?.en || key,
          score: seg.score,
          issue: seg.keyIssue || (isPt ? "Normal" : "Normal"),
        };
      })
      .sort((a, b) => a.score - b.score)
      .filter(a => a.score < 80); // Only show areas that need attention
  }, [segmentScores, isPt]);

  if (overallScore == null) return null;

  const verdict = getVerdict(overallScore, isPt);
  const dateStr = assessmentDate
    ? new Date(assessmentDate).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <Card className="overflow-hidden">
      {/* Header gradient */}
      <div className={`bg-gradient-to-r ${verdict.bg} px-4 sm:px-6 py-4 border-b border-border/50`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold">
              {isPt ? "Relatório de Avaliação Postural" : "Postural Assessment Report"}
            </h2>
            {(patientName || dateStr) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {patientName && <span>{patientName}</span>}
                {patientName && dateStr && " · "}
                {dateStr && <span>{dateStr}</span>}
                {assessmentNumber && <span className="ml-2 opacity-60">#{assessmentNumber}</span>}
              </p>
            )}
          </div>
          <Badge className={`${verdict.color} border-0 bg-background/50 text-xs`}>
            <Shield className="h-3 w-3 mr-1" />
            {verdict.text}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Score + Categories row */}
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Big score ring */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <LargeScoreRing score={overallScore} />
            <p className="text-[10px] text-muted-foreground text-center mt-1">{isPt ? "Score Geral" : "Overall Score"}</p>
          </div>

          {/* Category bars */}
          <div className="flex-1 space-y-3">
            {postureScore != null && (
              <CategoryBar label={isPt ? "Postura" : "Posture"} score={postureScore} icon={Activity} />
            )}
            {symmetryScore != null && (
              <CategoryBar label={isPt ? "Simetria" : "Symmetry"} score={symmetryScore} icon={Target} />
            )}
            {mobilityScore != null && (
              <CategoryBar label={isPt ? "Mobilidade" : "Mobility"} score={mobilityScore} icon={Zap} />
            )}
          </div>
        </div>

        {/* Verdict description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{verdict.desc}</p>

        {/* Areas needing attention */}
        {attentionAreas.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
              {isPt ? "Áreas que Precisam de Atenção" : "Areas Needing Attention"}
            </h3>
            <div className="divide-y divide-border/50">
              {attentionAreas.map((area, idx) => (
                <AttentionItem
                  key={area.key}
                  rank={idx + 1}
                  label={area.label}
                  score={area.score}
                  issue={area.issue}
                  isPt={isPt}
                />
              ))}
            </div>
          </div>
        )}

        {/* Good areas */}
        {segmentScores && attentionAreas.length < Object.keys(segmentScores).length && (
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/5 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {isPt
                ? `${Object.keys(segmentScores).length - attentionAreas.length} área(s) com pontuação boa — continue assim!`
                : `${Object.keys(segmentScores).length - attentionAreas.length} area(s) scoring well — keep it up!`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PatientReportSummary;
