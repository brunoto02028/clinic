"use client";

// Post-operative limb measurements (activity 67): thigh circumference on both
// sides at two fixed sites + knee ROM of the operated leg, logged over time and
// stamped by the server with the protocol week. Clinician-internal — never
// shown to the patient.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Trash2, Ruler, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrendChart, type TrendPoint } from "@/components/dashboard/trend-chart";
import { useLocale } from "@/hooks/use-locale";

export type LimbMeasurement = {
  id: string;
  measuredAt: string;
  operatedSide: "LEFT" | "RIGHT";
  protocolWeek: number | null;
  vmoDistanceCm: number | null;
  midThighDistanceCm: number | null;
  vmoLeftCm: number | null;
  vmoRightCm: number | null;
  midThighLeftCm: number | null;
  midThighRightCm: number | null;
  romMode: "ACTIVE" | "PASSIVE" | null;
  flexionDeg: number | null;
  extensionDeg: number | null;
  notes: string | null;
};

const T = {
  en: {
    title: "Post-op measurements",
    subtitle: "Thigh circumference (both sides) and knee range of motion of the operated leg. Saved with the protocol week. Clinician-internal.",
    newEntry: "New measurement", editEntry: "Edit measurement", date: "Date", operated: "Operated leg",
    left: "Left", right: "Right", vmo: "Vastus medialis (VMO)", midThigh: "Mid-thigh (rectus femoris)",
    dist: "Distance above patella (cm)", girthL: "Left (cm)", girthR: "Right (cm)",
    rom: "Knee range of motion — operated leg", mode: "Type", active: "Active", passive: "Passive",
    flexion: "Flexion (°)", extension: "Extension (°)", extHint: "Negative = cannot fully extend (deficit)",
    notes: "Notes", save: "Save", saving: "Saving…", cancel: "Cancel", saved: "Measurement saved.",
    history: "History", empty: "No measurements yet.", week: "Wk", diff: "Δ operated − other",
    confirmDelete: "Delete this measurement?", chooseSide: "Choose the operated leg.",
    gapVmo: "VMO — operated vs other", gapMid: "Mid-thigh — operated vs other", flexChart: "Flexion", extChart: "Extension",
    latest: "Latest", noProtocol: "no protocol week", loadError: "Could not load measurements.",
    numbersOnly: "Use numbers only (e.g. 38.5).", networkError: "Network error — nothing was changed. Try again.",
  },
  pt: {
    title: "Medidas do pós-operatório",
    subtitle: "Circunferência das duas coxas e ADM do joelho da perna operada. Salvo com a semana do protocolo. Uso interno da clínica.",
    newEntry: "Nova medida", editEntry: "Editar medida", date: "Data", operated: "Perna operada",
    left: "Esquerda", right: "Direita", vmo: "Vasto medial (VMO)", midThigh: "Meio de coxa (reto femoral)",
    dist: "Distância acima da patela (cm)", girthL: "Esquerda (cm)", girthR: "Direita (cm)",
    rom: "ADM do joelho — perna operada", mode: "Tipo", active: "Ativa", passive: "Passiva",
    flexion: "Flexão (°)", extension: "Extensão (°)", extHint: "Negativo = não estende totalmente (déficit)",
    notes: "Observações", save: "Salvar", saving: "Salvando…", cancel: "Cancelar", saved: "Medida salva.",
    history: "Histórico", empty: "Ainda sem medidas.", week: "Sem", diff: "Δ operada − outra",
    confirmDelete: "Excluir esta medida?", chooseSide: "Escolha a perna operada.",
    gapVmo: "VMO — operada vs outra", gapMid: "Meio de coxa — operada vs outra", flexChart: "Flexão", extChart: "Extensão",
    latest: "Última", noProtocol: "sem semana de protocolo", loadError: "Não foi possível carregar as medidas.",
    numbersOnly: "Use apenas números (ex.: 38,5).", networkError: "Erro de rede — nada foi alterado. Tente de novo.",
  },
} as const;

