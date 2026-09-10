"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface Progress {
  adherence: { doneLast4Weeks: number; plannedLast4Weeks: number; plannedPerWeek: number };
  weeklyVolume: { week: string; volume: number }[];
  loadByExercise: { exerciseName: string; series: { date: string; topLoadKg: number }[] }[];
  oneRepMax?: { exerciseName: string; kg: number }[];
  composition?: { weight: { date: string; v: number }[]; bodyFat: { date: string; v: number }[]; waist: { date: string; v: number }[] };
  recent: { id: string; performedAt: string; sessionRpe: number | null; setCount: number; volume: number }[];
}

export default function WorkoutProgress({ studentId }: { studentId: string }) {
  const { locale } = useLocale();
  const isPt = !!locale?.startsWith("pt");
  const t = (en: string, pt: string) => (isPt ? pt : en);

  const [data, setData] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    // Reset when the student changes so we never show the previous student's data.
    setLoading(true);
    setData(null);
    fetch(`/api/admin/workouts/progress?studentId=${encodeURIComponent(studentId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live) setData(d); })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading progress…", "Carregando progresso…")}
      </div>
    );
  }
  if (!data) return null;

  const { adherence, weeklyVolume, loadByExercise, recent } = data;
  const oneRepMax = data.oneRepMax ?? [];
  const comp = data.composition;
  const compTrend = (pts?: { date: string; v: number }[]) => {
    if (!pts || pts.length === 0) return null;
    const first = pts[0].v, last = pts[pts.length - 1].v;
    return `${first}${first !== last ? `→${last}` : ""}`;
  };
  const adhPct = adherence.plannedLast4Weeks > 0
    ? Math.round((adherence.doneLast4Weeks / adherence.plannedLast4Weeks) * 100)
    : null;
  const maxVol = Math.max(1, ...weeklyVolume.map((w) => w.volume));
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(isPt ? "pt-BR" : "en-GB");

  return (
    <div className="space-y-4 rounded-md border p-4" data-testid="workout-progress">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Activity className="h-4 w-4 text-primary" /> {t("Progress", "Progresso")}
      </h3>

      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No sessions logged yet.", "Nenhuma sessão registrada ainda.")}</p>
      ) : (
        <>
          {/* Adherence */}
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="text-muted-foreground">{t("Adherence (4 weeks):", "Aderência (4 semanas):")}</span>
            <span className="font-semibold">
              {adherence.doneLast4Weeks}/{adherence.plannedLast4Weeks} {t("sessions", "sessões")}
              {adhPct != null && ` · ${adhPct}%`}
            </span>
          </div>

          {/* Weekly volume */}
          {weeklyVolume.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t("Weekly volume (reps × kg)", "Volume semanal (reps × kg)")}</p>
              <div className="flex items-end gap-1.5" style={{ height: 60 }}>
                {weeklyVolume.map((w) => (
                  <div key={w.week} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${w.week}: ${w.volume}`}>
                    <div className="w-full rounded-t bg-primary/60" style={{ height: `${Math.max(4, (w.volume / maxVol) * 52)}px` }} />
                    <span className="text-[9px] text-muted-foreground">{w.week.split("-W")[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Load evolution per exercise */}
          {loadByExercise.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t("Load evolution (top set)", "Evolução de carga (série mais pesada)")}</p>
              <div className="space-y-1">
                {loadByExercise.map((ex) => {
                  const first = ex.series[0]?.topLoadKg ?? 0;
                  const last = ex.series[ex.series.length - 1]?.topLoadKg ?? 0;
                  const Trend = last > first ? TrendingUp : last < first ? TrendingDown : Minus;
                  const color = last > first ? "text-green-600" : last < first ? "text-red-500" : "text-muted-foreground";
                  return (
                    <div key={ex.exerciseName} className="flex items-center justify-between text-sm">
                      <span className="truncate">{ex.exerciseName}</span>
                      <span className={`flex items-center gap-1 ${color}`}>
                        <Trend className="h-3.5 w-3.5" />
                        {first}→{last} kg
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estimated 1RM (Epley) */}
          {oneRepMax.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t("Estimated 1RM (Epley)", "1RM estimado (Epley)")}</p>
              <div className="space-y-1">
                {oneRepMax.map((e) => (
                  <div key={e.exerciseName} className="flex items-center justify-between text-sm">
                    <span className="truncate">{e.exerciseName}</span>
                    <span className="font-medium">{e.kg} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body composition (from assessments) */}
          {comp && (comp.weight.length > 0 || comp.bodyFat.length > 0 || comp.waist.length > 0) && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t("Composition (first → latest)", "Composição (primeira → última)")}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                {compTrend(comp.weight) && <span>{t("Weight", "Peso")} {compTrend(comp.weight)} kg</span>}
                {compTrend(comp.bodyFat) && <span>{t("Body fat", "Gordura")} {compTrend(comp.bodyFat)} %</span>}
                {compTrend(comp.waist) && <span>{t("Waist", "Cintura")} {compTrend(comp.waist)} cm</span>}
              </div>
            </div>
          )}

          {/* Recent sessions */}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t("Recent sessions", "Últimas sessões")}</p>
            <div className="space-y-1 text-sm">
              {recent.slice(0, 8).map((r) => (
                <div key={r.id} className="flex justify-between border-b py-1 last:border-0">
                  <span>{fmtDate(r.performedAt)}</span>
                  <span className="text-muted-foreground">
                    {r.setCount} {t("sets", "séries")} · {r.volume} kg·{t("reps", "reps")}
                    {r.sessionRpe ? ` · RPE ${r.sessionRpe}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
