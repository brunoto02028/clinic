"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Brain, Zap, Moon, Activity, Heart, TrendingUp, CheckCircle2, ChevronDown, ChevronUp, Flame, Wind, Dna, Watch, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";

const CATEGORY_ICONS: Record<string, any> = {
  SLEEP: Moon, NUTRITION: Flame, EXERCISE: Activity, LIGHT: Zap,
  COLD: Wind, BREATHWORK: Wind, SUPPLEMENT: Dna, HRV: Heart,
};

const CATEGORY_COLORS: Record<string, string> = {
  // Only 4 semantic tokens exist in the brand palette (ok/warn/bad/health) for
  // 8 categories that need to stay visually tell-apart-able — cycled rather
  // than collapsed to one color, since a real semantic match doesn't exist.
  SLEEP: "bg-ba1-health/15 text-ba1-health border-ba1-health/20",
  NUTRITION: "bg-ba1-warn/15 text-ba1-warn border-ba1-warn/20",
  EXERCISE: "bg-ba1-ok/15 text-ba1-ok border-ba1-ok/20",
  LIGHT: "bg-ba1-bad/15 text-ba1-bad border-ba1-bad/20",
  COLD: "bg-ba1-health/15 text-ba1-health border-ba1-health/20",
  BREATHWORK: "bg-ba1-warn/15 text-ba1-warn border-ba1-warn/20",
  SUPPLEMENT: "bg-ba1-ok/15 text-ba1-ok border-ba1-ok/20",
  HRV: "bg-ba1-bad/15 text-ba1-bad border-ba1-bad/20",
};

function Slider({ label, value, onChange, min = 1, max = 10, color = "emerald" }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={`text-sm font-bold text-${color}-400`}>{value ?? "—"}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value ?? Math.round((min + max) / 2)}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-ba1-ok bg-muted"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function MiniBar({ value, max = 10, color = "emerald" }: { value: number | null; max?: number; color?: string }) {
  const pct = value != null ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full bg-${color}-500 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-6 text-right">{value ?? "—"}</span>
    </div>
  );
}

