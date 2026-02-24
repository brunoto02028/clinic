"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Filter,
  Upload,
  FolderUp,
  Play,
  Trash2,
  Edit,
  Send,
  X,
  Check,
  RefreshCw,
  Video,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Target,
  Repeat,
  Pause,
  FileVideo,
  Eye,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  Instagram,
  Link as LinkIcon,
  CheckCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVoiceInput } from "@/hooks/use-voice-input";

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

const DIFFICULTIES: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: "Beginner", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  INTERMEDIATE: { label: "Intermediate", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  ADVANCED: { label: "Advanced", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  bodyRegion: string;
  difficulty: string;
  tags: string[];
  videoUrl: string | null;
  videoFileName: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultHoldSec: number | null;
  defaultRestSec: number | null;
  isActive: boolean;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string };
  _count?: { prescriptions: number };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ─── Page ──────────────────────────────────────────────

export default function ExercisesPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bodyRegion, setBodyRegion] = useState("");
  const [difficulty, setDifficulty] = useState("");

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [showPrescribe, setShowPrescribe] = useState(false);
  const [prescribeExercise, setPrescribeExercise] = useState<Exercise | null>(null);
  const [showPreview, setShowPreview] = useState<Exercise | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showInstagram, setShowInstagram] = useState(false);
  const [igUrls, setIgUrls] = useState("");
  const [igImporting, setIgImporting] = useState(false);
  const [igResult, setIgResult] = useState<any>(null);

  const handleInstagramImport = async () => {
    const urls = igUrls.split("\n").map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) return;
    setIgImporting(true);
    setIgResult(null);
    try {
      const res = await fetch("/api/admin/exercises/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      if (!res.ok) { setIgResult({ error: data.error }); return; }
      setIgResult(data);
      if (data.downloaded > 0) fetchExercises();
    } catch (err: any) {
      setIgResult({ error: err.message });
    } finally {
      setIgImporting(false);
    }
  };

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "24");
      if (search) params.set("search", search);
      if (bodyRegion) params.set("bodyRegion", bodyRegion);
      if (difficulty) params.set("difficulty", difficulty);

      const res = await fetch(`/api/admin/exercises?${params}`);
      const data = await res.json();
      setExercises(data.exercises || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch exercises:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, bodyRegion, difficulty]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this exercise from the library?")) return;
    await fetch(`/api/admin/exercises/${id}`, { method: "DELETE" });
    fetchExercises();
  };

  const openEdit = (ex: Exercise) => {
    setEditingExercise(ex);
    setShowForm(true);
  };

  const openPrescribe = (ex: Exercise) => {
    setPrescribeExercise(ex);
    setShowPrescribe(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{T("admin.exercisesTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {T("admin.exercisesDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showInstagram} onOpenChange={(open) => { setShowInstagram(open); if (!open) { setIgUrls(""); setIgResult(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1.5 text-pink-600 border-pink-200 hover:bg-pink-50">
                <Instagram className="h-4 w-4" />
                <span className="hidden sm:inline">Instagram</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-pink-600" />
                  Import from Instagram
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Paste a <strong>profile URL</strong> to download all videos at once, or individual post/reel links (one per line). Body region is auto-detected from each post.
                </p>
                <Textarea
                  placeholder={"https://www.instagram.com/username\n\nor individual links:\nhttps://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/p/XYZ789/"}
                  value={igUrls}
                  onChange={(e) => setIgUrls(e.target.value)}
                  rows={5}
                  disabled={igImporting}
                  className="font-mono text-xs"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                  <Target className="h-3.5 w-3.5 flex-shrink-0" />
                  Body region is auto-categorized from the post description. No text is imported.
                </div>
                <Button
                  onClick={handleInstagramImport}
                  disabled={igImporting || !igUrls.trim()}
                  className="w-full gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {igImporting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Downloading videos...</>
                  ) : (
                    <><Video className="h-4 w-4" />Download Videos</>
                  )}
                </Button>
                {igResult?.downloaded > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> {igResult.downloaded} video{igResult.downloaded > 1 ? "s" : ""} downloaded!
                    </p>
                    {igResult.results?.filter((r: any) => r.success).map((r: any, i: number) => (
                      <p key={i} className="text-xs text-green-600">
                        {r.exercise?.name} → {r.exercise?.bodyRegion?.replace(/_/g, " ")}
                      </p>
                    ))}
                    {igResult.results?.filter((r: any) => !r.success).length > 0 && (
                      <div className="border-t border-green-200 pt-1 mt-1">
                        {igResult.results?.filter((r: any) => !r.success).map((r: any, i: number) => (
                          <p key={i} className="text-xs text-red-600">Failed: {r.error}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {igResult?.error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {igResult.error}
                  </div>
                )}
                {igResult && igResult.downloaded === 0 && !igResult.error && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3 rounded-md">
                    No videos could be downloaded. Posts may be private or not contain videos.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
            <FolderUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </Button>
          <Button onClick={() => { setEditingExercise(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Exercise</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={bodyRegion || "ALL"} onValueChange={(v) => { setBodyRegion(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Body Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Regions</SelectItem>
            {Object.entries(REGION_GROUPS).map(([group, regions]) => (
              regions.map((r) => (
                <SelectItem key={r} value={r}>{BODY_REGIONS[r]}</SelectItem>
              ))
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty || "ALL"} onValueChange={(v) => { setDifficulty(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Levels</SelectItem>
            <SelectItem value="BEGINNER">Beginner</SelectItem>
            <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
            <SelectItem value="ADVANCED">Advanced</SelectItem>
          </SelectContent>
        </Select>
        {(search || bodyRegion || difficulty) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setBodyRegion(""); setDifficulty(""); setPage(1); }}>
            Clear filters
          </Button>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {total} exercise{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Exercise Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading exercises...</span>
        </div>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Dumbbell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-muted-foreground">No exercises found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || bodyRegion || difficulty
                ? "Try adjusting your filters"
                : "Click \"Add Exercise\" to create your first exercise"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onEdit={() => openEdit(ex)}
              onDelete={() => handleDelete(ex.id)}
              onPrescribe={() => openPrescribe(ex)}
              onPreview={() => setShowPreview(ex)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ExerciseFormModal
          exercise={editingExercise}
          onClose={() => { setShowForm(false); setEditingExercise(null); }}
          onSaved={() => { setShowForm(false); setEditingExercise(null); fetchExercises(); }}
        />
      )}

      {showPrescribe && prescribeExercise && (
        <PrescribeModal
          exercise={prescribeExercise}
          onClose={() => { setShowPrescribe(false); setPrescribeExercise(null); }}
          onSaved={() => { setShowPrescribe(false); setPrescribeExercise(null); }}
        />
      )}

      {showPreview && (
        <VideoPreviewModal
          exercise={showPreview}
          onClose={() => setShowPreview(null)}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onDone={() => { setShowBulkUpload(false); fetchExercises(); }}
        />
      )}
    </div>
  );
}

// ─── Exercise Card ─────────────────────────────────────

function ExerciseCard({
  exercise,
  onEdit,
  onDelete,
  onPrescribe,
  onPreview,
}: {
  exercise: Exercise;
  onEdit: () => void;
  onDelete: () => void;
  onPrescribe: () => void;
  onPreview: () => void;
}) {
  const diff = DIFFICULTIES[exercise.difficulty] || DIFFICULTIES.BEGINNER;

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail / Video Preview */}
      <div
        className="relative h-40 bg-muted flex items-center justify-center cursor-pointer"
        onClick={exercise.videoUrl ? onPreview : undefined}
      >
        {exercise.thumbnailUrl ? (
          <img
            src={exercise.thumbnailUrl}
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
        ) : exercise.videoUrl ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <FileVideo className="h-10 w-10 mb-1" />
            <span className="text-xs">Video available</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground/40">
            <Video className="h-10 w-10 mb-1" />
            <span className="text-xs">No video</span>
          </div>
        )}
        {exercise.videoUrl && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Play className="h-10 w-10 text-white opacity-0 group-hover:opacity-90 transition-opacity drop-shadow-lg" />
          </div>
        )}
        {exercise.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
            {Math.floor(exercise.duration / 60)}:{String(exercise.duration % 60).padStart(2, "0")}
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-1">{exercise.name}</h3>
          <Badge className={`${diff.color} text-[10px] px-1.5 py-0 shrink-0`}>
            {diff.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {BODY_REGIONS[exercise.bodyRegion] || exercise.bodyRegion}
          </Badge>
          {exercise._count && exercise._count.prescriptions > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {exercise._count.prescriptions} prescribed
            </span>
          )}
        </div>

        {exercise.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{exercise.description}</p>
        )}

        {/* Default params */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {exercise.defaultSets && (
            <span className="flex items-center gap-0.5">
              <Target className="h-3 w-3" /> {exercise.defaultSets} sets
            </span>
          )}
          {exercise.defaultReps && (
            <span className="flex items-center gap-0.5">
              <Repeat className="h-3 w-3" /> {exercise.defaultReps} reps
            </span>
          )}
          {exercise.defaultHoldSec && (
            <span className="flex items-center gap-0.5">
              <Pause className="h-3 w-3" /> {exercise.defaultHoldSec}s hold
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1 border-t">
          <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={onPrescribe}>
            <Send className="h-3 w-3 mr-1" /> Prescribe
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Exercise Form Modal ───────────────────────────────

function ExerciseFormModal({
  exercise,
  onClose,
  onSaved,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(exercise?.name || "");
  const [description, setDescription] = useState(exercise?.description || "");
  const [instructions, setInstructions] = useState(exercise?.instructions || "");
  const [region, setRegion] = useState(exercise?.bodyRegion || "SHOULDER");
  const [diff, setDiff] = useState(exercise?.difficulty || "BEGINNER");
  const [tags, setTags] = useState(exercise?.tags?.join(", ") || "");
  const [defaultSets, setDefaultSets] = useState(exercise?.defaultSets?.toString() || "");
  const [defaultReps, setDefaultReps] = useState(exercise?.defaultReps?.toString() || "");
  const [defaultHoldSec, setDefaultHoldSec] = useState(exercise?.defaultHoldSec?.toString() || "");
  const [defaultRestSec, setDefaultRestSec] = useState(exercise?.defaultRestSec?.toString() || "");
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl || "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"file" | "url">(exercise?.videoUrl && !exercise.videoUrl.startsWith("/uploads") ? "url" : "file");

  // ─── Voice Input ───
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const [voiceLang, setVoiceLang] = useState<"en" | "pt">("en");
  const voice = useVoiceInput({ language: "pt-BR", continuous: true });
  const [thumbPreview, setThumbPreview] = useState<string | null>(exercise?.thumbnailUrl || null);

  const handleVoiceToggle = () => {
    if (voice.status === "listening") {
      voice.stop();
    } else {
      setVoiceSuccess(false);
      voice.start();
    }
  };

  const handleVoiceParse = async () => {
    const text = voice.transcript;
    if (!text || text.trim().length < 3) return;

    setVoiceParsing(true);
    setError("");
    try {
      const res = await fetch("/api/admin/exercises/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, language: voiceLang }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("Server returned an invalid response. Check GEMINI_API_KEY in .env");
      }
      if (!res.ok) throw new Error(data.error || "Failed to parse voice");

      const d = data.data;
      if (d.name) setName(d.name);
      if (d.description) setDescription(d.description);
      if (d.instructions) setInstructions(d.instructions);
      if (d.bodyRegion) setRegion(d.bodyRegion);
      if (d.difficulty) setDiff(d.difficulty);
      if (d.tags) setTags(d.tags.join(", "));
      if (d.defaultSets != null) setDefaultSets(String(d.defaultSets));
      if (d.defaultReps != null) setDefaultReps(String(d.defaultReps));
      if (d.defaultHoldSec != null) setDefaultHoldSec(String(d.defaultHoldSec));
      if (d.defaultRestSec != null) setDefaultRestSec(String(d.defaultRestSec));

      setVoiceSuccess(true);
      setTimeout(() => setVoiceSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || "Voice parsing failed");
    } finally {
      setVoiceParsing(false);
    }
  };

  // ─── Auto-thumbnail from video ───
  const extractThumbnailFromVideo = (file: File) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
            setThumbFile(thumbFile);
            setThumbPreview(canvas.toDataURL("image/jpeg", 0.85));
          }
          URL.revokeObjectURL(url);
        }, "image/jpeg", 0.85);
      } else {
        URL.revokeObjectURL(url);
      }
    };
    video.onerror = () => URL.revokeObjectURL(url);
  };

  const handleVideoFileChange = (file: File | null) => {
    setVideoFile(file);
    if (file && !thumbFile) {
      extractThumbnailFromVideo(file);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description);
      formData.append("instructions", instructions);
      formData.append("bodyRegion", region);
      formData.append("difficulty", diff);
      formData.append("tags", tags);
      if (defaultSets) formData.append("defaultSets", defaultSets);
      if (defaultReps) formData.append("defaultReps", defaultReps);
      if (defaultHoldSec) formData.append("defaultHoldSec", defaultHoldSec);
      if (defaultRestSec) formData.append("defaultRestSec", defaultRestSec);

      if (uploadType === "file" && videoFile) {
        formData.append("video", videoFile);
      } else if (uploadType === "url" && videoUrl) {
        formData.append("videoUrl", videoUrl);
      }

      if (thumbFile) {
        formData.append("thumbnail", thumbFile);
      }

      const url = exercise ? `/api/admin/exercises/${exercise.id}` : "/api/admin/exercises";
      const method = exercise ? "PATCH" : "POST";

      const res = await fetch(url, { method, body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save");
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 overflow-y-auto">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl mx-4 mb-10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">
            {exercise ? "Edit Exercise" : "Add New Exercise"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Voice Input Panel */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Voice Fill</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">AI</Badge>
              </div>
              {!voice.isSupported && (
                <span className="text-[11px] text-destructive">Not supported — use Chrome or Edge</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Speak naturally in Portuguese or English. Describe the exercise name, body region, difficulty, sets, reps, hold time, rest time, and instructions — the AI will fill the form automatically.
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Output:</span>
              <Button
                type="button"
                variant={voiceLang === "en" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setVoiceLang("en")}
              >
                🇬🇧 English
              </Button>
              <Button
                type="button"
                variant={voiceLang === "pt" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setVoiceLang("pt")}
              >
                🇧🇷 Português
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={voice.status === "listening" ? "destructive" : "default"}
                size="sm"
                onClick={handleVoiceToggle}
                disabled={!voice.isSupported || voiceParsing}
                className="gap-1.5"
              >
                {voice.status === "listening" ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    Start Recording
                  </>
                )}
              </Button>

              {(voice.status === "done" || voice.transcript) && !voiceParsing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleVoiceParse}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-Fill with AI
                </Button>
              )}

              {voiceParsing && (
                <div className="flex items-center gap-1.5 text-sm text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>AI is parsing...</span>
                </div>
              )}

              {voiceSuccess && (
                <div className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Fields filled!</span>
                </div>
              )}

              {voice.transcript && !voiceParsing && !voiceSuccess && (
                <Button type="button" variant="ghost" size="sm" onClick={voice.reset} className="text-xs">
                  Clear
                </Button>
              )}
            </div>

            {/* Live transcript */}
            {(voice.status === "listening" || voice.transcript || voice.interimTranscript) && (
              <div className="rounded-md bg-background border p-3 text-sm min-h-[48px] max-h-[120px] overflow-y-auto">
                {voice.status === "listening" && (
                  <span className="inline-flex items-center gap-1.5 text-red-500 text-xs font-medium mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Listening...
                  </span>
                )}
                {voice.transcript && (
                  <p className="text-foreground">{voice.transcript}</p>
                )}
                {voice.interimTranscript && (
                  <p className="text-muted-foreground italic">{voice.interimTranscript}</p>
                )}
                {!voice.transcript && !voice.interimTranscript && voice.status === "listening" && (
                  <p className="text-muted-foreground text-xs">Speak now...</p>
                )}
              </div>
            )}

            {voice.error && (
              <p className="text-xs text-destructive">{voice.error}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Exercise Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shoulder External Rotation" />
            </div>

            <div className="space-y-1">
              <Label>Body Region *</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REGION_GROUPS).map(([group, regions]) => (
                    regions.map((r) => (
                      <SelectItem key={r} value={r}>{BODY_REGIONS[r]}</SelectItem>
                    ))
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Difficulty</Label>
              <Select value={diff} onValueChange={setDiff}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the exercise..."
                rows={2}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Instructions for Patient</Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Step by step instructions for the patient..."
                rows={3}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Tags (comma separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. strengthening, mobility, post-surgery"
              />
            </div>
          </div>

          {/* Default parameters */}
          <div>
            <Label className="text-sm font-semibold">Default Parameters</Label>
            <div className="grid grid-cols-4 gap-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sets</Label>
                <Input type="number" min="0" value={defaultSets} onChange={(e) => setDefaultSets(e.target.value)} placeholder="3" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reps</Label>
                <Input type="number" min="0" value={defaultReps} onChange={(e) => setDefaultReps(e.target.value)} placeholder="12" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hold (sec)</Label>
                <Input type="number" min="0" value={defaultHoldSec} onChange={(e) => setDefaultHoldSec(e.target.value)} placeholder="30" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Rest (sec)</Label>
                <Input type="number" min="0" value={defaultRestSec} onChange={(e) => setDefaultRestSec(e.target.value)} placeholder="60" />
              </div>
            </div>
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Exercise Video</Label>
            <div className="flex items-center gap-2">
              <Button
                variant={uploadType === "file" ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadType("file")}
              >
                <Upload className="h-3.5 w-3.5 mr-1" /> Upload File
              </Button>
              <Button
                variant={uploadType === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadType("url")}
              >
                <Video className="h-3.5 w-3.5 mr-1" /> External URL
              </Button>
            </div>

            {uploadType === "file" ? (
              <div className="space-y-2">
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => videoRef.current?.click()}
                >
                  {videoFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileVideo className="h-5 w-5 text-primary" />
                      <span className="font-medium">{videoFile.name}</span>
                      <span className="text-muted-foreground">
                        ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)
                      </span>
                    </div>
                  ) : exercise?.videoUrl && exercise.videoUrl.startsWith("/uploads") ? (
                    <div className="text-sm text-muted-foreground">
                      <FileVideo className="h-8 w-8 mx-auto mb-1 text-primary/50" />
                      Current: {exercise.videoFileName || "Video uploaded"}
                      <br />
                      <span className="text-xs">Click to replace</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-1 text-muted-foreground/40" />
                      Click to select video (MP4, WebM, MOV — max 500MB)
                    </div>
                  )}
                </div>
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  className="hidden"
                  onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or direct video URL"
              />
            )}
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Thumbnail Image</Label>
              {videoFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => extractThumbnailFromVideo(videoFile)}
                >
                  <RefreshCw className="h-3 w-3" />
                  Re-extract from video
                </Button>
              )}
            </div>
            {thumbPreview ? (
              <div className="relative group">
                <img src={thumbPreview} alt="Thumbnail preview" className="w-full max-h-40 object-contain rounded-lg border" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center rounded-lg">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => thumbRef.current?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" /> Replace
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setThumbFile(null); setThumbPreview(null); }}
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
                {thumbFile?.name === "thumbnail.jpg" && (
                  <Badge className="absolute top-2 left-2 bg-primary/80 text-[10px]">Auto-extracted from video</Badge>
                )}
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => thumbRef.current?.click()}
              >
                <div className="text-sm text-muted-foreground">
                  <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground/40" />
                  {videoFile ? "Extracting frame..." : "Upload a video to auto-generate, or click to upload manually"}
                </div>
              </div>
            )}
            <input
              ref={thumbRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setThumbFile(f);
                if (f) setThumbPreview(URL.createObjectURL(f));
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            {exercise ? "Update Exercise" : "Create Exercise"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Prescribe Modal ───────────────────────────────────

function PrescribeModal({
  exercise,
  onClose,
  onSaved,
}: {
  exercise: Exercise;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [selectedPatientsData, setSelectedPatientsData] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState("");
  const [sets, setSets] = useState(exercise.defaultSets?.toString() || "");
  const [reps, setReps] = useState(exercise.defaultReps?.toString() || "");
  const [holdSeconds, setHoldSeconds] = useState(exercise.defaultHoldSec?.toString() || "");
  const [restSeconds, setRestSeconds] = useState(exercise.defaultRestSec?.toString() || "");
  const [frequency, setFrequency] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const fetchPatients = useCallback(async (search?: string, letter?: string) => {
    setLoadingPatients(true);
    try {
      const params = new URLSearchParams();
      params.set("role", "PATIENT");
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (letter) params.set("letter", letter);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setPatients(data.users || []);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  // Initial load + debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(patientSearch, letterFilter);
    }, patientSearch ? 300 : 0);
    return () => clearTimeout(timer);
  }, [patientSearch, letterFilter, fetchPatients]);

  const togglePatient = (p: Patient) => {
    if (selectedPatients.includes(p.id)) {
      setSelectedPatients((prev) => prev.filter((id) => id !== p.id));
      setSelectedPatientsData((prev) => prev.filter((d) => d.id !== p.id));
    } else {
      setSelectedPatients((prev) => [...prev, p.id]);
      setSelectedPatientsData((prev) => [...prev, p]);
    }
  };

  const handlePrescribe = async () => {
    if (selectedPatients.length === 0) { setError("Select at least one patient"); return; }
    setSaving(true);
    setError("");

    try {
      const promises = selectedPatients.map((patientId) =>
        fetch("/api/admin/exercise-prescriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId,
            exercises: [
              {
                exerciseId: exercise.id,
                sets: sets ? parseInt(sets) : null,
                reps: reps ? parseInt(reps) : null,
                holdSeconds: holdSeconds ? parseInt(holdSeconds) : null,
                restSeconds: restSeconds ? parseInt(restSeconds) : null,
                frequency: frequency || null,
                notes: notes || null,
              },
            ],
          }),
        })
      );

      await Promise.all(promises);
      setSuccess(true);
      setTimeout(() => onSaved(), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to prescribe");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 overflow-y-auto">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg mx-4 mb-10">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold">Prescribe Exercise</h2>
            <p className="text-sm text-muted-foreground">{exercise.name} — {BODY_REGIONS[exercise.bodyRegion]}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Exercise prescribed successfully!
            </div>
          )}

          {/* Patient Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select Patients</Label>
            <Input
              placeholder="Type to search patients by name or email..."
              value={patientSearch}
              onChange={(e) => { setPatientSearch(e.target.value); setLetterFilter(""); }}
            />
            {/* Letter filter */}
            <div className="flex flex-wrap gap-0.5">
              <button
                onClick={() => { setLetterFilter(""); setPatientSearch(""); }}
                className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors ${!letterFilter ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >All</button>
              {LETTERS.map((l) => (
                <button
                  key={l}
                  onClick={() => { setLetterFilter(l); setPatientSearch(""); }}
                  className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors ${letterFilter === l ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >{l}</button>
              ))}
            </div>
            {/* Selected patients chips */}
            {selectedPatientsData.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedPatientsData.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {p.firstName} {p.lastName}
                    <button onClick={() => togglePatient(p)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
              {loadingPatients ? (
                <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Searching...
                </div>
              ) : patients.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {patientSearch || letterFilter ? "No patients found" : "Type a name or click a letter to search"}
                </div>
              ) : (
                patients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePatient(p)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors ${
                      selectedPatients.includes(p.id) ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selectedPatients.includes(p.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                    }`}>
                      {selectedPatients.includes(p.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            {selectedPatients.length > 0 && (
              <p className="text-xs text-primary font-medium">{selectedPatients.length} patient(s) selected</p>
            )}
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Sets</Label>
              <Input type="number" min="0" value={sets} onChange={(e) => setSets(e.target.value)} placeholder="3" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reps</Label>
              <Input type="number" min="0" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="12" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hold (s)</Label>
              <Input type="number" min="0" value={holdSeconds} onChange={(e) => setHoldSeconds(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rest (s)</Label>
              <Input type="number" min="0" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue placeholder="Select frequency..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="2x per day">2x per day</SelectItem>
                <SelectItem value="3x per week">3x per week</SelectItem>
                <SelectItem value="Every other day">Every other day</SelectItem>
                <SelectItem value="2x per week">2x per week</SelectItem>
                <SelectItem value="As needed">As needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes for Patient</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific instructions or notes..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePrescribe} disabled={saving || success}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Prescribe to {selectedPatients.length || "..."} Patient{selectedPatients.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Upload Modal ────────────────────────────────

interface BulkFile {
  file: File;
  name: string;
  bodyRegion: string;
  difficulty: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

function BulkUploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [defaultRegion, setDefaultRegion] = useState("OTHER");
  const [defaultDifficulty, setDefaultDifficulty] = useState("BEGINNER");
  const [results, setResults] = useState<{ total: number; successCount: number; failCount: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: BulkFile[] = Array.from(fileList)
      .filter(f => f.type.startsWith("video/"))
      .map(f => ({
        file: f,
        name: f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        bodyRegion: defaultRegion,
        difficulty: defaultDifficulty,
        status: "pending" as const,
      }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const updateFile = (idx: number, updates: Partial<BulkFile>) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const applyDefaultsToAll = () => {
    setFiles(prev => prev.map(f => ({ ...f, bodyRegion: defaultRegion, difficulty: defaultDifficulty })));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    const metadata = files.map((f, i) => ({
      name: f.name,
      bodyRegion: f.bodyRegion,
      difficulty: f.difficulty,
      fileKey: `video_${i}`,
    }));

    formData.append("metadata", JSON.stringify(metadata));
    files.forEach((f, i) => {
      formData.append(`video_${i}`, f.file);
    });

    try {
      const res = await fetch("/api/admin/exercises/bulk", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setResults({ total: data.total, successCount: data.successCount, failCount: data.failCount });

      // Update individual file statuses
      if (data.results) {
        setFiles(prev => prev.map((f, i) => {
          const r = data.results[i];
          return r ? { ...f, status: r.success ? "done" : "error", error: r.error } : f;
        }));
      }
    } catch (err: any) {
      setFiles(prev => prev.map(f => ({ ...f, status: "error", error: err.message })));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-6 sm:pt-10 overflow-y-auto">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl mx-4 mb-10">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold">Bulk Upload Videos</h2>
            <p className="text-sm text-muted-foreground">Upload multiple exercise videos at once</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {results ? (
            <div className="space-y-3">
              <div className={`rounded-lg p-4 text-center ${results.failCount === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                <CheckCircle2 className={`h-8 w-8 mx-auto mb-2 ${results.failCount === 0 ? "text-green-600" : "text-amber-600"}`} />
                <p className="font-semibold">{results.successCount} of {results.total} uploaded successfully</p>
                {results.failCount > 0 && <p className="text-sm text-amber-700 mt-1">{results.failCount} failed</p>}
              </div>
              {files.filter(f => f.status === "error").map((f, i) => (
                <div key={i} className="text-sm text-destructive bg-destructive/10 rounded p-2">
                  <strong>{f.name}:</strong> {f.error}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Defaults */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 bg-muted/30 rounded-lg p-3">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Default Body Region</Label>
                  <Select value={defaultRegion} onValueChange={setDefaultRegion}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BODY_REGIONS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Default Difficulty</Label>
                  <Select value={defaultDifficulty} onValueChange={setDefaultDifficulty}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEGINNER">Beginner</SelectItem>
                      <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                      <SelectItem value="ADVANCED">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {files.length > 0 && (
                  <Button variant="outline" size="sm" className="h-9 text-xs shrink-0" onClick={applyDefaultsToAll}>
                    Apply to all
                  </Button>
                )}
              </div>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
              >
                <FolderUp className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="font-medium text-sm">Click or drag video files here</p>
                <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV — up to 500MB each</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{files.length} video{files.length !== 1 ? "s" : ""} selected</p>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setFiles([])}>
                      Clear all
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 border rounded-lg p-2">
                        <FileVideo className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <Input
                            value={f.name}
                            onChange={(e) => updateFile(idx, { name: e.target.value })}
                            className="h-7 text-xs"
                            placeholder="Exercise name"
                          />
                          <div className="flex items-center gap-1.5">
                            <Select value={f.bodyRegion} onValueChange={(v) => updateFile(idx, { bodyRegion: v })}>
                              <SelectTrigger className="h-6 text-[10px] w-[110px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(BODY_REGIONS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={f.difficulty} onValueChange={(v) => updateFile(idx, { difficulty: v })}>
                              <SelectTrigger className="h-6 text-[10px] w-[90px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BEGINNER">Beginner</SelectItem>
                                <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                                <SelectItem value="ADVANCED">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {(f.file.size / 1024 / 1024).toFixed(1)}MB
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(idx)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t">
          {results ? (
            <Button onClick={onDone}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
                {uploading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload {files.length} Video{files.length !== 1 ? "s" : ""}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Video Preview Modal ───────────────────────────────

function VideoPreviewModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const isExternal = exercise.videoUrl && !exercise.videoUrl.startsWith("/uploads");
  const isYoutube = exercise.videoUrl?.includes("youtube.com") || exercise.videoUrl?.includes("youtu.be");

  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{exercise.name}</h3>
            <p className="text-sm text-muted-foreground">{BODY_REGIONS[exercise.bodyRegion]}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-4">
          {isYoutube ? (
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                src={getYoutubeEmbedUrl(exercise.videoUrl!)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video
              src={exercise.videoUrl!}
              controls
              className="w-full rounded-lg max-h-[60vh]"
              autoPlay
            />
          )}
          {exercise.instructions && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Instructions</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{exercise.instructions}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
