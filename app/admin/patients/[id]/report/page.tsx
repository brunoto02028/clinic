"use client";

/**
 * Everything the clinic recorded about one patient, on one page.
 *
 * The data was never missing — screening, protocol, exercise logs, check-ins,
 * blood pressure, outcome measures, appointments, notes and wearable readings
 * all sit in the database keyed to the patient, each with its own screen. What
 * was missing is the single view a therapist wants before a consultation.
 *
 * It aggregates; it does not interpret (decision D3 of activity 074, and a hard
 * rule since the commercial plan: a product that diagnoses or recommends
 * treatment can be classified as a medical device by the MHRA). Every number
 * here is something a person or a device recorded. No trend is named, no score
 * is invented. Where a threshold is drawn, it is the clinic's own — the one
 * from T-3 — and it is named, not implied.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Loader2, CloudOff, HeartPulse, Dumbbell, ClipboardList,
  CalendarDays, Stethoscope, Watch, TriangleAlert, FileText, Activity, Download,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UI = {
  "en-GB": {
    back: "Back to patient",
    title: "Patient report",
    subtitle: "Everything recorded in the period, in one place. It reports; it does not interpret.",
    loading: "Building the report…",
    failed: "We could not build the report.",
    failedHint: "This does not mean there is no data — the request failed.",
    retry: "Try again",
    refresh: "Refresh",
    pdf: "Download PDF",
    period: "Period", from: "From", to: "To", apply: "Apply",
    last: (n: number) => `Last ${n} days`,
    nothing: "Nothing was recorded for this patient in this period.",
    nothingHint: "Try a longer period, or check that the patient has been using the app.",
    summary: "In this period",
    exerciseDays: "Days with exercise logged in the app",
    checkIns: "Check-ins",
    bpReadings: "Blood pressure readings",
    aboveThreshold: (s: number, d: number) => `At or above ${s}/${d}, this clinic's alert threshold`,
    appointments: "Appointments",
    notes: "Clinical notes",
    wearableDays: "Days with wearable data",
    ofDays: (n: number) => `of ${n} days`,
    bp: "Blood pressure",
    bpNone: "No reading in this period.",
    bpOne: "One reading in this period — a chart needs two.",
    systolic: "Systolic", diastolic: "Diastolic", pulse: "Pulse",
    alertLine: "Alert threshold",
    adherence: "Exercise",
    adherenceNone: "No exercise logged in this period.",
    perWeek: "Items completed per week",
    week: "Week",
    checkInsTitle: "Daily check-ins",
    checkInsNone: "No check-in in this period.",
    pain: "Pain (0–10)", mood: "Mood (1–5)", energy: "Energy", sleepQ: "Sleep quality",
    outcomes: "Outcome measures",
    outcomesNone: "No outcome measure recorded in this period.",
    date: "Date", vas: "VAS", faamAdl: "FAAM ADL", faamSport: "FAAM Sport", fn: "Overall function",
    apps: "Appointments",
    appsNone: "No appointment in this period.",
    notesTitle: "Clinical notes",
    notesNone: "No clinical note in this period.",
    protocols: "Treatment protocols",
    protocolsNone: "No protocol sent to this patient.",
    ofRecord: "Current record — not limited to the period",
    items: "items", completed: "completed",
    weeks: "weeks", perWeekSessions: "sessions/week",
    screening: "Medical screening",
    screeningNone: "This patient has not filled in the screening.",
    complaint: "Chief complaint", painScore: "Pain score", redFlags: "Red flags",
    noRedFlags: "None flagged.",
    wearable: "Wearable data",
    wearableNone: "No wearable data in this period.",
    avg: "average in the period",
    steps: "Steps", sleep: "Sleep", restingHr: "Resting heart rate", hrv: "HRV", spo2: "SpO₂",
    providers: "Sources",
    notInterpreted: "This page reports what was recorded. It draws no conclusion and makes no diagnosis.",
    therapist: "Therapist",
  },
  "pt-BR": {
    back: "Voltar ao paciente",
    title: "Relatório do paciente",
    subtitle: "Tudo que foi registrado no período, num lugar só. Ele relata; não interpreta.",
    loading: "Montando o relatório…",
    failed: "Não foi possível montar o relatório.",
    failedHint: "Isto não quer dizer que não há dado — a consulta falhou.",
    retry: "Tentar de novo",
    refresh: "Atualizar",
    pdf: "Baixar PDF",
    period: "Período", from: "De", to: "Até", apply: "Aplicar",
    last: (n: number) => `Últimos ${n} dias`,
    nothing: "Nada foi registrado para este paciente neste período.",
    nothingHint: "Tente um período maior, ou confira se o paciente está usando o app.",
    summary: "No período",
    exerciseDays: "Dias com exercício registrado no app",
    checkIns: "Check-ins",
    bpReadings: "Leituras de pressão",
    aboveThreshold: (s: number, d: number) => `Em ou acima de ${s}/${d}, o limiar de alerta desta clínica`,
    appointments: "Consultas",
    notes: "Notas clínicas",
    wearableDays: "Dias com dado de wearable",
    ofDays: (n: number) => `de ${n} dias`,
    bp: "Pressão arterial",
    bpNone: "Nenhuma leitura neste período.",
    bpOne: "Uma leitura neste período — um gráfico precisa de duas.",
    systolic: "Sistólica", diastolic: "Diastólica", pulse: "Pulso",
    alertLine: "Limiar de alerta",
    adherence: "Exercícios",
    adherenceNone: "Nenhum exercício registrado neste período.",
    perWeek: "Itens concluídos por semana",
    week: "Semana",
    checkInsTitle: "Check-ins diários",
    checkInsNone: "Nenhum check-in neste período.",
    pain: "Dor (0–10)", mood: "Humor (1–5)", energy: "Energia", sleepQ: "Qualidade do sono",
    outcomes: "Medidas de evolução",
    outcomesNone: "Nenhuma medida de evolução registrada neste período.",
    date: "Data", vas: "EVA", faamAdl: "FAAM AVD", faamSport: "FAAM Esporte", fn: "Função geral",
    apps: "Consultas",
    appsNone: "Nenhuma consulta neste período.",
    notesTitle: "Notas clínicas",
    notesNone: "Nenhuma nota clínica neste período.",
    protocols: "Protocolos de tratamento",
    protocolsNone: "Nenhum protocolo enviado a este paciente.",
    ofRecord: "Registro atual — não recortado pelo período",
    items: "itens", completed: "concluídos",
    weeks: "semanas", perWeekSessions: "sessões/semana",
    screening: "Triagem",
    screeningNone: "Este paciente não preencheu a triagem.",
    complaint: "Queixa principal", painScore: "Nota da dor", redFlags: "Sinais de alerta",
    noRedFlags: "Nenhum marcado.",
    wearable: "Dados de wearable",
    wearableNone: "Nenhum dado de wearable neste período.",
    avg: "média no período",
    steps: "Passos", sleep: "Sono", restingHr: "FC de repouso", hrv: "VFC", spo2: "SpO₂",
    providers: "Fontes",
    notInterpreted: "Esta página relata o que foi registrado. Não tira conclusão nem faz diagnóstico.",
    therapist: "Terapeuta",
  },
} as const;

const RED_FLAG_LABELS: Record<string, { en: string; pt: string }> = {
  unexplainedWeightLoss: { en: "Unexplained weight loss", pt: "Perda de peso inexplicada" },
  nightPain: { en: "Night pain", pt: "Dor noturna" },
  traumaHistory: { en: "Trauma history", pt: "Histórico de trauma" },
  neurologicalSymptoms: { en: "Neurological symptoms", pt: "Sintomas neurológicos" },
  bladderBowelDysfunction: { en: "Bladder/bowel dysfunction", pt: "Disfunção vesical/intestinal" },
  recentInfection: { en: "Recent infection", pt: "Infecção recente" },
  cancerHistory: { en: "Cancer history", pt: "Histórico de câncer" },
  steroidUse: { en: "Steroid use", pt: "Uso de corticoide" },
  osteoporosisRisk: { en: "Osteoporosis risk", pt: "Risco de osteoporose" },
  cardiovascularSymptoms: { en: "Cardiovascular symptoms", pt: "Sintomas cardiovasculares" },
  severeHeadache: { en: "Severe headache", pt: "Dor de cabeça intensa" },
  dizzinessBalanceIssues: { en: "Dizziness / balance", pt: "Tontura / equilíbrio" },
};

interface Report {
  patient: any;
  period: { from: string; to: string; days: number };
  thresholds: { alertSystolic: number; alertDiastolic: number; crisisSystolic: number; crisisDiastolic: number };
  summary: Record<string, number>;
  screening: any | null;
  protocols: any[];
  prescriptions: any[];
  completions: any[];
  checkIns: any[];
  bloodPressure: any[];
  outcomes: any[];
  appointments: any[];
  notes: any[];
  wearable: any[];
}

const iso = (d: Date) => d.toISOString().split("T")[0];

/** Monday of the week a date falls in, so weekly buckets line up. */
function weekKey(value: string | Date): string {
  const d = new Date(value);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return iso(d);
}

