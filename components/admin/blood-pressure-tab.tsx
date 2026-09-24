"use client";

// Blood pressure readings logged by staff from the patient record (activity
// 69) — typically checked right before a session for older/at-risk patients.
// Shares the BloodPressureReading model with the patient's own self-entry
// (app/dashboard/blood-pressure); the patient's own history/dashboard shows
// these mixed in with their self-measured ones, unchanged from today.

import { useCallback, useEffect, useMemo, useState } from "react";
import { HeartPulse, Loader2, Pencil, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrendChart, type TrendPoint } from "@/components/dashboard/trend-chart";
import { useLocale } from "@/hooks/use-locale";
import { classifyBP, type BPClassification } from "@/lib/blood-pressure";
import { zonedTimeToUtc, getZonedDateTimeLocalString, CLINIC_TIMEZONE } from "@/lib/clinic-timezone";

export type BPReading = {
  id: string;
  measuredAt: string;
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  notes: string | null;
  recordedBy: { firstName: string; lastName: string } | null;
  // Where the reading came from and what it was for (activity 074, T-14).
  // Older rows have neither; they predate the columns and read as what they
  // were: something a person typed.
  source?: "PATIENT_DEVICE" | "CLINIC_DEVICE" | "MANUAL" | null;
  context?: "PRE_SESSION" | "POST_SESSION" | "HOME" | "OTHER" | null;
};

const T = {
  en: {
    title: "Blood pressure",
    subtitle: "Log a reading before the session — the patient sees this in their own history too. Clinic time (UK).",
    newEntry: "New reading", editEntry: "Edit reading", dateTime: "Date & time", cancel: "Cancel",
    systolic: "Systolic (mmHg)", diastolic: "Diastolic (mmHg)", heartRate: "Heart rate (bpm, optional)",
    notes: "Notes", save: "Save", saving: "Saving…", saved: "Reading saved.",
    history: "History", empty: "No readings yet.", confirmDelete: "Delete this reading?",
    self: "Patient self-reported", recordedBy: "Recorded by",
    origin: "Origin", atHome: "Patient's own device", atClinic: "Clinic device", byHand: "Entered by hand",
    PRE_SESSION: "before the session", POST_SESSION: "after the session", HOME: "at home", OTHER: "",
    numbersOnly: "Use whole numbers only.", networkError: "Network error — nothing was changed. Try again.",
    LOW: "Low", NORMAL: "Normal", ELEVATED: "Elevated", STAGE1: "High (Stage 1)", STAGE2: "High (Stage 2)", CRISIS: "Hypertensive crisis",
    latest: "Latest reading",
  },
  pt: {
    title: "Pressão arterial",
    subtitle: "Registre a medida antes da sessão — a paciente também vê no próprio histórico dela. Horário do Reino Unido.",
    newEntry: "Nova medida", editEntry: "Editar medida", dateTime: "Data e hora", cancel: "Cancelar",
    systolic: "Sistólica (mmHg)", diastolic: "Diastólica (mmHg)", heartRate: "Frequência cardíaca (bpm, opcional)",
    notes: "Observações", save: "Salvar", saving: "Salvando…", saved: "Medida salva.",
    history: "Histórico", empty: "Ainda sem medidas.", confirmDelete: "Excluir esta medida?",
    self: "Autorregistrada pela paciente", recordedBy: "Registrada por",
    origin: "Origem", atHome: "Aparelho do paciente", atClinic: "Aparelho da clínica", byHand: "Digitada",
    PRE_SESSION: "antes da sessão", POST_SESSION: "depois da sessão", HOME: "em casa", OTHER: "",
    numbersOnly: "Use apenas números inteiros.", networkError: "Erro de rede — nada foi alterado. Tente de novo.",
    LOW: "Baixa", NORMAL: "Normal", ELEVATED: "Elevada", STAGE1: "Alta (Estágio 1)", STAGE2: "Alta (Estágio 2)", CRISIS: "Crise hipertensiva",
    latest: "Última medida",
  },
} as const;

const CLASS_COLOR: Record<BPClassification, string> = {
  LOW: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  NORMAL: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  ELEVATED: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  STAGE1: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  STAGE2: "bg-red-500/15 text-red-600 border-red-500/30",
  CRISIS: "bg-red-700/20 text-red-700 border-red-700/40",
};

