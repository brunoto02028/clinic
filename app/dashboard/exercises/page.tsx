"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dumbbell,
  Play,
  X,
  Check,
  RefreshCw,
  Target,
  Repeat,
  Pause,
  Clock,
  ChevronDown,
  ChevronUp,
  FileVideo,
  Video,
  CheckCircle2,
  CalendarDays,
  User,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

// ─── Constants ─────────────────────────────────────────

const BODY_REGIONS: Record<string, string> = {
  SHOULDER: "Shoulder",
  ELBOW: "Elbow",
  WRIST_HAND: "Wrist / Hand",
  HIP: "Hip",
  KNEE: "Knee",
  ANKLE_FOOT: "Ankle / Foot",
  SPINE_BACK: "Spine / Back",
  NECK_CERVICAL: "Neck / Cervical",
  CORE_ABDOMEN: "Core / Abdomen",
  STRETCHING: "Stretching",
  MUSCLE_INJURY: "Muscle Injury",
  FULL_BODY: "Full Body",
  OTHER: "Other",
};

const REGION_GROUPS: Record<string, string[]> = {
  "Upper Limbs": ["SHOULDER", "ELBOW", "WRIST_HAND"],
  "Lower Limbs": ["HIP", "KNEE", "ANKLE_FOOT"],
  "Trunk & Core": ["SPINE_BACK", "NECK_CERVICAL", "CORE_ABDOMEN"],
  "Other": ["STRETCHING", "MUSCLE_INJURY", "FULL_BODY", "OTHER"],
};

const REGION_EMOJIS: Record<string, string> = {
  SHOULDER: "💪",
  ELBOW: "🦾",
  WRIST_HAND: "✋",
  HIP: "🦵",
  KNEE: "🦿",
  ANKLE_FOOT: "🦶",
  SPINE_BACK: "🔙",
  NECK_CERVICAL: "🧘",
  CORE_ABDOMEN: "🏋️",
  STRETCHING: "🤸",
  MUSCLE_INJURY: "🩹",
  FULL_BODY: "🏃",
  OTHER: "📋",
};

const DIFFICULTIES: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: "Beginner", color: "bg-green-100 text-green-700" },
  INTERMEDIATE: { label: "Intermediate", color: "bg-amber-100 text-amber-700" },
  ADVANCED: { label: "Advanced", color: "bg-red-100 text-red-700" },
};

interface Prescription {
  id: string;
  sets: number | null;
  reps: number | null;
  holdSeconds: number | null;
  restSeconds: number | null;
  frequency: string | null;
  notes: string | null;
  isActive: boolean;
  completedCount: number;
  lastCompletedAt: string | null;
  startDate: string;
  createdAt: string;
  exercise: {
    id: string;
    name: string;
    description: string | null;
    instructions: string | null;
    bodyRegion: string;
    difficulty: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    duration: number | null;
    defaultSets: number | null;
    defaultReps: number | null;
    defaultHoldSec: number | null;
    defaultRestSec: number | null;
  };
  therapist: { firstName: string; lastName: string };
}

// ─── Page ──────────────────────────────────────────────

