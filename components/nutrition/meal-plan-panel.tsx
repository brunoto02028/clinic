"use client";

// Nutrition panel on the student's detail page (personal-trainer product).
// Trainer builds a meal plan with macro targets + meals, manages its status,
// and sees the student's adherence logs (with notes/photos). Activity 27.
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Save, Trash2, Apple, X, Play, Pause, Archive, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVocab } from "@/hooks/use-vocab";

interface FoodLite {
  id: string;
  name: string;
  basis: "PER_100G" | "PER_UNIT";
  unitLabel: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isActive?: boolean;
}
interface MealFoodItem {
  foodId: string;
  quantity: number;
  food?: FoodLite; // kept inline for the client-side macro preview
}
interface MealItem {
  id?: string;
  name: string;
  timeOfDay: string | null;
  description: string | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  order: number;
  foods?: MealFoodItem[]; // undefined = manual macros; array (incl []) = food-composed
}

const clientFactor = (basis: string, q: number) => (basis === "PER_100G" ? q / 100 : q);
/** Meal macros for display/preview: computed from foods, else the manual fields. */
function mealMacros(m: MealItem) {
  if (m.foods) {
    let kcal = 0, p = 0, c = 0, f = 0;
    for (const it of m.foods) {
      const fd = it.food;
      if (!fd) continue;
      const k = clientFactor(fd.basis, it.quantity || 0);
      kcal += fd.kcal * k; p += fd.proteinG * k; c += fd.carbsG * k; f += fd.fatG * k;
    }
    return { kcal: Math.round(kcal), proteinG: Math.round(p * 10) / 10, carbsG: Math.round(c * 10) / 10, fatG: Math.round(f * 10) / 10 };
  }
  return { kcal: m.kcal ?? 0, proteinG: m.proteinG ?? 0, carbsG: m.carbsG ?? 0, fatG: m.fatG ?? 0 };
}
interface LogItem {
  id: string;
  mealId: string | null;
  mealName: string;
  loggedDate: string;
  performedAt: string;
  note: string | null;
  photoUrl: string | null;
}
interface MealPlan {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  targetKcal: number | null;
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatG: number | null;
  notes: string | null;
  meals: MealItem[];
  logs: LogItem[];
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-400",
  PAUSED: "bg-amber-500/20 text-amber-400",
  COMPLETED: "bg-blue-500/20 text-blue-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const num = (v: string): number | null => (v.trim() === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const emptyMeal = (order: number): MealItem => ({ name: "", timeOfDay: "", description: "", kcal: null, proteinG: null, carbsG: null, fatG: null, order });

/** Adherence over the last 7 days: distinct (mealId, day) logs ÷ (meals × 7). */
function weekAdherence(plan: MealPlan): { logged: number; planned: number; pct: number } {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const seen = new Set<string>();
  for (const l of plan.logs) {
    if (!l.mealId) continue;
    if (new Date(l.performedAt) < cutoff) continue;
    seen.add(`${l.mealId}|${l.loggedDate.slice(0, 10)}`);
  }
  const planned = plan.meals.length * 7;
  const logged = seen.size;
  return { logged, planned, pct: planned === 0 ? 0 : Math.min(1, logged / planned) };
}

export default function MealPlanPanel({ studentId }: { studentId: string }) {
  const { relabel } = useVocab();
  const [list, setList] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // plan id being edited
  const [creating, setCreating] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [targets, setTargets] = useState<Record<string, string>>({ kcal: "", protein: "", carbs: "", fat: "" });
  const [notes, setNotes] = useState("");
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [notifyStudent, setNotifyStudent] = useState(true);
  const [catalog, setCatalog] = useState<FoodLite[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [r, rc] = await Promise.all([
        fetch(`/api/admin/meal-plans?studentId=${encodeURIComponent(studentId)}`),
        fetch("/api/admin/foods"),
      ]);
      if (!r.ok) throw new Error(String(r.status));
      setList(await r.json());
      if (rc.ok) setCatalog(await rc.json());
    } catch {
      setError("Could not load meal plans.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setName(""); setTargets({ kcal: "", protein: "", carbs: "", fat: "" }); setNotes("");
    setMeals([emptyMeal(0)]); setNotifyStudent(true); setError("");
  }
  function startNew() { setEditingId(null); setCreating(true); resetForm(); }
  function startEdit(p: MealPlan) {
    setEditingId(p.id); setCreating(true);
    setName(p.name);
    setTargets({
      kcal: p.targetKcal?.toString() ?? "", protein: p.targetProteinG?.toString() ?? "",
      carbs: p.targetCarbsG?.toString() ?? "", fat: p.targetFatG?.toString() ?? "",
    });
    setNotes(p.notes ?? "");
    setMeals(
      p.meals.length
        ? p.meals.map((m: any) => ({
            ...m,
            // Empty foods from the API = manual meal (undefined); non-empty = food-composed.
            foods: m.foods && m.foods.length ? m.foods.map((f: any) => ({ foodId: f.foodId, quantity: f.quantity, food: f.food })) : undefined,
          }))
        : [emptyMeal(0)]
    );
    setNotifyStudent(false);
    setError("");
  }
  function cancel() { setCreating(false); setEditingId(null); }

  const setMeal = (i: number, patch: Partial<MealItem>) =>
    setMeals((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  // ── Food composition per meal ──
  const enableFoods = (i: number) => setMeal(i, { foods: [] });
  const disableFoods = (i: number) => setMeal(i, { foods: undefined });
  const addFoodToMeal = (i: number, foodId: string) => {
    const fd = catalog.find((c) => c.id === foodId);
    if (!fd) return;
    setMeals((ms) => ms.map((m, idx) => (idx === i ? { ...m, foods: [...(m.foods ?? []), { foodId, quantity: fd.basis === "PER_100G" ? 100 : 1, food: fd }] } : m)));
  };
  const setFoodQty = (i: number, fi: number, q: number) =>
    setMeals((ms) => ms.map((m, idx) => (idx === i ? { ...m, foods: (m.foods ?? []).map((x, j) => (j === fi ? { ...x, quantity: q } : x)) } : m)));
  const removeFoodFromMeal = (i: number, fi: number) =>
    setMeals((ms) => ms.map((m, idx) => (idx === i ? { ...m, foods: (m.foods ?? []).filter((_, j) => j !== fi) } : m)));

  const plannedTotals = meals.reduce(
    (a, m) => { const mm = mealMacros(m); return { kcal: a.kcal + mm.kcal, protein: a.protein + mm.proteinG, carbs: a.carbs + mm.carbsG, fat: a.fat + mm.fatG }; },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  async function save() {
    setSaving(true); setError("");
    try {
      const body: any = {
        studentId,
        name: name.trim(),
        targetKcal: num(targets.kcal), targetProteinG: num(targets.protein),
        targetCarbsG: num(targets.carbs), targetFatG: num(targets.fat),
        notes: notes.trim() || null,
        notifyStudent,
        meals: meals
          .filter((m) => m.name.trim())
          .map((m, i) => ({
            id: m.id, name: m.name.trim(), timeOfDay: m.timeOfDay || null, description: m.description || null,
            kcal: m.kcal, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG, order: i,
            // foods present (incl []) → server computes/stores macros; absent → manual kept.
            ...(m.foods !== undefined ? { foods: m.foods.map((x, idx) => ({ foodId: x.foodId, quantity: x.quantity, order: idx })) } : {}),
          })),
      };
      const url = editingId ? `/api/admin/meal-plans/${editingId}` : "/api/admin/meal-plans";
      const r = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.error || String(r.status)); }
      setCreating(false); setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(p: MealPlan, status: MealPlan["status"]) {
    const r = await fetch(`/api/admin/meal-plans/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).catch(() => null);
    if (!r || !r.ok) { setError("Could not change status."); return; }
    await load();
  }

  async function remove(p: MealPlan) {
    if (!confirm(relabel(`Delete meal plan "${p.name}"? The student will no longer see it.`))) return;
    const r = await fetch(`/api/admin/meal-plans/${p.id}`, { method: "DELETE" }).catch(() => null);
    if (!r || !r.ok) { setError("Could not delete the plan."); return; }
    await load();
  }

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading meal plans…</div>;

  return (
    <div className="space-y-4" data-testid="meal-plan-panel">
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!creating && (
        <Button onClick={startNew} className="gap-2" data-testid="meal-plan-new"><Plus className="h-4 w-4" /> New meal plan</Button>
      )}

      {/* Create / Edit form */}
      {creating && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editingId ? "Edit meal plan" : "New meal plan"}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancel}><X className="h-4 w-4" /></Button>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Plan name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cutting Phase — Week 1" className="h-8" data-testid="mp-name" />
          </div>

          {/* Daily macro targets */}
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">Daily targets (optional)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([["kcal", "Calories (kcal)"], ["protein", "Protein (g)"], ["carbs", "Carbs (g)"], ["fat", "Fat (g)"]] as const).map(([k, label]) => (
                <div key={k}>
                  <Label className="text-[10px] text-muted-foreground">{label}</Label>
                  <Input type="number" min={0} value={targets[k]} onChange={(e) => setTargets((t) => ({ ...t, [k]: e.target.value }))} className="h-8" data-testid={`mp-target-${k}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">Meals</p>
              <p className="text-[10px] text-muted-foreground">Planned: {plannedTotals.kcal} kcal · {plannedTotals.protein}P / {plannedTotals.carbs}C / {plannedTotals.fat}F</p>
            </div>
            {meals.map((m, i) => (
              <div key={i} className="rounded-md border p-2 space-y-2" data-testid="mp-meal-row">
                <div className="flex items-center gap-2">
                  <Input value={m.name} onChange={(e) => setMeal(i, { name: e.target.value })} placeholder={`Meal ${i + 1} name (e.g. Breakfast)`} className="h-8 flex-1" />
                  <Input value={m.timeOfDay ?? ""} onChange={(e) => setMeal(i, { timeOfDay: e.target.value })} placeholder="08:00" className="h-8 w-20" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setMeals((ms) => ms.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <Input value={m.description ?? ""} onChange={(e) => setMeal(i, { description: e.target.value })} placeholder="What to eat…" className="h-8" />

                {m.foods === undefined ? (
                  <>
                    {/* Manual macros (activity 27) */}
                    <div className="grid grid-cols-4 gap-2">
                      {([["kcal", "kcal"], ["proteinG", "P (g)"], ["carbsG", "C (g)"], ["fatG", "F (g)"]] as const).map(([field, label]) => (
                        <div key={field}>
                          <Label className="text-[9px] text-muted-foreground">{label}</Label>
                          <Input type="number" min={0} value={(m[field] as number | null) ?? ""} onChange={(e) => setMeal(i, { [field]: num(e.target.value) } as Partial<MealItem>)} className="h-8" />
                        </div>
                      ))}
                    </div>
                    {catalog.length > 0 && (
                      <button type="button" className="text-[10px] text-primary hover:underline" onClick={() => enableFoods(i)}>+ Build from foods (auto macros)</button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Food-composed meal */}
                    <div className="space-y-1">
                      {(m.foods ?? []).map((it, fi) => (
                        <div key={fi} className="flex items-center gap-2">
                          <span className="flex-1 text-xs truncate">{it.food?.name ?? "food"}{it.food && it.food.isActive === false ? " (inactive)" : ""}</span>
                          <Input type="number" min={0} step="0.1" value={it.quantity} onChange={(e) => setFoodQty(i, fi, Number(e.target.value) || 0)} className="h-7 w-20 text-xs" />
                          <span className="text-[10px] text-muted-foreground w-10">{it.food?.basis === "PER_100G" ? "g" : it.food?.unitLabel || "un"}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFoodFromMeal(i, fi)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) addFoodToMeal(i, e.target.value); }}
                        className="h-8 w-full rounded border bg-background px-2 text-xs"
                        data-testid="mp-food-picker"
                      >
                        <option value="">+ Add food…</option>
                        {catalog.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                      {(() => { const mm = mealMacros(m); return (
                        <p className="text-[10px] text-muted-foreground">Computed: {mm.kcal} kcal · {mm.proteinG}P / {mm.carbsG}C / {mm.fatG}F</p>
                      ); })()}
                      <button type="button" className="text-[10px] text-muted-foreground hover:underline" onClick={() => disableFoods(i)}>Switch to manual macros</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMeals((ms) => [...ms, emptyMeal(ms.length)])}><Plus className="h-3 w-3" /> Add meal</Button>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8" />
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={notifyStudent} onChange={(e) => setNotifyStudent(e.target.checked)} />
            {relabel("Notify student")}
          </label>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="gap-2" data-testid="mp-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button>
            <Button variant="outline" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!creating && list.length === 0 && (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Apple className="mx-auto mb-2 h-8 w-8 opacity-30" />
          {relabel("No meal plan yet — create one to get started.")}
        </div>
      )}

      {/* Plans list */}
      {!creating && list.map((p) => {
        const ad = weekAdherence(p);
        return (
          <div key={p.id} className="rounded-md border p-3 space-y-2" data-testid="meal-plan-row">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className={`rounded px-1.5 text-[10px] ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {p.meals.length} meals
                  {p.targetKcal != null && ` · target ${p.targetKcal} kcal`}
                  {(p.targetProteinG != null || p.targetCarbsG != null || p.targetFatG != null) &&
                    ` · ${p.targetProteinG ?? "–"}P / ${p.targetCarbsG ?? "–"}C / ${p.targetFatG ?? "–"}F`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {p.status !== "ACTIVE" && <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" title="Activate" onClick={() => setStatus(p, "ACTIVE")}><Play className="h-3.5 w-3.5" /></Button>}
                {p.status === "ACTIVE" && <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500" title="Pause" onClick={() => setStatus(p, "PAUSED")}><Pause className="h-3.5 w-3.5" /></Button>}
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Archive" onClick={() => setStatus(p, "ARCHIVED")}><Archive className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>Edit</Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>

            {/* Meals summary */}
            <div className="flex flex-wrap gap-1">
              {p.meals.map((m) => (
                <span key={m.id ?? m.name} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                  {m.timeOfDay ? `${m.timeOfDay} ` : ""}{m.name}
                </span>
              ))}
            </div>

            {/* Adherence + logs feed */}
            <div className="rounded-md bg-muted/40 p-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium">Adherence (7 days)</span>
                <span className="text-muted-foreground">{ad.logged}/{ad.planned} · {Math.round(ad.pct * 100)}%</span>
              </div>
              {p.logs.length === 0 ? (
                <p className="mt-1 text-[10px] text-muted-foreground">No meals logged yet.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {p.logs.slice(0, 8).map((l) => (
                    <li key={l.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="font-medium text-foreground">{l.mealName}</span>
                      <span>{new Date(l.loggedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                      {l.note && <span className="truncate italic">“{l.note}”</span>}
                      {l.photoUrl && <a href={l.photoUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">photo</a>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