function average(values: number[]): number | null {
  const usable = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (!usable.length) return null;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold" style={{ color: entry.color }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function Section({
  icon: Icon, title, empty, children,
}: { icon: any; title: string; empty?: string | null; children?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
      </CardContent>
    </Card>
  );
}

export default function PatientReportPage() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id as string;
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const ui = UI[isPt ? "pt-BR" : "en-GB"];
  const dateFmt = isPt ? "pt-BR" : "en-GB";

  const [days, setDays] = useState(90);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (range?: { from: string; to: string }) => {
      setLoading(true);
      setFailed(false);
      try {
        const qs = range?.from && range?.to
          ? `?from=${range.from}&to=${range.to}`
          : `?from=${iso(new Date(Date.now() - days * 86_400_000))}&to=${iso(new Date())}`;
        const res = await fetch(`/api/admin/patients/${patientId}/report/data${qs}`);
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        // A malformed answer is not an empty report. Treating it as one would
        // print "nothing was recorded" over a patient who has a year of data.
        if (!json?.patient || !Array.isArray(json?.bloodPressure)) throw new Error("malformed");
        setData(json);
      } catch {
        setData(null);
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [patientId, days]
  );

  useEffect(() => {
    if (patientId) load();
  }, [patientId, load]);

  const bpSeries = useMemo(
    () =>
      (data?.bloodPressure ?? []).map((r: any) => ({
        label: new Date(r.measuredAt).toLocaleDateString(dateFmt, { day: "2-digit", month: "short" }),
        systolic: r.systolic,
        diastolic: r.diastolic,
        pulse: r.heartRate ?? null,
      })),
    [data, dateFmt]
  );

  const weekly = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const c of data?.completions ?? []) {
      const key = weekKey(c.completedDate);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        label: new Date(key).toLocaleDateString(dateFmt, { day: "2-digit", month: "short" }),
        count,
      }));
  }, [data, dateFmt]);

  const checkInSeries = useMemo(
    () =>
      (data?.checkIns ?? []).map((c: any) => ({
        label: new Date(c.checkinDate).toLocaleDateString(dateFmt, { day: "2-digit", month: "short" }),
        pain: c.painLevel,
        mood: c.moodLevel,
      })),
    [data, dateFmt]
  );

  const wearableStats = useMemo(() => {
    const rows = data?.wearable ?? [];
    if (!rows.length) return null;
    return {
      providers: [...new Set(rows.map((w: any) => w.provider).filter(Boolean))],
      steps: rows.reduce((sum: number, w: any) => sum + (w.steps ?? 0), 0),
      sleep: average(rows.map((w: any) => w.sleepDuration)),
      restingHr: average(rows.map((w: any) => w.restingHr)),
      hrv: average(rows.map((w: any) => w.hrv)),
      spo2: average(rows.map((w: any) => w.spo2)),
    };
  }, [data]);

  const redFlags = useMemo(() => {
    const s = data?.screening;
    if (!s) return [];
    return Object.keys(RED_FLAG_LABELS).filter((k) => s[k] === true);
  }, [data]);

  const isEmpty =
    !!data &&
    !data.screening &&
    !data.protocols.length &&
    !data.completions.length &&
    !data.checkIns.length &&
    !data.bloodPressure.length &&
    !data.outcomes.length &&
    !data.appointments.length &&
    !data.notes.length &&
    !data.wearable.length;

  const patientName = data ? `${data.patient.firstName ?? ""} ${data.patient.lastName ?? ""}`.trim() : "";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link
            href={`/admin/patients/${patientId}`}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />{ui.back}
          </Link>
          <h1 className="text-xl font-bold mt-1">{ui.title}</h1>
          <p className="text-sm text-muted-foreground">{ui.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* The same period the screen is showing, so the file cannot be of
              another range than the one on screen. It downloads; it sends
              nothing to the patient. */}
          <Button
            variant="outline"
            size="sm"
            disabled={loading || !data}
            onClick={() => {
              if (!data) return;
              const qs = new URLSearchParams({
                from: data.period.from.split("T")[0],
                to: data.period.to.split("T")[0],
                lang: isPt ? "pt-BR" : "en-GB",
              });
              window.open(`/api/admin/patients/${patientId}/report/pdf?${qs}`, "_blank");
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1" />{ui.pdf}
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(from && to ? { from, to } : undefined)} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            {ui.refresh}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex gap-1.5">
            {[30, 90, 180, 365].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={days === n && !from && !to ? "default" : "outline"}
                onClick={() => { setFrom(""); setTo(""); setDays(n); }}
                disabled={loading}
              >
                {ui.last(n)}
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs">{ui.from}</Label>
              <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{ui.to}</Label>
              <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button size="sm" variant="outline" disabled={!from || !to || loading} onClick={() => load({ from, to })}>
              {ui.apply}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />{ui.loading}
        </div>
      )}

      {!loading && failed && (
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <CloudOff className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="font-medium">{ui.failed}</p>
            <p className="text-sm text-muted-foreground">{ui.failedHint}</p>
            <Button size="sm" variant="outline" onClick={() => load(from && to ? { from, to } : undefined)}>{ui.retry}</Button>
          </CardContent>
        </Card>
      )}

      {!loading && data && (
        <>
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {data.patient.email}
                  {data.patient.dateOfBirth
                    ? ` · ${new Date(data.patient.dateOfBirth).toLocaleDateString(dateFmt)}`
                    : ""}
                </p>
              </div>
              <Badge variant="outline">
                {new Date(data.period.from).toLocaleDateString(dateFmt)} — {new Date(data.period.to).toLocaleDateString(dateFmt)}
              </Badge>
            </CardContent>
          </Card>

          {isEmpty ? (
            <Card>
              <CardContent className="p-8 text-center space-y-1">
                <FileText className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="font-medium">{ui.nothing}</p>
                <p className="text-sm text-muted-foreground">{ui.nothingHint}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{ui.summary}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Stat
                    label={ui.exerciseDays}
                    value={String(data.summary.exerciseDaysLogged ?? 0)}
                    hint={ui.ofDays(data.summary.totalDays ?? data.period.days)}
                  />
                  <Stat label={ui.checkIns} value={String(data.summary.checkIns ?? 0)} />
                  <Stat
                    label={ui.bpReadings}
                    value={String(data.summary.bloodPressureReadings ?? 0)}
                    hint={
                      data.summary.bloodPressureReadings
                        ? `${data.summary.bloodPressureAboveThreshold ?? 0} · ${ui.aboveThreshold(data.thresholds.alertSystolic, data.thresholds.alertDiastolic)}`
                        : undefined
                    }
                  />
                  <Stat label={ui.appointments} value={String(data.summary.appointments ?? 0)} />
                  <Stat label={ui.notes} value={String(data.summary.clinicalNotes ?? 0)} />
                  <Stat label={ui.wearableDays} value={String(data.summary.wearableDays ?? 0)} />
                </CardContent>
              </Card>

              <Section icon={HeartPulse} title={ui.bp}>
                {bpSeries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{ui.bpNone}</p>
                ) : bpSeries.length === 1 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{ui.bpOne}</p>
                    <p className="text-lg font-semibold">
                      {bpSeries[0].systolic}/{bpSeries[0].diastolic} mmHg
                      <span className="text-sm font-normal text-muted-foreground ml-2">{bpSeries[0].label}</span>
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={bpSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} domain={[40, "auto"]} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {/* The clinic's own alert threshold, named. A line with no
                          label is read as "normal", which is a conclusion. */}
                      <ReferenceLine
                        y={data.thresholds.alertSystolic}
                        stroke="#dc2626"
                        strokeDasharray="4 4"
                        label={{ value: `${ui.alertLine} ${data.thresholds.alertSystolic}`, position: "insideTopRight", fontSize: 10, fill: "#dc2626" }}
                      />
                      <Line type="monotone" dataKey="systolic" name={ui.systolic} stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="diastolic" name={ui.diastolic} stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="pulse" name={ui.pulse} stroke="#16a34a" strokeWidth={1.5} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Section>

              <Section icon={Dumbbell} title={ui.adherence} empty={weekly.length === 0 ? ui.adherenceNone : null}>
                <p className="text-xs text-muted-foreground mb-2">{ui.perWeek}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name={ui.week} fill="#4F7361" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {data.prescriptions.length > 0 && (
                  <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {data.prescriptions.map((p: any) => (
                      <div key={p.id} className="text-sm flex items-center justify-between border rounded-md px-2.5 py-1.5">
                        <span>{p.exercise?.name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.sets}×{p.reps} · {p.completedCount ?? 0} {ui.completed}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section icon={Activity} title={ui.checkInsTitle} empty={checkInSeries.length === 0 ? ui.checkInsNone : null}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={checkInSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={26} domain={[0, 10]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="pain" name={ui.pain} stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="mood" name={ui.mood} stroke="#4F7361" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Section>

              <Section icon={ClipboardList} title={ui.outcomes} empty={data.outcomes.length === 0 ? ui.outcomesNone : null}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-1.5 pr-3">{ui.date}</th>
                        <th className="py-1.5 pr-3">{ui.vas}</th>
                        <th className="py-1.5 pr-3">{ui.faamAdl}</th>
                        <th className="py-1.5 pr-3">{ui.faamSport}</th>
                        <th className="py-1.5">{ui.fn}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.outcomes.map((o: any) => (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-1.5 pr-3">{new Date(o.recordedAt).toLocaleDateString(dateFmt)}</td>
                          <td className="py-1.5 pr-3">{o.vasScore ?? "—"}</td>
                          <td className="py-1.5 pr-3">{o.faamAdlPercent != null ? `${Math.round(o.faamAdlPercent)}%` : o.faamAdl ?? "—"}</td>
                          <td className="py-1.5 pr-3">{o.faamSportPercent != null ? `${Math.round(o.faamSportPercent)}%` : o.faamSport ?? "—"}</td>
                          <td className="py-1.5">{o.overallFunction ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section icon={CalendarDays} title={ui.apps} empty={data.appointments.length === 0 ? ui.appsNone : null}>
                <div className="space-y-1.5">
                  {data.appointments.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between border rounded-md px-2.5 py-1.5 text-sm">
                      <span>
                        {new Date(a.dateTime).toLocaleString(dateFmt, { dateStyle: "medium", timeStyle: "short" })}
                        <span className="text-muted-foreground ml-2">{a.treatmentType ?? ""}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {a.therapist && (
                          <span className="text-xs text-muted-foreground">
                            {ui.therapist}: {a.therapist.firstName} {a.therapist.lastName}
                          </span>
                        )}
                        <Badge variant="outline" className="text-[11px]">{a.status}</Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={Stethoscope} title={ui.notesTitle} empty={data.notes.length === 0 ? ui.notesNone : null}>
                <div className="space-y-2">
                  {data.notes.map((n: any) => (
                    <details key={n.id} className="border rounded-md px-2.5 py-1.5">
                      <summary className="text-sm cursor-pointer">
                        {new Date(n.createdAt).toLocaleDateString(dateFmt)}
                        {n.therapist && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {n.therapist.firstName} {n.therapist.lastName}
                          </span>
                        )}
                      </summary>
                      <div className="mt-2 grid gap-1.5 text-sm">
                        {[["S", n.subjective], ["O", n.objective], ["A", n.assessment], ["P", n.plan]].map(
                          ([k, v]) => v ? (
                            <p key={String(k)}>
                              <span className="font-semibold mr-1.5">{k}:</span>
                              <span className="text-muted-foreground whitespace-pre-wrap">{String(v)}</span>
                            </p>
                          ) : null
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </Section>

              {/* Protocol and screening are documents, not series: they are
                  the patient's current ones whenever they were written. Under a
                  heading that says "in the period" that reads as a contradiction
                  unless it is said out loud. */}
              <Section icon={FileText} title={`${ui.protocols} · ${ui.ofRecord}`} empty={data.protocols.length === 0 ? ui.protocolsNone : null}>
                <div className="space-y-2">
                  {data.protocols.map((p: any) => {
                    const done = (p.items ?? []).filter((i: any) => i.isCompleted).length;
                    return (
                      <div key={p.id} className="border rounded-md px-3 py-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="font-medium text-sm">{p.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {(p.items ?? []).length} {ui.items} · {done} {ui.completed}
                            {p.estimatedWeeks ? ` · ${p.estimatedWeeks} ${ui.weeks}` : ""}
                            {p.sessionsPerWeek ? ` · ${p.sessionsPerWeek} ${ui.perWeekSessions}` : ""}
                          </span>
                        </div>
                        {p.summary && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{p.summary}</p>}
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section icon={TriangleAlert} title={`${ui.screening} · ${ui.ofRecord}`} empty={!data.screening ? ui.screeningNone : null}>
                {data.screening && (
                  <div className="space-y-2 text-sm">
                    {data.screening.chiefComplaint && (
                      <p><span className="text-muted-foreground">{ui.complaint}: </span>{data.screening.chiefComplaint}</p>
                    )}
                    {data.screening.painScore != null && (
                      <p><span className="text-muted-foreground">{ui.painScore}: </span>{data.screening.painScore}/10</p>
                    )}
                    <div>
                      <p className="text-muted-foreground mb-1">{ui.redFlags}</p>
                      {redFlags.length === 0 ? (
                        <p className="text-muted-foreground">{ui.noRedFlags}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {redFlags.map((k) => (
                            <Badge key={k} variant="destructive" className="text-[11px]">
                              {isPt ? RED_FLAG_LABELS[k].pt : RED_FLAG_LABELS[k].en}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Section>

              <Section icon={Watch} title={ui.wearable} empty={!wearableStats ? ui.wearableNone : null}>
                {wearableStats && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <Stat label={ui.steps} value={wearableStats.steps ? wearableStats.steps.toLocaleString(dateFmt) : "—"} />
                      <Stat
                        label={ui.sleep}
                        value={wearableStats.sleep != null ? `${(wearableStats.sleep / 60).toFixed(1)} h` : "—"}
                        hint={ui.avg}
                      />
                      <Stat
                        label={ui.restingHr}
                        value={wearableStats.restingHr != null ? `${Math.round(wearableStats.restingHr)} bpm` : "—"}
                        hint={ui.avg}
                      />
                      <Stat label={ui.hrv} value={wearableStats.hrv != null ? `${Math.round(wearableStats.hrv)} ms` : "—"} hint={ui.avg} />
                      <Stat label={ui.spo2} value={wearableStats.spo2 != null ? `${Math.round(wearableStats.spo2)}%` : "—"} hint={ui.avg} />
                    </div>
                    {wearableStats.providers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {ui.providers}: {wearableStats.providers.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </Section>

              <p className="text-xs text-muted-foreground text-center pb-4">{ui.notInterpreted}</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
