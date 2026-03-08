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
import { PosturalComparisonView } from "./postural-comparison-view";

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
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  frontLandmarks?: any[] | null;
  backLandmarks?: any[] | null;
  locale?: string;
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
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/30";
  if (score >= 60) return "bg-yellow-500/10 border-yellow-500/30";
  if (score >= 40) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
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

// ========== Realistic Anatomical Body SVG ==========

function BodySilhouette({ segmentScores }: { segmentScores: SegmentScoresData }) {
  // Realistic anatomical human body outline — frontal view
  // Each segment uses detailed paths for a medical-quality appearance
  const segments: { key: keyof SegmentScoresData; paths: string[] }[] = [
    {
      key: "head",
      paths: [
        // Head oval + neck
        "M50,3 C44,3 39,7 38,13 C37,18 38,22 40,25 C42,28 45,30 48,31 L48,36 C48,37 49,38 50,38 C51,38 52,37 52,36 L52,31 C55,30 58,28 60,25 C62,22 63,18 62,13 C61,7 56,3 50,3 Z",
      ],
    },
    {
      key: "shoulders",
      paths: [
        // Left shoulder + upper arm
        "M48,38 C46,38 42,38 38,39 C33,40 28,42 25,44 C22,46 21,48 22,50 C23,52 25,53 28,53 L34,52 C37,51 40,49 42,48 L44,46 L48,44 Z",
        // Right shoulder + upper arm
        "M52,38 C54,38 58,38 62,39 C67,40 72,42 75,44 C78,46 79,48 78,50 C77,52 75,53 72,53 L66,52 C63,51 60,49 58,48 L56,46 L52,44 Z",
      ],
    },
    {
      key: "spine",
      paths: [
        // Torso / trunk
        "M44,46 L42,48 C40,52 39,56 39,60 C39,64 40,68 41,71 L43,74 L46,76 L50,77 L54,76 L57,74 L59,71 C60,68 61,64 61,60 C61,56 60,52 58,48 L56,46 L52,44 L48,44 Z",
      ],
    },
    {
      key: "hips",
      paths: [
        // Pelvis / hips
        "M43,74 L41,76 C39,78 37,80 36,83 C35,85 35,87 36,88 L38,90 L42,91 L46,91 L50,90 L54,91 L58,91 L62,90 L64,88 C65,87 65,85 64,83 C63,80 61,78 59,76 L57,74 L54,76 L50,77 L46,76 Z",
      ],
    },
    {
      key: "knees",
      paths: [
        // Left thigh + knee
        "M38,90 L36,93 C35,96 34,99 34,102 C34,105 35,108 36,110 L38,112 L40,113 L42,112 L44,110 C45,108 46,105 46,102 C46,99 45,96 44,93 L42,91 Z",
        // Right thigh + knee
        "M62,90 L64,93 C65,96 66,99 66,102 C66,105 65,108 64,110 L62,112 L60,113 L58,112 L56,110 C55,108 54,105 54,102 C54,99 55,96 56,93 L58,91 Z",
      ],
    },
    {
      key: "ankles",
      paths: [
        // Left shin + ankle + foot
        "M38,112 L37,116 C36,120 35,124 35,128 C35,131 36,134 37,136 L38,138 C39,139 40,140 42,140 L45,139 L46,137 C46,135 45,133 44,131 L44,128 C44,124 43,120 42,116 L42,112 Z",
        // Right shin + ankle + foot
        "M62,112 L63,116 C64,120 65,124 65,128 C65,131 64,134 63,136 L62,138 C61,139 60,140 58,140 L55,139 L54,137 C54,135 55,133 56,131 L56,128 C56,124 57,120 58,116 L58,112 Z",
      ],
    },
  ];

  return (
    <svg viewBox="0 0 100 145" className="w-full h-full max-h-[320px]">
      <defs>
        {/* Subtle gradient for each segment */}
        {segments.map((seg) => {
          const data = segmentScores[seg.key];
          const color = data ? getScoreColor(data.score) : "#64748B";
          return (
            <radialGradient key={`grad-${seg.key}`} id={`grad-${seg.key}`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.1} />
            </radialGradient>
          );
        })}
      </defs>

      {/* Body outline shadow for depth */}
      {segments.map((seg) => (
        seg.paths.map((p, pi) => (
          <path
            key={`shadow-${seg.key}-${pi}`}
            d={p}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.4}
            strokeOpacity={0.08}
            transform="translate(0.5, 0.5)"
          />
        ))
      ))}

      {/* Colored segments */}
      {segments.map((seg) => {
        const data = segmentScores[seg.key];
        const color = data ? getScoreColor(data.score) : "#64748B";
        return (
          <g key={seg.key}>
            {seg.paths.map((p, pi) => (
              <path
                key={pi}
                d={p}
                fill={`url(#grad-${seg.key})`}
                stroke={color}
                strokeWidth={1.2}
                strokeOpacity={0.7}
                strokeLinejoin="round"
                className="transition-all duration-500"
              />
            ))}
          </g>
        );
      })}

      {/* Center midline */}
      <line x1="50" y1="31" x2="50" y2="90" stroke="currentColor" strokeWidth={0.3} strokeOpacity={0.12} strokeDasharray="2,3" />

      {/* Score labels on body */}
      {segments.map((seg) => {
        const data = segmentScores[seg.key];
        if (!data) return null;
        const color = getScoreColor(data.score);
        const labelY: Record<string, number> = { head: 16, shoulders: 48, spine: 62, hips: 84, knees: 104, ankles: 130 };
        return (
          <text
            key={`label-${seg.key}`}
            x="50"
            y={labelY[seg.key]}
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fill={color}
            className="select-none"
          >
            {Math.round(data.score)}
          </text>
        );
      })}
    </svg>
  );
}

// ========== Main Component ==========

export function SegmentScores({ segmentScores, overallScore, compact = false, frontImageUrl, backImageUrl, frontLandmarks, backLandmarks, locale }: SegmentScoresProps) {
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
        {/* Postural Comparison Photos (replaces SVG avatar) */}
        {(frontImageUrl || backImageUrl) && (
          <div className="mb-4">
            <PosturalComparisonView
              frontImageUrl={frontImageUrl}
              backImageUrl={backImageUrl}
              frontLandmarks={frontLandmarks}
              backLandmarks={backLandmarks}
              segmentScores={segmentScores}
              postureScore={overallScore}
              locale={locale}
              compact
            />
          </div>
        )}

        <div className="flex gap-6">
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
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all hover:brightness-110 ${getScoreBg(data.score)}`}
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
