"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Dumbbell, Video, Timer, Play, Pause, RotateCcw, Check, Loader2, History, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/hooks/use-locale";

interface WEx {
  id: string;
  supersetGroup?: string | null;
  sets?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  loadKg?: number | null;
  rpe?: number | null;
  rir?: number | null;
  cadence?: string | null;
  restSeconds?: number | null;
  exercise?: { id: string; name: string; namePt?: string | null; videoUrl?: string | null; thumbnailUrl?: string | null };
}
interface Workout {
  id: string;
  name: string;
  phase?: string | null;
  daysOfWeek: number[];
  scheduledDate?: string | null;
  templateDayId?: string | null;
  exercises: WEx[];
}
interface SetEntry { reps: string; loadKg: string; rpe: string; completed: boolean }
interface SessionLog {
  id: string;
  performedAt: string;
  sessionRpe?: number | null;
  durationMin?: number | null;
  setLogs: Array<{ id: string; workoutExerciseId: string; setNumber: number; reps?: number | null; loadKg?: number | null; rpe?: number | null; completed: boolean }>;
}

const s = (v: number | null | undefined) => (v == null ? "" : String(v));

function RestTimer({ seconds, isPt }: { seconds: number; isPt?: boolean }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { setRunning(false); return; }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [running, remaining]);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Timer className="h-4 w-4 text-primary" />
      <span className="tabular-nums font-medium">{mm}:{String(ss).padStart(2, "0")}</span>
      <button type="button" onClick={() => setRunning((v) => !v)} className="rounded border px-2 py-0.5 text-xs hover:bg-muted">
        {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <button type="button" onClick={() => { setRemaining(seconds); setRunning(false); }} className="rounded border px-2 py-0.5 text-xs hover:bg-muted">
        <RotateCcw className="h-3 w-3" />
      </button>
      <span className="text-xs text-muted-foreground">{isPt ? "descanso" : "rest"}</span>
    </div>
  );
}