type FormState = {
  date: string; operatedSide: "" | "LEFT" | "RIGHT";
  vmoDistanceCm: string; vmoLeftCm: string; vmoRightCm: string;
  midThighDistanceCm: string; midThighLeftCm: string; midThighRightCm: string;
  romMode: "" | "ACTIVE" | "PASSIVE"; flexionDeg: string; extensionDeg: string; notes: string;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyForm = (side: FormState["operatedSide"] = ""): FormState => ({
  date: todayStr(), operatedSide: side,
  vmoDistanceCm: "", vmoLeftCm: "", vmoRightCm: "",
  midThighDistanceCm: "", midThighLeftCm: "", midThighRightCm: "",
  romMode: "ACTIVE", flexionDeg: "", extensionDeg: "", notes: "",
});

const s = (v: number | null | undefined) => (v == null ? "" : String(v));
const dateOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Operated minus non-operated, rounded to 0.1 cm; null when either side is missing.
export function thighGap(m: LimbMeasurement, site: "vmo" | "mid"): number | null {
  const left = site === "vmo" ? m.vmoLeftCm : m.midThighLeftCm;
  const right = site === "vmo" ? m.vmoRightCm : m.midThighRightCm;
  if (left == null || right == null) return null;
  const gap = m.operatedSide === "LEFT" ? left - right : right - left;
  // Symmetric rounding: Math.round alone turns -1.75 into -1.7.
  return (Math.sign(gap) * Math.round(Math.abs(gap) * 10)) / 10;
}

const fmtGap = (g: number | null) => (g == null ? "—" : `${g > 0 ? "+" : ""}${g}`);

function useMeasurements(patientId: string) {
  const [items, setItems] = useState<LimbMeasurement[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/measurements`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setItems(data.measurements || []);
      setError(false);
    } catch {
      setError(true);
      setItems((prev) => prev ?? []);
    }
  }, [patientId]);
  useEffect(() => { load(); }, [load]);
  return { items, error, reload: load };
}

export function LimbMeasurementsTab({ patientId }: { patientId: string }) {
  const { locale } = useLocale();
  const isPt = String(locale).toLowerCase().startsWith("pt");
  const t = T[isPt ? "pt" : "en"];
  const { items, error: loadError, reload } = useMeasurements(patientId);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [sidePrefilled, setSidePrefilled] = useState(false);

  // Pre-fill the operated leg from the latest record, once.
  useEffect(() => {
    if (items && items.length && !sidePrefilled && !editingId) {
      setForm((f) => (f.operatedSide ? f : { ...f, operatedSide: items[0].operatedSide }));
      setSidePrefilled(true);
    }
  }, [items, sidePrefilled, editingId]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm(items?.[0]?.operatedSide ?? ""));
  };

  const startEdit = (m: LimbMeasurement) => {
    setEditingId(m.id);
    setMsg(null);
    setForm({
      date: dateOf(m.measuredAt), operatedSide: m.operatedSide,
      vmoDistanceCm: s(m.vmoDistanceCm), vmoLeftCm: s(m.vmoLeftCm), vmoRightCm: s(m.vmoRightCm),
      midThighDistanceCm: s(m.midThighDistanceCm), midThighLeftCm: s(m.midThighLeftCm), midThighRightCm: s(m.midThighRightCm),
      romMode: m.romMode ?? "ACTIVE", flexionDeg: s(m.flexionDeg), extensionDeg: s(m.extensionDeg), notes: m.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!form.operatedSide) { setMsg({ kind: "err", text: t.chooseSide }); return; }
    // Blank fields are sent as null on edit so a cleared box really clears the value.
    const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v.trim().replace(",", ".")));
    // "38cm" would become NaN → null and be dropped silently; refuse instead.
    const numericFields = [form.vmoDistanceCm, form.vmoLeftCm, form.vmoRightCm, form.midThighDistanceCm, form.midThighLeftCm, form.midThighRightCm, form.flexionDeg, form.extensionDeg];
    if (numericFields.some((v) => v.trim() !== "" && !Number.isFinite(numOrNull(v)))) { setMsg({ kind: "err", text: t.numbersOnly }); return; }
    const body = {
      operatedSide: form.operatedSide,
      measuredAt: `${form.date}T12:00:00`,
      vmoDistanceCm: numOrNull(form.vmoDistanceCm), vmoLeftCm: numOrNull(form.vmoLeftCm), vmoRightCm: numOrNull(form.vmoRightCm),
      midThighDistanceCm: numOrNull(form.midThighDistanceCm), midThighLeftCm: numOrNull(form.midThighLeftCm), midThighRightCm: numOrNull(form.midThighRightCm),
      romMode: form.romMode || null, flexionDeg: numOrNull(form.flexionDeg), extensionDeg: numOrNull(form.extensionDeg),
      notes: form.notes.trim() || null,
    };
    setSaving(true);
    try {
      const url = `/api/admin/patients/${patientId}/measurements${editingId ? `/${editingId}` : ""}`;
      const res = await fetch(url, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "err", text: data.error || "Error" }); return; }
      setMsg({ kind: "ok", text: t.saved });
      setEditingId(null);
      setForm(emptyForm(form.operatedSide));
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
      const res = await fetch(`/api/admin/patients/${patientId}/measurements/${id}`, { method: "DELETE" });
      if (res.ok) { if (editingId === id) resetForm(); await reload(); }
      else setMsg({ kind: "err", text: (await res.json().catch(() => ({}))).error || "Error" });
    } catch {
      setMsg({ kind: "err", text: t.networkError });
    }
  }

  // Charts read oldest → newest.
  const chrono = useMemo(() => [...(items || [])].reverse(), [items]);
  const series = useMemo(() => {
    const pts = (fn: (m: LimbMeasurement) => number | null): TrendPoint[] => chrono.map((m) => ({ date: m.measuredAt, value: fn(m) }));
    return {
      vmo: pts((m) => thighGap(m, "vmo")),
      mid: pts((m) => thighGap(m, "mid")),
      flex: pts((m) => m.flexionDeg),
      ext: pts((m) => m.extensionDeg),
    };
  }, [chrono]);
  const range = (p: TrendPoint[], floor: number, ceil: number, pad: number) => {
    const v = p.map((x) => x.value).filter((x): x is number => x !== null);
    return { min: Math.min(floor, ...v) - pad, max: Math.max(ceil, ...v) + pad };
  };

  const inputCls = "h-8 text-sm";
  const labelCls = "text-[11px] text-muted-foreground mb-0.5 block";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2"><Ruler className="h-4 w-4" />{t.title}</h3>
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
          <div>
            <label className={labelCls}>{t.date}</label>
            <Input type="date" className={inputCls} value={form.date} max={todayStr()} onChange={set("date")} required />
          </div>
          <div>
            <label className={labelCls}>{t.operated}</label>
            <select className="h-8 w-full rounded-md border bg-background px-2 text-sm" value={form.operatedSide} onChange={set("operatedSide")} required>
              <option value="">—</option>
              <option value="LEFT">{t.left}</option>
              <option value="RIGHT">{t.right}</option>
            </select>
          </div>
        </div>

        {([["vmo", t.vmo], ["midThigh", t.midThigh]] as const).map(([site, label]) => {
          const k = (suffix: "DistanceCm" | "LeftCm" | "RightCm") => `${site}${suffix}` as keyof FormState;
          return (
            <div key={site}>
              <div className="text-xs font-medium mb-1">{label}</div>
              <div className="grid grid-cols-3 gap-3 sm:max-w-md">
                <div><label className={labelCls}>{t.dist}</label><Input inputMode="decimal" className={inputCls} value={form[k("DistanceCm")]} onChange={set(k("DistanceCm"))} /></div>
                <div><label className={labelCls}>{t.girthL}</label><Input inputMode="decimal" className={inputCls} value={form[k("LeftCm")]} onChange={set(k("LeftCm"))} /></div>
                <div><label className={labelCls}>{t.girthR}</label><Input inputMode="decimal" className={inputCls} value={form[k("RightCm")]} onChange={set(k("RightCm"))} /></div>
              </div>
            </div>
          );
        })}

        <div>
          <div className="text-xs font-medium mb-1">{t.rom}</div>
          <div className="grid grid-cols-3 gap-3 sm:max-w-md">
            <div>
              <label className={labelCls}>{t.mode}</label>
              <select className="h-8 w-full rounded-md border bg-background px-2 text-sm" value={form.romMode} onChange={set("romMode")}>
                <option value="ACTIVE">{t.active}</option>
                <option value="PASSIVE">{t.passive}</option>
              </select>
            </div>
            <div><label className={labelCls}>{t.flexion}</label><Input inputMode="numeric" className={inputCls} value={form.flexionDeg} onChange={set("flexionDeg")} /></div>
            <div><label className={labelCls}>{t.extension}</label><Input inputMode="numeric" className={inputCls} value={form.extensionDeg} onChange={set("extensionDeg")} /></div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{t.extHint}</p>
        </div>

        <div>
          <label className={labelCls}>{t.notes}</label>
          <Textarea rows={2} className="text-sm" value={form.notes} onChange={set("notes")} maxLength={2000} />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            {saving ? t.saving : t.save}
          </Button>
          {msg && <span role="status" className={`text-xs ${msg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>}
        </div>
      </form>

      {loadError && <p className="text-xs text-red-600">{t.loadError}</p>}

      {items === null ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.empty}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <TrendChart points={series.vmo} label={t.gapVmo} unit=" cm" {...range(series.vmo, 0, 0, 1)} higherIsBetter color="#4F7361" isPt={isPt} />
            <TrendChart points={series.mid} label={t.gapMid} unit=" cm" {...range(series.mid, 0, 0, 1)} higherIsBetter color="#4F7361" isPt={isPt} />
            <TrendChart points={series.flex} label={t.flexChart} unit="°" {...range(series.flex, 0, 140, 5)} higherIsBetter color="#2563eb" isPt={isPt} />
            <TrendChart points={series.ext} label={t.extChart} unit="°" {...range(series.ext, -5, 0, 3)} higherIsBetter color="#d97706" isPt={isPt} />
          </div>

          <div>
            <h4 className="text-xs font-semibold mb-1">{t.history}</h4>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">{t.date}</th>
                    <th className="p-2 text-left">{t.week}</th>
                    <th className="p-2 text-left">{t.operated}</th>
                    <th className="p-2 text-left">VMO L / R</th>
                    <th className="p-2 text-left">{t.diff}</th>
                    <th className="p-2 text-left">{isPt ? "Meio coxa" : "Mid-thigh"} L / R</th>
                    <th className="p-2 text-left">{t.diff}</th>
                    <th className="p-2 text-left">Flex / Ext</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => {
                    const op = m.operatedSide;
                    const cell = (l: number | null, r: number | null) => (
                      <span>
                        <span className={op === "LEFT" ? "font-semibold" : ""}>{l ?? "—"}</span>
                        {" / "}
                        <span className={op === "RIGHT" ? "font-semibold" : ""}>{r ?? "—"}</span>
                      </span>
                    );
                    return (
                      <tr key={m.id} className="border-t align-top">
                        <td className="p-2 whitespace-nowrap">{new Date(m.measuredAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}</td>
                        <td className="p-2">{m.protocolWeek ?? "—"}</td>
                        <td className="p-2">{op === "LEFT" ? t.left : t.right}</td>
                        <td className="p-2 whitespace-nowrap">{cell(m.vmoLeftCm, m.vmoRightCm)}{m.vmoDistanceCm != null && <span className="text-muted-foreground"> @{m.vmoDistanceCm}</span>}</td>
                        <td className="p-2 font-medium">{fmtGap(thighGap(m, "vmo"))}</td>
                        <td className="p-2 whitespace-nowrap">{cell(m.midThighLeftCm, m.midThighRightCm)}{m.midThighDistanceCm != null && <span className="text-muted-foreground"> @{m.midThighDistanceCm}</span>}</td>
                        <td className="p-2 font-medium">{fmtGap(thighGap(m, "mid"))}</td>
                        <td className="p-2 whitespace-nowrap">
                          {m.flexionDeg != null ? `${m.flexionDeg}°` : "—"} / {m.extensionDeg != null ? `${m.extensionDeg}°` : "—"}
                          {m.romMode && (m.flexionDeg != null || m.extensionDeg != null) && <span className="text-muted-foreground"> ({m.romMode === "ACTIVE" ? t.active : t.passive})</span>}
                          {m.notes && <div className="text-muted-foreground whitespace-normal max-w-[16rem] mt-0.5">{m.notes}</div>}
                        </td>
                        <td className="p-2 whitespace-nowrap text-right">
                          <button type="button" aria-label="edit" className="p-1 hover:text-primary" onClick={() => startEdit(m)}><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label="delete" className="p-1 hover:text-red-600" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{isPt ? "Negrito = perna operada. @N = distância acima da patela (cm)." : "Bold = operated leg. @N = distance above patella (cm)."}</p>
          </div>
        </>
      )}
    </div>
  );
}

// Compact card for the protocol tab: latest measurement + shortcut to the tab.
export function LimbMeasurementsShortcut({ patientId, onOpen }: { patientId: string; onOpen: () => void }) {
  const { locale } = useLocale();
  const isPt = String(locale).toLowerCase().startsWith("pt");
  const t = T[isPt ? "pt" : "en"];
  const { items } = useMeasurements(patientId);
  if (items === null) return null;
  const m = items[0];
  const vmo = m ? thighGap(m, "vmo") : null;
  const mid = m ? thighGap(m, "mid") : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition-colors"
      data-testid="measurements-shortcut"
    >
      <div className="flex items-center gap-2 text-xs font-semibold"><Ruler className="h-3.5 w-3.5" />{t.title}</div>
      {m ? (
        <p className="text-xs text-muted-foreground mt-1">
          {t.latest}: {new Date(m.measuredAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB")} · {m.protocolWeek != null ? `${t.week} ${m.protocolWeek}` : t.noProtocol}
          {" · "}VMO Δ {fmtGap(vmo)} cm · {isPt ? "Meio coxa" : "Mid-thigh"} Δ {fmtGap(mid)} cm · {m.flexionDeg != null ? `${m.flexionDeg}°` : "—"} / {m.extensionDeg != null ? `${m.extensionDeg}°` : "—"}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">{t.empty}</p>
      )}
    </button>
  );
}
