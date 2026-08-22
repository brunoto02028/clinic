"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Footprints,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/hooks/use-locale";
import { TrendChart, type TrendPoint } from "@/components/dashboard/trend-chart";
import { LineChart } from "lucide-react";

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  titlePt: string;
  description?: string;
  descriptionPt?: string;
  date: string;
  status: string;
  data?: any;
}

interface OutcomeRow {
  recordedAt: string;
  vasScore: number | null;
  faamAdlPercent: number | null;
  faamSportPercent: number | null;
  overallFunction: number | null;
}

interface AdherenceRow {
  periodStart: string;
  doneCount: number;
  totalDays: number;
  percent: number;
}

type ProgressRange = "30d" | "90d" | "all";

export default function FollowUpPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [outcomeTrend, setOutcomeTrend] = useState<any>(null);

  const [range, setRange] = useState<ProgressRange>("all");
  const [outcomeSeries, setOutcomeSeries] = useState<OutcomeRow[]>([]);
  const [adherenceSeries, setAdherenceSeries] = useState<AdherenceRow[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const reqSeq = useRef(0);

  useEffect(() => {
    fetchTimeline();
  }, []);

  useEffect(() => {
    fetchProgress(range);
  }, [range]);

  const fetchProgress = async (r: ProgressRange) => {
    const seq = ++reqSeq.current;
    setProgressLoading(true);
    try {
      const [histRes, adhRes] = await Promise.all([
        fetch(`/api/patient/outcome-measures?history=true&range=${r}`),
        fetch(`/api/patient/adherence?range=${r}`),
      ]);
      const hist = histRes.ok ? (await histRes.json()).series ?? [] : [];
      const adh = adhRes.ok ? (await adhRes.json()).series ?? [] : [];
      if (seq !== reqSeq.current) return; // a newer range request superseded this one
      setOutcomeSeries(hist);
      setAdherenceSeries(adh);
    } catch (e) {
      console.error("Error fetching progress:", e);
      if (seq === reqSeq.current) {
        setOutcomeSeries([]);
        setAdherenceSeries([]);
      }
    } finally {
      if (seq === reqSeq.current) setProgressLoading(false);
    }
  };

  const pointsOf = (key: keyof OutcomeRow): TrendPoint[] =>
    outcomeSeries.map((r) => ({ date: r.recordedAt, value: (r[key] as number | null) ?? null }));

  const hasOutcome = outcomeSeries.some(
    (r) => r.vasScore !== null || r.faamAdlPercent !== null || r.faamSportPercent !== null || r.overallFunction !== null,
  );
  const hasAdherence = adherenceSeries.length > 0;

  const fetchTimeline = async () => {
    try {
      const [progressRes, measuresRes] = await Promise.all([
        fetch("/api/patient/assessment-progress"),
        fetch("/api/patient/outcome-measures"),
      ]);

      const events: TimelineEvent[] = [];

      if (progressRes.ok) {
        const progress = await progressRes.json();

        for (const step of progress.steps) {
          if (step.status !== "pending" && step.data) {
            events.push({
              id: step.id,
              type: step.id,
              title: step.label,
              titlePt: step.labelPt,
              date: step.data.createdAt || step.data.recordedAt || new Date().toISOString(),
              status: step.status,
              data: step.data,
            });
          }
        }
      }

      if (measuresRes.ok) {
        const { measures } = await measuresRes.json();
        if (measures) {
          setOutcomeTrend(measures);
        }
      }

      // Sort by date descending
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(events);
    } catch (e) {
      console.error("Error fetching timeline:", e);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "screening": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "outcome_measures": return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "body_assessment": return <Activity className="h-4 w-4 text-purple-500" />;
      case "foot_scan": return <Footprints className="h-4 w-4 text-emerald-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "processing": return "bg-blue-500";
      case "in_progress": return "bg-yellow-500";
      default: return "bg-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            {isPt ? "Acompanhamento" : "Follow-up & Progress"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPt
              ? "Veja a evolução do seu tratamento ao longo do tempo"
              : "Track your treatment progress over time"}
          </p>
        </div>
      </div>

      {/* Outcome Scores Summary */}
      {outcomeTrend && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {isPt ? "Scores Actuais" : "Current Scores"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  VAS {isPt ? "Dor" : "Pain"}
                </p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  {outcomeTrend.vasScore ?? "—"}/10
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">FAAM ADL</p>
                <p className="text-2xl font-bold text-blue-500 mt-1">
                  {outcomeTrend.faamAdlPercent ?? "—"}%
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  FAAM {isPt ? "Desporto" : "Sport"}
                </p>
                <p className="text-2xl font-bold text-purple-500 mt-1">
                  {outcomeTrend.faamSportPercent ?? "—"}%
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {isPt ? "Função" : "Function"}
                </p>
                <p className="text-2xl font-bold text-emerald-500 mt-1">
                  {outcomeTrend.overallFunction ?? "—"}%
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <Link href="/dashboard/outcome-measures">
                <RefreshCw className="h-4 w-4 mr-2" />
                {isPt ? "Re-avaliar Agora" : "Re-assess Now"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* My Progress — trend charts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              {isPt ? "Meu Progresso" : "My Progress"}
            </CardTitle>
            {/* range selector */}
            <div className="inline-flex rounded-lg bg-muted/50 p-0.5">
              {(["30d", "90d", "all"] as ProgressRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === r
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "all" ? (isPt ? "Tudo" : "All") : r}
                </button>
              ))}
            </div>
          </div>
          <CardDescription>
            {isPt
              ? "A evolução das suas medidas ao longo do tratamento."
              : "How your measures have evolved over treatment."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progressLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !hasOutcome && !hasAdherence ? (
            <div className="text-center py-8">
              <LineChart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {isPt
                  ? "Ainda sem medidas registadas. Registe a primeira para começar a ver a sua evolução."
                  : "No measures recorded yet. Record your first to start seeing your progress."}
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/outcome-measures">
                  {isPt ? "Registar Medida" : "Record a Measure"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  key: "vasScore" as const,
                  label: isPt ? "Dor (EVA 0–10)" : "Pain (VAS 0–10)",
                  unit: "",
                  min: 0,
                  max: 10,
                  higherIsBetter: false,
                  color: "#ef4444",
                  points: pointsOf("vasScore"),
                },
                {
                  key: "faamAdlPercent" as const,
                  label: "FAAM ADL",
                  unit: "%",
                  min: 0,
                  max: 100,
                  higherIsBetter: true,
                  color: "#3b82f6",
                  points: pointsOf("faamAdlPercent"),
                },
                {
                  key: "faamSportPercent" as const,
                  label: isPt ? "FAAM Desporto" : "FAAM Sport",
                  unit: "%",
                  min: 0,
                  max: 100,
                  higherIsBetter: true,
                  color: "#a855f7",
                  points: pointsOf("faamSportPercent"),
                },
                {
                  key: "overallFunction" as const,
                  label: isPt ? "Função Geral" : "Overall Function",
                  unit: "%",
                  min: 0,
                  max: 100,
                  higherIsBetter: true,
                  color: "#10b981",
                  points: pointsOf("overallFunction"),
                },
              ]
                .filter((c) => c.points.some((p) => p.value !== null))
                .map((c) => (
                  <TrendChart
                    key={c.key}
                    points={c.points}
                    label={c.label}
                    unit={c.unit}
                    min={c.min}
                    max={c.max}
                    higherIsBetter={c.higherIsBetter}
                    color={c.color}
                    isPt={isPt}
                  />
                ))}

              {hasAdherence && (
                <TrendChart
                  kind="bar"
                  points={adherenceSeries.map((w) => ({ date: w.periodStart, value: w.percent }))}
                  label={isPt ? "Aderência (semanal)" : "Adherence (weekly)"}
                  unit="%"
                  min={0}
                  max={100}
                  higherIsBetter={true}
                  color="#14b8a6"
                  isPt={isPt}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {isPt ? "Cronologia do Tratamento" : "Treatment Timeline"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {isPt
                  ? "Ainda não há eventos. Comece pela avaliação completa."
                  : "No events yet. Start with the complete assessment."}
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/assessment-flow">
                  {isPt ? "Iniciar Avaliação" : "Start Assessment"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

              <div className="space-y-4">
                {timeline.map((event) => (
                  <div key={event.id} className="relative flex gap-4 pl-2">
                    {/* Dot */}
                    <div className={`relative z-10 w-5 h-5 rounded-full ${getStatusColor(event.status)} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getEventIcon(event.type)}
                        <span className="font-medium text-sm">
                          {isPt ? event.titlePt : event.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.status === "completed"
                            ? isPt ? "Concluído" : "Completed"
                            : event.status === "processing"
                              ? isPt ? "A processar" : "Processing"
                              : isPt ? "Em curso" : "In progress"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.date).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-between" asChild>
            <Link href="/dashboard/assessment-flow">
              {isPt ? "Avaliação Completa" : "Full Assessment"}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-between" asChild>
            <Link href="/dashboard/exercises">
              {isPt ? "Exercícios Prescritos" : "Prescribed Exercises"}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-between" asChild>
            <Link href="/dashboard/appointments">
              {isPt ? "Marcar Consulta" : "Book Appointment"}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