export default function StudentWorkouts() {
  const { locale } = useLocale();
  const isPt = !!locale?.startsWith("pt");
  const t = (en: string, pt: string) => (isPt ? pt : en);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Workout | null>(null);
  // Per-exercise set entries, keyed by workoutExerciseId.
  const [entries, setEntries] = useState<Record<string, SetEntry[]>>({});
  const [sessionRpe, setSessionRpe] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  // Guards the history fetch against a race when switching workouts quickly.
  const currentWorkoutRef = useRef<string | null>(null);

  const exName = (e: WEx) => (isPt && e.exercise?.namePt ? e.exercise.namePt : e.exercise?.name || "");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/workouts");
        // 404 = training module off for this tenant (e.g. a clinic patient who
        // reached the URL directly): show the empty state, not an error.
        if (r.status === 404) { setWorkouts([]); return; }
        if (!r.ok) throw new Error(String(r.status));
        setWorkouts(await r.json());
      } catch {
        setError(t("Could not load your workouts.", "Não foi possível carregar seus treinos."));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWorkout = useCallback((w: Workout) => {
    setSelected(w);
    setSavedMsg("");
    setSessionRpe("");
    setShowHistory(false);
    setSessionSaved(false);
    currentWorkoutRef.current = w.id;
    // Pre-fill each exercise's sets with the prescribed values.
    const init: Record<string, SetEntry[]> = {};
    for (const e of w.exercises) {
      const n = Math.max(1, e.sets ?? 1);
      init[e.id] = Array.from({ length: n }, () => ({
        reps: s(e.repsMax ?? e.repsMin),
        loadKg: s(e.loadKg),
        rpe: s(e.rpe),
        completed: false,
      }));
    }
    setEntries(init);
    // Load history for this workout (ignore if the user has since switched).
    fetch(`/api/workouts/${w.id}/logs`)
      .then((r) => (r.ok ? r.json() : []))
      .then((h) => { if (currentWorkoutRef.current === w.id) setHistory(Array.isArray(h) ? h : []); })
      .catch(() => { if (currentWorkoutRef.current === w.id) setHistory([]); });
  }, []);

  function updateSet(exId: string, i: number, patch: Partial<SetEntry>) {
    setSessionSaved(false); // editing after a save re-enables Finish for a new session
    setSavedMsg("");
    setEntries((prev) => ({
      ...prev,
      [exId]: prev[exId].map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    }));
  }

  async function finish() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const sets = Object.entries(entries).flatMap(([exId, rows]) =>
        rows.map((row, idx) => ({
          workoutExerciseId: exId,
          setNumber: idx + 1,
          reps: row.reps === "" ? null : Number(row.reps),
          loadKg: row.loadKg === "" ? null : Number(row.loadKg),
          rpe: row.rpe === "" ? null : Number(row.rpe),
          completed: row.completed,
        }))
      );
      const r = await fetch(`/api/workouts/${selected.id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionRpe: sessionRpe === "" ? null : Number(sessionRpe), sets }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.error || String(r.status));
      }
      setSavedMsg(t("Session saved!", "Sessão registrada!"));
      setSessionSaved(true); // block an accidental duplicate re-POST of the same session
      const h = await fetch(`/api/workouts/${selected.id}/logs`).then((x) => (x.ok ? x.json() : []));
      if (currentWorkoutRef.current === selected.id) setHistory(Array.isArray(h) ? h : []);
    } catch (e: any) {
      setError(e?.message || t("Could not save the session.", "Não foi possível registrar a sessão."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading your workouts…", "Carregando seus treinos…")}
      </div>
    );
  }

  const dayNames = isPt
    ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // scheduledDate is a UTC-midnight-anchored "date-only" value (see
  // assign/route.ts's scheduledDateFor) — reading it with local getters would
  // shift it by a day for any negative-offset timezone (Brazil included,
  // UTC-3 year-round), so this compares/formats in UTC to match how it was
  // written, not the viewer's local wall-clock time.
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getUTCFullYear() === now.getUTCFullYear() &&
      d.getUTCMonth() === now.getUTCMonth() &&
      d.getUTCDate() === now.getUTCDate()
    );
  };
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${dayNames[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  };
  // Program-generated workouts (activity 33) carry a scheduledDate and are
  // grouped separately, sorted by date with today highlighted. Manually
  // assigned recurring workouts (scheduledDate: null) keep the plain list —
  // unchanged from before this activity.
  const recurringWorkouts = workouts.filter((w) => !w.scheduledDate);
  const scheduledWorkouts = workouts
    .filter((w) => w.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());

  const renderWorkoutRow = (w: Workout) => (
    <button
      key={w.id}
      onClick={() => openWorkout(w)}
      className={`flex w-full items-center justify-between rounded-md border p-3 text-left hover:border-primary hover:bg-primary/5 ${
        w.scheduledDate && isToday(w.scheduledDate) ? "border-primary" : ""
      }`}
    >
      <span>
        <span className="font-medium">{w.name}</span>
        {w.phase && <span className="ml-2 text-xs text-muted-foreground">{w.phase}</span>}
        <span className="block text-xs text-muted-foreground">
          {w.scheduledDate
            ? `${isToday(w.scheduledDate) ? t("Today", "Hoje") : formatDate(w.scheduledDate)} · `
            : ""}
          {w.exercises.length} {t("exercises", "exercícios")}
          {!w.scheduledDate && w.daysOfWeek?.length ? " · " + w.daysOfWeek.map((d) => dayNames[d]).join(", ") : ""}
        </span>
      </span>
      <Play className="h-4 w-4 text-primary" />
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Dumbbell className="h-5 w-5 text-primary" /> {t("My Workouts", "Meus Treinos")}
      </h1>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!selected ? (
        workouts.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("No workouts assigned yet. Your trainer will set these up.", "Nenhum treino ainda. Seu personal vai montar.")}
          </p>
        ) : (
          <div className="space-y-4">
            {scheduledWorkouts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">{t("Program", "Programa")}</p>
                {scheduledWorkouts.map(renderWorkoutRow)}
              </div>
            )}
            {recurringWorkouts.length > 0 && (
              <div className="space-y-2">
                {scheduledWorkouts.length > 0 && (
                  <p className="text-xs font-medium uppercase text-muted-foreground">{t("Recurring", "Recorrente")}</p>
                )}
                {recurringWorkouts.map(renderWorkoutRow)}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> {t("All workouts", "Todos os treinos")}
          </button>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selected.name}</h2>
            <button onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <History className="h-4 w-4" /> {t("History", "Histórico")} ({history.length})
            </button>
          </div>

          {showHistory && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              {history.length === 0 ? (
                <p className="text-muted-foreground">{t("No sessions logged yet.", "Nenhuma sessão registrada.")}</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="flex justify-between border-b py-1 last:border-0">
                    <span>{new Date(h.performedAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}</span>
                    <span className="text-muted-foreground">
                      {h.setLogs.length} {t("sets", "séries")}{h.sessionRpe ? ` · RPE ${h.sessionRpe}` : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {selected.exercises.map((e) => (
            <div key={e.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{exName(e)}</span>
                {e.supersetGroup && <span className="rounded bg-primary/10 px-1.5 text-[10px] text-primary">SS {e.supersetGroup}</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                {[
                  e.sets != null ? `${e.sets} ${t("sets", "séries")}` : null,
                  e.repsMin != null || e.repsMax != null ? `${e.repsMin ?? ""}${e.repsMin != null && e.repsMax != null ? "–" : ""}${e.repsMax ?? ""} ${t("reps", "reps")}` : null,
                  e.loadKg != null ? `${e.loadKg} kg` : null,
                  e.rpe != null ? `RPE ${e.rpe}` : null,
                  e.rir != null ? `RIR ${e.rir}` : null,
                  e.cadence ? `${t("cadence", "cadência")} ${e.cadence}` : null,
                ].filter(Boolean).join(" · ")}
              </p>

              {e.exercise?.videoUrl && (
                <video controls preload="none" poster={e.exercise.thumbnailUrl || undefined} className="w-full max-h-64 rounded bg-black">
                  <source src={e.exercise.videoUrl} />
                </video>
              )}

              {/* Set logging */}
              <div className="space-y-1">
                <div className="grid grid-cols-[24px_1fr_1fr_1fr_28px] gap-1 text-[10px] text-muted-foreground">
                  <span>#</span><span>{t("Reps", "Reps")}</span><span>{t("Load kg", "Carga kg")}</span><span>RPE</span><span><Check className="h-3 w-3" /></span>
                </div>
                {(entries[e.id] || []).map((row, i) => (
                  <div key={i} className="grid grid-cols-[24px_1fr_1fr_1fr_28px] items-center gap-1">
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                    <Input type="number" min={0} step={1} value={row.reps} onChange={(ev) => updateSet(e.id, i, { reps: ev.target.value })} className="h-8" />
                    <Input type="number" min={0} step={0.5} value={row.loadKg} onChange={(ev) => updateSet(e.id, i, { loadKg: ev.target.value })} className="h-8" />
                    <Input type="number" min={1} max={10} step={1} value={row.rpe} onChange={(ev) => updateSet(e.id, i, { rpe: ev.target.value })} className="h-8" />
                    <input type="checkbox" checked={row.completed} onChange={(ev) => updateSet(e.id, i, { completed: ev.target.checked })} className="h-4 w-4" aria-label={t("Set done", "Série feita")} />
                  </div>
                ))}
              </div>

              {e.restSeconds != null && e.restSeconds > 0 && <RestTimer seconds={e.restSeconds} isPt={isPt} />}
            </div>
          ))}

          {/* Session summary + finish */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">{t("Session RPE", "RPE da sessão")}</Label>
                <Input type="number" min={1} max={10} step={1} value={sessionRpe} onChange={(e) => setSessionRpe(e.target.value)} className="h-8 w-24" />
              </div>
              <Button onClick={finish} disabled={saving || sessionSaved} className="gap-2" data-testid="finish-session">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t("Finish session", "Concluir sessão")}
              </Button>
            </div>
            {savedMsg && <p className="text-sm text-green-600">{savedMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
