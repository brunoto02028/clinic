"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Video,
  Save,
  Loader2,
  Dumbbell,
  Copy,
  X,
  Users,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLocale } from "@/hooks/use-locale";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun, dayOfWeek 0=Sun

interface LibraryExercise {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultRestSec?: number | null;
}

interface TemplateExercise {
  exerciseId: string;
  order: number;
  supersetGroup?: string | null;
  sets?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  loadKg?: number | null;
  rpe?: number | null;
  rir?: number | null;
  cadence?: string | null;
  restSeconds?: number | null;
  exercise?: { id: string; name: string; videoUrl?: string | null };
}

interface TemplateDay {
  id: string;
  weekIndex: number;
  dayOfWeek: number;
  name: string;
  phase: string | null;
  exercises: TemplateExercise[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  weeks: number;
  days: TemplateDay[];
}

interface Row {
  _uid: string;
  exerciseId: string;
  name?: string;
  videoUrl?: string | null;
  supersetGroup?: string | null;
  sets?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  loadKg?: number | null;
  rpe?: number | null;
  rir?: number | null;
  cadence?: string | null;
  restSeconds?: number | null;
}

const numOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));
let uidSeq = 0;
const uid = () => `r${Date.now()}-${uidSeq++}`;

export default function ProgramEditor({ id }: { id: string }) {
  const { locale } = useLocale();
  const isPt = locale?.startsWith("pt");
  const t = (en: string, pt: string) => (isPt ? pt : en);
  const dayLabel = (d: number) =>
    [t("Sun", "Dom"), t("Mon", "Seg"), t("Tue", "Ter"), t("Wed", "Qua"), t("Thu", "Qui"), t("Fri", "Sex"), t("Sat", "Sáb")][d];

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [week, setWeek] = useState(0);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch(`/api/admin/workout-templates/${id}`);
      if (!r.ok) throw new Error(String(r.status));
      const data: Template = await r.json();
      setTemplate(data);
    } catch {
      setError(t("Could not load the program.", "Não foi possível carregar o programa."));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Day editor (dialog) ──
  const [editing, setEditing] = useState<{ weekIndex: number; dayOfWeek: number } | null>(null);
  const [dayName, setDayName] = useState("");
  const [dayPhase, setDayPhase] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryExercise[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  function findDay(weekIndex: number, dayOfWeek: number): TemplateDay | undefined {
    return template?.days.find((d) => d.weekIndex === weekIndex && d.dayOfWeek === dayOfWeek);
  }

  function openEditor(weekIndex: number, dayOfWeek: number) {
    const existing = findDay(weekIndex, dayOfWeek);
    setEditing({ weekIndex, dayOfWeek });
    setDayName(existing?.name || `${t("Day", "Dia")} ${dayLabel(dayOfWeek)}`);
    setDayPhase(existing?.phase || "");
    setRows(
      (existing?.exercises || []).map((e) => ({
        _uid: uid(),
        exerciseId: e.exerciseId,
        name: e.exercise?.name,
        videoUrl: e.exercise?.videoUrl,
        supersetGroup: e.supersetGroup,
        sets: e.sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        loadKg: e.loadKg,
        rpe: e.rpe,
        rir: e.rir,
        cadence: e.cadence,
        restSeconds: e.restSeconds,
      }))
    );
    setSaveError("");
    setPickerOpen(false);
  }

  async function runSearch() {
    setSearching(true);
    try {
      const r = await fetch(`/api/admin/exercises?all=true&search=${encodeURIComponent(query)}`);
      const data = await r.json();
      setResults(Array.isArray(data.exercises) ? data.exercises : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function addExercise(ex: LibraryExercise) {
    setRows((r) => [
      ...r,
      {
        _uid: uid(),
        exerciseId: ex.id,
        name: ex.name,
        videoUrl: ex.videoUrl,
        sets: ex.defaultSets ?? 3,
        repsMin: null,
        repsMax: ex.defaultReps ?? null,
        loadKg: null,
        rpe: null,
        rir: null,
        cadence: null,
        restSeconds: ex.defaultRestSec ?? null,
        supersetGroup: null,
      },
    ]);
    setPickerOpen(false);
    setQuery("");
    setResults([]);
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function saveDay() {
    if (!editing) return;
    if (!dayName.trim()) {
      setSaveError(t("Give the day a name.", "Dê um nome ao dia."));
      return;
    }
    // Captured so a slow request can't close a dialog the user has since
    // reopened for a different day (the dialog is keyed by object identity,
    // not just weekIndex/dayOfWeek, so a fresh openEditor() call always wins).
    const target = editing;
    setSaving(true);
    setSaveError("");
    try {
      const r = await fetch(`/api/admin/workout-templates/${id}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekIndex: target.weekIndex,
          dayOfWeek: target.dayOfWeek,
          name: dayName.trim(),
          phase: dayPhase.trim() || null,
          exercises: rows.map((row, i) => ({
            exerciseId: row.exerciseId,
            order: i,
            supersetGroup: row.supersetGroup || null,
            sets: row.sets ?? null,
            repsMin: row.repsMin ?? null,
            repsMax: row.repsMax ?? null,
            loadKg: row.loadKg ?? null,
            rpe: row.rpe ?? null,
            rir: row.rir ?? null,
            cadence: row.cadence || null,
            restSeconds: row.restSeconds ?? null,
          })),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || String(r.status));
      setEditing((cur) => (cur === target ? null : cur));
      await load();
    } catch (e: any) {
      setSaveError(e?.message || t("Could not save.", "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  // ── Copy day ──
  const [copySource, setCopySource] = useState<{ weekIndex: number; dayOfWeek: number } | null>(null);
  const [copyTargetWeek, setCopyTargetWeek] = useState(0);
  const [copyTargetDay, setCopyTargetDay] = useState(1);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState("");

  // ── Assign to students ──
  const [assignOpen, setAssignOpen] = useState(false);
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignResult, setAssignResult] = useState<{ assigned: number; skipped: number } | null>(null);

  // ── Sync template updates to already-assigned students ──
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncResult, setSyncResult] = useState<{ updated: number; skipped: number } | null>(null);

  async function pushSync() {
    setSyncError("");
    setSyncResult(null);
    try {
      const dry = await fetch(`/api/admin/workout-templates/${id}/sync`);
      const dryData = await dry.json().catch(() => ({}));
      if (!dry.ok) throw new Error(dryData?.error || String(dry.status));
      const proceed = confirm(
        t(
          `This will update ${dryData.willUpdate} upcoming, not-yet-started workout(s). ${dryData.willSkip} already-started/past workout(s) will not be touched. Continue?`,
          `Isso vai atualizar ${dryData.willUpdate} treino(s) futuro(s) ainda não iniciados. ${dryData.willSkip} treino(s) já iniciados/passados não serão alterados. Continuar?`
        )
      );
      if (!proceed) return;
      setSyncing(true);
      const r = await fetch(`/api/admin/workout-templates/${id}/sync`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || String(r.status));
      setSyncResult(data);
    } catch (e: any) {
      setSyncError(e?.message || t("Could not sync.", "Não foi possível sincronizar."));
    } finally {
      setSyncing(false);
    }
  }

  function openCopy(weekIndex: number, dayOfWeek: number) {
    setCopySource({ weekIndex, dayOfWeek });
    setCopyTargetWeek(weekIndex);
    setCopyTargetDay(dayOfWeek);
    setCopyError("");
  }

  async function confirmCopy() {
    if (!copySource || !template) return;
    const source = findDay(copySource.weekIndex, copySource.dayOfWeek);
    if (!source) return;
    if (copyTargetWeek === copySource.weekIndex && copyTargetDay === copySource.dayOfWeek) {
      setCopyError(t("Choose a different day.", "Escolha um dia diferente."));
      return;
    }
    const destination = findDay(copyTargetWeek, copyTargetDay);
    if (destination && destination.exercises.length > 0) {
      if (!confirm(t("The target day already has exercises. Overwrite it?", "O dia de destino já tem exercícios. Sobrescrever?"))) return;
    }
    // Captured so a slow request can't close a dialog reopened for a
    // different copy in the meantime (see saveDay for the same pattern).
    const requestSource = copySource;
    setCopying(true);
    setCopyError("");
    try {
      const r = await fetch(`/api/admin/workout-templates/${id}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekIndex: copyTargetWeek,
          dayOfWeek: copyTargetDay,
          name: source.name,
          phase: source.phase,
          exercises: source.exercises.map((e, i) => ({
            exerciseId: e.exerciseId,
            order: i,
            supersetGroup: e.supersetGroup || null,
            sets: e.sets ?? null,
            repsMin: e.repsMin ?? null,
            repsMax: e.repsMax ?? null,
            loadKg: e.loadKg ?? null,
            rpe: e.rpe ?? null,
            rir: e.rir ?? null,
            cadence: e.cadence || null,
            restSeconds: e.restSeconds ?? null,
          })),
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setCopySource((cur) => (cur === requestSource ? null : cur));
      await load();
    } catch {
      setCopyError(t("Could not copy.", "Não foi possível copiar."));
    } finally {
      setCopying(false);
    }
  }

  async function loadStudents() {
    if (students.length || studentsLoading) return;
    setStudentsLoading(true);
    try {
      const r = await fetch("/api/admin/patients?limit=500");
      if (!r.ok) throw new Error(String(r.status));
      setStudents(await r.json());
    } catch {
      setAssignError(t("Could not load students.", "Não foi possível carregar os alunos."));
    } finally {
      setStudentsLoading(false);
    }
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function confirmAssign() {
    if (!selectedStudentIds.length) {
      setAssignError(t("Select at least one student.", "Selecione pelo menos um aluno."));
      return;
    }
    if (!startDate) {
      setAssignError(t("Choose a start date.", "Escolha uma data de início."));
      return;
    }
    setAssigning(true);
    setAssignError("");
    try {
      const r = await fetch(`/api/admin/workout-templates/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudentIds, startDate }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || String(r.status));
      setAssignResult({ assigned: data.assigned?.length || 0, skipped: data.skipped?.length || 0 });
      setSelectedStudentIds([]);
    } catch (e: any) {
      setAssignError(e?.message || t("Could not assign.", "Não foi possível atribuir."));
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading…", "Carregando…")}
      </div>
    );
  }
  if (!template) {
    return <div className="p-6 text-sm text-red-700">{error || t("Not found.", "Não encontrado.")}</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/training-programs" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{template.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t(`${template.weeks} week${template.weeks > 1 ? "s" : ""}`, `${template.weeks} semana${template.weeks > 1 ? "s" : ""}`)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={pushSync}
            disabled={syncing}
            className="gap-2"
            data-testid="program-sync"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("Push updates", "Enviar atualizações")}
          </Button>
          <Button
            onClick={() => { setAssignOpen(true); setAssignResult(null); setAssignError(""); loadStudents(); }}
            className="gap-2"
            data-testid="program-assign-open"
          >
            <Users className="h-4 w-4" /> {t("Assign", "Atribuir")}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {syncError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{syncError}</div>}
      {syncResult && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800" data-testid="sync-result">
          {t(`Updated ${syncResult.updated} workout(s), skipped ${syncResult.skipped}.`, `Atualizado ${syncResult.updated} treino(s), ${syncResult.skipped} ignorado(s).`)}
        </div>
      )}

      {/* Week selector */}
      {template.weeks > 1 && (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: template.weeks }, (_, i) => i).map((w) => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                week === w ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50"
              }`}
              data-testid={`week-tab-${w}`}
            >
              {t(`Week ${w + 1}`, `Semana ${w + 1}`)}
            </button>
          ))}
        </div>
      )}

      {/* Day grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-7" data-testid="week-grid">
        {DAY_ORDER.map((dow) => {
          const day = findDay(week, dow);
          const count = day?.exercises.length || 0;
          return (
            <div key={dow} className="rounded-md border p-2 space-y-2" data-testid="day-cell">
              <p className="text-xs font-medium text-muted-foreground">{dayLabel(dow)}</p>
              {day ? (
                <div>
                  <p className="truncate text-sm font-medium">{day.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`${count} exercise${count === 1 ? "" : "s"}`, `${count} exercício${count === 1 ? "" : "s"}`)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">{t("Rest / empty", "Descanso / vazio")}</p>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-xs" onClick={() => openEditor(week, dow)} data-testid="day-edit">
                  {day ? t("Edit", "Editar") : t("Add", "Adicionar")}
                </Button>
                {day && count > 0 && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 px-2" onClick={() => openCopy(week, dow)} title={t("Copy to…", "Copiar para…")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day editor dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing && t(`Week ${editing.weekIndex + 1} — ${dayLabel(editing.dayOfWeek)}`, `Semana ${editing.weekIndex + 1} — ${dayLabel(editing.dayOfWeek)}`)}
            </DialogTitle>
          </DialogHeader>
          {saveError && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{saveError}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="day-name">{t("Day name", "Nome do dia")}</Label>
              <Input id="day-name" value={dayName} onChange={(e) => setDayName(e.target.value)} data-testid="day-name-input" />
            </div>
            <div>
              <Label htmlFor="day-phase">{t("Phase (optional)", "Fase (opcional)")}</Label>
              <Input
                id="day-phase"
                value={dayPhase}
                onChange={(e) => setDayPhase(e.target.value)}
                placeholder={t("e.g. Strength phase", "ex: Fase de força")}
                data-testid="day-phase-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={row._uid} className="rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 truncate text-sm font-medium">
                    {row.name || row.exerciseId}
                    {row.videoUrl && (
                      <a href={row.videoUrl} target="_blank" rel="noreferrer" className="text-primary">
                        <Video className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <button onClick={() => move(i, -1)} className="p-1 hover:text-primary"><ChevronUp className="h-4 w-4" /></button>
                    <button onClick={() => move(i, 1)} className="p-1 hover:text-primary"><ChevronDown className="h-4 w-4" /></button>
                    <button onClick={() => removeRow(i)} className="p-1 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {[
                    { k: "sets", label: t("Sets", "Séries"), step: 1 },
                    { k: "repsMin", label: t("Reps min", "Reps mín"), step: 1 },
                    { k: "repsMax", label: t("Reps max", "Reps máx"), step: 1 },
                    { k: "loadKg", label: t("Load kg", "Carga kg"), step: 0.5 },
                    { k: "rpe", label: "RPE", step: 1 },
                    { k: "rir", label: "RIR", step: 1 },
                    { k: "restSeconds", label: t("Rest s", "Desc. s"), step: 5 },
                  ].map((f) => (
                    <div key={f.k}>
                      <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                      <Input
                        type="number"
                        min={0}
                        step={f.step}
                        value={(row as any)[f.k] ?? ""}
                        onChange={(e) => updateRow(i, { [f.k]: numOrNull(e.target.value) } as Partial<Row>)}
                        className="h-8"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {pickerOpen ? (
            <div className="space-y-2 rounded-md border p-2">
              <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="flex gap-2">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search the library…", "Buscar na biblioteca…")} autoFocus />
                <Button type="submit" variant="outline" className="gap-2">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
                <button type="button" onClick={() => setPickerOpen(false)} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </form>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {results.map((ex) => (
                  <button key={ex.id} onClick={() => addExercise(ex)} className="flex w-full items-center gap-2 rounded p-1.5 text-left text-sm hover:bg-muted">
                    {ex.thumbnailUrl ? (
                      <img src={ex.thumbnailUrl} alt="" className="h-8 w-12 rounded object-cover" />
                    ) : (
                      <span className="flex h-8 w-12 items-center justify-center rounded bg-muted"><Dumbbell className="h-4 w-4 text-muted-foreground" /></span>
                    )}
                    <span className="flex-1 truncate">{ex.name}</span>
                  </button>
                ))}
                {!searching && results.length === 0 && query && <p className="p-2 text-xs text-muted-foreground">{t("No matches.", "Nenhum resultado.")}</p>}
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setPickerOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> {t("Add exercise", "Adicionar exercício")}
            </Button>
          )}

          <DialogFooter>
            <Button onClick={saveDay} disabled={saving} className="gap-2" data-testid="day-save">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("Save", "Salvar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy day dialog */}
      <Dialog open={!!copySource} onOpenChange={(open) => !open && setCopySource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Copy day to…", "Copiar dia para…")}</DialogTitle>
          </DialogHeader>
          {copyError && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{copyError}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t("Week", "Semana")}</Label>
              <select
                value={copyTargetWeek}
                onChange={(e) => setCopyTargetWeek(Number(e.target.value))}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                {Array.from({ length: template.weeks }, (_, i) => i).map((w) => (
                  <option key={w} value={w}>{t(`Week ${w + 1}`, `Semana ${w + 1}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("Day", "Dia")}</Label>
              <select
                value={copyTargetDay}
                onChange={(e) => setCopyTargetDay(Number(e.target.value))}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                {DAY_ORDER.map((dow) => (
                  <option key={dow} value={dow}>{dayLabel(dow)}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmCopy} disabled={copying} className="gap-2">
              {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              {t("Copy", "Copiar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to students dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Assign program", "Atribuir programa")}</DialogTitle>
          </DialogHeader>
          {assignError && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{assignError}</div>}
          {assignResult && (
            <div className="rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-800" data-testid="assign-result">
              {t(
                `Assigned to ${assignResult.assigned} student${assignResult.assigned === 1 ? "" : "s"}${assignResult.skipped ? ` (${assignResult.skipped} skipped)` : ""}.`,
                `Atribuído a ${assignResult.assigned} aluno${assignResult.assigned === 1 ? "" : "s"}${assignResult.skipped ? ` (${assignResult.skipped} ignorado(s))` : ""}.`
              )}
            </div>
          )}
          <div>
            <Label htmlFor="assign-start-date">{t("Start date", "Data de início")}</Label>
            <Input id="assign-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="assign-start-date" />
          </div>
          <div>
            <Label>{t("Students", "Alunos")}</Label>
            {studentsLoading ? (
              <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading…", "Carregando…")}
              </div>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {students.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded p-1.5 text-sm hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      data-testid="assign-student-checkbox"
                    />
                    {s.firstName} {s.lastName}
                  </label>
                ))}
                {students.length === 0 && <p className="p-2 text-xs text-muted-foreground">{t("No students found.", "Nenhum aluno encontrado.")}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={confirmAssign} disabled={assigning} className="gap-2" data-testid="program-assign-confirm">
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {t("Assign", "Atribuir")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
