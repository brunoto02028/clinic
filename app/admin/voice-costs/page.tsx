"use client";

import { useState, useEffect } from "react";
import {
  Mic,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  BarChart3,
  User,
  FileText,
  Stethoscope,
  Dumbbell,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CONTEXT_LABELS: Record<string, { label: string; icon: any }> = {
  medical_screening: { label: "Medical Screening", icon: FileText },
  soap_note: { label: "SOAP Note", icon: Stethoscope },
  exercise: { label: "Exercise", icon: Dumbbell },
  general: { label: "General", icon: Mic },
};

export default function VoiceCostsPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/voice-costs?period=${period}`);
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error("Failed to fetch voice costs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${min}m ${s}s` : `${min}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {T("admin.voiceCostsTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track voice-to-text usage and estimated costs (Gemini API + 20% margin)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["week", "month", "all"].map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="text-xs capitalize"
            >
              {p === "all" ? "All Time" : `This ${p}`}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No data available.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              icon={Mic}
              label="Transcriptions"
              value={data.summary.totalTranscriptions}
              sub={`${data.summary.totalDurationMin} min total`}
            />
            <SummaryCard
              icon={DollarSign}
              label="API Cost"
              value={`$${data.summary.totalApiCostUsd}`}
              sub="Raw Gemini cost"
              color="text-blue-600"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Total with Margin"
              value={`$${data.summary.totalCostWithMargin}`}
              sub="+20% margin included"
              color="text-amber-600"
            />
            <SummaryCard
              icon={Users}
              label="Avg per Patient"
              value={`$${data.summary.avgCostPerPatient}`}
              sub={`$${data.summary.avgCostPerTranscription}/transcription`}
              color="text-green-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Context */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Cost by Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.byContext.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No transcriptions yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.byContext.map((c: any) => {
                      const ctx = CONTEXT_LABELS[c.context] || CONTEXT_LABELS.general;
                      const CtxIcon = ctx.icon;
                      return (
                        <div key={c.context} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <CtxIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{ctx.label}</p>
                              <span className="text-sm font-semibold">${c.costUsd}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{c.count} transcription{c.count !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Patient */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Cost by Patient
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.byPatient.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No transcriptions yet</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {data.byPatient.map((p: any) => (
                      <div key={p.patientId} className="flex items-center gap-3 py-1.5">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.count} uses · {formatDuration(p.durationSec)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold shrink-0">${p.costUsd}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Transcriptions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Recent Transcriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentTranscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transcriptions recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 font-medium">Patient</th>
                        <th className="pb-2 font-medium">Context</th>
                        <th className="pb-2 font-medium">Duration</th>
                        <th className="pb-2 font-medium">Lang</th>
                        <th className="pb-2 font-medium text-right">Cost</th>
                        <th className="pb-2 font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.recentTranscriptions.map((t: any) => {
                        const ctx = CONTEXT_LABELS[t.context] || CONTEXT_LABELS.general;
                        return (
                          <tr key={t.id} className="text-xs">
                            <td className="py-2 font-medium">{t.patientName}</td>
                            <td className="py-2">
                              <Badge variant="outline" className="text-[10px]">{ctx.label}</Badge>
                            </td>
                            <td className="py-2">{formatDuration(t.durationSec)}</td>
                            <td className="py-2">{t.language}</td>
                            <td className="py-2 text-right font-medium">${t.costUsd}</td>
                            <td className="py-2 text-right text-muted-foreground">
                              {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className={`h-5 w-5 ${color || "text-primary"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
