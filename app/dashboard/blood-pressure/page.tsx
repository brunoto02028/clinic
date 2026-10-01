"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Heart,
  Activity,
  Plus,
  PenLine,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Smartphone,
  Flashlight,
  HelpCircle,
  FileText,
  BarChart3,
  Shield,
  RefreshCw,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";
import { t as i18nT } from "@/lib/i18n";
import ProfessionalReviewBanner from "@/components/dashboard/professional-review-banner";
import { NonEmergencyNotice } from "@/components/patient/non-emergency-notice";
import { QRCameraFallback } from "@/components/ui/qr-camera-fallback";
import { BP_LABELS, BP_GUIDANCE_NOTE, classifyBP as faixaDaLeitura } from "@/lib/blood-pressure";

interface BPReading {
  id: string;
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  method: "MANUAL" | "CAMERA_PPG" | "CLINIC_DEVICE";
  source?: "PATIENT_DEVICE" | "CLINIC_DEVICE" | "MANUAL" | null;
  context?: "PRE_SESSION" | "POST_SESSION" | "HOME" | "OTHER" | null;
  notes: string | null;
  confidence: number | null;
  ppgSignal?: any;
  measuredAt: string;
}

/**
 * Esta tela **nao mede** pressao arterial (115 T-2).
 *
 * Ela tinha a captura por camera inteira aqui dentro: acesso a camera e ao
 * flash, amostragem do sinal, `analyzePPGSignal`, forma de onda "tipo ECG",
 * deteccao de arritmia e metricas de VFC — mil e duzentas linhas, e todas
 * derivadas do mesmo sinal optico.
 *
 * O Bruno, 30/09/2026: *"nao vamos ter medidor de pressao por camera. Isso
 * dai nao e um dado preciso e eu tenho que trabalhar com dados precisos."* A
 * decisao ja estava na atividade 006 — *"e screening, nao medicao"* — e tinha
 * sido aplicada so ao app, que por isso nunca teve camera.
 *
 * A estimativa de pressao, a analise de ritmo e a VFC sairam **juntas**,
 * porque nenhuma tinha outra fonte. A tela ficou com o que ela de facto faz:
 * mostrar o historico e aceitar uma leitura de um aparelho de verdade.
 */

/**
 * A cor, o icone e a gravidade — o **nome e os limiares vem da lib**.
 *
 * Esta funcao tinha os limiares escritos aqui dentro. Eram os mesmos da lib, e
 * por isso ninguem notava; foi assim que o painel comecou tambem, ate discordar
 * em tres leituras. O QA de hoje achou um terceiro classificador no alerta, com
 * a mesma origem: uma copia que ninguem chamou de copia.
 *
 * O que e desta tela fica aqui — cor e icone sao do desenho, nao do vocabulario.
 */
const APARENCIA_DA_FAIXA = {
  CRISIS: { color: "text-ba1-bad bg-ba1-bad/15 border-ba1-bad/30", icon: AlertTriangle, severity: 5 },
  STAGE2: { color: "text-ba1-bad bg-ba1-bad/10 border-ba1-bad/20", icon: AlertTriangle, severity: 4 },
  STAGE1: { color: "text-ba1-warn bg-ba1-warn/10 border-ba1-warn/20", icon: AlertTriangle, severity: 3 },
  ELEVATED: { color: "text-ba1-warn bg-ba1-warn/10 border-ba1-warn/20", icon: TrendingUp, severity: 2 },
  LOW: { color: "text-ba1-health bg-ba1-health/10 border-ba1-health/20", icon: TrendingDown, severity: 1 },
  NORMAL: { color: "text-ba1-ok bg-ba1-ok/10 border-ba1-ok/20", icon: CheckCircle, severity: 0 },
} as const;

function classifyBP(sys: number, dia: number): { labelEn: string; labelPt: string; color: string; icon: any; severity: number } {
  const faixa = faixaDaLeitura(sys, dia);
  return { labelEn: BP_LABELS[faixa].en, labelPt: BP_LABELS[faixa].pt, ...APARENCIA_DA_FAIXA[faixa] };
}

