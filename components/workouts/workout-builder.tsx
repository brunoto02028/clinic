"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, Search, Video, Save, Loader2, Dumbbell, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/hooks/use-locale";

interface LibraryExercise {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultRestSec?: number | null;
}

interface WEx {
  _uid: string; // stable client key so reorder/remove keeps input focus on the right row
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

interface Workout {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  exercises: Array<{
    exerciseId: string;
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
  }>;
}

const numOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));
let uidSeq = 0;
const uid = () => `r${Date.now()}-${uidSeq++}`;

export default function WorkoutBuilder({ studentId }: { studentId: string }) {
  const { locale } = useLocale();
  const isPt = locale?.startsWith("pt");
  const t = (en: string, pt: string) => (isPt ? pt : en);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<WEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Library search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryExercise[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // AI Workout Builder (activity 32) — never persists; only fills `name`/`rows`,
  // the same state the manual flow edits and the normal Save button submits.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ goal: "", level: "intermediate", daysPerWeek: "", focus: "", notes: "" });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiFallbackNotice, setAiFallbackNotice] = useState("");

  // Fetches and stores the list; returns it so callers can (re)select a row.
  // Never toggles the full-screen spinner or auto-selects — that would fire on
  // every mutation refetch and yank the editor away from the row being edited.
  const load = useCallback(async (): Promise<Workout[]> => {
    setError("");
    try {
      const r = await fetch(`/api/admin/workouts?studentId=${encodeURIComponent(studentId)}`);
      if (!r.ok) throw new Error(String(r.status));
      const data: Workout[] = await r.json();
      setWorkouts(data);
      return data;
    } catch {
      setError(t("Could not load workouts.", "Não foi possível carregar os treinos."));
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await load();
      if (data.length) selectWorkout(data[0]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  function selectWorkout(w: Workout) {
    setSelectedId(w.id);
    setName(w.name);
    setRows(
      w.exercises.map((e) => ({
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
  }

  function startNew() {
    setSelectedId("__new__");
    setName(t(`Workout ${String.fromCharCode(65 + workouts.length)}`, `Treino ${String.fromCharCode(65 + workouts.length)}`));
    setRows([]);
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

  // AI Workout Builder — generates a draft, populates name/rows exactly like
  // picking exercises manually would. Nothing is saved until the normal Save
  // button is clicked. Regenerating is all-or-nothing (G-5): confirms before
  // replacing non-empty rows, no partial merge with manual edits.
  async function generateWithAI() {
    // M1: also guard a manually-typed name with no exercises yet — the AI draft
    // would silently overwrite it otherwise (the confirm text only mentions exercises).
    const hasManualWork = rows.length > 0 || name.trim() !== "";
    if (hasManualWork && !confirm(t(
      "This replaces the current name and exercises with the AI draft. Continue?",
      "Isso substitui o nome e os exercícios atuais pelo rascunho da IA. Continuar?"
    ))) return;

    setAiGenerating(true);
    setAiError("");
    setAiFallbackNotice("");
    // B2: capture the focus used for THIS request — aiForm isn't reset after
    // success, so referencing the live state in the notice below could show a
    // focus the user typed after this call, not the one actually sent.
    const usedFocus = aiForm.focus;
    try {
      const r = await fetch("/api/admin/workouts/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          goal: aiForm.goal || undefined,
          level: aiForm.level || undefined,
          daysPerWeek: aiForm.daysPerWeek ? Number(aiForm.daysPerWeek) : undefined,
          focus: usedFocus || undefined,
          notes: aiForm.notes || undefined,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || String(r.status));

      const gen = data.generated as { name: string; phase: string | null; exercises: Array<Omit<WEx, "_uid">> };
      setName(gen.name);
      setRows(gen.exercises.map((e) => ({ ...e, _uid: uid() })));
      if (data.usedFallbackCatalog) {
        setAiFallbackNotice(t(
          `No exercises matched "${usedFocus}" — used your full library instead.`,
          `Nenhum exercício bateu com "${usedFocus}" — usamos toda a sua biblioteca.`
        ));
      }
      setAiOpen(false);
      // B1: clear the form so a later generation (another student/workout) doesn't
      // silently reuse this one's goal/focus/notes.
      setAiForm({ goal: "", level: "intermediate", daysPerWeek: "", focus: "", notes: "" });
    } catch (e: any) {
      setAiError(e?.message || t("Could not generate a workout. Try again.", "Não foi possível gerar o treino. Tente de novo."));
    } finally {
      setAiGenerating(false);
    }
  }

  function updateRow(i: number, patch: Partial<WEx>) {
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

  // Progression helpers (T-21): bump load or reps across the whole workout.
  function progressLoad(deltaKg: number) {
    setRows((r) =>
      r.map((row) => ({
        ...row,
        loadKg: row.loadKg != null ? Math.max(0, Math.round((row.loadKg + deltaKg) * 100) / 100) : row.loadKg,
      }))
    );
  }
  function progressReps(delta: number) {
    setRows((r) =>
      r.map((row) => {
        // Bump the rep target: repsMax when set, else the fixed repsMin.
        if (row.repsMax != null) return { ...row, repsMax: Math.max(0, row.repsMax + delta) };
        if (row.repsMin != null) return { ...row, repsMin: Math.max(0, row.repsMin + delta) };
        return row;
      })
    );
  }

  function serializeExercises() {
    return rows.map((row, i) => ({
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
    }));
  }

  async function save() {
    if (!name.trim()) {
      setError(t("Give the workout a name.", "Dê um nome ao treino."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), studentId, exercises: serializeExercises() };
      const isNew = selectedId === "__new__";
      const r = await fetch(isNew ? "/api/admin/workouts" : `/api/admin/workouts/${selectedId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.error || String(r.status));
      }
      const saved: Workout = await r.json();
      // Reselect from the reloaded list: the POST/PATCH response omits the
      // nested `exercise` (name/video), the GET list includes it.
      const data = await load();
      const fresh = data.find((w) => w.id === saved.id);
      if (fresh) selectWorkout(fresh);
      else setSelectedId(saved.id);
    } catch (e: any) {
      setError(e?.message || t("Could not save.", "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  async function duplicate(w: Workout) {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: `${w.name} ${t("(copy)", "(cópia)")}`,
        studentId,
        exercises: w.exercises.map((e, i) => ({
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
      };
      const r = await fetch("/api/admin/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(String(r.status));
      const saved: Workout = await r.json();
      const data = await load();
      const fresh = data.find((x) => x.id === saved.id);
      if (fresh) selectWorkout(fresh);
    } catch {
      setError(t("Could not duplicate.", "Não foi possível duplicar."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("Delete this workout?", "Excluir este treino?"))) return;
    try {
      const r = await fetch(`/api/admin/workouts/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(String(r.status));
      const data = await load();
      if (selectedId === id) {
        setSelectedId(null);
        setRows([]);
        setName("");
      }
    } catch {
      setError(t("Could not delete.", "Não foi possível excluir."));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading workouts…", "Carregando treinos…")}
      </div>
    );
  }

  const editing = selectedId !== null;

  return (
    <div className="space-y-4" data-testid="workout-builder">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        {/* Workout list (A/B/C) */}
        <div className="space-y-2">
          <Button onClick={startNew} className="w-full gap-2" data-testid="workout-new">
            <Plus className="h-4 w-4" /> {t("New workout", "Novo treino")}
          </Button>
          {workouts.length === 0 && (
            <p className="text-xs text-muted-foreground px-1">{t("No workouts yet.", "Nenhum treino ainda.")}</p>
          )}
          {workouts.map((w) => (
            <div
              key={w.id}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer ${
                selectedId === w.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => selectWorkout(w)}
            >
              <span className="flex items-center gap-2 truncate">
                <Dumbbell className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{w.name}</span>
                <span className="text-xs text-muted-foreground">({w.exercises.length})</span>
              </span>
              <span className="flex items-center gap-1">
                <button title={t("Duplicate", "Duplicar")} onClick={(e) => { e.stopPropagation(); duplicate(w); }} className="p-1 hover:text-primary">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button title={t("Delete", "Excluir")} onClick={(e) => { e.stopPropagation(); remove(w.id); }} className="p-1 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          ))}
        </div>

        {/* Editor */}
        {editing ? (
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="wname">{t("Workout name", "Nome do treino")}</Label>
                <Input id="wname" value={name} onChange={(e) => setName(e.target.value)} data-testid="workout-name" />
              </div>
              <Button variant="outline" onClick={() => { setAiOpen((v) => !v); setAiError(""); }} className="gap-2" data-testid="workout-ai-generate">
                <Sparkles className="h-4 w-4" /> {t("Generate with AI", "Gerar com IA")}
              </Button>
              <Button onClick={save} disabled={saving} className="gap-2" data-testid="workout-save">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("Save", "Salvar")}
              </Button>
            </div>

            {/* AI Workout Builder (activity 32) — draft-only, never saves by itself */}
            {aiOpen && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2" data-testid="workout-ai-form">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> {t("Generate with AI", "Gerar com IA")}</span>
                  <button onClick={() => setAiOpen(false)} className="p-1 hover:text-red-500" title={t("Close", "Fechar")}><X className="h-4 w-4" /></button>
                </div>
                {aiError && <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{aiError}</div>}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="col-span-2">
                    <Label className="text-[10px] text-muted-foreground">{t("Goal", "Objetivo")}</Label>
                    <Input value={aiForm.goal} onChange={(e) => setAiForm((f) => ({ ...f, goal: e.target.value }))} placeholder={t("e.g. build strength", "ex: ganhar força")} className="h-8" data-testid="ai-goal" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t("Level", "Nível")}</Label>
                    <select value={aiForm.level} onChange={(e) => setAiForm((f) => ({ ...f, level: e.target.value }))} className="h-8 w-full rounded border bg-background px-2 text-sm">
                      <option value="beginner">{t("Beginner", "Iniciante")}</option>
                      <option value="intermediate">{t("Intermediate", "Intermediário")}</option>
                      <option value="advanced">{t("Advanced", "Avançado")}</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t("Days/week", "Dias/semana")}</Label>
                    <Input type="number" min={1} max={7} value={aiForm.daysPerWeek} onChange={(e) => setAiForm((f) => ({ ...f, daysPerWeek: e.target.value }))} className="h-8" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] text-muted-foreground">{t("Focus", "Foco")}</Label>
                    <Input value={aiForm.focus} onChange={(e) => setAiForm((f) => ({ ...f, focus: e.target.value }))} placeholder={t("e.g. legs, upper body, full body", "ex: pernas, superiores, corpo todo")} className="h-8" data-testid="ai-focus" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] text-muted-foreground">{t("Notes", "Observações")}</Label>
                    <Input value={aiForm.notes} onChange={(e) => setAiForm((f) => ({ ...f, notes: e.target.value }))} className="h-8" placeholder={t("e.g. avoid overhead pressing", "ex: evitar press acima da cabeça")} />
                  </div>
                </div>
                <Button onClick={generateWithAI} disabled={aiGenerating} className="gap-2" data-testid="workout-ai-submit">
                  {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiGenerating ? t("Generating…", "Gerando…") : t("Generate", "Gerar")}
                </Button>
              </div>
            )}
            {aiFallbackNotice && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                <span>{aiFallbackNotice}</span>
                <button onClick={() => setAiFallbackNotice("")} className="p-0.5 hover:text-amber-950"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}

            {/* Progression */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">{t("Progression:", "Progressão:")}</span>
              <button onClick={() => progressLoad(2.5)} className="rounded border px-2 py-1 hover:bg-muted">+2.5 kg</button>
              <button onClick={() => progressLoad(-2.5)} className="rounded border px-2 py-1 hover:bg-muted">−2.5 kg</button>
              <button onClick={() => progressReps(1)} className="rounded border px-2 py-1 hover:bg-muted">+1 {t("rep", "rep")}</button>
            </div>

            {/* Exercise rows */}
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={row._uid} className="rounded-md border p-2" data-testid="workout-ex-row">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium truncate">
                      {row.name || row.exerciseId}
                      {row.videoUrl && (
                        <a href={row.videoUrl} target="_blank" rel="noreferrer" title={t("Video", "Vídeo")} className="text-primary">
                          <Video className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <button onClick={() => move(i, -1)} className="p-1 hover:text-primary" title={t("Up", "Subir")}><ChevronUp className="h-4 w-4" /></button>
                      <button onClick={() => move(i, 1)} className="p-1 hover:text-primary" title={t("Down", "Descer")}><ChevronDown className="h-4 w-4" /></button>
                      <button onClick={() => removeRow(i)} className="p-1 hover:text-red-500" title={t("Remove", "Remover")}><Trash2 className="h-4 w-4" /></button>
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                    {[
                      { k: "sets", label: t("Sets", "Séries"), min: 0, max: undefined, step: 1 },
                      { k: "repsMin", label: t("Reps min", "Reps mín"), min: 0, max: undefined, step: 1 },
                      { k: "repsMax", label: t("Reps max", "Reps máx"), min: 0, max: undefined, step: 1 },
                      { k: "loadKg", label: t("Load kg", "Carga kg"), min: 0, max: undefined, step: 0.5 },
                      { k: "rpe", label: "RPE", min: 1, max: 10, step: 1 },
                      { k: "rir", label: "RIR", min: 0, max: 5, step: 1 },
                      { k: "restSeconds", label: t("Rest s", "Desc. s"), min: 0, max: undefined, step: 5 },
                    ].map((f) => (
                      <div key={f.k}>
                        <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                        <Input
                          type="number"
                          min={f.min}
                          max={f.max}
                          step={f.step}
                          value={(row as any)[f.k] ?? ""}
                          onChange={(e) => updateRow(i, { [f.k]: numOrNull(e.target.value) } as Partial<WEx>)}
                          className="h-8"
                          data-testid={`wex-${f.k}`}
                        />
                      </div>
                    ))}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">{t("Cadence", "Cadência")}</Label>
                      <Input value={row.cadence ?? ""} onChange={(e) => updateRow(i, { cadence: e.target.value })} className="h-8" placeholder="3-1-1" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-[10px] text-muted-foreground">{t("Superset group (same letter = superset)", "Grupo de superset (mesma letra = superset)")}</Label>
                    <Input value={row.supersetGroup ?? ""} onChange={(e) => updateRow(i, { supersetGroup: e.target.value })} className="h-8 w-24" placeholder="A" />
                  </div>
                </div>
              ))}
            </div>

            {/* Add exercise from library */}
            {pickerOpen ? (
              <div className="rounded-md border p-2 space-y-2">
                <form
                  onSubmit={(e) => { e.preventDefault(); runSearch(); }}
                  className="flex gap-2"
                >
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search the library…", "Buscar na biblioteca…")} data-testid="workout-search" autoFocus />
                  <Button type="submit" variant="outline" className="gap-2">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </form>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {results.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      className="flex w-full items-center gap-2 rounded p-1.5 text-left text-sm hover:bg-muted"
                    >
                      {ex.thumbnailUrl ? (
                        <img src={ex.thumbnailUrl} alt="" className="h-8 w-12 rounded object-cover" />
                      ) : (
                        <span className="flex h-8 w-12 items-center justify-center rounded bg-muted"><Dumbbell className="h-4 w-4 text-muted-foreground" /></span>
                      )}
                      <span className="flex-1 truncate">{ex.name}</span>
                      {ex.videoUrl && <Video className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ))}
                  {!searching && results.length === 0 && query && (
                    <p className="p-2 text-xs text-muted-foreground">{t("No matches.", "Nenhum resultado.")}</p>
                  )}
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setPickerOpen(true)} className="gap-2" data-testid="workout-add-ex">
                <Plus className="h-4 w-4" /> {t("Add exercise", "Adicionar exercício")}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
            {t("Select a workout or create a new one.", "Selecione um treino ou crie um novo.")}
          </div>
        )}
      </div>
    </div>
  );
}
