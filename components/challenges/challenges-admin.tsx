"use client";

// Studio-wide Challenges admin (personal-trainer product, activity 29). The
// trainer creates challenges fed by WorkoutLog/MealLog and sees the leaderboard.
import { useEffect, useState, useCallback } from "react";
import { Trophy, Plus, Loader2, Trash2, ChevronLeft, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  metric: "WORKOUT_COUNT" | "MEAL_LOG_DAYS";
  target: number;
  startsAt: string;
  endsAt: string;
  status: "ACTIVE" | "ARCHIVED";
  _count?: { participants: number };
}
interface LeaderboardEntry {
  studentId: string;
  displayName: string;
  progress: number;
  target: number;
  pct: number;
  completed: boolean;
}

const METRIC_LABEL: Record<string, string> = {
  WORKOUT_COUNT: "Workouts logged",
  MEAL_LOG_DAYS: "Days with a meal logged",
};
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDaysISO = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export default function ChallengesAdmin() {
  const [list, setList] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Challenge | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", metric: "WORKOUT_COUNT" as Challenge["metric"], target: "12",
    startsAt: todayISO(), endsAt: plusDaysISO(30),
  });

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/admin/challenges");
      if (!r.ok) throw new Error(String(r.status));
      setList(await r.json());
    } catch {
      setError("Could not load challenges.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openBoard(c: Challenge) {
    setOpen(c); setBoard([]); setBoardLoading(true);
    try {
      const r = await fetch(`/api/admin/challenges/${c.id}`);
      if (r.ok) setBoard((await r.json()).leaderboard || []);
    } finally {
      setBoardLoading(false);
    }
  }

  async function create() {
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/admin/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(), description: form.description.trim() || null,
          metric: form.metric, target: Number(form.target),
          startsAt: new Date(form.startsAt + "T00:00:00.000Z").toISOString(), endsAt: new Date(form.endsAt + "T23:59:59.999Z").toISOString(),
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.error || String(r.status)); }
      setCreating(false);
      setForm({ title: "", description: "", metric: "WORKOUT_COUNT", target: "12", startsAt: todayISO(), endsAt: plusDaysISO(30) });
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not create the challenge.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(c: Challenge) {
    if (!confirm(`Archive "${c.title}"?`)) return;
    await fetch(`/api/admin/challenges/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ARCHIVED" }) });
    await load();
  }
  async function remove(c: Challenge) {
    if (!confirm(`Delete "${c.title}"? This removes all participation.`)) return;
    await fetch(`/api/admin/challenges/${c.id}`, { method: "DELETE" });
    setOpen(null);
    await load();
  }

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading challenges…</div>;

  // Leaderboard detail view
  if (open) {
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => setOpen(null)} className="flex items-center gap-1 text-xs text-primary hover:underline"><ChevronLeft className="h-3 w-3" /> Back to challenges</button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> {open.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {METRIC_LABEL[open.metric]} · target {open.target} · {fmtDate(open.startsAt)}–{fmtDate(open.endsAt)}
          </p>
        </div>
        {boardLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading leaderboard…</div>
        ) : board.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students have joined this challenge yet.</p>
        ) : (
          <div className="space-y-1.5">
            {board.map((e, i) => (
              <div key={e.studentId} className="flex items-center gap-3 rounded-md border p-2.5">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{e.displayName} {e.completed && <Medal className="inline h-3.5 w-3.5 text-amber-500" />}</span>
                <div className="w-32">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.round(e.pct * 100)}%` }} /></div>
                </div>
                <span className="w-14 text-right text-xs text-muted-foreground">{e.progress}/{e.target}</span>
              </div>
            ))}
          </div>
        )}
        <Button variant="ghost" size="sm" className="text-destructive gap-1.5" onClick={() => remove(open)}><Trash2 className="h-3.5 w-3.5" /> Delete challenge</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Challenges</h1>
        {!creating && <Button onClick={() => setCreating(true)} className="gap-2" data-testid="challenge-new"><Plus className="h-4 w-4" /> New challenge</Button>}
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {creating && (
        <div className="rounded-md border p-3 space-y-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. 12 workouts this month" className="h-8" data-testid="ch-title" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Metric *</Label>
              <select value={form.metric} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value as Challenge["metric"] }))} className="h-8 w-full rounded border bg-background px-2 text-sm" data-testid="ch-metric">
                <option value="WORKOUT_COUNT">Workouts logged</option>
                <option value="MEAL_LOG_DAYS">Days with a meal logged</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Target *</Label>
              <Input type="number" min={1} value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} className="h-8" data-testid="ch-target" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Start</Label>
              <Input type="date" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} className="h-8" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">End</Label>
              <Input type="date" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} className="h-8" />
            </div>
          </div>
          {form.metric === "MEAL_LOG_DAYS" && (
            <p className="text-[10px] text-amber-600">Meal-log challenges only progress for students who have an active nutrition plan.</p>
          )}
          <div>
            <Label className="text-[10px] text-muted-foreground">Description</Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="h-8" />
          </div>
          <div className="flex gap-2">
            <Button onClick={create} disabled={saving || !form.title.trim() || !form.target} className="gap-2" data-testid="ch-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create</Button>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {list.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground">No challenges yet. Create one to motivate your students.</p>
      )}

      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="rounded-md border p-3 flex items-center justify-between gap-2">
            <button onClick={() => openBoard(c)} className="text-left flex-1">
              <p className="text-sm font-medium">{c.title} <span className={`ml-1 rounded px-1.5 text-[10px] ${c.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{c.status}</span></p>
              <p className="text-[11px] text-muted-foreground">{METRIC_LABEL[c.metric]} · target {c.target} · {fmtDate(c.startsAt)}–{fmtDate(c.endsAt)} · {c._count?.participants ?? 0} joined</p>
            </button>
            {c.status === "ACTIVE" && <Button variant="ghost" size="sm" onClick={() => archive(c)}>Archive</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}
