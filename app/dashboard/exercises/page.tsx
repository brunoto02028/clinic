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
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { regionName, regionIcon, ORDERED_REGION_KEYS } from "@/lib/exercise-regions";

// ─── Constants ─────────────────────────────────────────

const DIFFICULTIES_EN: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: "Beginner", color: "bg-green-500/15 text-green-400" },
  INTERMEDIATE: { label: "Intermediate", color: "bg-amber-500/15 text-amber-400" },
  ADVANCED: { label: "Advanced", color: "bg-red-500/15 text-red-400" },
};
const DIFFICULTIES_PT: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: "Iniciante", color: "bg-green-500/15 text-green-400" },
  INTERMEDIATE: { label: "Intermediário", color: "bg-amber-500/15 text-amber-400" },
  ADVANCED: { label: "Avançado", color: "bg-red-500/15 text-red-400" },
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
    namePt: string | null;
    descriptionPt: string | null;
    instructionsPt: string | null;
    folderId: string | null;
    folder: { id: string; name: string } | null;
    bodyRegion: string;
    difficulty: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    duration: number | null;
    muteForPatient: boolean;
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
  const { toast } = useToast();
  const isPt = locale === "pt-BR";
  const T = (key: string) => i18nT(key, locale);
  const DIFFICULTIES = isPt ? DIFFICULTIES_PT : DIFFICULTIES_EN;
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<Prescription | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exercises");
      const data = await res.json();
      setPrescriptions(data.prescriptions || []);
      // Start collapsed — a patient with 20-30 videos should see the list of
      // sections on one screen, not a wall of exercises to scroll past.
      setExpandedRegions(new Set());
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
      // fetch() only rejects on network errors, so without this check a 404
      // or 500 would still tick the exercise off on screen while nothing was
      // saved — the patient would think they'd logged it.
      const res = await fetch("/api/exercises", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      // Update local state
      setPrescriptions((prev) =>
        prev.map((p) =>
          p.id === prescriptionId
            ? { ...p, completedCount: p.completedCount + 1, lastCompletedAt: new Date().toISOString() }
            : p
        )
      );

      const { dismiss } = toast({
        description: T("exercises.markedComplete"),
        action: (
          <ToastAction altText={T("exercises.undo")} onClick={() => handleUndo(prescriptionId)}>
            {T("exercises.undo")}
          </ToastAction>
        ),
      });
      setTimeout(dismiss, 6000);
    } catch (err) {
      console.error("Failed to mark complete:", err);
      toast({ variant: "destructive", description: T("exercises.completeFailed") });
    } finally {
      setTimeout(() => setCompletingId(null), 1000);
    }
  };

  const handleUndo = async (prescriptionId: string) => {
    try {
      const res = await fetch("/api/exercises", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId, action: "undo" }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setPrescriptions((prev) =>
        prev.map((p) =>
          p.id === prescriptionId
            ? { ...p, completedCount: Math.max(0, p.completedCount - 1) }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to undo:", err);
      toast({ variant: "destructive", description: T("exercises.undoFailed") });
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

  // Sections: exercises that came from a named admin folder are grouped under
  // that folder; anything else falls back to its body region.
  const byFolder: Record<string, { name: string; items: Prescription[] }> = {};
  const byRegion: Record<string, Prescription[]> = {};
  prescriptions.forEach((p) => {
    const folder = p.exercise.folder;
    if (folder) {
      if (!byFolder[folder.id]) byFolder[folder.id] = { name: folder.name, items: [] };
      byFolder[folder.id].items.push(p);
    } else {
      const region = p.exercise.bodyRegion;
      if (!byRegion[region]) byRegion[region] = [];
      byRegion[region].push(p);
    }
  });

  const sections: { key: string; title: string; icon: string; items: Prescription[] }[] = [
    ...Object.entries(byFolder)
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, f]) => ({ key: `folder:${id}`, title: f.name, icon: "", items: f.items })),
    ...ORDERED_REGION_KEYS.filter((r) => byRegion[r]).map((r) => ({
      key: `region:${r}`,
      title: regionName(r, locale),
      icon: regionIcon(r),
      items: byRegion[r],
    })),
  ];

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
          {prescriptions.length} {prescriptions.length !== 1 ? T("exercises.exercisePlural") : T("exercises.exercise")} {prescriptions.length !== 1 ? T("exercises.prescribed") : T("exercises.prescribedSingular")} {sections.length} {(sections.length !== 1 ? T("exercises.groups") : T("exercises.group")).toLowerCase()}
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
            <p className="text-2xl font-bold">{sections.length}</p>
            <p className="text-xs text-muted-foreground">{T("exercises.groups")}</p>
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

      {/* Exercise Sections — admin folders first, then body regions */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedRegions.has(section.key);

          return (
            <Card key={section.key} className="overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleRegion(section.key)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {section.icon ? (
                    <span className="text-2xl">{section.icon}</span>
                  ) : (
                    <FolderOpen className="h-6 w-6 text-primary" />
                  )}
                  <div>
                    <h2 className="font-semibold text-base">{section.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {section.items.length} {section.items.length !== 1 ? T("exercises.exercisePlural") : T("exercises.exercise")}
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
                  {section.items.map((p) => (
                    <ExerciseRow
                      key={p.id}
                      prescription={p}
                      onPlay={() => setActiveVideo(p)}
                      onComplete={() => handleComplete(p.id)}
                      onRequestUndo={() => setUndoConfirmId(p.id)}
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

      {/* Undo-completion confirmation */}
      <AlertDialog open={!!undoConfirmId} onOpenChange={(open) => !open && setUndoConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("exercises.undoConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{T("exercises.undoConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (undoConfirmId) handleUndo(undoConfirmId);
                setUndoConfirmId(null);
              }}
            >
              {T("exercises.undo")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Exercise Row ──────────────────────────────────────

function ExerciseRow({
  prescription,
  onPlay,
  onComplete,
  onRequestUndo,
  completing,
}: {
  prescription: Prescription;
  onPlay: () => void;
  onComplete: () => void;
  onRequestUndo: () => void;
  completing: boolean;
}) {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const T = (key: string) => i18nT(key, locale);
  const DIFFICULTIES = isPt ? DIFFICULTIES_PT : DIFFICULTIES_EN;
  const ex = prescription.exercise;
  const diff = DIFFICULTIES[ex.difficulty] || DIFFICULTIES.BEGINNER;
  const sets = prescription.sets || ex.defaultSets;
  const reps = prescription.reps || ex.defaultReps;
  const holdSec = prescription.holdSeconds || ex.defaultHoldSec;
  const restSec = prescription.restSeconds || ex.defaultRestSec;
  const [hoverPlaying, setHoverPlaying] = useState(false);

  return (
    <div className="relative px-3 sm:px-5 py-3 sm:py-4 pb-16 sm:pb-4 flex items-start gap-3 sm:gap-4">
      {/* Thumbnail / Play */}
      <div
        className={`relative w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden ${
          ex.videoUrl ? "cursor-pointer group" : ""
        }`}
        onClick={ex.videoUrl ? onPlay : undefined}
        onMouseEnter={() => ex.videoUrl && setHoverPlaying(true)}
        onMouseLeave={() => setHoverPlaying(false)}
      >
        {hoverPlaying && ex.videoUrl ? (
          <video src={ex.videoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : ex.thumbnailUrl ? (
          <img src={ex.thumbnailUrl} alt={ex.name} className="w-full h-full object-cover" />
        ) : ex.videoUrl ? (
          <FileVideo className="h-8 w-8 text-muted-foreground/50" />
        ) : (
          <Dumbbell className="h-8 w-8 text-muted-foreground/30" />
        )}
        {ex.videoUrl && !hoverPlaying && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">{(isPt && ex.namePt) || ex.name}</h3>
          <Badge className={`${diff.color} text-[10px] px-1.5 py-0`}>{diff.label}</Badge>
        </div>

        {((isPt && ex.descriptionPt) || ex.description) && (
          <p className="text-xs text-muted-foreground line-clamp-2">{(isPt && ex.descriptionPt) || ex.description}</p>
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
            {prescription.therapist.firstName}
          </span>
          {prescription.completedCount > 0 && (
            <button
              type="button"
              onClick={onRequestUndo}
              className="flex items-center gap-1 text-green-400 underline underline-offset-2"
            >
              <CheckCircle2 className="h-3 w-3" />
              {T("exercises.completedCount")} {prescription.completedCount}x
              <RefreshCw className="h-3 w-3 ml-0.5" />
            </button>
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
      {/* Mobile actions — below content. Kept at a real touch-target height
          (h-11 ≈ 44px) and labelled: this is the main thing a patient does on
          a phone, and it used to be a bare 28px icon. */}
      <div className="flex sm:hidden gap-2 absolute bottom-3 left-3 right-3">
        {ex.videoUrl && (
          <Button
            variant="outline"
            className="h-11 flex-1 text-xs"
            onClick={onPlay}
            aria-label={T("exercises.watch")}
          >
            <Play className="h-4 w-4 mr-1.5" /> {T("exercises.watch")}
          </Button>
        )}
        <Button
          variant={completing ? "default" : "outline"}
          className={`h-11 flex-1 text-xs ${completing ? "bg-green-600 hover:bg-green-600" : ""}`}
          onClick={onComplete}
          disabled={completing}
          aria-label={completing ? T("exercises.completed") : T("exercises.complete")}
        >
          {completing ? (
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
          ) : (
            <Check className="h-4 w-4 mr-1.5" />
          )}
          {completing ? T("exercises.completed") : T("exercises.complete")}
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
  const isPt = locale === "pt-BR";
  const T = (key: string) => i18nT(key, locale);
  const [videoFailed, setVideoFailed] = useState(false);
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
            <h3 className="font-semibold">{(isPt && ex.namePt) || ex.name}</h3>
            <p className="text-sm text-muted-foreground">{regionName(ex.bodyRegion, locale)}</p>
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
          ) : videoFailed ? (
            <div className="aspect-video rounded-lg bg-muted flex flex-col items-center justify-center text-center px-6">
              <Video className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">{T("exercises.videoUnavailable")}</p>
              <p className="text-xs text-muted-foreground mt-1">{T("exercises.videoUnavailableHint")}</p>
            </div>
          ) : (
            <video
              src={ex.videoUrl!}
              controls
              className="w-full rounded-lg"
              playsInline
              muted={ex.muteForPatient !== false}
              // Browsers refuse to autoplay a video that can be heard, so an
              // unmuted clip that autoplayed simply never started. It waits for
              // a tap instead — which is also when someone expects sound.
              autoPlay={ex.muteForPatient !== false}
              onError={() => setVideoFailed(true)}
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

          {((isPt && ex.instructionsPt) || ex.instructions) && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">{T("exercises.instructions")}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(isPt && ex.instructionsPt) || ex.instructions}</p>
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