export default function BloodPressurePage() {
  const { toast } = useToast();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const T = (key: string) => i18nT(key, locale);
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [lastBP, setLastBP] = useState<{ sys: number; dia: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState(30);
  const [bpReminder, setBpReminder] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  const [manualSys, setManualSys] = useState("");
  const [manualDia, setManualDia] = useState("");
  const [manualHR, setManualHR] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const fetchReadings = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient/blood-pressure?days=${days}`);
      const data = await res.json();
      setReadings(data.readings || []);
    } catch {
      console.error("Failed to fetch readings");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchReadings();
    // Fetch reminder preference
    fetch("/api/patient/bp-reminder").then(r => r.json()).then(d => setBpReminder(!!d.enabled)).catch(() => {});
  }, [fetchReadings]);

  const toggleReminder = async () => {
    setReminderLoading(true);
    try {
      const res = await fetch("/api/patient/bp-reminder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !bpReminder }),
      });
      if (res.ok) {
        setBpReminder(!bpReminder);
        toast({ title: !bpReminder ? T("bp.reminderOn") : T("bp.reminderOff") });
      }
    } catch {} finally { setReminderLoading(false); }
  };

  const saveReading = async (data: {
    systolic: number;
    diastolic: number;
    heartRate?: number;
    method: string;
    notes?: string;
    confidence?: number;
  }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/patient/blood-pressure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast({ title: T("bp.toastSaved"), description: T("bp.toastSavedDesc") });
        fetchReadings();
        setShowManual(false);
        setManualSys(""); setManualDia(""); setManualHR(""); setManualNotes("");
      } else {
        const err = await res.json();
        toast({ title: T("common.error"), description: err.error || T("bp.failedSave"), variant: "destructive" });
      }
    } catch {
      toast({ title: T("common.error"), description: T("bp.failedSave"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleManualSubmit = () => {
    const sys = parseInt(manualSys);
    const dia = parseInt(manualDia);
    if (!sys || !dia) return;
    if (dia >= sys) {
      toast({ title: T("common.error"), description: locale === "pt-BR" ? "A diastólica deve ser menor que a sistólica." : "Diastolic must be lower than systolic.", variant: "destructive" });
      return;
    }
    if (sys < 50 || sys > 300 || dia < 30 || dia > 200) {
      toast({ title: T("common.error"), description: locale === "pt-BR" ? "Valores fora da faixa válida." : "Values out of valid range.", variant: "destructive" });
      return;
    }
    saveReading({ systolic: sys, diastolic: dia, heartRate: manualHR ? parseInt(manualHR) : undefined, method: "MANUAL", notes: manualNotes || undefined });
  };

  const avgSys = readings.length > 0 ? Math.round(readings.reduce((s, r) => s + r.systolic, 0) / readings.length) : 0;
  const avgDia = readings.length > 0 ? Math.round(readings.reduce((s, r) => s + r.diastolic, 0) / readings.length) : 0;
  const latest = readings[0] || null;
  const latestClass = latest ? classifyBP(latest.systolic, latest.diastolic) : null;

  return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-ba1-bad" />
              {T("bp.title")}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">{T("bp.subtitle")}</p>
          </div>
          <button
            onClick={toggleReminder}
            disabled={reminderLoading}
            className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-full border transition-colors shrink-0 ${
              bpReminder
                ? "bg-ba1-ok/10 border-ba1-ok/30 text-ba1-ok"
                : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
            }`}
            title={T("bp.reminderLabel")}
          >
            {reminderLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
            {T("bp.reminderLabel")}
          </button>
        </div>

        <ProfessionalReviewBanner descriptionKey="review.descriptionBP" />

        {/* Quem mede a própria pressão e vê um número alto precisa saber, na
            mesma tela, que ninguém está olhando em tempo real (T-13). */}
        <NonEmergencyNotice />

        {/* Preparation Tips */}
        {!showManual && (
          <Card className="border-ba1-health/20 bg-ba1-health/10">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-ba1-health flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                {locale === "pt-BR" ? "Antes de Medir — Preparação" : "Before Measuring — Preparation"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-ba1-health">
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-ba1-health mt-px">1.</span>
                  <span>{locale === "pt-BR" ? "Sente-se confortavelmente e descanse por 5 minutos antes de medir." : "Sit comfortably and rest for 5 minutes before measuring."}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-ba1-health mt-px">2.</span>
                  <span>{locale === "pt-BR" ? "Evite cafeína, exercício e fumo 30 min antes." : "Avoid caffeine, exercise, and smoking 30 min before."}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-ba1-health mt-px">3.</span>
                  <span>{locale === "pt-BR" ? "Esvazie a bexiga antes de medir." : "Empty your bladder before measuring."}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-ba1-health mt-px">4.</span>
                  <span>{locale === "pt-BR" ? "Apoie o braço na mesa, com o manguito na altura do coração." : "Support your arm on a table, cuff at heart level."}</span>
                </div>
              </div>
              <p className="text-[10px] text-ba1-health/70 italic">
                {locale === "pt-BR" ? "Para resultados precisos, meça sempre no mesmo horário (de manhã, antes de medicamentos)." : "For accurate results, measure at the same time each day (morning, before medications)."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Um botao so, porque ha um caminho so.
            Eram dois: "Enter Cuff Reading" e "Camera Estimate" — e o segundo ja
            se anunciava como *estimate only*, ao lado do primeiro marcado
            *recommended*. Duas portas para a mesma coisa, uma delas avisando que
            nao servia. Ficou a que serve (115 T-2). */}
        {!showManual && (
          <Button
            size="lg"
            className="gap-2 h-14 sm:h-16 text-base w-full"
            onClick={() => setShowManual(true)}
          >
            <PenLine className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold text-sm">{locale === "pt-BR" ? "Inserir Leitura do Aparelho" : "Enter Cuff Reading"}</div>
              <div className="text-[10px] font-normal opacity-80">{locale === "pt-BR" ? "Do seu aparelho de pressão" : "From your blood-pressure monitor"}</div>
            </div>
          </Button>
        )}

        {/* Manual Entry Section */}
        
          {showManual && (
            <div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PenLine className="h-5 w-5 text-primary" />
                    {T("bp.manualEntry")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{T("bp.systolic")} *</Label>
                      <Input type="number" inputMode="numeric" placeholder="120" value={manualSys} onChange={(e) => setManualSys(e.target.value)} className="h-12 text-lg text-center" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{T("bp.diastolic")} *</Label>
                      <Input type="number" inputMode="numeric" placeholder="80" value={manualDia} onChange={(e) => setManualDia(e.target.value)} className="h-12 text-lg text-center" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{T("bp.heartRate")}</Label>
                      <Input type="number" inputMode="numeric" placeholder="72" value={manualHR} onChange={(e) => setManualHR(e.target.value)} className="h-12 text-lg text-center" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs">{T("bp.notes")}</Label>
                    <Textarea rows={2} value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder={locale === "pt-BR" ? "Ex: Após exercício, leitura matinal..." : "e.g., After exercise, morning reading..."} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button onClick={handleManualSubmit} disabled={saving || !manualSys || !manualDia} className="gap-2 flex-1">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {T("bp.saveReading")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowManual(false)} className="flex-1">{T("common.cancel")}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        

        {/* Latest Reading Hero Card */}
        {!loading && latest && latestClass && (
          <Card className={`border-2 ${latestClass.color}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{locale === "pt-BR" ? "Última Leitura" : "Latest Reading"}</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">{latest.systolic}/{latest.diastolic} <span className="text-sm font-normal opacity-60">mmHg</span></p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] ${latestClass.color}`}>
                      {locale === "pt-BR" ? latestClass.labelPt : latestClass.labelEn}
                    </Badge>
                    {latest.heartRate && <span className="text-xs text-muted-foreground">{latest.heartRate} bpm</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(latest.measuredAt).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right space-y-1.5">
                  <div className="bg-muted/50 rounded-lg px-2.5 py-1 text-center">
                    <p className="text-[9px] text-muted-foreground font-medium">{locale === "pt-BR" ? "P. Pulso" : "Pulse P."}</p>
                    <p className="text-sm font-bold text-foreground">{latest.systolic - latest.diastolic}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-2.5 py-1 text-center">
                    <p className="text-[9px] text-muted-foreground font-medium">MAP</p>
                    <p className="text-sm font-bold text-foreground">{Math.round(latest.diastolic + (latest.systolic - latest.diastolic) / 3)}</p>
                  </div>
                </div>
              </div>
              {latestClass.severity >= 5 && (
                <div className="mt-2 bg-ba1-bad/20 border border-ba1-bad/30 rounded-lg p-2 text-center animate-pulse">
                  <p className="text-xs font-bold text-ba1-bad">{locale === "pt-BR" ? "⚠️ LEITURA MUITO ALTA — Procure atendimento médico IMEDIATAMENTE" : "⚠️ VERY HIGH READING — Seek medical attention IMMEDIATELY"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        {!loading && readings.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-2.5 sm:p-3">
                <p className="text-[10px] text-muted-foreground font-medium">{locale === "pt-BR" ? "Média" : "Average"} ({days}d)</p>
                <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">
                  {avgSys}/{avgDia}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{readings.length} {locale === "pt-BR" ? "leituras" : "readings"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 sm:p-3">
                <p className="text-[10px] text-muted-foreground font-medium">{locale === "pt-BR" ? "P. Pulso Médio" : "Avg Pulse P."}</p>
                <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">
                  {Math.round(readings.reduce((s, r) => s + (r.systolic - r.diastolic), 0) / readings.length)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{locale === "pt-BR" ? "Normal: 30-50" : "Normal: 30-50"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 sm:p-3">
                <p className="text-[10px] text-muted-foreground font-medium">{locale === "pt-BR" ? "MAP Média" : "Avg MAP"}</p>
                <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">
                  {Math.round(readings.reduce((s, r) => s + r.diastolic + (r.systolic - r.diastolic) / 3, 0) / readings.length)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{locale === "pt-BR" ? "Normal: 70-100" : "Normal: 70-100"}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* BP Trend Chart */}
        {!loading && readings.length >= 2 && (
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                {locale === "pt-BR" ? "Tendência da Pressão Arterial" : "Blood Pressure Trend"}
              </p>
              {(() => {
                const sorted = [...readings].reverse();
                const W = 600, H = 160, padL = 35, padR = 10, padT = 10, padB = 25;
                const chartW = W - padL - padR, chartH = H - padT - padB;
                const allVals = sorted.flatMap(r => [r.systolic, r.diastolic]);
                const minV = Math.max(40, Math.min(...allVals) - 10);
                const maxV = Math.min(220, Math.max(...allVals) + 10);
                const rangeV = maxV - minV || 1;
                const toX = (i: number) => padL + (i / Math.max(1, sorted.length - 1)) * chartW;
                const toY = (v: number) => padT + chartH - ((v - minV) / rangeV) * chartH;
                const sysPath = sorted.map((r, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(r.systolic)}`).join(" ");
                const diaPath = sorted.map((r, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(r.diastolic)}`).join(" ");
                const normalZoneY1 = toY(120), normalZoneY2 = toY(80);
                return (
                  <div className="w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[300px]" preserveAspectRatio="xMidYMid meet">
                      <rect x={padL} y={padT} width={chartW} height={chartH} fill="#f8fafc" rx="4" />
                      <rect x={padL} y={normalZoneY1} width={chartW} height={Math.max(0, normalZoneY2 - normalZoneY1)} fill="#dcfce7" opacity="0.5" />
                      {[60, 80, 100, 120, 140, 160, 180].filter(v => v >= minV && v <= maxV).map(v => (
                        <g key={v}>
                          <line x1={padL} y1={toY(v)} x2={padL + chartW} y2={toY(v)} stroke={v === 140 ? "#f87171" : v === 120 ? "#fbbf24" : "#e2e8f0"} strokeWidth={v === 140 || v === 120 ? "1" : "0.5"} strokeDasharray={v === 140 || v === 120 ? "4 2" : "none"} />
                          <text x={padL - 4} y={toY(v) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{v}</text>
                        </g>
                      ))}
                      <path d={sysPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
                      <path d={diaPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                      {sorted.map((r, i) => (
                        <g key={r.id}>
                          <circle cx={toX(i)} cy={toY(r.systolic)} r="3" fill="#ef4444" />
                          <circle cx={toX(i)} cy={toY(r.diastolic)} r="3" fill="#3b82f6" />
                        </g>
                      ))}
                      {sorted.length <= 10 && sorted.map((r, i) => (
                        <text key={`d${i}`} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="7" fill="#94a3b8">
                          {new Date(r.measuredAt).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "2-digit", month: "short" })}
                        </text>
                      ))}
                    </svg>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-ba1-bad" /> {locale === "pt-BR" ? "Sistólica" : "Systolic"}</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-ba1-health" /> {locale === "pt-BR" ? "Diastólica" : "Diastolic"}</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-2 bg-ba1-ok/30 rounded-sm" /> {locale === "pt-BR" ? "Faixa Normal" : "Normal Range"}</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Time filter */}
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} variant={days === d ? "default" : "outline"} size="sm" onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
        </div>

        {/* Readings List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {T("bp.readingHistory")}
            </CardTitle>
            {/* A frase que desfaz a leitura errada. Estava no app e nao estava
                aqui: as etiquetas novas chegaram a esta tela, e a explicacao
                delas nao — que e a metade que faz a etiqueta voltar a soar como
                veredito. Achado do QA de 30/09. */}
            <p className="text-[11px] leading-snug text-muted-foreground mt-1">
              {isPt ? BP_GUIDANCE_NOTE.pt : BP_GUIDANCE_NOTE.en}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : readings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">{T("bp.noReadings")}</p>
                <p className="text-sm mt-1">{T("bp.noReadingsDesc")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {readings.map((r) => {
                  const cls = classifyBP(r.systolic, r.diastolic);
                  const Icon = cls.icon;
                  return (
                    <div key={r.id}>
                      <div
                        className={`flex items-center gap-2 sm:gap-3 p-2.5 rounded-lg border ${cls.color}`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <span className="font-bold text-sm sm:text-base">{r.systolic}/{r.diastolic}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">mmHg</span>
                            {r.heartRate && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground">· {r.heartRate}bpm</span>
                            )}
                            <div className="flex items-center gap-1 ml-auto">
                              {/* O cracha de ritmo saiu com a camera (115 T-2).
                                  Ele dizia "AFib?" a partir dos intervalos entre
                                  batimentos lidos pelo telefone — a promessa mais
                                  arriscada das tres que o sinal sustentava, e a
                                  unica que nomeava uma condicao. A leitura antiga
                                  continua na lista; o veredito sobre ela, nao. */}
                              {/* Readings taken on the clinic's cuff sit in the
                                  same list as the ones taken at home, so the
                                  patient is told which is which. */}
                              <Badge variant="outline" className="text-[8px]">
                                {r.source === "CLINIC_DEVICE"
                                  ? (locale === "pt-BR" ? "Na clínica" : "At the clinic")
                                  : r.source === "PATIENT_DEVICE"
                                    ? (locale === "pt-BR" ? "Aparelho" : "Device")
                                    : r.method === "CAMERA_PPG" ? (locale === "pt-BR" ? "Câmera" : "Camera") : "Manual"}
                              </Badge>
                              {r.source === "CLINIC_DEVICE" && r.context && r.context !== "OTHER" && (
                                <Badge variant="outline" className="text-[8px] text-muted-foreground">
                                  {r.context === "PRE_SESSION"
                                    ? (locale === "pt-BR" ? "antes" : "before")
                                    : r.context === "POST_SESSION"
                                      ? (locale === "pt-BR" ? "depois" : "after")
                                      : (locale === "pt-BR" ? "em casa" : "at home")}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(r.measuredAt).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* BP Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">{T("bp.categories")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px]">
              {[
                { label: locale === "pt-BR" ? "Baixa" : "Low", range: "<90/60", color: "bg-ba1-health/10 text-ba1-health border-ba1-health/20" },
                { label: "Normal", range: "<120/80", color: "bg-ba1-ok/10 text-ba1-ok border-ba1-ok/20" },
                { label: locale === "pt-BR" ? "Elevada" : "Elevated", range: "120-129/<80", color: "bg-ba1-warn/10 text-ba1-warn border-ba1-warn/20" },
                { label: locale === "pt-BR" ? BP_LABELS.STAGE1.pt : BP_LABELS.STAGE1.en, range: "130-139/80-89", color: "bg-ba1-warn/10 text-ba1-warn border-ba1-warn/20" },
                { label: locale === "pt-BR" ? BP_LABELS.STAGE2.pt : BP_LABELS.STAGE2.en, range: "≥140/≥90", color: "bg-ba1-bad/10 text-ba1-bad border-ba1-bad/20" },
                /* **A unica da lista que nao tinha migrado** (achado do QA
                   online, 01/10). As faixas vizinhas ja vinham de `BP_LABELS`;
                   esta ficou com a palavra literal. E *crise* e o nome curto de
                   *crise hipertensiva* — categoria diagnostica, na tela que o
                   paciente abre sozinho, que e exatamente o que a 105 T-6 foi
                   corrigir. */
                { label: locale === "pt-BR" ? BP_LABELS.CRISIS.pt : BP_LABELS.CRISIS.en, range: "≥180/≥120", color: "bg-ba1-bad/15 text-ba1-bad border-ba1-bad/30 font-bold" },
              ].map((cat) => (
                <div key={cat.label} className={`p-1.5 rounded border text-center ${cat.color}`}>
                  <p className="font-semibold">{cat.label}</p>
                  <p>{cat.range}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