type FormState = { dateTime: string; systolic: string; diastolic: string; heartRate: string; notes: string };
const emptyForm = (): FormState => ({ dateTime: getZonedDateTimeLocalString(new Date()), systolic: "", diastolic: "", heartRate: "", notes: "" });

function useReadings(patientId: string) {
  const [items, setItems] = useState<BPReading[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/blood-pressure?days=365`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setItems(data.readings || []);
      setError(false);
    } catch {
      setError(true);
      setItems((prev) => prev ?? []);
    }
  }, [patientId]);
  useEffect(() => { load(); }, [load]);
  return { items, error, reload: load };
}

export function BloodPressureTab({ patientId }: { patientId: string }) {
  const { locale } = useLocale();
  const isPt = String(locale).toLowerCase().startsWith("pt");
  const t = T[isPt ? "pt" : "en"];
  const { items, error: loadError, reload } = useReadings(patientId);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; cls?: BPClassification } | null>(null);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const resetForm = () => { setEditingId(null); setForm(emptyForm()); };

  const startEdit = (r: BPReading) => {
    setEditingId(r.id);
    setMsg(null);
    setForm({
      dateTime: getZonedDateTimeLocalString(new Date(r.measuredAt)),
      systolic: String(r.systolic), diastolic: String(r.diastolic),
      heartRate: r.heartRate != null ? String(r.heartRate) : "", notes: r.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const intOrNull = (v: string) => (v.trim() === "" ? null : Number(v.trim()));
    const sys = intOrNull(form.systolic);
    const dia = intOrNull(form.diastolic);
    const hr = intOrNull(form.heartRate);
    if (sys === null || dia === null || !Number.isInteger(sys) || !Number.isInteger(dia) || (hr !== null && !Number.isInteger(hr))) {
      setMsg({ kind: "err", text: t.numbersOnly });
      return;
    }
    const body = {
      systolic: sys, diastolic: dia, heartRate: hr,
      measuredAt: zonedTimeToUtc(form.dateTime.slice(0, 10), form.dateTime.slice(11, 16), CLINIC_TIMEZONE).toISOString(),
      notes: form.notes.trim() || null,
    };
    setSaving(true);
    try {
      const url = `/api/admin/patients/${patientId}/blood-pressure${editingId ? `/${editingId}` : ""}`;
      const res = await fetch(url, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "err", text: data.error || "Error" }); return; }
      setMsg({ kind: "ok", text: t.saved, cls: classifyBP(sys, dia) });
      setEditingId(null);
      setForm(emptyForm());
      await reload();
    } catch {
      setMsg({ kind: "err", text: t.networkError });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/blood-pressure/${id}`, { method: "DELETE" });
      if (res.ok) { if (editingId === id) resetForm(); await reload(); }
      else setMsg({ kind: "err", text: (await res.json().catch(() => ({}))).error || "Error" });
    } catch {
      setMsg({ kind: "err", text: t.networkError });
    }
  }

  const chrono = useMemo(() => [...(items || [])].reverse(), [items]);
  const series = useMemo(() => {
    const pts = (fn: (r: BPReading) => number | null): TrendPoint[] => chrono.map((r) => ({ date: r.measuredAt, value: fn(r) }));
    return { sys: pts((r) => r.systolic), dia: pts((r) => r.diastolic), hr: pts((r) => r.heartRate) };
  }, [chrono]);
  const range = (p: TrendPoint[], floor: number, ceil: number, pad: number) => {
    const v = p.map((x) => x.value).filter((x): x is number => x !== null);
    return { min: Math.min(floor, ...v) - pad, max: Math.max(ceil, ...v) + pad };
  };
  const hasHR = chrono.some((r) => r.heartRate != null);

  const inputCls = "h-8 text-sm";
  const labelCls = "text-[11px] text-muted-foreground mb-0.5 block";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2"><HeartPulse className="h-4 w-4" />{t.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
      </div>

      <form onSubmit={submit} className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{editingId ? t.editEntry : t.newEntry}</span>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={resetForm}><X className="h-3 w-3 mr-1" />{t.cancel}</Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>{t.dateTime}</label>
            <Input type="datetime-local" className={inputCls} value={form.dateTime} max={getZonedDateTimeLocalString(new Date())} onChange={set("dateTime")} required />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          <div><label className={labelCls}>{t.systolic}</label><Input inputMode="numeric" className={inputCls} value={form.systolic} onChange={set("systolic")} required /></div>
          <div><label className={labelCls}>{t.diastolic}</label><Input inputMode="numeric" className={inputCls} value={form.diastolic} onChange={set("diastolic")} required /></div>
          <div><label className={labelCls}>{t.heartRate}</label><Input inputMode="numeric" className={inputCls} value={form.heartRate} onChange={set("heartRate")} /></div>
        </div>

        <div>
          <label className={labelCls}>{t.notes}</label>
          <Textarea rows={2} className="text-sm" value={form.notes} onChange={set("notes")} maxLength={2000} />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            {saving ? t.saving : t.save}
          </Button>
          {msg && (
            <span role="status" className={`text-xs ${msg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>
              {msg.text}
              {msg.cls && (
                <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${CLASS_COLOR[msg.cls]}`}>
                  {t[msg.cls]}
                </span>
              )}
            </span>
          )}
        </div>
      </form>

      {loadError && <p className="text-xs text-red-600">{t.networkError}</p>}

      {items === null ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.empty}</p>
      ) : (
        <>
          <div className={`grid gap-3 sm:grid-cols-2 ${hasHR ? "lg:grid-cols-3" : ""}`}>
            <TrendChart points={series.sys} label={isPt ? "Sistólica" : "Systolic"} unit=" mmHg" {...range(series.sys, 90, 140, 10)} higherIsBetter={false} color="#dc2626" isPt={isPt} />
            <TrendChart points={series.dia} label={isPt ? "Diastólica" : "Diastolic"} unit=" mmHg" {...range(series.dia, 60, 90, 10)} higherIsBetter={false} color="#ea580c" isPt={isPt} />
            {hasHR && <TrendChart points={series.hr} label={isPt ? "FC" : "Heart rate"} unit=" bpm" {...range(series.hr, 50, 100, 10)} higherIsBetter={false} color="#2563eb" isPt={isPt} />}
          </div>

          <div>
            <h4 className="text-xs font-semibold mb-1">{t.history}</h4>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">{t.dateTime}</th>
                    <th className="p-2 text-left">mmHg</th>
                    <th className="p-2 text-left" />
                    <th className="p-2 text-left">{isPt ? "FC" : "HR"}</th>
                    <th className="p-2 text-left">{t.origin}</th>
                    <th className="p-2 text-left">{t.recordedBy}</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const cls = classifyBP(r.systolic, r.diastolic);
                    return (
                      <tr key={r.id} className="border-t align-top">
                        <td className="p-2 whitespace-nowrap">{new Intl.DateTimeFormat(isPt ? "pt-BR" : "en-GB", { timeZone: CLINIC_TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(r.measuredAt))}</td>
                        <td className="p-2 font-medium whitespace-nowrap">{r.systolic} / {r.diastolic}</td>
                        <td className="p-2 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${CLASS_COLOR[cls]}`}>{t[cls]}</span>
                        </td>
                        <td className="p-2">{r.heartRate ?? "—"}</td>
                        {/* Home and clinic readings sit in one list; without
                            this the therapist cannot tell a measurement taken
                            on the reception cuff from one the patient took on
                            a Sunday morning. */}
                        <td className="p-2 whitespace-nowrap">
                          <span className="text-muted-foreground">
                            {r.source === "CLINIC_DEVICE" ? t.atClinic : r.source === "PATIENT_DEVICE" ? t.atHome : t.byHand}
                          </span>
                          {r.context && t[r.context] ? (
                            <div className="text-[10px] text-muted-foreground">{t[r.context]}</div>
                          ) : null}
                        </td>
                        <td className="p-2 whitespace-nowrap">{r.recordedBy ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}` : <span className="text-muted-foreground">{t.self}</span>}
                          {r.notes && <div className="text-muted-foreground whitespace-normal max-w-[16rem] mt-0.5">{r.notes}</div>}
                        </td>
                        <td className="p-2 whitespace-nowrap text-right">
                          <button type="button" aria-label="edit" className="p-1 hover:text-primary" onClick={() => startEdit(r)}><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label="delete" className="p-1 hover:text-red-600" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
