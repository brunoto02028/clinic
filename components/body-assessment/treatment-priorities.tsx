"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Target, TrendingUp, Shield, ChevronRight } from "lucide-react";

// ========== Types ==========

interface SegmentScore {
  score: number;
  status: "good" | "fair" | "poor";
  keyIssue: string;
  trend?: "improving" | "declining" | "stable";
  previousScore?: number;
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

interface TreatmentPrioritiesProps {
  segmentScores?: SegmentScoresData | null;
  aiFindings?: Finding[] | null;
  overallScore?: number | null;
  locale?: string;
}

// ========== Helpers ==========

const SEGMENT_LABELS: Record<string, { en: string; pt: string; emoji: string }> = {
  head: { en: "Head & Neck", pt: "Cabeça e Pescoço", emoji: "🧠" },
  shoulders: { en: "Shoulders", pt: "Ombros", emoji: "💪" },
  spine: { en: "Spine & Trunk", pt: "Coluna e Tronco", emoji: "🦴" },
  hips: { en: "Hips & Pelvis", pt: "Quadril e Pelve", emoji: "🫁" },
  knees: { en: "Knees", pt: "Joelhos", emoji: "🦵" },
  ankles: { en: "Ankles & Feet", pt: "Tornozelos e Pés", emoji: "🦶" },
};

function getPriority(score: number): { level: "high" | "medium" | "low"; color: string; bg: string; border: string; labelEn: string; labelPt: string } {
  if (score < 70) return { level: "high", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", labelEn: "High Priority", labelPt: "Alta Prioridade" };
  if (score < 80) return { level: "medium", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", labelEn: "Medium Priority", labelPt: "Média Prioridade" };
  return { level: "low", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/25", labelEn: "Low Priority", labelPt: "Baixa Prioridade" };
}

function getPriorityDot(level: "high" | "medium" | "low") {
  if (level === "high") return "bg-red-500";
  if (level === "medium") return "bg-yellow-500";
  return "bg-green-500";
}

function getOverallVerdict(score: number, isPt: boolean) {
  if (score >= 85) return { text: isPt ? "Excelente" : "Excellent", color: "text-green-400", bg: "bg-green-500/10" };
  if (score >= 70) return { text: isPt ? "Bom" : "Good", color: "text-emerald-400", bg: "bg-emerald-500/10" };
  if (score >= 55) return { text: isPt ? "Regular" : "Fair", color: "text-yellow-400", bg: "bg-yellow-500/10" };
  return { text: isPt ? "Precisa Atenção" : "Needs Attention", color: "text-red-400", bg: "bg-red-500/10" };
}

// ========== Score Bar ==========

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const color = score >= 80 ? "bg-green-500" : score >= 70 ? "bg-yellow-500" : score >= 55 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-7 text-right">{Math.round(score)}</span>
    </div>
  );
}

// ========== Main Component ==========

export function TreatmentPriorities({ segmentScores, aiFindings, overallScore, locale }: TreatmentPrioritiesProps) {
  const isPt = locale === "pt-BR";

  const priorities = useMemo(() => {
    if (!segmentScores) return [];

    const items = Object.entries(segmentScores)
      .filter(([_, data]) => data && typeof data === "object" && "score" in data)
      .map(([key, data]) => {
        const seg = data as SegmentScore;
        const label = SEGMENT_LABELS[key];
        const priority = getPriority(seg.score);

        // Find matching findings for this segment
        const relatedFindings = (aiFindings || []).filter(f => {
          const area = f.area?.toLowerCase() || "";
          const k = key.toLowerCase();
          if (k === "head") return area.includes("head") || area.includes("neck") || area.includes("cervical") || area.includes("pescoço") || area.includes("cabeça");
          if (k === "shoulders") return area.includes("shoulder") || area.includes("scapul") || area.includes("ombro") || area.includes("escapul");
          if (k === "spine") return area.includes("spine") || area.includes("trunk") || area.includes("thorac") || area.includes("lumbar") || area.includes("coluna") || area.includes("tronco") || area.includes("torác") || area.includes("lombar");
          if (k === "hips") return area.includes("hip") || area.includes("pelv") || area.includes("quadril") || area.includes("pelv");
          if (k === "knees") return area.includes("knee") || area.includes("joelho");
          if (k === "ankles") return area.includes("ankle") || area.includes("foot") || area.includes("feet") || area.includes("tornozelo") || area.includes("pé");
          return false;
        });

        return {
          key,
          label: isPt ? label?.pt || key : label?.en || key,
          emoji: label?.emoji || "📍",
          score: seg.score,
          keyIssue: seg.keyIssue,
          priority,
          trend: seg.trend,
          delta: seg.previousScore != null ? seg.score - seg.previousScore : null,
          findings: relatedFindings,
        };
      })
      .sort((a, b) => a.score - b.score); // Lowest score = highest priority

    return items;
  }, [segmentScores, aiFindings, isPt]);

  if (priorities.length === 0) return null;

  const highCount = priorities.filter(p => p.priority.level === "high").length;
  const mediumCount = priorities.filter(p => p.priority.level === "medium").length;
  const verdict = overallScore != null ? getOverallVerdict(overallScore, isPt) : null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            {isPt ? "Prioridades de Tratamento" : "Treatment Priorities"}
          </CardTitle>
          {verdict && (
            <Badge className={`${verdict.bg} ${verdict.color} border-0 text-xs gap-1`}>
              <Shield className="h-3 w-3" />
              {overallScore}/100 — {verdict.text}
            </Badge>
          )}
        </div>
        {/* Summary badges */}
        <div className="flex items-center gap-2 mt-1">
          {highCount > 0 && (
            <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {highCount} {isPt ? "alta" : "high"}
            </Badge>
          )}
          {mediumCount > 0 && (
            <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-[10px] gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              {mediumCount} {isPt ? "média" : "medium"}
            </Badge>
          )}
          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {priorities.length - highCount - mediumCount} {isPt ? "baixa" : "low"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {priorities.map((item, idx) => (
          <div
            key={item.key}
            className={`rounded-lg border px-3 py-2.5 ${item.priority.bg} ${item.priority.border} transition-all`}
          >
            <div className="flex items-center gap-3">
              {/* Rank number */}
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background/50 border flex-shrink-0">
                <span className="text-xs font-bold">{idx + 1}</span>
              </div>

              {/* Priority dot */}
              <span className={`w-2.5 h-2.5 rounded-full ${getPriorityDot(item.priority.level)} flex-shrink-0`} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.emoji}</span>
                  <span className="text-sm font-semibold">{item.label}</span>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${item.priority.color} border-current/30 ml-auto`}>
                    {isPt ? item.priority.labelPt : item.priority.labelEn}
                  </Badge>
                </div>

                {/* Key issue */}
                {item.keyIssue && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.keyIssue}</p>
                )}

                {/* Related findings */}
                {item.findings.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {item.findings.slice(0, 2).map((f, fi) => (
                      <div key={fi} className="flex items-start gap-1.5 text-[11px]">
                        <ChevronRight className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground/80">{f.finding}</strong>
                          {f.recommendation && ` — ${f.recommendation}`}
                        </span>
                      </div>
                    ))}
                    {item.findings.length > 2 && (
                      <p className="text-[10px] text-muted-foreground ml-4">+{item.findings.length - 2} {isPt ? "achados" : "more findings"}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Score bar */}
              <div className="w-24 flex-shrink-0">
                <ScoreBar score={item.score} />
              </div>

              {/* Trend */}
              {item.delta !== null && (
                <div className="flex-shrink-0">
                  <span className={`text-xs font-medium ${item.delta > 0 ? "text-green-400" : item.delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                    {item.delta > 0 ? "↑" : item.delta < 0 ? "↓" : "→"}{item.delta > 0 ? "+" : ""}{item.delta}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default TreatmentPriorities;