export default function BiohackingDashboardPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [protocol, setProtocol] = useState<any>(null);
  const [protocolOpen, setProtocolOpen] = useState(true);

  // Check-in form state
  const [painLevel, setPainLevel]       = useState<number>(3);
  const [moodLevel, setMoodLevel]       = useState<number>(3);
  const [energyLevel, setEnergyLevel]   = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [stressLevel, setStressLevel]   = useState<number | null>(null);
  const [hrv, setHrv]                   = useState<string>("");
  const [notes, setNotes]               = useState("");
  const [exercisesDone, setExercisesDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ciRes, prRes] = await Promise.all([
      fetch("/api/patient/daily-checkin"),
      fetch("/api/biohacking/my-protocol"),
    ]);
    const ciData = await ciRes.json();
    const prData = await prRes.json();

    if (ciData.today) {
      const t = ciData.today;
      setPainLevel(t.painLevel ?? 3);
      setMoodLevel(t.moodLevel ?? 3);
      setEnergyLevel(t.energyLevel ?? null);
      setSleepQuality(t.sleepQuality ?? null);
      setStressLevel(t.stressLevel ?? null);
      setHrv(t.hrv != null ? String(t.hrv) : "");
      setNotes(t.notes ?? "");
      setExercisesDone(t.exercisesDone ?? false);
      setToday(t);
      setSaved(true);
    }
    setHistory(ciData.history || []);
    setProtocol(prData.assignment || null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/patient/daily-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        painLevel, moodLevel, exercisesDone, notes,
        energyLevel, sleepQuality, stressLevel,
        hrv: hrv !== "" ? parseFloat(hrv) : null,
      }),
    });
    const data = await res.json();
    if (res.ok) { setToday(data.checkIn); setSaved(true); }
    setSaving(false);
  };

  const dayLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString(isPt ? "pt-BR" : "en-GB", { weekday: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-ba1-ok/15 flex items-center justify-center shrink-0">
          <Brain className="h-5 w-5 text-ba1-ok" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{isPt ? "Biohacking e Performance" : "Biohacking & Performance"}</h1>
          <p className="text-sm text-muted-foreground">{isPt ? "Check-in biológico diário — acompanhe sua recuperação por dentro." : "Daily biological check-in — track your recovery from the inside out."}</p>
        </div>
      </div>

      {/* Devices left this page for /dashboard/devices, which `mod_devices`
          governs; the check-in stays here under `mod_journey`. */}
      <Link
        href="/dashboard/devices"
        className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm text-foreground flex items-center gap-2">
          <Watch className="h-4 w-4 text-ba1-health" />
          {isPt ? "Dispositivos e dados do wearable" : "Devices and wearable data"}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>

      {/* Daily Check-In */}
      <Card className="border-ba1-ok/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-ba1-ok" />
              {isPt ? "Check-In de Hoje" : "Today's Check-In"}
            </CardTitle>
            {saved && (
              <Badge className="bg-ba1-ok/15 text-ba1-ok border-ba1-ok/20 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {isPt ? "Salvo" : "Saved"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Slider label={isPt ? "Nível de Dor" : "Pain Level"} value={painLevel} onChange={setPainLevel} min={0} max={10} color="rose" />
          <Slider label={isPt ? "Nível de Energia" : "Energy Level"} value={energyLevel ?? 5} onChange={setEnergyLevel} min={1} max={10} color="amber" />
          <Slider label={isPt ? "Qualidade do Sono (noite passada)" : "Sleep Quality (last night)"} value={sleepQuality ?? 5} onChange={setSleepQuality} min={1} max={10} color="indigo" />
          <Slider label={isPt ? "Nível de Estresse" : "Stress Level"} value={stressLevel ?? 5} onChange={setStressLevel} min={1} max={10} color="violet" />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{isPt ? "Humor" : "Mood"}</label>
            <div className="flex gap-2">
              {[
                { v: 1, emoji: "😞" }, { v: 2, emoji: "😕" }, { v: 3, emoji: "😐" },
                { v: 4, emoji: "🙂" }, { v: 5, emoji: "😄" },
              ].map(({ v, emoji }) => (
                <button key={v} onClick={() => setMoodLevel(v)}
                  className={`flex-1 py-2 rounded-lg text-xl transition-all ${moodLevel === v ? "bg-ba1-ok/20 ring-1 ring-ba1-ok/40 scale-110" : "bg-muted hover:bg-muted/80"}`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">HRV <span className="text-muted-foreground font-normal">{isPt ? "(ms — do wearable, opcional)" : "(ms — from wearable, optional)"}</span></label>
            <input
              type="number" min={20} max={200} step={0.1}
              value={hrv} onChange={e => setHrv(e.target.value)}
              placeholder={isPt ? "ex: 52.4" : "e.g. 52.4"}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ba1-ok"
            />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border cursor-pointer" onClick={() => setExercisesDone(v => !v)}>
            <div className={`w-5 h-5 rounded flex items-center justify-center ${exercisesDone ? "bg-ba1-ok" : "border border-border"}`}>
              {exercisesDone && <CheckCircle2 className="h-4 w-4 text-white" />}
            </div>
            <span className="text-sm font-medium">{isPt ? "Completou o protocolo de exercícios/movimento de hoje" : "Completed today's exercise / movement protocol"}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{isPt ? "Notas" : "Notes"} <span className="text-muted-foreground font-normal">{isPt ? "(opcional)" : "(optional)"}</span></label>
            <textarea
              rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={isPt ? "Como você está se sentindo hoje? Algum sintoma, observação..." : "How are you feeling today? Any symptoms, observations..."}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ba1-ok resize-none"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-ba1-ok hover:bg-ba1-ok/90 text-white">
            {saving ? (isPt ? "Salvando..." : "Saving...") : saved ? (isPt ? "Atualizar Check-In" : "Update Check-In") : (isPt ? "Salvar Check-In" : "Save Check-In")}
          </Button>
        </CardContent>
      </Card>

      {/* 7-Day Trends */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-ba1-ok" />
              {isPt ? "Tendências dos Últimos 7 Dias" : "7-Day Trends"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {[...history].reverse().map((c: any) => (
                  <div key={c.checkinDate} className="text-center text-xs text-muted-foreground">
                    {dayLabel(c.checkinDate).split(" ")[0]}
                  </div>
                ))}
              </div>
              {[
                { key: "energyLevel", label: isPt ? "Energia" : "Energy", color: "amber" },
                { key: "painLevel",   label: isPt ? "Dor"     : "Pain",   color: "rose" },
                { key: "sleepQuality",label: isPt ? "Sono"    : "Sleep",  color: "indigo" },
                { key: "stressLevel", label: isPt ? "Estresse": "Stress", color: "violet" },
              ].map(({ key, label, color }) => (
                <div key={key} className="grid grid-cols-[80px_1fr] gap-2 items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <div className="grid grid-cols-7 gap-1">
                    {[...history].reverse().map((c: any) => {
                      const v = c[key];
                      const pct = v != null ? Math.round((v / 10) * 100) : 0;
                      return (
                        <div key={c.checkinDate} className="flex flex-col items-center gap-0.5">
                          <div className="w-full h-8 bg-muted rounded flex items-end overflow-hidden">
                            <div className={`w-full bg-${color}-500/70 rounded transition-all`} style={{ height: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{v ?? "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Protocol */}
      {protocol ? (
        <Card className="border-ba1-health/20">
          <CardHeader className="pb-0">
            <button className="flex items-center justify-between w-full" onClick={() => setProtocolOpen(v => !v)}>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-ba1-health" />
                {isPt ? "Seu Protocolo Ativo" : "Your Active Protocol"}
                <span className="ml-1 text-sm font-normal text-ba1-health">{protocol.protocol.name}</span>
              </CardTitle>
              {protocolOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {protocolOpen && (
            <CardContent className="pt-4 space-y-3">
              {protocol.protocol.description && (
                <p className="text-sm text-muted-foreground">{protocol.protocol.description}</p>
              )}
              {protocol.notes && (
                <div className="p-3 rounded-lg bg-ba1-health/10 border border-ba1-health/20 text-sm text-ba1-health">
                  <span className="font-semibold">{isPt ? "Nota do Bruno: " : "Bruno's note: "}</span>{protocol.notes}
                </div>
              )}
              <div className="space-y-2">
                {protocol.protocol.items.map((item: any) => {
                  const Icon = CATEGORY_ICONS[item.category] || Brain;
                  const colorClass = CATEGORY_COLORS[item.category] || "bg-muted text-muted-foreground";
                  return (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted border border-border">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <Badge variant="outline" className="text-xs">{item.frequency}</Badge>
                          {item.duration && <span className="text-xs text-muted-foreground">{item.duration}</span>}
                        </div>
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">{isPt ? "Nenhum protocolo ativo ainda." : "No active protocol yet."}</p>
            <p className="text-xs text-muted-foreground mt-1">{isPt ? "O Bruno vai atribuir seu protocolo de biohacking personalizado após a sua avaliação inicial." : "Bruno will assign your personalised biohacking protocol after your initial assessment."}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
