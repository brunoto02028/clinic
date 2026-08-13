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
  ChevronDown,
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
  CheckSquare,
  FolderPlus,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BODY_REGIONS, regionLabel, REGION_GROUPS } from "@/lib/exercise-regions";

// ─── Constants ─────────────────────────────────────────

// Region tables live in lib/exercise-regions.ts so the patient dashboard
// renders the exact same names/icons/groupings.

const DIFFICULTIES: Record<string, { label: string; labelPt: string; color: string }> = {
  BEGINNER: { label: "Beginner", labelPt: "Iniciante", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  INTERMEDIATE: { label: "Intermediate", labelPt: "Intermediário", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  ADVANCED: { label: "Advanced", labelPt: "Avançado", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const difficultyLabel = (key: string, locale: string) => {
  const d = DIFFICULTIES[key];
  if (!d) return key;
  return locale === "pt-BR" ? d.labelPt : d.label;
};

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  namePt?: string | null;
  descriptionPt?: string | null;
  instructionsPt?: string | null;
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
  updatedAt: string;
  createdBy?: { firstName: string; lastName: string };
  folderId?: string | null;
  folder?: { id: string; name: string } | null;
  _count?: { prescriptions: number };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  exerciseCount: number;
}

interface CategoryNode extends FolderNode {
  children: FolderNode[];
  folderCount: number;
  totalExerciseCount: number;
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
  const [translatedFilter, setTranslatedFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [bulkTranslating, setBulkTranslating] = useState(false);
  const [fixingVideos, setFixingVideos] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<
    { id: string; name: string; count: number; isCategory: boolean; folderCount: number } | null
  >(null);
  const [bulkResult, setBulkResult] = useState<string>("");
  // Two levels of drill-down: neither set = categories, category set = its
  // folders, both set = the videos.
  const [nav, setNav] = useState<{ categoryId: string | null; folderId: string | null }>({
    categoryId: null,
    folderId: null,
  });
  const [folderTree, setFolderTree] = useState<CategoryNode[]>([]);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);
  const [bulkTargetRegion, setBulkTargetRegion] = useState("");

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [showPrescribe, setShowPrescribe] = useState(false);
  const [prescribeExercises, setPrescribeExercises] = useState<Exercise[]>([]);
  const [prescribeCollectionName, setPrescribeCollectionName] = useState<string>("");
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

  const isGroupedMode = !search && !bodyRegion;

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      // Grouped mode needs the whole library in one go, since the cards show
      // per-category counts — a page-sized fetch would silently under-count.
      params.set("limit", isGroupedMode ? "2000" : "24");
      if (search) params.set("search", search);
      if (bodyRegion) params.set("bodyRegion", bodyRegion);
      if (difficulty) params.set("difficulty", difficulty);
      if (translatedFilter) params.set("translated", translatedFilter);
      if (sort) params.set("sort", sort);

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
  }, [page, search, bodyRegion, difficulty, translatedFilter, sort, isGroupedMode]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const fetchFolders = useCallback(async () => {
    try {
      const [treeRes, flatRes] = await Promise.all([
        fetch("/api/admin/exercise-folders"),
        fetch("/api/admin/exercise-folders?flat=true"),
      ]);
      const treeData = await treeRes.json();
      const flatData = await flatRes.json();
      // A folder whose parent vanished still holds videos. Showing it at the
      // top level keeps it reachable instead of silently swallowing them.
      const orphans: FolderNode[] = treeData.orphans || [];
      const asCategories: CategoryNode[] = orphans.map((o) => ({
        ...o,
        parentId: null,
        children: [],
        folderCount: 0,
        totalExerciseCount: o.exerciseCount,
      }));
      setFolderTree([...(treeData.tree || []), ...asCategories]);
      // Only leaf folders can hold videos, so the move/upload pickers must never
      // offer a category.
      setFolders((flatData.folders || []).filter((f: any) => f.parentId));
    } catch (err) {
      console.error("Failed to fetch exercise folders:", err);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const promptCreate = async (parentId: string | null, isCategory: boolean) => {
    const label = isCategory
      ? locale === "pt-BR" ? "Nome da nova categoria:" : "New category name:"
      : locale === "pt-BR" ? "Nome da nova pasta:" : "New folder name:";
    const name = prompt(label);
    if (!name || !name.trim()) return;
    const res = await fetch("/api/admin/exercise-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parentId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || (locale === "pt-BR" ? "Falha ao criar" : "Failed to create"));
      return;
    }
    fetchFolders();
  };

  const handleRenameFolder = async (folder: { id: string; name: string }) => {
    const newName = prompt(
      locale === "pt-BR" ? "Novo nome:" : "New name:",
      folder.name
    );
    if (!newName || !newName.trim() || newName.trim() === folder.name) return;
    const res = await fetch(`/api/admin/exercise-folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || (locale === "pt-BR" ? "Falha ao renomear" : "Failed to rename"));
      return;
    }
    fetchFolders();
  };

  const handleMoveFolder = async (folder: FolderNode) => {
    const options = folderTree.filter((c) => c.id !== folder.parentId);
    if (options.length === 0) {
      alert(locale === "pt-BR" ? "Não há outra categoria para onde mover." : "No other category to move to.");
      return;
    }
    const list = options.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
    const answer = prompt(
      (locale === "pt-BR" ? "Mover para qual categoria?\n\n" : "Move to which category?\n\n") + list
    );
    const index = parseInt(answer || "", 10) - 1;
    if (Number.isNaN(index) || !options[index]) return;
    const res = await fetch(`/api/admin/exercise-folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: options[index].id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || (locale === "pt-BR" ? "Falha ao mover" : "Failed to move"));
      return;
    }
    fetchFolders();
  };

  const handleDeleteFolder = (folder: { id: string; name: string }) => {
    const category = folderTree.find((c) => c.id === folder.id);
    const asChild = folderTree.flatMap((c) => c.children).find((f) => f.id === folder.id);
    // Server-side counts, not the client array — that one is capped by the
    // grouped-mode fetch limit and would understate what is about to go.
    const count = category
      ? category.totalExerciseCount
      : asChild?.exerciseCount ?? exercises.filter((ex) => ex.folderId === folder.id).length;
    setDeleteFolderTarget({
      id: folder.id,
      name: folder.name,
      count,
      isCategory: !!category,
      folderCount: category?.folderCount ?? 0,
    });
  };

  const confirmDeleteFolder = async (withExercises: boolean) => {
    const target = deleteFolderTarget;
    if (!target) return;
    setDeleteFolderTarget(null);
    await fetch(
      `/api/admin/exercise-folders/${target.id}${withExercises ? "?withExercises=true" : ""}`,
      { method: "DELETE" }
    );
    setNav({ categoryId: null, folderId: null });
    fetchFolders();
    fetchExercises();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === "pt-BR" ? "Remover este exercício da biblioteca?" : "Remove this exercise from the library?")) return;
    await fetch(`/api/admin/exercises/${id}`, { method: "DELETE" });
    fetchExercises();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkRecategorize = async (targetRegion: string) => {
    if (!targetRegion || selectedIds.size === 0) return;
    setBulkActing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => {
        const fd = new FormData();
        fd.append("bodyRegion", targetRegion);
        return fetch(`/api/admin/exercises/${id}`, { method: "PATCH", body: fd });
      }));
      setSelectedIds(new Set());
      setBulkTargetRegion("");
      fetchExercises();
    } finally {
      setBulkActing(false);
    }
  };

  const handleBulkMoveToFolder = async (folderId: string) => {
    if (!folderId || selectedIds.size === 0) return;
    setBulkActing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => {
        const fd = new FormData();
        // Always a real folder now — the "no folder" option is gone, and the
        // API rejects unfiling anyway.
        fd.append("folderId", folderId);
        return fetch(`/api/admin/exercises/${id}`, { method: "PATCH", body: fd });
      }));
      setSelectedIds(new Set());
      fetchFolders();
      fetchExercises();
    } finally {
      setBulkActing(false);
    }
  };

  const handleCreateFolderFromSelection = async () => {
    if (selectedIds.size === 0) return;
    const isPt = locale === "pt-BR";
    if (folderTree.length === 0) {
      alert(isPt ? "Crie uma categoria primeiro." : "Create a category first.");
      return;
    }
    // A folder always belongs to a category, so ask where before asking what.
    const parentId =
      nav.categoryId ||
      (() => {
        const list = folderTree.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
        const answer = prompt(
          (isPt ? "Em qual categoria?\n\n" : "In which category?\n\n") + list
        );
        const index = parseInt(answer || "", 10) - 1;
        return folderTree[index]?.id || null;
      })();
    if (!parentId) return;

    const name = prompt(isPt ? "Nome da nova pasta:" : "New folder name:", search || "");
    if (!name || !name.trim()) return;
    setBulkActing(true);
    try {
      const res = await fetch("/api/admin/exercise-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.folder) return;
      await Promise.all(Array.from(selectedIds).map((id) => {
        const fd = new FormData();
        fd.append("folderId", data.folder.id);
        return fetch(`/api/admin/exercises/${id}`, { method: "PATCH", body: fd });
      }));
      setSelectedIds(new Set());
      fetchFolders();
      fetchExercises();
    } finally {
      setBulkActing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(locale === "pt-BR" ? `Remover ${selectedIds.size} exercício(s) da biblioteca?` : `Remove ${selectedIds.size} exercise(s) from the library?`)) return;
    setBulkActing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/exercises/${id}`, { method: "DELETE" })
      ));
      setSelectedIds(new Set());
      fetchExercises();
    } finally {
      setBulkActing(false);
    }
  };

  // Converts already-uploaded videos to the H.264/mp4/faststart form every
  // device can play. Runs from a button because the owner works on an iPad,
  // where a console command is not a realistic instruction.
  const handleFixVideos = async () => {
    setFixingVideos(true);
    setBulkResult(locale === "pt-BR" ? "Verificando os vídeos..." : "Checking videos...");
    try {
      const dry = await fetch("/api/admin/exercises/normalize-videos?dryRun=true", { method: "POST" });
      const dryData = await dry.json();
      if (!dry.ok) throw new Error(dryData.error || `HTTP ${dry.status}`);

      const s = dryData.summary || {};
      const needsWork = (s.needsTranscode || 0) + (s.needsRemux || 0);
      if (needsWork === 0) {
        setBulkResult(
          locale === "pt-BR"
            ? `Nenhum vídeo precisa de conversão. (${s.missingFile || 0} arquivo(s) ausente(s), ${s.probeFailed || 0} ilegível(is))`
            : `No videos need converting. (${s.missingFile || 0} missing, ${s.probeFailed || 0} unreadable)`
        );
        return;
      }

      if (!confirm(
        locale === "pt-BR"
          ? `${needsWork} vídeo(s) serão convertidos para tocar em qualquer celular (${s.needsTranscode || 0} recodificados, ${s.needsRemux || 0} ajustes rápidos). Pode levar alguns minutos. Continuar?`
          : `${needsWork} video(s) will be converted so they play on any phone. This may take a few minutes. Continue?`
      )) {
        setBulkResult("");
        return;
      }

      let offset = 0;
      let converted = 0;
      let failed = 0;
      // Batched on purpose: transcoding the whole library in one request
      // would outlive the proxy timeout.
      while (offset !== null) {
        const res = await fetch(`/api/admin/exercises/normalize-videos?limit=10&offset=${offset}`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        for (const r of data.results || []) {
          if (r.status === "transcoded" || r.status === "remuxed") converted++;
          else if (r.status === "failed" || r.status === "probe-failed") failed++;
        }
        setBulkResult(
          locale === "pt-BR"
            ? `Convertendo... ${converted} de ${dryData.total} prontos${failed ? ` (${failed} com erro)` : ""}`
            : `Converting... ${converted} of ${dryData.total} done${failed ? ` (${failed} failed)` : ""}`
        );
        offset = data.nextOffset;
      }

      setBulkResult(
        locale === "pt-BR"
          ? `Pronto: ${converted} vídeo(s) convertidos${failed ? `, ${failed} com erro (veja os logs)` : ""}.`
          : `Done: ${converted} video(s) converted${failed ? `, ${failed} failed` : ""}.`
      );
      fetchExercises();
    } catch (err: any) {
      setBulkResult((locale === "pt-BR" ? "Erro: " : "Error: ") + err.message);
    } finally {
      setFixingVideos(false);
    }
  };

  const handleBulkTranslate = async () => {
    if (!confirm("Traduzir para português todos os exercícios sem tradução? (AI — pode demorar alguns minutos)")) return;
    setBulkTranslating(true);
    setBulkResult("");
    try {
      const res = await fetch("/api/admin/exercises/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBulkResult(data.translated === 0 && data.remaining === 0
        ? "Todos os exercícios já estão traduzidos."
        : `${data.translated} traduzido(s)${data.remaining > 0 ? ` — ${data.remaining} por traduzir (clique novamente)` : ""}`);
      fetchExercises();
    } catch (err: any) {
      setBulkResult(`Erro: ${err.message}`);
    } finally {
      setBulkTranslating(false);
    }
  };

  const openEdit = (ex: Exercise) => {
    setEditingExercise(ex);
    setShowForm(true);
  };

  const openPrescribe = (ex: Exercise) => {
    setPrescribeExercises([ex]);
    setPrescribeCollectionName("");
    setShowPrescribe(true);
  };

  const openPrescribeCollection = (items: Exercise[], name: string) => {
    if (items.length === 0) return;
    setPrescribeExercises(items);
    setPrescribeCollectionName(name);
    setShowPrescribe(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{T("admin.exercisesTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {T("admin.exercisesDesc")}
          </p>
        </div>
        {/* Wraps: six actions with real labels no longer fit one row on a laptop. */}
        <div className="flex items-center gap-2 flex-wrap">
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
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> {igResult.downloaded} video{igResult.downloaded > 1 ? "s" : ""} downloaded!
                    </p>
                    {igResult.results?.filter((r: any) => r.success).map((r: any, i: number) => (
                      <p key={i} className="text-xs text-emerald-400/80">
                        {r.exercise?.name} → {r.exercise?.bodyRegion?.replace(/_/g, " ")}
                      </p>
                    ))}
                    {igResult.results?.filter((r: any) => !r.success).length > 0 && (
                      <div className="border-t border-emerald-500/20 pt-1 mt-1">
                        {igResult.results?.filter((r: any) => !r.success).map((r: any, i: number) => (
                          <p key={i} className="text-xs text-destructive">Failed: {r.error}</p>
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
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm p-3 rounded-md">
                    No videos could be downloaded. Posts may be private or not contain videos.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleBulkTranslate} disabled={bulkTranslating}>
            {bulkTranslating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">{bulkTranslating ? "Traduzindo..." : "Traduzir PT"}</span>
          </Button>
          <Button variant="outline" onClick={handleFixVideos} disabled={fixingVideos}>
            {fixingVideos ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">{fixingVideos ? (locale === "pt-BR" ? "Convertendo..." : "Converting...") : (locale === "pt-BR" ? "Corrigir Vídeos" : "Fix Videos")}</span>
          </Button>
          <Button variant="outline" onClick={() => promptCreate(null, true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{locale === "pt-BR" ? "Nova Categoria" : "New Category"}</span>
          </Button>
          <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
            <FolderUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </Button>
          <Button onClick={() => { setEditingExercise(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{T("admin.exAdd")}</span><span className="sm:hidden">+</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={T("admin.exSearch")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={bodyRegion || "ALL"} onValueChange={(v) => { setBodyRegion(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Body Region">
              {bodyRegion ? regionLabel(bodyRegion, locale) : T("admin.exAllRegions")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">🏥 {T("admin.exAllRegions")}</SelectItem>
            {REGION_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 pt-2">
                  {locale === "pt-BR" ? group.labelPt : group.label}
                </SelectLabel>
                {group.keys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {regionLabel(k, locale)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty || "ALL"} onValueChange={(v) => { setDifficulty(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{T("admin.exAllLevels")}</SelectItem>
            <SelectItem value="BEGINNER">Beginner</SelectItem>
            <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
            <SelectItem value="ADVANCED">Advanced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={translatedFilter || "ALL"} onValueChange={(v) => { setTranslatedFilter(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Translation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{T("admin.exPtAll")}</SelectItem>
            <SelectItem value="yes">🇵🇹 {T("admin.exPtYes")}</SelectItem>
            <SelectItem value="no">⚠️ {T("admin.exPtNo")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{T("admin.exNewest")}</SelectItem>
            <SelectItem value="name">{T("admin.exNameAZ")}</SelectItem>
            <SelectItem value="region">{T("admin.exByRegion")}</SelectItem>
          </SelectContent>
        </Select>
        {(search || bodyRegion || difficulty || translatedFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setBodyRegion(""); setDifficulty(""); setTranslatedFilter(""); setPage(1); }}>
            {T("admin.exClearFilters")}
          </Button>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {total} {total !== 1 ? T("admin.exCount") : T("admin.exCountOne")}
        </div>
      </div>

      {bulkResult && (
        <div className="bg-primary/10 text-primary text-sm p-2.5 rounded-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0" /> {bulkResult}
          <button className="ml-auto" onClick={() => setBulkResult("")}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Exercise Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">{T("admin.exLoading")}</span>
        </div>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Dumbbell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-muted-foreground">{T("admin.exNoneFound")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || bodyRegion || difficulty
                ? T("admin.exAdjustFilters")
                : T("admin.exAddFirst")}
            </p>
          </CardContent>
        </Card>
      ) : isGroupedMode ? (
        (() => {
          const isPt = locale === "pt-BR";
          const LOOSE = "__loose__";
          // A category can end up holding videos directly — a folder promoted
          // by a category deletion keeps its videos. Without a way in, those
          // videos would be invisible but still counted.
          const DIRECT = "__direct__";
          const looseItems = exercises.filter((ex) => !ex.folderId);
          const category = nav.categoryId ? folderTree.find((c) => c.id === nav.categoryId) : null;
          const openFolder =
            nav.folderId && nav.folderId !== LOOSE && nav.folderId !== DIRECT
              ? folderTree.flatMap((c) => c.children).find((f) => f.id === nav.folderId) || null
              : null;

          const coverFor = (folderIds: string[]) =>
            exercises.find((ex) => ex.folderId && folderIds.includes(ex.folderId) && ex.thumbnailUrl)
              ?.thumbnailUrl;

          const crumb = (
            <nav className="flex items-center gap-1.5 text-sm flex-wrap" aria-label={isPt ? "Trilha" : "Breadcrumb"}>
              <button
                className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                onClick={() => setNav({ categoryId: null, folderId: null })}
              >
                {isPt ? "Biblioteca" : "Library"}
              </button>
              {category && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <button
                    className={
                      nav.folderId
                        ? "text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                        : "font-medium"
                    }
                    onClick={() => setNav({ categoryId: category.id, folderId: null })}
                  >
                    {category.name}
                  </button>
                </>
              )}
              {nav.folderId && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">
                    {openFolder
                      ? openFolder.name
                      : nav.folderId === DIRECT
                        ? isPt ? "Direto na categoria" : "Directly in category"
                        : isPt ? "Sem categoria" : "Uncategorised"}
                  </span>
                </>
              )}
            </nav>
          );

          // ── Level 3: the videos ──────────────────────────
          if (nav.folderId) {
            const items =
              nav.folderId === LOOSE
                ? looseItems
                : nav.folderId === DIRECT
                  ? exercises.filter((ex) => ex.folderId === nav.categoryId)
                  : exercises.filter((ex) => ex.folderId === nav.folderId);
            const selectedHere = items.filter((ex) => selectedIds.has(ex.id));
            const allSelected = items.length > 0 && selectedHere.length === items.length;
            const title = openFolder
              ? openFolder.name
              : nav.folderId === DIRECT
                ? `${category?.name ?? ""} — ${isPt ? "direto na categoria" : "directly in category"}`
                : isPt ? "Sem categoria" : "Uncategorised";

            return (
              <div className="space-y-4">
                {crumb}
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <Badge variant="outline">{items.length}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={items.length === 0}
                    onClick={() =>
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (allSelected) items.forEach((ex) => next.delete(ex.id));
                        else items.forEach((ex) => next.add(ex.id));
                        return next;
                      })
                    }
                  >
                    <CheckSquare className="h-3.5 w-3.5 mr-1" />
                    {allSelected
                      ? isPt ? "Limpar seleção" : "Clear selection"
                      : isPt ? "Selecionar todos" : "Select all"}
                  </Button>
                  <div className="flex items-center gap-1 ml-auto flex-wrap">
                    <Button
                      size="sm"
                      disabled={items.length === 0}
                      onClick={() => openPrescribeCollection(items, title)}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      {isPt ? "Prescrever tudo" : "Prescribe all"}
                    </Button>
                    {openFolder && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleRenameFolder(openFolder)}>
                          <Edit className="h-3.5 w-3.5 mr-1" /> {isPt ? "Renomear" : "Rename"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleMoveFolder(openFolder)}>
                          <FolderUp className="h-3.5 w-3.5 mr-1" /> {isPt ? "Mover" : "Move"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteFolder(openFolder)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> {isPt ? "Excluir" : "Delete"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {selectedHere.length > 0 && (
                  <BulkActionBar
                    selectedCount={selectedHere.length}
                    locale={locale}
                    bulkTargetRegion={bulkTargetRegion}
                    setBulkTargetRegion={setBulkTargetRegion}
                    bulkActing={bulkActing}
                    onApplyRecategorize={() => handleBulkRecategorize(bulkTargetRegion)}
                    onDelete={handleBulkDelete}
                    onCreateFolder={handleCreateFolderFromSelection}
                    folders={folders}
                    folderTree={folderTree}
                    onMoveToFolder={handleBulkMoveToFolder}
                    onClear={() =>
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        items.forEach((ex) => next.delete(ex.id));
                        return next;
                      })
                    }
                  />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((ex) => (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      onEdit={() => openEdit(ex)}
                      onDelete={() => handleDelete(ex.id)}
                      onPrescribe={() => openPrescribe(ex)}
                      onPreview={() => setShowPreview(ex)}
                      selectable
                      selected={selectedIds.has(ex.id)}
                      onToggleSelect={() => toggleSelect(ex.id)}
                    />
                  ))}
                </div>
              </div>
            );
          }

          // ── Level 2: the folders inside a category ───────
          if (category) {
            return (
              <div className="space-y-4">
                {crumb}
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                  <Badge variant="outline">
                    {category.folderCount} {isPt ? "pastas" : "folders"}
                  </Badge>
                  <div className="flex items-center gap-1 ml-auto flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => promptCreate(category.id, false)}>
                      <FolderPlus className="h-3.5 w-3.5 mr-1" /> {isPt ? "Nova Pasta" : "New Folder"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRenameFolder(category)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> {isPt ? "Renomear" : "Rename"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteFolder(category)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> {isPt ? "Excluir categoria" : "Delete category"}
                    </Button>
                  </div>
                </div>
                {category.children.length === 0 && category.exerciseCount === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <FolderUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="font-medium text-muted-foreground">
                        {isPt ? "Nenhuma pasta nesta categoria" : "No folders in this category"}
                      </p>
                      <Button size="sm" className="mt-4" onClick={() => promptCreate(category.id, false)}>
                        <FolderPlus className="h-3.5 w-3.5 mr-1" /> {isPt ? "Nova Pasta" : "New Folder"}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.children.map((f) => (
                      <CollectionCard
                        key={f.id}
                        title={f.name}
                        cover={coverFor([f.id])}
                        badgeLabel={isPt ? "Pasta" : "Folder"}
                        countLabel={String(f.exerciseCount)}
                        onOpen={() => setNav({ categoryId: category.id, folderId: f.id })}
                        onRename={() => handleRenameFolder(f)}
                        onMove={() => handleMoveFolder(f)}
                        onDelete={() => handleDeleteFolder(f)}
                        locale={locale}
                      />
                    ))}
                    {category.exerciseCount > 0 && (
                      <CollectionCard
                        title={isPt ? "Direto na categoria" : "Directly in category"}
                        cover={coverFor([category.id])}
                        badgeLabel={isPt ? "Precisa organizar" : "Needs filing"}
                        countLabel={String(category.exerciseCount)}
                        onOpen={() => setNav({ categoryId: category.id, folderId: DIRECT })}
                        locale={locale}
                        warn
                      />
                    )}
                  </div>
                )}
              </div>
            );
          }

          // ── Level 1: the categories ──────────────────────
          return (
            <div className="space-y-4">
              {folderTree.length === 0 && looseItems.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <FolderPlus className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="font-medium text-muted-foreground">
                      {isPt ? "Nenhuma categoria ainda" : "No categories yet"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isPt
                        ? "Crie uma categoria, depois uma pasta dentro dela, e então suba os vídeos."
                        : "Create a category, then a folder inside it, then upload the videos."}
                    </p>
                    <Button className="mt-4" onClick={() => promptCreate(null, true)}>
                      <FolderPlus className="h-4 w-4 mr-1" /> {isPt ? "Nova Categoria" : "New Category"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folderTree.map((c) => (
                    <CollectionCard
                      key={c.id}
                      title={c.name}
                      cover={coverFor([c.id, ...c.children.map((f) => f.id)])}
                      badgeLabel={isPt ? "Categoria" : "Category"}
                      countLabel={`${c.folderCount} ${isPt ? "pastas" : "folders"} · ${c.totalExerciseCount}`}
                      onOpen={() => setNav({ categoryId: c.id, folderId: null })}
                      onRename={() => handleRenameFolder(c)}
                      onDelete={() => handleDeleteFolder(c)}
                      locale={locale}
                    />
                  ))}
                  {/* Only shows up if something slipped through without a
                      folder — visible and fixable beats silently hidden. */}
                  {looseItems.length > 0 && (
                    <CollectionCard
                      title={isPt ? "Sem categoria" : "Uncategorised"}
                      cover={looseItems.find((ex) => ex.thumbnailUrl)?.thumbnailUrl}
                      badgeLabel={isPt ? "Precisa organizar" : "Needs filing"}
                      countLabel={String(looseItems.length)}
                      onOpen={() => setNav({ categoryId: null, folderId: LOOSE })}
                      locale={locale}
                      warn
                    />
                  )}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="space-y-3">
          {selectedIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              locale={locale}
              bulkTargetRegion={bulkTargetRegion}
              setBulkTargetRegion={setBulkTargetRegion}
              bulkActing={bulkActing}
              onApplyRecategorize={() => handleBulkRecategorize(bulkTargetRegion)}
              onDelete={handleBulkDelete}
              onCreateFolder={handleCreateFolderFromSelection}
              folders={folders}
              onMoveToFolder={handleBulkMoveToFolder}
              onClear={() => setSelectedIds(new Set())}
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onEdit={() => openEdit(ex)}
                onDelete={() => handleDelete(ex.id)}
                onPrescribe={() => openPrescribe(ex)}
                onPreview={() => setShowPreview(ex)}
                selectable
                selected={selectedIds.has(ex.id)}
                onToggleSelect={() => toggleSelect(ex.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isGroupedMode && totalPages > 1 && (
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
          onSaved={() => { setShowForm(false); setEditingExercise(null); fetchExercises(); fetchFolders(); }}
          folderTree={folderTree}
          // Creating from inside an open folder pre-selects it.
          defaultFolderId={nav.folderId && nav.folderId.startsWith("__") ? null : nav.folderId}
        />
      )}

      {showPrescribe && prescribeExercises.length > 0 && (
        <PrescribeModal
          exercises={prescribeExercises}
          collectionName={prescribeCollectionName}
          onClose={() => { setShowPrescribe(false); setPrescribeExercises([]); }}
          onSaved={() => { setShowPrescribe(false); setPrescribeExercises([]); fetchExercises(); }}
        />
      )}

      {showPreview && (
        <VideoPreviewModal
          exercise={showPreview}
          onClose={() => setShowPreview(null)}
        />
      )}

      {/* Deleting a folder is destructive in one of two very different ways —
          make the choice explicit rather than hiding it behind OK/Cancel. */}
      {deleteFolderTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDeleteFolderTarget(null)}>
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold">
                {deleteFolderTarget.isCategory
                  ? locale === "pt-BR"
                    ? `Excluir a categoria "${deleteFolderTarget.name}"?`
                    : `Delete category "${deleteFolderTarget.name}"?`
                  : locale === "pt-BR"
                    ? `Excluir a pasta "${deleteFolderTarget.name}"?`
                    : `Delete folder "${deleteFolderTarget.name}"?`}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {deleteFolderTarget.isCategory
                  ? locale === "pt-BR"
                    ? `Ela tem ${deleteFolderTarget.folderCount} pasta(s) e ${deleteFolderTarget.count} vídeo(s). Escolha o que fazer com eles.`
                    : `It holds ${deleteFolderTarget.folderCount} folder(s) and ${deleteFolderTarget.count} video(s). Choose what happens to them.`
                  : locale === "pt-BR"
                    ? `Ela tem ${deleteFolderTarget.count} vídeo(s). Escolha o que fazer com eles.`
                    : `It holds ${deleteFolderTarget.count} video(s). Choose what happens to them.`}
              </p>
            </div>
            <div className="p-5 space-y-3">
              <button
                type="button"
                onClick={() => confirmDeleteFolder(false)}
                className="w-full text-left rounded-lg border p-3 hover:border-primary/50 hover:bg-muted/40 transition-colors"
              >
                <p className="font-medium text-sm">
                  {deleteFolderTarget.isCategory
                    ? locale === "pt-BR" ? "Excluir só a categoria" : "Delete category only"
                    : locale === "pt-BR" ? "Excluir só a pasta" : "Delete folder only"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {deleteFolderTarget.isCategory
                    ? locale === "pt-BR"
                      ? "As pastas de dentro viram categorias e nenhum vídeo é perdido."
                      : "The folders inside become categories; no video is lost."
                    : locale === "pt-BR"
                      ? "Os vídeos continuam na biblioteca, apenas sem pasta."
                      : "The videos stay in the library, just unfiled."}
                </p>
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteFolder(true)}
                className="w-full text-left rounded-lg border border-destructive/40 p-3 hover:bg-destructive/10 transition-colors"
              >
                <p className="font-medium text-sm text-destructive">
                  {deleteFolderTarget.isCategory
                    ? locale === "pt-BR" ? "Excluir a categoria e tudo dentro" : "Delete category and everything in it"
                    : locale === "pt-BR" ? "Excluir a pasta e os vídeos" : "Delete folder and its videos"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {deleteFolderTarget.isCategory
                    ? locale === "pt-BR"
                      ? `Remove as ${deleteFolderTarget.folderCount} pasta(s) e os ${deleteFolderTarget.count} vídeo(s).`
                      : `Removes the ${deleteFolderTarget.folderCount} folder(s) and ${deleteFolderTarget.count} video(s).`
                    : locale === "pt-BR"
                      ? `Remove os ${deleteFolderTarget.count} vídeo(s) da biblioteca também.`
                      : `Removes the ${deleteFolderTarget.count} video(s) from the library as well.`}
                </p>
              </button>
            </div>
            <div className="px-5 pb-5">
              <Button variant="ghost" className="w-full" onClick={() => setDeleteFolderTarget(null)}>
                {locale === "pt-BR" ? "Cancelar" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onDone={() => { setShowBulkUpload(false); fetchExercises(); fetchFolders(); }}
          folderTree={folderTree}
          onFoldersChanged={fetchFolders}
          locale={locale}
        />
      )}
    </div>
  );
}

// ─── Collection Card (category or folder) ──────────────

/** Actions carry visible labels rather than bare icons: the icon-only version
 *  shipped before was on the card the whole time and still went unfound. */
function CollectionCard({
  title,
  cover,
  badgeLabel,
  countLabel,
  onOpen,
  onRename,
  onMove,
  onDelete,
  locale,
  warn,
}: {
  title: string;
  cover?: string | null;
  badgeLabel: string;
  countLabel: string;
  onOpen: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  locale: string;
  warn?: boolean;
}) {
  const isPt = locale === "pt-BR";
  const hasActions = !!(onRename || onMove || onDelete);
  return (
    <div
      className={`group rounded-xl overflow-hidden border bg-card transition-all hover:shadow-lg ${
        warn ? "border-amber-500/50" : "hover:border-primary/40"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="relative h-36 bg-muted flex items-center justify-center overflow-hidden cursor-pointer w-full"
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <FolderUp className="h-10 w-10 text-muted-foreground/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <span
          className={`absolute top-2 left-2 text-[10px] font-medium text-white backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1 ${
            warn ? "bg-amber-600/80" : "bg-black/50"
          }`}
        >
          {warn ? <AlertCircle className="h-3 w-3" /> : <FolderUp className="h-3 w-3" />} {badgeLabel}
        </span>
        <div className="absolute bottom-0 inset-x-0 p-3 flex items-end justify-between gap-2">
          <span className="font-semibold text-sm text-white drop-shadow line-clamp-2">{title}</span>
          <span className="shrink-0 text-xs font-medium text-white bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
            {countLabel}
          </span>
        </div>
      </div>
      {hasActions && (
        <div className="flex items-center gap-1 p-2 border-t bg-muted/30">
          {onRename && (
            <Button variant="ghost" size="sm" className="h-9 text-xs flex-1" onClick={onRename}>
              <Edit className="h-3.5 w-3.5 mr-1" /> {isPt ? "Renomear" : "Rename"}
            </Button>
          )}
          {onMove && (
            <Button variant="ghost" size="sm" className="h-9 text-xs flex-1" onClick={onMove}>
              <FolderUp className="h-3.5 w-3.5 mr-1" /> {isPt ? "Mover" : "Move"}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs flex-1 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> {isPt ? "Excluir" : "Delete"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bulk Action Bar ────────────────────────────────────

function BulkActionBar({
  selectedCount,
  locale,
  bulkTargetRegion,
  setBulkTargetRegion,
  bulkActing,
  onApplyRecategorize,
  onDelete,
  onClear,
  onCreateFolder,
  folders,
  folderTree,
  onMoveToFolder,
}: {
  selectedCount: number;
  locale: string;
  bulkTargetRegion: string;
  setBulkTargetRegion: (v: string) => void;
  bulkActing: boolean;
  onApplyRecategorize: () => void;
  onDelete: () => void;
  onClear: () => void;
  onCreateFolder?: () => void;
  folders?: { id: string; name: string }[];
  folderTree?: CategoryNode[];
  onMoveToFolder?: (folderId: string) => void;
}) {
  const isPt = locale === "pt-BR";
  return (
    <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
      <span className="text-xs font-medium">
        {selectedCount} {isPt ? `selecionado${selectedCount !== 1 ? "s" : ""}` : `selected`}
      </span>
      <Select value={bulkTargetRegion} onValueChange={setBulkTargetRegion}>
        <SelectTrigger className="w-[190px] h-8 text-xs">
          {/* "Category" now means the folder tree, so this picker says what it
              actually changes: the body region tag. */}
          <SelectValue placeholder={isPt ? "Mudar região do corpo..." : "Change body region..."} />
        </SelectTrigger>
        <SelectContent>
          {REGION_GROUPS.map((g) => (
            <SelectGroup key={g.label}>
              <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 pt-2">
                {locale === "pt-BR" ? g.labelPt : g.label}
              </SelectLabel>
              {g.keys.map((k) => (
                <SelectItem key={k} value={k}>{regionLabel(k, locale)}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="h-8 text-xs" disabled={!bulkTargetRegion || bulkActing} onClick={onApplyRecategorize}>
        {isPt ? "Aplicar" : "Apply"}
      </Button>
      {onMoveToFolder && folders && folders.length > 0 && (
        <Select value="" onValueChange={onMoveToFolder}>
          <SelectTrigger className="w-[190px] h-8 text-xs">
            <SelectValue placeholder={isPt ? "Mover para pasta..." : "Move to folder..."} />
          </SelectTrigger>
          <SelectContent>
            {/* Grouped by category so two folders sharing a name stay tellable
                apart in the list. */}
            {folderTree && folderTree.length > 0
              ? folderTree
                  .filter((c) => c.children.length > 0)
                  .map((c) => (
                    <SelectGroup key={c.id}>
                      <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 pt-2">
                        {c.name}
                      </SelectLabel>
                      {c.children.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))
              : folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
          </SelectContent>
        </Select>
      )}
      {onCreateFolder && (
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={bulkActing} onClick={onCreateFolder}>
          <FolderPlus className="h-3.5 w-3.5 mr-1" /> {isPt ? "Criar pasta" : "Create folder"}
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:text-destructive" disabled={bulkActing} onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5 mr-1" /> {isPt ? "Excluir" : "Delete"}
      </Button>
      <Button size="sm" variant="ghost" className="h-8 text-xs ml-auto" onClick={onClear}>
        {isPt ? "Limpar seleção" : "Clear selection"}
      </Button>
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
  selectable,
  selected,
  onToggleSelect,
}: {
  exercise: Exercise;
  onEdit: () => void;
  onDelete: () => void;
  onPrescribe: () => void;
  onPreview: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { locale } = useLocale();
  const diff = DIFFICULTIES[exercise.difficulty] || DIFFICULTIES.BEGINNER;
  const [hoverPlaying, setHoverPlaying] = useState(false);

  return (
    <Card className={`group overflow-hidden hover:shadow-md transition-shadow ${selected ? "ring-2 ring-primary" : ""}`}>
      {/* Thumbnail / Video Preview */}
      <div
        className="relative h-40 bg-muted flex items-center justify-center cursor-pointer"
        onClick={exercise.videoUrl ? onPreview : undefined}
        onMouseEnter={() => exercise.videoUrl && setHoverPlaying(true)}
        onMouseLeave={() => setHoverPlaying(false)}
      >
        {selectable && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
            aria-label={selected ? "Desmarcar exercício" : "Selecionar exercício"}
            className={`absolute top-2 left-2 z-10 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
              selected ? "bg-primary border-primary" : "bg-black/40 border-white/70 hover:border-white"
            }`}
          >
            {selected && <Check className="h-3 w-3 text-primary-foreground" />}
          </button>
        )}
        {hoverPlaying && exercise.videoUrl ? (
          <video
            src={exercise.videoUrl}
            poster={exercise.thumbnailUrl || undefined}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : exercise.thumbnailUrl ? (
          <img
            src={exercise.thumbnailUrl}
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
        ) : exercise.videoUrl ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <FileVideo className="h-10 w-10 mb-1" />
            <span className="text-xs">{locale === "pt-BR" ? "Vídeo disponível" : "Video available"}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground/40">
            <Video className="h-10 w-10 mb-1" />
            <span className="text-xs">{locale === "pt-BR" ? "Sem vídeo" : "No video"}</span>
          </div>
        )}
        {exercise.videoUrl && !hoverPlaying && (
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
          <div className="min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1">{exercise.name}</h3>
            {exercise.namePt && <p className="text-[10px] text-muted-foreground line-clamp-1">🇵🇹 {exercise.namePt}</p>}
          </div>
          <Badge className={`${diff.color} text-[10px] px-1.5 py-0 shrink-0`}>
            {difficultyLabel(exercise.difficulty, locale)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {regionLabel(exercise.bodyRegion, locale)}
          </Badge>
          {!exercise.namePt && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-500 border-amber-500/40">
              {locale === "pt-BR" ? "sem PT" : "no PT"}
            </Badge>
          )}
          <span className="text-[10px] text-foreground/70 font-medium flex items-center gap-0.5 ml-auto">
            <Users className="h-3 w-3" />
            {locale === "pt-BR"
              ? `${exercise._count?.prescriptions || 0} prescrito(s)`
              : `${exercise._count?.prescriptions || 0} prescribed`}
          </span>
        </div>

        {exercise.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{exercise.description}</p>
        )}

        {(exercise.tags?.length > 0 || exercise.updatedAt) && (
          <div className="flex items-center gap-1 flex-wrap">
            {exercise.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                {tag}
              </Badge>
            ))}
            {exercise.tags?.length > 3 && (
              <span className="text-[9px] text-muted-foreground">+{exercise.tags.length - 3}</span>
            )}
            {exercise.updatedAt && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {formatDistanceToNow(new Date(exercise.updatedAt), {
                  addSuffix: true,
                  locale: locale === "pt-BR" ? ptBR : undefined,
                })}
              </span>
            )}
          </div>
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
            <Send className="h-3 w-3 mr-1" /> {locale === "pt-BR" ? "Prescrever" : "Prescribe"}
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
  folderTree,
  defaultFolderId,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  onSaved: () => void;
  folderTree: CategoryNode[];
  defaultFolderId?: string | null;
}) {
  const { locale } = useLocale();
  // The API refuses an exercise with no folder, so the form has to ask for one
  // — otherwise every manual creation fails with a 400 the user can't act on.
  const [folderId, setFolderId] = useState<string>(
    exercise?.folderId || defaultFolderId || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(exercise?.name || "");
  const [description, setDescription] = useState(exercise?.description || "");
  const [instructions, setInstructions] = useState(exercise?.instructions || "");
  const [namePt, setNamePt] = useState(exercise?.namePt || "");
  const [descriptionPt, setDescriptionPt] = useState(exercise?.descriptionPt || "");
  const [instructionsPt, setInstructionsPt] = useState(exercise?.instructionsPt || "");
  const [translating, setTranslating] = useState(false);
  const [showPtFields, setShowPtFields] = useState(!!exercise?.namePt);
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

  const handleTranslate = async () => {
    if (!name.trim()) { setError("Fill the English name first"); return; }
    setTranslating(true);
    setError("");
    try {
      // Translate current form content (not yet saved) via the single-exercise endpoint pattern:
      // for unsaved exercises we translate locally via API using a transient payload
      if (exercise?.id) {
        // Persisted exercise — make sure latest EN text is what gets translated
        const res = await fetch("/api/admin/exercises/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId: exercise.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setNamePt(data.exercise.namePt || "");
        setDescriptionPt(data.exercise.descriptionPt || "");
        setInstructionsPt(data.exercise.instructionsPt || "");
      } else {
        setError("Save the exercise first, then translate.");
        return;
      }
      setShowPtFields(true);
    } catch (err: any) {
      setError(err.message || "Translation failed");
    } finally {
      setTranslating(false);
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
      formData.append("namePt", namePt.trim());
      formData.append("descriptionPt", descriptionPt);
      formData.append("instructionsPt", instructionsPt);
      formData.append("bodyRegion", region);
      formData.append("difficulty", diff);
      formData.append("folderId", folderId);
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
              <Label>{locale === "pt-BR" ? "Região do corpo *" : "Body Region *"}</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGION_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {locale === "pt-BR" ? group.labelPt : group.label}
                      </SelectLabel>
                      {group.keys.map((k) => (
                        <SelectItem key={k} value={k}>{regionLabel(k, locale)}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label>{locale === "pt-BR" ? "Pasta *" : "Folder *"}</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder={locale === "pt-BR" ? "Escolha a pasta..." : "Choose a folder..."} />
                </SelectTrigger>
                <SelectContent>
                  {folderTree
                    .filter((c) => c.children.length > 0)
                    .map((c) => (
                      <SelectGroup key={c.id}>
                        <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {c.name}
                        </SelectLabel>
                        {c.children.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                </SelectContent>
              </Select>
              {folderTree.every((c) => c.children.length === 0) && (
                <p className="text-[11px] text-amber-500">
                  {locale === "pt-BR"
                    ? "Nenhuma pasta ainda — feche e crie uma categoria e uma pasta primeiro."
                    : "No folders yet — close this and create a category and a folder first."}
                </p>
              )}
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

          {/* Portuguese Translation */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">🇵🇹 Portuguese Translation</span>
                {namePt ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-600/40">Translated</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/40">Not translated</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {exercise?.id && (
                  <Button type="button" variant="outline" size="sm" onClick={handleTranslate} disabled={translating} className="gap-1.5">
                    {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {translating ? "Translating..." : "Translate with AI"}
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPtFields(!showPtFields)}>
                  {showPtFields ? "Hide" : "Edit"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">English is the primary language. The Portuguese version is shown to patients using the app in PT.</p>
            {showPtFields && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome (PT)</Label>
                  <Input value={namePt} onChange={(e) => setNamePt(e.target.value)} placeholder="ex: Rotação Externa do Ombro" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição (PT)</Label>
                  <Textarea value={descriptionPt} onChange={(e) => setDescriptionPt(e.target.value)} rows={2} placeholder="Breve descrição em português..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Instruções para o Paciente (PT)</Label>
                  <Textarea value={instructionsPt} onChange={(e) => setInstructionsPt(e.target.value)} rows={3} placeholder="Instruções passo a passo em português..." />
                </div>
              </div>
            )}
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
          {!folderId && (
            <p className="text-xs text-amber-500 flex items-center gap-1.5 mr-auto">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {locale === "pt-BR" ? "Escolha a pasta antes de salvar." : "Choose a folder before saving."}
            </p>
          )}
          <Button variant="outline" onClick={onClose}>
            {locale === "pt-BR" ? "Cancelar" : "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !folderId}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            {exercise
              ? locale === "pt-BR" ? "Salvar alterações" : "Update Exercise"
              : locale === "pt-BR" ? "Criar exercício" : "Create Exercise"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Prescribe Modal ───────────────────────────────────

function PrescribeModal({
  exercises,
  collectionName,
  onClose,
  onSaved,
}: {
  exercises: Exercise[];
  collectionName?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  // One exercise → therapist tunes sets/reps for it. Many (a whole folder) →
  // each exercise keeps its own defaults, since forcing one set/rep scheme
  // across a mixed folder would be wrong.
  const exercise = exercises[0];
  const isBulk = exercises.length > 1;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [selectedPatientsData, setSelectedPatientsData] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState("");
  const [sets, setSets] = useState(exercise.defaultSets?.toString() || "3");
  const [reps, setReps] = useState(exercise.defaultReps?.toString() || "12");
  const [holdSeconds, setHoldSeconds] = useState(exercise.defaultHoldSec?.toString() || "");
  const [restSeconds, setRestSeconds] = useState(exercise.defaultRestSec?.toString() || "");
  const [frequency, setFrequency] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
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
            exercises: exercises.map((ex) =>
              isBulk
                ? {
                    exerciseId: ex.id,
                    sets: ex.defaultSets,
                    reps: ex.defaultReps,
                    holdSeconds: ex.defaultHoldSec,
                    restSeconds: ex.defaultRestSec,
                    frequency: frequency || null,
                    notes: notes || null,
                  }
                : {
                    exerciseId: ex.id,
                    sets: sets ? parseInt(sets) : null,
                    reps: reps ? parseInt(reps) : null,
                    holdSeconds: holdSeconds ? parseInt(holdSeconds) : null,
                    restSeconds: restSeconds ? parseInt(restSeconds) : null,
                    frequency: frequency || null,
                    notes: notes || null,
                  }
            ),
          }),
        })
      );

      const results = await Promise.all(promises);
      const payloads = await Promise.all(results.map((r) => r.json().catch(() => ({}))));

      // fetch() only rejects on network errors, so a 4xx/5xx would otherwise
      // sail through and report success while nothing was created.
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const idx = results.indexOf(failed);
        throw new Error((payloads[idx] as any)?.error || `Failed to prescribe (${failed.status})`);
      }

      setSkippedCount(payloads.reduce((sum: number, p: any) => sum + (p?.skipped || 0), 0));
      setSuccess(true);
      setTimeout(() => onSaved(), 2500);
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
            <h2 className="text-lg font-semibold">
              {isBulk
                ? isPt ? "Prescrever coleção" : "Prescribe Collection"
                : isPt ? "Prescrever exercício" : "Prescribe Exercise"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isBulk
                ? `${collectionName ? `${collectionName} — ` : ""}${exercises.length} ${isPt ? "exercícios" : "exercises"}`
                : `${exercise.name} — ${regionLabel(exercise.bodyRegion, locale)}`}
            </p>
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
            <div className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm p-3 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {isBulk ? "Collection prescribed successfully!" : "Exercise prescribed successfully!"}
                {skippedCount > 0 && (
                  <span className="block text-xs mt-0.5 opacity-80">
                    {skippedCount} already prescribed — skipped to avoid duplicates.
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Patient Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{isPt ? "Selecionar pacientes" : "Select Patients"}</Label>
            <Input
              placeholder={isPt ? "Buscar paciente por nome ou e-mail..." : "Type to search patients by name or email..."}
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

          {isBulk && (
            <div className="bg-muted/50 text-muted-foreground text-xs p-3 rounded-lg">
              {isPt
                ? `Cada exercício mantém as próprias séries/repetições. A frequência e as notas abaixo valem para os ${exercises.length}.`
                : `Each exercise keeps its own default sets/reps/hold. Frequency and notes below apply to all ${exercises.length}.`}
            </div>
          )}

          {/* Parameters — type a custom number or pick a common value */}
          <div className={`grid grid-cols-4 gap-3 ${isBulk ? "hidden" : ""}`}>
            <div className="space-y-1">
              <Label className="text-xs">Sets</Label>
              <Input type="number" min="0" list="sets-options" value={sets} onChange={(e) => setSets(e.target.value)} placeholder="3" />
              <datalist id="sets-options">
                {["1", "2", "3", "4", "5"].map((v) => <option key={v} value={v} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reps</Label>
              <Input type="number" min="0" list="reps-options" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="12" />
              <datalist id="reps-options">
                {["5", "8", "10", "12", "15", "20"].map((v) => <option key={v} value={v} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hold (s)</Label>
              <Input type="number" min="0" list="hold-options" value={holdSeconds} onChange={(e) => setHoldSeconds(e.target.value)} />
              <datalist id="hold-options">
                {["5", "10", "15", "20", "30", "45", "60"].map((v) => <option key={v} value={v} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rest (s)</Label>
              <Input type="number" min="0" list="rest-options" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
              <datalist id="rest-options">
                {["15", "30", "45", "60", "90", "120"].map((v) => <option key={v} value={v} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue placeholder={isPt ? "Escolha a frequência..." : "Select frequency..."} /></SelectTrigger>
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
            <Label className="text-xs">{isPt ? "Notas para o paciente" : "Notes for Patient"}</Label>
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
            {selectedPatients.length === 0
              ? (isPt ? "Selecione um paciente" : "Select a patient")
              : isPt
                ? `Prescrever para ${selectedPatients.length} paciente${selectedPatients.length !== 1 ? "s" : ""}`
                : `Prescribe to ${selectedPatients.length} Patient${selectedPatients.length !== 1 ? "s" : ""}`}
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
  tags: string;
  folder: string | null;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

// Best-effort folder-name -> body region guess, since real folder taxonomies
// (e.g. "Tennis Elbow", "Sit a Lot", "Plantar Faciit") rarely match the enum
// exactly. Always falls back to the bulk-upload's default region — the raw
// folder name is kept as a tag regardless, so nothing is lost if this misses.
const FOLDER_REGION_HINTS: [RegExp, string][] = [
  [/shoulder/i, "SHOULDER"],
  [/elbow/i, "ELBOW"],
  [/wrist|hand/i, "WRIST_HAND"],
  [/hip/i, "HIP"],
  [/knee/i, "KNEE"],
  [/ankle|foot|feet|plantar/i, "ANKLE_FOOT"],
  [/lumbar/i, "SPINE_LUMBAR"],
  [/thoracic/i, "SPINE_THORACIC"],
  [/spine|back|posture/i, "SPINE_BACK"],
  [/neck|cervical/i, "NECK_CERVICAL"],
  [/core|abdomen|abs\b/i, "CORE_ABDOMEN"],
  [/stretch/i, "STRETCHING"],
  [/injury|strain|sprain/i, "MUSCLE_INJURY"],
  [/full body|total body/i, "FULL_BODY"],
];
const guessRegionFromFolder = (folder: string): string | null => {
  const hit = FOLDER_REGION_HINTS.find(([re]) => re.test(folder));
  return hit ? hit[1] : null;
};

function BulkUploadModal({
  onClose,
  onDone,
  folderTree,
  onFoldersChanged,
  locale,
}: {
  onClose: () => void;
  onDone: () => void;
  folderTree: CategoryNode[];
  onFoldersChanged: () => void;
  locale: string;
}) {
  const isPt = locale === "pt-BR";
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [defaultRegion, setDefaultRegion] = useState("OTHER");
  const [defaultDifficulty, setDefaultDifficulty] = useState("BEGINNER");
  const [results, setResults] = useState<{ total: number; successCount: number; failCount: number } | null>(null);
  // Every video needs a home before a single byte is sent — landing unfiled is
  // the failure this whole reorganisation exists to prevent.
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [fallbackFolderName, setFallbackFolderName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const createCategory = async () => {
    const name = prompt(isPt ? "Nome da nova categoria:" : "New category name:");
    if (!name || !name.trim()) return;
    const res = await fetch("/api/admin/exercise-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.folder) {
      alert(data.error || (isPt ? "Falha ao criar categoria" : "Failed to create category"));
      return;
    }
    setTargetCategoryId(data.folder.id);
    onFoldersChanged();
  };

  // Files dragged in without a subfolder of their own fall back to this name;
  // files inside a subfolder keep the subfolder's name.
  const needsFallbackName = files.some((f) => !f.folder);
  const destinationReady =
    !!targetCategoryId && (!needsFallbackName || !!fallbackFolderName.trim());

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: BulkFile[] = Array.from(fileList)
      .filter(f => f.type.startsWith("video/"))
      .map(f => {
        // webkitdirectory gives a relative path like "Thoracic/011.mp4", or
        // "AllExercises/Thoracic/011.mp4" if the picked root itself contains
        // named subfolders — either way, the segment immediately before the
        // filename is the actual category the file was organised into.
        const relPath = (f as any).webkitRelativePath as string | undefined;
        const pathParts = relPath ? relPath.split("/") : [];
        const folder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null;
        const baseName = f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        return {
          file: f,
          name: folder ? `${folder} ${baseName}` : baseName,
          bodyRegion: (folder && guessRegionFromFolder(folder)) || defaultRegion,
          difficulty: defaultDifficulty,
          tags: folder ? folder.toLowerCase() : "",
          folder,
          status: "pending" as const,
        };
      });
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
    if (files.length === 0 || !destinationReady) return;
    setUploading(true);
    setUploadProgress(0);

    // Get-or-create a real folder inside the chosen category for each distinct
    // subfolder name in this batch, reusing one that already matches.
    const folderNameToId: Record<string, string> = {};
    const resolvedName = (f: BulkFile) => f.folder || fallbackFolderName.trim();
    const distinctFolderNames = Array.from(new Set(files.map(resolvedName).filter(Boolean)));
    const failedFolders: string[] = [];
    for (const folderName of distinctFolderNames) {
      try {
        const res = await fetch("/api/admin/exercise-folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: folderName, parentId: targetCategoryId }),
        });
        const data = await res.json();
        if (res.ok && data.folder) folderNameToId[folderName] = data.folder.id;
        else failedFolders.push(folderName);
      } catch (err) {
        console.error(`Failed to create/reuse folder "${folderName}":`, err);
        failedFolders.push(folderName);
      }
    }
    // Don't upload into limbo: if the folder couldn't be created the videos
    // would silently land unfiled, which is exactly what looks like "the
    // upload went to the wrong place".
    if (failedFolders.length > 0) {
      setFiles(prev => prev.map(f => ({ ...f, status: "error", error: `Could not create folder "${failedFolders[0]}"` })));
      setUploading(false);
      return;
    }
    onFoldersChanged();

    const formData = new FormData();
    const metadata = files.map((f, i) => ({
      name: f.name,
      bodyRegion: f.bodyRegion,
      difficulty: f.difficulty,
      tags: f.tags,
      fileKey: `video_${i}`,
      folderId: folderNameToId[resolvedName(f)],
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
            <h2 className="text-lg font-semibold">{isPt ? "Envio em massa" : "Bulk Upload Videos"}</h2>
            <p className="text-sm text-muted-foreground">{isPt ? "Suba vários vídeos de uma vez" : "Upload multiple exercise videos at once"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {results ? (
            <div className="space-y-3">
              <div className={`rounded-lg p-6 text-center border ${results.failCount === 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                <div className={`h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center ${results.failCount === 0 ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
                  <CheckCircle2 className={`h-8 w-8 ${results.failCount === 0 ? "text-emerald-400" : "text-amber-400"}`} />
                </div>
                <p className={`font-semibold text-lg ${results.failCount === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {results.successCount} of {results.total} uploaded successfully
                </p>
                {results.failCount > 0 && <p className="text-sm text-amber-400/80 mt-1">{results.failCount} failed — see details below</p>}
                {results.failCount === 0 && <p className="text-sm text-muted-foreground mt-1">Ready to prescribe to your patients</p>}
              </div>
              {files.filter(f => f.status === "error").map((f, i) => (
                <div key={i} className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <strong>{f.name}:</strong> {f.error}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Destination first: pick where the videos land before choosing
                  which ones, so nothing can be sent without a home. */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <FolderPlus className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">
                    {isPt ? "1. Onde estes vídeos vão ficar" : "1. Where these videos will live"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">{isPt ? "Categoria" : "Category"}</Label>
                    <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={isPt ? "Escolha a categoria..." : "Choose a category..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {folderTree.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" className="h-9" onClick={createCategory}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> {isPt ? "Criar categoria" : "New category"}
                    </Button>
                  </div>
                </div>
                {needsFallbackName && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {isPt ? "Nome da pasta para estes vídeos" : "Folder name for these videos"}
                    </Label>
                    <Input
                      className="h-9"
                      value={fallbackFolderName}
                      onChange={(e) => setFallbackFolderName(e.target.value)}
                      placeholder={isPt ? "ex.: Tennis Elbow" : "e.g. Tennis Elbow"}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {isPt
                        ? "Vídeos que vieram dentro de uma subpasta mantêm o nome dela."
                        : "Videos that came inside a subfolder keep that subfolder's name."}
                    </p>
                  </div>
                )}
                {!destinationReady && files.length > 0 && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {!targetCategoryId
                      ? isPt ? "Escolha uma categoria para continuar." : "Choose a category to continue."
                      : isPt ? "Dê um nome à pasta para continuar." : "Name the folder to continue."}
                  </p>
                )}
              </div>

              {/* Defaults */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 bg-muted/30 rounded-lg p-3">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">{isPt ? "Região do corpo padrão" : "Default Body Region"}</Label>
                  <Select value={defaultRegion} onValueChange={setDefaultRegion}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BODY_REGIONS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{`${v.icon} ${v.en}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">{isPt ? "Nível padrão" : "Default Difficulty"}</Label>
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
                    {isPt ? "Aplicar a todos" : "Apply to all"}
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
                <p className="font-medium text-sm">{isPt ? "Clique ou arraste os vídeos aqui" : "Click or drag video files here"}</p>
                <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV — up to 500MB each</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderUp className="h-4 w-4 mr-2" />
                {isPt
                  ? "Selecionar uma pasta inteira (usa o nome das subpastas como pasta e tags)"
                  : "Select a Whole Folder (auto-fills region & tags from subfolder names)"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore — non-standard but supported by all major browsers
                webkitdirectory=""
                directory=""
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
                                {REGION_GROUPS.flatMap(g => g.keys).map((k) => (
                                  <SelectItem key={k} value={k}>{regionLabel(k, "en-GB")}</SelectItem>
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
                            {f.folder && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0" title="Auto-tagged from folder name">
                                📁 {f.folder}
                              </span>
                            )}
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
              <Button onClick={handleUpload} disabled={files.length === 0 || uploading || !destinationReady}>
                {uploading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {isPt
                  ? `Enviar ${files.length} vídeo${files.length !== 1 ? "s" : ""}`
                  : `Upload ${files.length} Video${files.length !== 1 ? "s" : ""}`}
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
            <p className="text-sm text-muted-foreground">{regionLabel(exercise.bodyRegion, "en-GB")}</p>
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
