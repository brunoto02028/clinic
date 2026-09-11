"use client";

// Tenant food catalog admin (activity 31). The trainer curates foods (macros per
// 100g or per unit) used to compose meals in the meal-plan builder.
import { useEffect, useState, useCallback } from "react";
import { Apple, Plus, Loader2, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Food {
  id: string;
  name: string;
  basis: "PER_100G" | "PER_UNIT";
  unitLabel: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const empty = { name: "", basis: "PER_100G" as Food["basis"], unitLabel: "", kcal: "", proteinG: "", carbsG: "", fatG: "" };

export default function FoodCatalog() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // food id or "new" or null
  const [form, setForm] = useState({ ...empty });

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/admin/foods");
      if (!r.ok) throw new Error(String(r.status));
      setFoods(await r.json());
    } catch {
      setError("Could not load the food catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startNew() { setEditing("new"); setForm({ ...empty }); }
  function startEdit(f: Food) {
    setEditing(f.id);
    setForm({ name: f.name, basis: f.basis, unitLabel: f.unitLabel, kcal: String(f.kcal), proteinG: String(f.proteinG), carbsG: String(f.carbsG), fatG: String(f.fatG) });
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const payload = {
        name: form.name.trim(), basis: form.basis, unitLabel: form.unitLabel.trim() || undefined,
        kcal: Math.round(Number(form.kcal) || 0), proteinG: Number(form.proteinG) || 0, carbsG: Number(form.carbsG) || 0, fatG: Number(form.fatG) || 0,
      };
      const url = editing === "new" ? "/api/admin/foods" : `/api/admin/foods/${editing}`;
      const r = await fetch(url, { method: editing === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.error || String(r.status)); }
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(f: Food) {
    if (!confirm(`Remove "${f.name}" from the catalog? Meals already using it keep their values.`)) return;
    const r = await fetch(`/api/admin/foods/${f.id}`, { method: "DELETE" }).catch(() => null);
    if (!r || !r.ok) { setError("Could not remove."); return; }
    await load();
  }

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Apple className="h-5 w-5 text-primary" /> Food Catalog</h1>
        {editing === null && <Button onClick={startNew} className="gap-2" data-testid="food-new"><Plus className="h-4 w-4" /> Add food</Button>}
      </div>
      <p className="text-xs text-muted-foreground">Foods you add here can be used to build meals with automatic macro totals.</p>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {editing !== null && (
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{editing === "new" ? "New food" : "Edit food"}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-[10px] text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Chicken breast" className="h-8" data-testid="food-name" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Basis</Label>
              <select value={form.basis} onChange={(e) => setForm((f) => ({ ...f, basis: e.target.value as Food["basis"] }))} className="h-8 w-full rounded border bg-background px-2 text-sm" data-testid="food-basis">
                <option value="PER_100G">per 100g</option>
                <option value="PER_UNIT">per unit</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Unit label</Label>
              <Input value={form.unitLabel} onChange={(e) => setForm((f) => ({ ...f, unitLabel: e.target.value }))} placeholder={form.basis === "PER_100G" ? "100g" : "egg, slice…"} className="h-8" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {([["kcal", "kcal"], ["proteinG", "P (g)"], ["carbsG", "C (g)"], ["fatG", "F (g)"]] as const).map(([k, label]) => (
              <div key={k}>
                <Label className="text-[10px] text-muted-foreground">{label}</Label>
                <Input type="number" min={0} step={k === "kcal" ? "1" : "0.1"} value={(form as any)[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className="h-8" data-testid={`food-${k}`} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !form.name.trim()} className="gap-2" data-testid="food-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {foods.length === 0 && editing === null ? (
        <p className="text-sm text-muted-foreground">No foods yet. Add the ones you use most.</p>
      ) : (
        <div className="space-y-1.5">
          {foods.map((f) => (
            <div key={f.id} className="rounded-md border p-2.5 flex items-center justify-between gap-2" data-testid="food-row">
              <div>
                <p className="text-sm font-medium">{f.name} <span className="text-muted-foreground font-normal text-xs">({f.basis === "PER_100G" ? "per 100g" : `per ${f.unitLabel || "unit"}`})</span></p>
                <p className="text-[11px] text-muted-foreground">{f.kcal} kcal · {f.proteinG}P / {f.carbsG}C / {f.fatG}F</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
