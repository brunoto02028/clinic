"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Save, Trash2, Camera, Activity, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Method = "MANUAL" | "BIA" | "SKINFOLD";
interface Assessment {
  id: string;
  performedAt: string;
  weightKg: number | null;
  heightCm: number | null;
  sex: string | null;
  bfMethod: Method;
  assessmentType: string | null;
  bodyFatPct: number | null;
  bmi: number | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
  whr: number | null;
  restingHr: number | null;
  systolic: number | null;
  diastolic: number | null;
  girths: Record<string, number> | null;
  skinfolds: Record<string, number> | null;
  bia: Record<string, number> | null;
  notes: string | null;
  photos: { id: string; pose: string; url: string }[];
}

const GIRTHS = ["neck", "chest", "waist", "hip", "armRelaxed", "armFlexed", "thigh", "calf"];
const SKINFOLDS = ["chest", "abdomen", "thigh", "triceps", "suprailiac", "subscapular", "midaxillary"];
const n = (v: string) => (v.trim() === "" ? undefined : Number(v));

export default function AssessmentPanel({ studentId }: { studentId: string }) {
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [consentAt, setConsentAt] = useState<string | null>(null);
  const [types, setTypes] = useState<string[]>([]); // tenant's assessment-type catalog

  // Form state (strings for inputs)
  const [f, setF] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<Method>("MANUAL");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setError("");
    try {
      const sid = encodeURIComponent(studentId);
      const [ra, rc] = await Promise.all([
        fetch(`/api/admin/assessments?studentId=${sid}`),
        fetch(`/api/admin/assessments/consent?studentId=${sid}`),
      ]);
      if (!ra.ok) throw new Error(String(ra.status));
      setList(await ra.json());
      // Reflect the student's existing consent so we don't re-prompt (and don't
      // overwrite the original consent date).
      if (rc.ok) setConsentAt((await rc.json()).photoConsentAt ?? null);
      // Assessment-type catalog = the tenant's ASSESSMENT_SERVICE treatment types.
      try {
        const rt = await fetch("/api/admin/treatment-types");
        if (rt.ok) {
          const tt = await rt.json();
          setTypes((Array.isArray(tt) ? tt : [])
            .filter((x: any) => x.category === "ASSESSMENT_SERVICE" && x.isActive !== false)
            .map((x: any) => x.namePt || x.name));
        }
      } catch { /* catalog optional */ }
    } catch {
      setError("Could not load assessments.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    setCreating(true);
    setF({});
    setMethod("MANUAL");
    setError("");
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const girths: Record<string, number> = {};
      for (const g of GIRTHS) { const v = n(f[`g_${g}`] || ""); if (v !== undefined) girths[g] = v; }
      const body: any = {
        studentId,
        performedAt: f.performedAt || undefined,
        assessmentType: f.assessmentType || undefined,
        weightKg: n(f.weightKg || ""),
        heightCm: n(f.heightCm || ""),
        sex: f.sex || undefined,
        bfMethod: method,
        restingHr: n(f.restingHr || ""),
        systolic: n(f.systolic || ""),
        diastolic: n(f.diastolic || ""),
        girths: Object.keys(girths).length ? girths : undefined,
        notes: f.notes || undefined,
      };
      if (method === "MANUAL") body.bodyFatPct = n(f.bodyFatPct || "");
      if (method === "BIA") {
        const bia: Record<string, number> = {};
        for (const [k, key] of [["bodyFatPct", "bia_bodyFatPct"], ["muscleMassKg", "bia_muscleMassKg"], ["bodyWaterPct", "bia_bodyWaterPct"], ["visceralFat", "bia_visceralFat"]] as const) {
          const v = n(f[key] || ""); if (v !== undefined) bia[k] = v;
        }
        body.bia = Object.keys(bia).length ? bia : undefined; // don't store an empty object
      }
      if (method === "SKINFOLD") { const sf: Record<string, number> = {}; for (const s of SKINFOLDS) { const v = n(f[`sf_${s}`] || ""); if (v !== undefined) sf[s] = v; } body.skinfolds = Object.keys(sf).length ? sf : undefined; }

      const r = await fetch("/api/admin/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.error || String(r.status)); }
      setCreating(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this assessment?")) return;
    const r = await fetch(`/api/admin/assessments/${id}`, { method: "DELETE" }).catch(() => null);
    if (!r || !r.ok) { setError("Could not delete the assessment."); return; }
    await load();
  }

  async function grantConsent() {
    try {
      const r = await fetch("/api/admin/assessments/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId }) });
      if (!r.ok) throw new Error();
      setConsentAt((await r.json()).photoConsentAt);
    } catch {
      setError("Could not record consent.");
    }
  }

  async function uploadPhoto(assessmentId: string, pose: string, file: File) {
    const fd = new FormData();
    fd.append("pose", pose);
    fd.append("image", file);
    const r = await fetch(`/api/admin/assessments/${assessmentId}/photos`, { method: "POST", body: fd });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d?.error || "Upload failed"); return; }
    setError(""); // clear any prior failure on success
    await load();
  }

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading assessments…</div>;

  const numField = (k: string, label: string, step = "1") => (
    <div key={k}>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input type="number" step={step} min={0} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="h-8" data-testid={`af-${k}`} />
    </div>
  );

  return (
    <div className="space-y-4" data-testid="assessment-panel">
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!creating && (
        <Button onClick={startNew} className="gap-2" data-testid="assessment-new"><Plus className="h-4 w-4" /> New assessment</Button>
      )}

      {creating && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <Label className="text-[10px] text-muted-foreground">Date</Label>
              <Input type="date" value={f.performedAt ?? ""} onChange={(e) => set("performedAt", e.target.value)} className="h-8" data-testid="af-performedAt" />
            </div>
            {types.length > 0 && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Assessment type</Label>
                <select value={f.assessmentType ?? ""} onChange={(e) => set("assessmentType", e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-sm" data-testid="af-assessmentType">
                  <option value="">—</option>
                  {types.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
            )}
            {numField("weightKg", "Weight (kg)", "0.1")}
            {numField("heightCm", "Height (cm)", "0.1")}
            <div>
              <Label className="text-[10px] text-muted-foreground">Sex</Label>
              <select value={f.sex ?? ""} onChange={(e) => set("sex", e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-sm">
                <option value="">—</option><option value="M">M</option><option value="F">F</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Body-fat method</Label>
              <select value={method} onChange={(e) => setMethod(e.target.value as Method)} className="h-8 w-full rounded-md border bg-background px-2 text-sm" data-testid="af-method">
                <option value="MANUAL">Manual %BF</option><option value="BIA">Bioimpedance</option><option value="SKINFOLD">Skinfolds (JP)</option>
              </select>
            </div>
          </div>

          {method === "MANUAL" && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{numField("bodyFatPct", "Body fat %", "0.1")}</div>}
          {method === "BIA" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {numField("bia_bodyFatPct", "Body fat %", "0.1")}
              {numField("bia_muscleMassKg", "Muscle (kg)", "0.1")}
              {numField("bia_bodyWaterPct", "Body water %", "0.1")}
              {numField("bia_visceralFat", "Visceral fat", "1")}
            </div>
          )}
          {method === "SKINFOLD" && (
            <div>
              <p className="mb-1 text-[10px] text-muted-foreground">Skinfolds (mm) — 3-site by sex, or all 7</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{SKINFOLDS.map((s) => numField(`sf_${s}`, s))}</div>
            </div>
          )}

          <div>
            <p className="mb-1 text-[10px] text-muted-foreground flex items-center gap-1"><Ruler className="h-3 w-3" /> Circumferences (cm)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{GIRTHS.map((g) => numField(`g_${g}`, g, "0.1"))}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {numField("restingHr", "Resting HR")}
            {numField("systolic", "Systolic")}
            {numField("diastolic", "Diastolic")}
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Notes</Label>
            <Input value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="h-8" />
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="gap-2" data-testid="assessment-save">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> History ({list.length})</h3>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assessments recorded yet.</p>
        ) : (
          list.map((a) => (
            <div key={a.id} className="rounded-md border p-3 text-sm" data-testid="assessment-row">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {new Date(a.performedAt).toLocaleDateString("en-GB")}
                  {a.assessmentType && <span className="ml-2 rounded bg-primary/10 px-1.5 text-[10px] text-primary">{a.assessmentType}</span>}
                </span>
                <button onClick={() => remove(a.id)} className="p-1 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {a.weightKg != null && <span>{a.weightKg} kg</span>}
                {a.bmi != null && <span>BMI {a.bmi}</span>}
                {a.bodyFatPct != null && <span>{a.bodyFatPct}% BF ({a.bfMethod.toLowerCase()})</span>}
                {a.leanMassKg != null && <span>lean {a.leanMassKg} kg</span>}
                {a.whr != null && <span>WHR {a.whr}</span>}
                {a.restingHr != null && <span>HR {a.restingHr}</span>}
              </div>

              {/* Photos */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {a.photos.map((p) => (
                  <img key={p.id} src={p.url} alt={p.pose} className="h-16 w-12 rounded object-cover" title={p.pose} />
                ))}
                {consentAt ? (
                  ["FRONT", "SIDE", "BACK"].map((pose) => (
                    <label key={pose} className="flex h-16 w-12 cursor-pointer flex-col items-center justify-center rounded border border-dashed text-[9px] text-muted-foreground hover:border-primary">
                      <Camera className="h-4 w-4" />{pose}
                      <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) uploadPhoto(a.id, pose, file); }} />
                    </label>
                  ))
                ) : (
                  <button onClick={grantConsent} className="rounded border px-2 py-1 text-[10px] hover:bg-muted">Record photo consent to enable photos</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
