"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";

// ========== Types ==========

interface AssessmentData {
  id: string;
  date: string;
  assessmentNumber: string;
  overallScore: number | null;
  postureScore: number | null;
  symmetryScore: number | null;
  mobilityScore: number | null;
  segmentScores?: Record<string, { score: number; status?: string; keyIssue?: string }>;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  leftImageUrl?: string | null;
  rightImageUrl?: string | null;
  aiFindings?: Array<{ area: string; finding: string; severity: string }>;
}

interface CrossSessionComparisonProps {
  assessments: AssessmentData[];
  currentId?: string;
}

// ========== Helpers ==========

function getScoreColor(score: number | null): string {
  if (score === null) return "#64748B";
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#EAB308";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const SEGMENTS = ["head", "shoulders", "spine", "hips", "knees", "ankles"] as const;
const SEGMENT_LABELS: Record<string, string> = {
  head: "Head & Neck", shoulders: "Shoulders", spine: "Spine",
  hips: "Hips", knees: "Knees", ankles: "Ankles",
};
const SEGMENT_EMOJIS: Record<string, string> = {
  head: "🧠", shoulders: "💪", spine: "🦴", hips: "🫁", knees: "🦵", ankles: "🦶",
};

// ========== Score Comparison Row ==========

function ScoreRow({
  label,
  emoji,
  scoreA,
  scoreB,
}: {
  label: string;
  emoji?: string;
  scoreA: number | null;
  scoreB: number | null;
}) {
  const delta = scoreA !== null && scoreB !== null ? scoreB - scoreA : null;

  return (
    <div className="flex items-center gap-2 py-1.5 border-b last:border-0">
      {emoji && <span className="text-sm w-5">{emoji}</span>}
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <span className="text-xs font-bold w-10 text-center" style={{ color: getScoreColor(scoreA) }}>
        {scoreA ?? "—"}
      </span>
      <div className="w-16 flex justify-center">
        {delta !== null ? (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${
            delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
          }`}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {delta > 0 ? "+" : ""}{delta}
          </span>
        ) : (
          <Minus className="w-3 h-3 text-muted-foreground/40" />
        )}
      </div>
      <span className="text-xs font-bold w-10 text-center" style={{ color: getScoreColor(scoreB) }}>
        {scoreB ?? "—"}
      </span>
    </div>
  );
}

// ========== Image Pair ==========

function ImagePair({
  label,
  urlA,
  urlB,
  dateA,
  dateB,
}: {
  label: string;
  urlA?: string | null;
  urlB?: string | null;
  dateA: string;
  dateB: string;
}) {
  if (!urlA && !urlB) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg overflow-hidden bg-muted aspect-[3/4] relative">
          {urlA ? (
            <img src={urlA} alt={`${label} A`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
            <p className="text-[9px] text-white/70">{formatDate(dateA)}</p>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden bg-muted aspect-[3/4] relative">
          {urlB ? (
            <img src={urlB} alt={`${label} B`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
            <p className="text-[9px] text-white/70">{formatDate(dateB)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== Main Component ==========

export function CrossSessionComparison({ assessments, currentId }: CrossSessionComparisonProps) {
  const sorted = useMemo(
    () => [...assessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [assessments]
  );

  const defaultA = currentId ? sorted.findIndex((a) => a.id === currentId) : 0;
  const defaultB = defaultA >= 0 && sorted.length > 1 ? (defaultA === 0 ? 1 : 0) : -1;

  const [selectedA, setSelectedA] = useState<string>(sorted[defaultA >= 0 ? defaultA : 0]?.id || "");
  const [selectedB, setSelectedB] = useState<string>(sorted[defaultB >= 0 ? defaultB : Math.min(1, sorted.length - 1)]?.id || "");
  const [viewMode, setViewMode] = useState<"scores" | "images">("scores");

  const assessA = sorted.find((a) => a.id === selectedA);
  const assessB = sorted.find((a) => a.id === selectedB);

  if (sorted.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ArrowLeftRight className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Need at least 2 assessments to compare.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Complete another assessment to unlock comparison.</p>
        </CardContent>
      </Card>
    );
  }

  const overallDelta = assessA && assessB && assessA.overallScore !== null && assessB.overallScore !== null
    ? assessB.overallScore - assessA.overallScore
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            Compare Assessments
          </CardTitle>
          {overallDelta !== null && (
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${
                overallDelta > 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : overallDelta < 0
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : "bg-white/5 text-white/40 border-white/10"
              }`}
            >
              {overallDelta > 0 ? (
                <><TrendingUp className="w-3 h-3 mr-1" />+{overallDelta} pts improvement</>
              ) : overallDelta < 0 ? (
                <><TrendingDown className="w-3 h-3 mr-1" />{overallDelta} pts decline</>
              ) : (
                <><Minus className="w-3 h-3 mr-1" />No change</>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selectors */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
          <Select value={selectedA} onValueChange={setSelectedA}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sorted.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-xs">
                  {a.assessmentNumber} — {formatDate(a.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />

          <Select value={selectedB} onValueChange={setSelectedB}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sorted.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-xs">
                  {a.assessmentNumber} — {formatDate(a.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setViewMode("scores")}
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
              viewMode === "scores" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Scores
          </button>
          <button
            onClick={() => setViewMode("images")}
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
              viewMode === "images" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Images
          </button>
        </div>

        {assessA && assessB && viewMode === "scores" && (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wide">
              <span className="flex-1" />
              <span className="w-5" />
              <span className="w-10 text-center">{formatDate(assessA.date).split(" ").slice(0, 2).join(" ")}</span>
              <span className="w-16 text-center">Change</span>
              <span className="w-10 text-center">{formatDate(assessB.date).split(" ").slice(0, 2).join(" ")}</span>
            </div>

            {/* Main scores */}
            <div className="rounded-lg bg-muted/50 border px-3 py-1">
              <ScoreRow label="Overall" scoreA={assessA.overallScore} scoreB={assessB.overallScore} emoji="🏆" />
              <ScoreRow label="Posture" scoreA={assessA.postureScore} scoreB={assessB.postureScore} emoji="🧍" />
              <ScoreRow label="Symmetry" scoreA={assessA.symmetryScore} scoreB={assessB.symmetryScore} emoji="⚖️" />
              <ScoreRow label="Mobility" scoreA={assessA.mobilityScore} scoreB={assessB.mobilityScore} emoji="🤸" />
            </div>

            {/* Segment scores */}
            {(assessA.segmentScores || assessB.segmentScores) && (
              <div className="rounded-lg bg-muted/50 border px-3 py-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide py-1.5 border-b">
                  Body Segments
                </p>
                {SEGMENTS.map((seg) => (
                  <ScoreRow
                    key={seg}
                    label={SEGMENT_LABELS[seg]}
                    emoji={SEGMENT_EMOJIS[seg]}
                    scoreA={assessA.segmentScores?.[seg]?.score ?? null}
                    scoreB={assessB.segmentScores?.[seg]?.score ?? null}
                  />
                ))}
              </div>
            )}

            {/* Findings comparison */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/50 border p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                  Findings ({formatDate(assessA.date).split(" ").slice(0, 2).join(" ")})
                </p>
                <div className="space-y-1">
                  {(assessA.aiFindings || []).slice(0, 5).map((f, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <AlertTriangle className={`w-2.5 h-2.5 mt-0.5 flex-shrink-0 ${
                        f.severity === "severe" ? "text-red-400" : f.severity === "moderate" ? "text-orange-400" : "text-yellow-400"
                      }`} />
                      <p className="text-[10px] text-muted-foreground leading-tight">{f.finding}</p>
                    </div>
                  ))}
                  {(!assessA.aiFindings || assessA.aiFindings.length === 0) && (
                    <p className="text-[10px] text-muted-foreground/50">No findings</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 border p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                  Findings ({formatDate(assessB.date).split(" ").slice(0, 2).join(" ")})
                </p>
                <div className="space-y-1">
                  {(assessB.aiFindings || []).slice(0, 5).map((f, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <AlertTriangle className={`w-2.5 h-2.5 mt-0.5 flex-shrink-0 ${
                        f.severity === "severe" ? "text-red-400" : f.severity === "moderate" ? "text-orange-400" : "text-yellow-400"
                      }`} />
                      <p className="text-[10px] text-muted-foreground leading-tight">{f.finding}</p>
                    </div>
                  ))}
                  {(!assessB.aiFindings || assessB.aiFindings.length === 0) && (
                    <p className="text-[10px] text-muted-foreground/50">No findings</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {assessA && assessB && viewMode === "images" && (
          <div className="space-y-4">
            <ImagePair label="Frontal View" urlA={assessA.frontImageUrl} urlB={assessB.frontImageUrl} dateA={assessA.date} dateB={assessB.date} />
            <ImagePair label="Posterior View" urlA={assessA.backImageUrl} urlB={assessB.backImageUrl} dateA={assessA.date} dateB={assessB.date} />
            <ImagePair label="Left Lateral" urlA={assessA.leftImageUrl} urlB={assessB.leftImageUrl} dateA={assessA.date} dateB={assessB.date} />
            <ImagePair label="Right Lateral" urlA={assessA.rightImageUrl} urlB={assessB.rightImageUrl} dateA={assessA.date} dateB={assessB.date} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CrossSessionComparison;
