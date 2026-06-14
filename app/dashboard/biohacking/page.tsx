"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Brain, Zap, Moon, Activity, Heart, TrendingUp, CheckCircle2, ChevronDown, ChevronUp, Flame, Wind, Dna, Watch, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORY_ICONS: Record<string, any> = {
  SLEEP: Moon, NUTRITION: Flame, EXERCISE: Activity, LIGHT: Zap,
  COLD: Wind, BREATHWORK: Wind, SUPPLEMENT: Dna, HRV: Heart,
};

const CATEGORY_COLORS: Record<string, string> = {
  SLEEP: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  NUTRITION: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  EXERCISE: "bg-green-500/15 text-green-400 border-green-500/20",
  LIGHT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  COLD: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  BREATHWORK: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  SUPPLEMENT: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  HRV: "bg-rose-500/15 text-rose-400 border-rose-500/20",
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
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500 bg-muted"
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const searchParams = useSearchParams();
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [protocol, setProtocol] = useState<any>(null);
  const [protocolOpen, setProtocolOpen] = useState(true);

  // Wearable / Terra state
  const [wearable, setWearable] = useState<{ connections: any[]; dataPoints: any[] } | null>(null);
  const [connectingWearable, setConnectingWearable] = useState(false);
  const [wearableMsg, setWearableMsg] = useState<string | null>(
    searchParams?.get("connected") === "1" ? "Wearable connected! Data will sync shortly." :
    searchParams?.get("connected") === "0" ? "Wearable connection failed. Please try again." : null
  );

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
    const [ciRes, prRes, wRes] = await Promise.all([
      fetch("/api/patient/daily-checkin"),
      fetch("/api/biohacking/my-protocol"),
      fetch("/api/biohacking/terra/status"),
    ]);
    const ciData = await ciRes.json();
    const prData = await prRes.json();
    const wData  = wRes.ok ? await wRes.json() : null;

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
    if (wData) setWearable(wData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConnectWearable = async () => {
    setConnectingWearable(true);
    try {
      const res = await fetch("/api/biohacking/terra/connect");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setWearableMsg("Could not generate connection link. Please try again.");
    } catch {
      setWearableMsg("Connection error. Please try again.");
    }
    setConnectingWearable(false);
  };

  const handleDisconnect = async (terraUserId: string) => {
    await fetch("/api/biohacking/terra/connect", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terraUserId }),
    });
    load();
  };

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
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
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
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <Brain className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Biohacking & Performance</h1>
          <p className="text-sm text-muted-foreground">Daily biological check-in — track your recovery from the inside out.</p>
        </div>
      </div>

      {/* Wearable Connection */}
      <Card className="border-violet-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Watch className="h-4 w-4 text-violet-400" />
              Wearable Integration
            </CardTitle>
            {wearable?.connections && wearable.connections.length > 0 ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">
                <Wifi className="h-3 w-3 mr-1" /> {wearable.connections.length} Connected
              </Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground text-xs">
                <WifiOff className="h-3 w-3 mr-1" /> Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {wearableMsg && (
            <div className={`text-sm p-3 rounded-lg ${
              wearableMsg.includes("connected!") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>{wearableMsg}</div>
          )}

          {wearable?.connections && wearable.connections.length > 0 ? (
            <div className="space-y-2">
              {wearable.connections.map((conn: any) => (
                <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{conn.provider}</p>
                    {conn.lastSyncedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last sync: {new Date(conn.lastSyncedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => load()} className="p-1.5 rounded-lg hover:bg-muted-foreground/10 text-muted-foreground" title="Refresh">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDisconnect(conn.terraUserId)}
                      className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-500/10">Disconnect</button>
                  </div>
                </div>
              ))}
              <Button onClick={handleConnectWearable} disabled={connectingWearable} variant="outline" className="w-full text-sm">
                + Add Another Device
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Connect your wearable to automatically sync HRV, sleep, activity and readiness data.</p>
              <p className="text-xs text-muted-foreground">Supports: Garmin · Oura · Whoop · Apple Health · Fitbit · Samsung · Polar</p>
              <Button onClick={handleConnectWearable} disabled={connectingWearable}
                className="bg-violet-600 hover:bg-violet-700 text-white">
                {connectingWearable ? "Connecting..." : "Connect Wearable"}
              </Button>
            </div>
          )}

          {/* Latest wearable data snapshot */}
          {wearable?.dataPoints && wearable.dataPoints.length > 0 && (() => {
            const latest = wearable.dataPoints[0];
            return (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Latest sync — {latest.dataDate} · {latest.provider}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Sleep Score",  val: latest.sleepScore != null ? `${Math.round(latest.sleepScore)}%` : null, color: "indigo" },
                    { label: "HRV",          val: latest.hrv != null ? `${Math.round(latest.hrv)} ms` : null, color: "rose" },
                    { label: "Resting HR",   val: latest.restingHr != null ? `${Math.round(latest.restingHr)} bpm` : null, color: "amber" },
                    { label: "Recovery",     val: latest.hrvScore != null ? `${Math.round(latest.hrvScore)}%` : null, color: "emerald" },
                  ].filter(x => x.val).map(({ label, val, color }) => (
                    <div key={label} className={`p-2.5 rounded-lg bg-${color}-500/10 border border-${color}-500/20 text-center`}>
                      <p className={`text-sm font-bold text-${color}-400`}>{val}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Daily Check-In */}
      <Card className="border-emerald-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Today's Check-In
            </CardTitle>
            {saved && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Saved
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Slider label="Pain Level" value={painLevel} onChange={setPainLevel} min={0} max={10} color="rose" />
          <Slider label="Energy Level" value={energyLevel ?? 5} onChange={setEnergyLevel} min={1} max={10} color="amber" />
          <Slider label="Sleep Quality (last night)" value={sleepQuality ?? 5} onChange={setSleepQuality} min={1} max={10} color="indigo" />
          <Slider label="Stress Level" value={stressLevel ?? 5} onChange={setStressLevel} min={1} max={10} color="violet" />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mood</label>
            <div className="flex gap-2">
              {[
                { v: 1, emoji: "😞" }, { v: 2, emoji: "😕" }, { v: 3, emoji: "😐" },
                { v: 4, emoji: "🙂" }, { v: 5, emoji: "😄" },
              ].map(({ v, emoji }) => (
                <button key={v} onClick={() => setMoodLevel(v)}
                  className={`flex-1 py-2 rounded-lg text-xl transition-all ${moodLevel === v ? "bg-emerald-500/20 ring-1 ring-emerald-500/40 scale-110" : "bg-muted hover:bg-muted/80"}`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">HRV <span className="text-muted-foreground font-normal">(ms — from wearable, optional)</span></label>
            <input
              type="number" min={20} max={200} step={0.1}
              value={hrv} onChange={e => setHrv(e.target.value)}
              placeholder="e.g. 52.4"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border cursor-pointer" onClick={() => setExercisesDone(v => !v)}>
            <div className={`w-5 h-5 rounded flex items-center justify-center ${exercisesDone ? "bg-emerald-500" : "border border-border"}`}>
              {exercisesDone && <CheckCircle2 className="h-4 w-4 text-white" />}
            </div>
            <span className="text-sm font-medium">Completed today's exercise / movement protocol</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="How are you feeling today? Any symptoms, observations..."
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? "Saving..." : saved ? "Update Check-In" : "Save Check-In"}
          </Button>
        </CardContent>
      </Card>

      {/* 7-Day Trends */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              7-Day Trends
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
                { key: "energyLevel", label: "Energy", color: "amber" },
                { key: "painLevel",   label: "Pain",   color: "rose" },
                { key: "sleepQuality",label: "Sleep",  color: "indigo" },
                { key: "stressLevel", label: "Stress", color: "violet" },
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
        <Card className="border-teal-500/20">
          <CardHeader className="pb-0">
            <button className="flex items-center justify-between w-full" onClick={() => setProtocolOpen(v => !v)}>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-teal-400" />
                Your Active Protocol
                <span className="ml-1 text-sm font-normal text-teal-400">{protocol.protocol.name}</span>
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
                <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-sm text-teal-300">
                  <span className="font-semibold">Bruno's note: </span>{protocol.notes}
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
            <p className="text-sm text-muted-foreground">No active protocol yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Bruno will assign your personalised biohacking protocol after your initial assessment.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
