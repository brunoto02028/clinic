"use client";

// Student's nutrition view (personal-trainer product, activity 27). Shows the
// active meal plan's macro targets and meals, and lets the student mark each
// meal done for today (idempotent + reversible). Weekly adherence summary.
import { useEffect, useState, useCallback } from "react";
import { Apple, Loader2, Check, Utensils } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface Meal {
  id: string;
  name: string;
  timeOfDay: string | null;
  description: string | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  order: number;
}
interface Log {
  id: string;
  mealId: string | null;
  mealName: string;
  loggedDate: string;
  performedAt: string;
  note: string | null;
}
interface Plan {
  id: string;
  name: string;
  targetKcal: number | null;
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatG: number | null;
  notes: string | null;
  meals: Meal[];
  logs: Log[];
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function StudentNutrition() {
  const { locale } = useLocale();
  const isPt = !!locale?.startsWith("pt");
  const t = (en: string, pt: string) => (isPt ? pt : en);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // mealId being toggled
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/meal-plans");
      if (!r.ok) throw new Error(String(r.status));
      const p: Plan | null = await r.json();
      setPlan(p);
      // Seed note drafts from today's logs so an existing note stays visible.
      if (p) {
        const seed: Record<string, string> = {};
        for (const l of p.logs) {
          if (l.mealId && l.loggedDate.slice(0, 10) === todayStr() && l.note) seed[l.mealId] = l.note;
        }
        setNoteDraft(seed);
      }
    } catch {
      setError(t("Could not load your meal plan.", "Não foi possível carregar seu plano alimentar."));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPt]);

  useEffect(() => { load(); }, [load]);

  const doneToday = (mealId: string) =>
    !!plan?.logs.some((l) => l.mealId === mealId && l.loggedDate.slice(0, 10) === todayStr());

  async function toggle(mealId: string) {
    if (!plan) return;
    setBusy(mealId);
    const done = doneToday(mealId);
    try {
      const r = done
        ? await fetch(`/api/meal-plans/${plan.id}/logs?mealId=${encodeURIComponent(mealId)}&date=${todayStr()}`, { method: "DELETE" })
        : await fetch(`/api/meal-plans/${plan.id}/logs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mealId, date: todayStr(), note: noteDraft[mealId]?.trim() || undefined }) });
      if (!r.ok) throw new Error(String(r.status));
      await load();
    } catch {
      setError(t("Could not update. Try again.", "Não foi possível atualizar. Tente de novo."));
    } finally {
      setBusy(null);
    }
  }

  // Weekly adherence: distinct (mealId, day) logs in last 7 days ÷ (meals × 7).
  const week = (() => {
    if (!plan) return { logged: 0, planned: 0, pct: 0 };
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const seen = new Set<string>();
    for (const l of plan.logs) {
      if (!l.mealId) continue;
      if (new Date(l.performedAt) < cutoff) continue;
      seen.add(`${l.mealId}|${l.loggedDate.slice(0, 10)}`);
    }
    const planned = plan.meals.length * 7;
    return { logged: seen.size, planned, pct: planned === 0 ? 0 : Math.min(1, seen.size / planned) };
  })();

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("Loading…", "Carregando…")}</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Apple className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">{t("Nutrition", "Nutrição")}</h1>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!plan ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          <Utensils className="mx-auto mb-2 h-8 w-8 opacity-30" />
          {t("Your trainer hasn't set a meal plan yet.", "Seu personal ainda não definiu um plano alimentar.")}
        </div>
      ) : (
        <>
          <div className="rounded-md border p-3">
            <p className="font-medium">{plan.name}</p>
            {(plan.targetKcal != null || plan.targetProteinG != null || plan.targetCarbsG != null || plan.targetFatG != null) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Daily targets", "Metas diárias")}: {plan.targetKcal != null ? `${plan.targetKcal} kcal` : "–"}
                {" · "}{plan.targetProteinG ?? "–"}P / {plan.targetCarbsG ?? "–"}C / {plan.targetFatG ?? "–"}F
              </p>
            )}
            {plan.notes && <p className="mt-1 text-xs text-muted-foreground">{plan.notes}</p>}
            <div className="mt-2 flex items-center justify-between rounded bg-muted/40 px-2 py-1 text-xs">
              <span className="font-medium">{t("Adherence (7 days)", "Aderência (7 dias)")}</span>
              <span className="text-muted-foreground">{week.logged}/{week.planned} · {Math.round(week.pct * 100)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{t("Today's meals", "Refeições de hoje")}</p>
            {plan.meals.map((m) => {
              const done = doneToday(m.id);
              return (
                <div key={m.id} className={`rounded-md border p-3 ${done ? "border-emerald-500/40 bg-emerald-500/5" : ""}`} data-testid="student-meal">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.timeOfDay ? `${m.timeOfDay} · ` : ""}{m.name}</p>
                      {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                      {(m.kcal != null || m.proteinG != null || m.carbsG != null || m.fatG != null) && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {m.kcal != null ? `${m.kcal} kcal` : ""} {m.proteinG ?? "–"}P / {m.carbsG ?? "–"}C / {m.fatG ?? "–"}F
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={busy === m.id}
                      onClick={() => toggle(m.id)}
                      data-testid="meal-toggle"
                      className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {busy === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {done ? t("Done", "Feito") : t("Mark done", "Marcar")}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={noteDraft[m.id] ?? ""}
                    onChange={(e) => setNoteDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                    placeholder={t("Add a note (optional)", "Adicionar uma nota (opcional)")}
                    className="mt-2 w-full rounded border bg-background px-2 py-1 text-xs"
                    data-testid="meal-note"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
