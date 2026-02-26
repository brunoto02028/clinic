"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  TrendingDown,
  Trophy,
} from "lucide-react";

// ========== Types ==========

interface SegmentScore {
  score: number;
  status: "good" | "fair" | "poor";
  keyIssue: string;
  trend?: "improving" | "declining" | "stable";
  previousScore?: number;
}

interface SegmentScoresData {
  head: SegmentScore;
  shoulders: SegmentScore;
  spine: SegmentScore;
  hips: SegmentScore;
  knees: SegmentScore;
  ankles: SegmentScore;
}

interface SegmentScoresProps {
  segmentScores: SegmentScoresData;
  overallScore?: number;
  compact?: boolean;
}

// ========== Helpers ==========

const SEGMENTS = [
  { key: "head", label: "Head & Neck", emoji: "🧠", yPos: 8 },
  { key: "shoulders", label: "Shoulders", emoji: "💪", yPos: 20 },
  { key: "spine", label: "Spine & Trunk", emoji: "🦴", yPos: 38 },
  { key: "hips", label: "Hips & Pelvis", emoji: "🫁", yPos: 52 },
  { key: "knees", label: "Knees", emoji: "🦵", yPos: 68 },
  { key: "ankles", label: "Ankles & Feet", emoji: "🦶", yPos: 85 },
] as const;

function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#EAB308";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30";
  if (score >= 60) return "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30";
  if (score >= 40) return "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30";
  return "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30";
}

function getScoreGrade(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Attention";
  return "Poor";
}

// ========== Circular Progress Ring ==========

function ScoreRing({
  score,
  size = 72,
  strokeWidth = 5,
  showLabel = true,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>
            {Math.round(score)}
          </span>
        </div>
      )}
    </div>
  );
}

// ========== Body Silhouette SVG ==========

function BodySilhouette({ segmentScores }: { segmentScores: SegmentScoresData }) {
  const segments: { key: keyof SegmentScoresData; paths: string; }[] = [
    {
      key: "head",
      paths: "M48,4 C42,4 38,8 38,14 C38,20 42,26 48,28 L48,32 L52,32 L52,28 C58,26 62,20 62,14 C62,8 58,4 52,4 Z",
    },
    {
      key: "shoulders",
      paths: "M30,33 L42,32 L48,34 L52,34 L58,32 L70,33 L72,38 L68,44 L60,42 L52,40 L48,40 L40,42 L32,44 L28,38 Z",
    },
    {
      key: "spine",
      paths: "M40,42 L60,42 L58,64 L54,68 L46,68 L42,64 Z",
    },
    {
      key: "hips",
      paths: "M42,64 L58,64 L62,72 L60,78 L52,76 L48,76 L40,78 L38,72 Z",
    },
    {
      key: "knees",
      paths: "M38,78 L44,78 L44,94 L40,96 L36,94 Z M56,78 L62,78 L64,94 L60,96 L56,94 Z",
    },
    {
      key: "ankles",
      paths: "M36,94 L44,94 L44,104 L42,108 L34,108 L34,104 Z M56,94 L64,94 L66,104 L66,108 L58,108 L56,104 Z",
    },
  ];

  return (
    <svg viewBox="0 0 100 112" className="w-full h-full max-h-[320px]">
      {segments.map((seg) => {
        const data = segmentScores[seg.key];
        const color = data ? getScoreColor(data.score) : "#64748B";
        return (
          <g key={seg.key}>
            <path
              d={seg.paths}
              fill={color}
              fillOpacity={0.2}
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.6}
              className="transition-all duration-500"
            />
            <path
              d={seg.paths}
              fill={color}
              fillOpacity={0.08}
              className="animate-pulse"
              style={{ animationDuration: "3s" }}
            />
          </g>
        );
      })}
      {/* Center spine line */}
      <line x1="50" y1="28" x2="50" y2="76" stroke="white" strokeWidth={0.5} strokeOpacity={0.15} strokeDasharray="2,2" />
    </svg>
  );
}

// ========== Main Component ==========

export function SegmentScores({ segmentScores, overallScore, compact = false }: SegmentScoresProps) {
  const sortedSegments = useMemo(() => {
    return SEGMENTS.map((seg) => ({
      ...seg,
      data: segmentScores[seg.key as keyof SegmentScoresData],
    })).sort((a, b) => (a.data?.score || 0) - (b.data?.score || 0));
  }, [segmentScores]);

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {SEGMENTS.map((seg) => {
          const data = segmentScores[seg.key as keyof SegmentScoresData];
          if (!data) return null;
          return (
            <div
              key={seg.key}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${getScoreBg(data.score)}`}
            >
              <ScoreRing score={data.score} size={36} strokeWidth={3} />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{seg.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{data.keyIssue || "Normal"}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Body Segment Analysis
          </CardTitle>
          {overallScore !== undefined && (
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" style={{ color: getScoreColor(overallScore) }} />
              <span className="text-lg font-bold" style={{ color: getScoreColor(overallScore) }}>
                {overallScore}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* Body Silhouette */}
          <div className="w-[140px] flex-shrink-0 flex items-center justify-center">
            <BodySilhouette segmentScores={segmentScores} />
          </div>

          {/* Segment List */}
          <div className="flex-1 space-y-2">
            {SEGMENTS.map((seg) => {
              const data = segmentScores[seg.key as keyof SegmentScoresData];
              if (!data) return null;
              const color = getScoreColor(data.score);
              const delta = data.previousScore != null ? data.score - data.previousScore : null;

              return (
                <div
                  key={seg.key}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all hover:bg-white/5 ${getScoreBg(data.score)}`}
                >
                  <ScoreRing score={data.score} size={44} strokeWidth={3.5} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{seg.emoji}</span>
                      <span className="text-sm font-medium">{seg.label}</span>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] px-1.5 py-0"
                        style={{ borderColor: color, color }}
                      >
                        {getScoreGrade(data.score)}
                      </Badge>
                    </div>
                    {data.keyIssue && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{data.keyIssue}</p>
                    )}
                  </div>

                  {/* Trend indicator */}
                  {delta !== null && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {delta > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : delta < 0 ? (
                        <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span
                        className="text-xs font-medium"
                        style={{ color: delta > 0 ? "#22C55E" : delta < 0 ? "#EF4444" : "#64748B" }}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SegmentScores;