export default function PatientExercisesPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<Prescription | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exercises");
      const data = await res.json();
      setPrescriptions(data.prescriptions || []);
      // Auto-expand all regions that have exercises
      const regions = new Set(
        (data.prescriptions || []).map((p: Prescription) => p.exercise.bodyRegion)
      );
      setExpandedRegions(regions as Set<string>);
    } catch (err) {
      console.error("Failed to fetch exercises:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleComplete = async (prescriptionId: string) => {
    setCompletingId(prescriptionId);
    try {
      await fetch("/api/exercises", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId }),
      });
      // Update local state
      setPrescriptions((prev) =>
        prev.map((p) =>
          p.id === prescriptionId
            ? { ...p, completedCount: p.completedCount + 1, lastCompletedAt: new Date().toISOString() }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to mark complete:", err);
    } finally {
      setTimeout(() => setCompletingId(null), 1000);
    }
  };

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  // Group prescriptions by body region
  const grouped: Record<string, Prescription[]> = {};
  prescriptions.forEach((p) => {
    const region = p.exercise.bodyRegion;
    if (!grouped[region]) grouped[region] = [];
    grouped[region].push(p);
  });

  // Sort groups by REGION_GROUPS order
  const orderedRegions: string[] = [];
  Object.values(REGION_GROUPS).forEach((regions) => {
    regions.forEach((r) => {
      if (grouped[r]) orderedRegions.push(r);
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">{T("exercises.loading")}</span>
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Dumbbell className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-lg sm:text-xl font-semibold text-muted-foreground">{T("exercises.noExercisesPatient")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          {T("exercises.noExercisesPatientDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{T("exercises.myExercises")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {prescriptions.length} {prescriptions.length !== 1 ? T("exercises.exercisePlural") : T("exercises.exercise")} {T("exercises.prescribed")} {orderedRegions.length} {T("exercises.bodyRegions").toLowerCase()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Dumbbell className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{prescriptions.length}</p>
            <p className="text-xs text-muted-foreground">{T("exercises.exercisesLabel")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Target className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{orderedRegions.length}</p>
            <p className="text-xs text-muted-foreground">{T("exercises.bodyRegions")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">
              {prescriptions.reduce((sum, p) => sum + p.completedCount, 0)}
            </p>
            <p className="text-xs text-muted-foreground">{T("exercises.completedLabel")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Video className="h-6 w-6 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">
              {prescriptions.filter((p) => p.exercise.videoUrl).length}
            </p>
            <p className="text-xs text-muted-foreground">{T("exercises.withVideo")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Exercise Groups by Body Region */}
      <div className="space-y-4">
        {orderedRegions.map((region) => {
          const regionExercises = grouped[region];
          const isExpanded = expandedRegions.has(region);

          return (
            <Card key={region} className="overflow-hidden">
              {/* Region Header */}
              <button
                onClick={() => toggleRegion(region)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{REGION_EMOJIS[region] || "📋"}</span>
                  <div>
                    <h2 className="font-semibold text-base">{BODY_REGIONS[region] || region}</h2>
                    <p className="text-xs text-muted-foreground">
                      {regionExercises.length} {regionExercises.length !== 1 ? T("exercises.exercisePlural") : T("exercises.exercise")}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Exercises */}
              {isExpanded && (
                <div className="border-t divide-y">
                  {regionExercises.map((p) => (
                    <ExerciseRow
                      key={p.id}
                      prescription={p}
                      onPlay={() => setActiveVideo(p)}
                      onComplete={() => handleComplete(p.id)}
                      completing={completingId === p.id}
                    />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          prescription={activeVideo}
          onClose={() => setActiveVideo(null)}
          completing={completingId === activeVideo.id}
          onComplete={() => {
            handleComplete(activeVideo.id);
            setTimeout(() => setActiveVideo(null), 1200);
          }}
        />
      )}
    </div>
  );
}

// ─── Exercise Row ──────────────────────────────────────

function ExerciseRow({
  prescription,
  onPlay,
  onComplete,
  completing,
}: {
  prescription: Prescription;
  onPlay: () => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const ex = prescription.exercise;
  const diff = DIFFICULTIES[ex.difficulty] || DIFFICULTIES.BEGINNER;
  const sets = prescription.sets || ex.defaultSets;
  const reps = prescription.reps || ex.defaultReps;
  const holdSec = prescription.holdSeconds || ex.defaultHoldSec;
  const restSec = prescription.restSeconds || ex.defaultRestSec;

  return (
    <div className="relative px-3 sm:px-5 py-3 sm:py-4 pb-10 sm:pb-4 flex items-start gap-3 sm:gap-4">
      {/* Thumbnail / Play */}
      <div
        className={`relative w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden ${
          ex.videoUrl ? "cursor-pointer group" : ""
        }`}
        onClick={ex.videoUrl ? onPlay : undefined}
      >
        {ex.thumbnailUrl ? (
          <img src={ex.thumbnailUrl} alt={ex.name} className="w-full h-full object-cover" />
        ) : ex.videoUrl ? (
          <FileVideo className="h-8 w-8 text-muted-foreground/50" />
        ) : (
          <Dumbbell className="h-8 w-8 text-muted-foreground/30" />
        )}
        {ex.videoUrl && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">{ex.name}</h3>
          <Badge className={`${diff.color} text-[10px] px-1.5 py-0`}>{diff.label}</Badge>
        </div>

        {ex.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{ex.description}</p>
        )}

        {/* Parameters */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {sets && (
            <span className="flex items-center gap-0.5">
              <Target className="h-3 w-3" /> {sets} {T("exercises.sets")}
            </span>
          )}
          {reps && (
            <span className="flex items-center gap-0.5">
              <Repeat className="h-3 w-3" /> {reps} {T("exercises.reps")}
            </span>
          )}
          {holdSec && (
            <span className="flex items-center gap-0.5">
              <Pause className="h-3 w-3" /> {holdSec}s {T("exercises.hold")}
            </span>
          )}
          {restSec && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {restSec}s {T("exercises.rest")}
            </span>
          )}
          {prescription.frequency && (
            <span className="flex items-center gap-0.5">
              <CalendarDays className="h-3 w-3" /> {prescription.frequency}
            </span>
          )}
        </div>

        {/* Therapist notes */}
        {prescription.notes && (
          <div className="bg-muted/50 rounded px-2 py-1.5 text-xs text-muted-foreground flex items-start gap-1.5">
            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{prescription.notes}</span>
          </div>
        )}

        {/* Prescribed by + progress */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Dr. {prescription.therapist.firstName} {prescription.therapist.lastName}
          </span>
          {prescription.completedCount > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {T("exercises.completedCount")} {prescription.completedCount}x
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="hidden sm:flex flex-col gap-2 shrink-0">
        {ex.videoUrl && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onPlay}>
            <Play className="h-3 w-3 mr-1" /> {T("exercises.watch")}
          </Button>
        )}
        <Button
          variant={completing ? "default" : "outline"}
          size="sm"
          className={`h-8 text-xs ${completing ? "bg-green-600 hover:bg-green-600" : ""}`}
          onClick={onComplete}
          disabled={completing}
        >
          {completing ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <Check className="h-3 w-3 mr-1" />
          )}
          {completing ? T("exercises.completed") : T("exercises.complete")}
        </Button>
      </div>
      {/* Mobile actions - below content */}
      <div className="flex sm:hidden gap-2 absolute bottom-3 right-3">
        {ex.videoUrl && (
          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={onPlay}>
            <Play className="h-3 w-3 mr-0.5" /> {T("exercises.watch")}
          </Button>
        )}
        <Button
          variant={completing ? "default" : "outline"}
          size="sm"
          className={`h-7 text-[10px] px-2 ${completing ? "bg-green-600 hover:bg-green-600" : ""}`}
          onClick={onComplete}
          disabled={completing}
        >
          {completing ? <CheckCircle2 className="h-3 w-3" /> : <Check className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Video Player Modal ────────────────────────────────

function VideoPlayerModal({
  prescription,
  onClose,
  onComplete,
  completing = false,
}: {
  prescription: Prescription;
  onClose: () => void;
  onComplete: () => void;
  completing?: boolean;
}) {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const ex = prescription.exercise;
  const sets = prescription.sets || ex.defaultSets;
  const reps = prescription.reps || ex.defaultReps;
  const holdSec = prescription.holdSeconds || ex.defaultHoldSec;
  const isYoutube = ex.videoUrl?.includes("youtube.com") || ex.videoUrl?.includes("youtu.be");

  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{ex.name}</h3>
            <p className="text-sm text-muted-foreground">{BODY_REGIONS[ex.bodyRegion]}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Video */}
        <div className="p-4">
          {isYoutube ? (
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                src={getYoutubeEmbedUrl(ex.videoUrl!)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video
              src={ex.videoUrl!}
              controls
              className="w-full rounded-lg"
              autoPlay
            />
          )}
        </div>

        {/* Instructions & Details */}
        <div className="px-4 pb-4 space-y-3">
          {/* Parameters */}
          <div className="flex items-center gap-4 text-sm flex-wrap">
            {sets && (
              <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium">{sets} {T("exercises.sets")}</span>
              </div>
            )}
            {reps && (
              <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
                <Repeat className="h-4 w-4 text-primary" />
                <span className="font-medium">{reps} {T("exercises.reps")}</span>
              </div>
            )}
            {holdSec && (
              <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
                <Pause className="h-4 w-4 text-primary" />
                <span className="font-medium">{holdSec}s {T("exercises.hold")}</span>
              </div>
            )}
            {prescription.frequency && (
              <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="font-medium">{prescription.frequency}</span>
              </div>
            )}
          </div>

          {ex.instructions && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">{T("exercises.instructions")}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ex.instructions}</p>
            </div>
          )}

          {prescription.notes && (
            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">{T("exercises.therapistNotes")}</p>
              <p className="text-sm text-muted-foreground">{prescription.notes}</p>
            </div>
          )}

          {/* Complete Button */}
          <Button
            className={`w-full ${completing ? "bg-green-600 hover:bg-green-600" : ""}`}
            size="lg"
            onClick={onComplete}
            disabled={completing}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            {completing ? T("exercises.completed") : T("exercises.complete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
