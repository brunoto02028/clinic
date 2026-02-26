"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Clock,
  Repeat,
  Layers,
  Target,
  Zap,
  Star,
  CheckCircle2,
  ListChecks,
} from "lucide-react";

// ========== Types ==========

interface Exercise {
  name: string;
  targetArea: string;
  finding: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  sets: number;
  reps: number;
  holdSeconds?: number;
  instructions: string;
  benefits: string;
  musclesTargeted: string[];
}

interface CorrectiveExercisesProps {
  exercises: Exercise[];
  title?: string;
  compact?: boolean;
}

// ========== Helpers ==========

const DIFFICULTY_CONFIG = {
  beginner: {
    color: "#22C55E",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    label: "Beginner",
    stars: 1,
  },
  intermediate: {
    color: "#F59E0B",
    bg: "bg-amber-500/10 border-amber-500/20",
    label: "Intermediate",
    stars: 2,
  },
  advanced: {
    color: "#EF4444",
    bg: "bg-red-500/10 border-red-500/20",
    label: "Advanced",
    stars: 3,
  },
};

const AREA_EMOJIS: Record<string, string> = {
  cervical: "🧠",
  head: "🧠",
  neck: "🧠",
  shoulders: "💪",
  shoulder: "💪",
  thoracic: "🦴",
  spine: "🦴",
  lumbar: "🦴",
  core: "🫁",
  hips: "🏃",
  hip: "🏃",
  pelvis: "🏃",
  knees: "🦵",
  knee: "🦵",
  ankles: "🦶",
  ankle: "🦶",
  foot: "🦶",
  feet: "🦶",
  glutes: "🍑",
  gluteal: "🍑",
};

function getAreaEmoji(area: string): string {
  const lower = area.toLowerCase();
  for (const [key, emoji] of Object.entries(AREA_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "🏋️";
}

// ========== Exercise Card ==========

function ExerciseCard({ exercise, index }: { exercise: Exercise; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const diff = DIFFICULTY_CONFIG[exercise.difficulty] || DIFFICULTY_CONFIG.beginner;
  const emoji = getAreaEmoji(exercise.targetArea);

  return (
    <div
      className={`rounded-xl border transition-all duration-300 overflow-hidden ${
        expanded ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5" : "bg-muted/30 border-border hover:border-border/80"
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Number badge */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 flex items-center justify-center">
          <span className="text-lg">{emoji}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{exercise.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: diff.color, color: diff.color }}>
              {Array.from({ length: diff.stars }).map((_, i) => "★").join("")} {diff.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Addresses: <span className="text-foreground/70">{exercise.finding}</span>
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 flex-shrink-0 mr-2">
          <div className="text-center">
            <p className="text-xs font-bold text-primary">{exercise.sets}×{exercise.reps}</p>
            <p className="text-[9px] text-muted-foreground">sets×reps</p>
          </div>
          {exercise.holdSeconds && exercise.holdSeconds > 0 && (
            <div className="text-center">
              <p className="text-xs font-bold text-amber-500">{exercise.holdSeconds}s</p>
            <p className="text-[9px] text-muted-foreground">hold</p>
            </div>
          )}
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t">
          {/* Stats row */}
          <div className="flex items-center gap-4 pt-3">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">{exercise.sets} sets</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">{exercise.reps} reps</span>
            </div>
            {exercise.holdSeconds && exercise.holdSeconds > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-muted-foreground">{exercise.holdSeconds}s hold</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs text-muted-foreground capitalize">{exercise.targetArea}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-muted/50 border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ListChecks className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Instructions
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {exercise.instructions}
            </p>
          </div>

          {/* Benefits */}
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/10 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Benefits
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{exercise.benefits}</p>
          </div>

          {/* Muscles targeted */}
          {exercise.musclesTargeted && exercise.musclesTargeted.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Zap className="w-3.5 h-3.5 text-violet-500 mt-0.5" />
              {exercise.musclesTargeted.map((muscle, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-500/20"
                >
                  {muscle}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== Main Component ==========

export function CorrectiveExercises({ exercises, title, compact = false }: CorrectiveExercisesProps) {
  const [showAll, setShowAll] = useState(false);
  const displayList = compact && !showAll ? exercises.slice(0, 3) : exercises;

  const diffCounts = {
    beginner: exercises.filter((e) => e.difficulty === "beginner").length,
    intermediate: exercises.filter((e) => e.difficulty === "intermediate").length,
    advanced: exercises.filter((e) => e.difficulty === "advanced").length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            {title || "Corrective Exercises"}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] px-2 py-0 text-primary border-primary/30">
            {exercises.length} exercises
          </Badge>
        </div>
        {/* Difficulty summary */}
        <div className="flex items-center gap-2 mt-1">
          {diffCounts.beginner > 0 && (
            <span className="text-[10px] text-emerald-400">★ {diffCounts.beginner} beginner</span>
          )}
          {diffCounts.intermediate > 0 && (
            <span className="text-[10px] text-amber-400">★★ {diffCounts.intermediate} intermediate</span>
          )}
          {diffCounts.advanced > 0 && (
            <span className="text-[10px] text-red-400">★★★ {diffCounts.advanced} advanced</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayList.map((exercise, i) => (
            <ExerciseCard key={i} exercise={exercise} index={i} />
          ))}
        </div>

        {compact && exercises.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 w-full text-center text-xs text-primary hover:text-primary/80 transition-colors py-1.5"
          >
            {showAll ? "Show less" : `Show all ${exercises.length} exercises`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default CorrectiveExercises;
