"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface Assessment {
  id: string;
  performedAt: string;
  weightKg: number | null;
  bmi: number | null;
  bodyFatPct: number | null;
  bfMethod: string;
  leanMassKg: number | null;
  fatMassKg: number | null;
  whr: number | null;
  restingHr: number | null;
  girths: Record<string, number> | null;
  photos: { id: string; pose: string; url: string }[];
}

// Direction of change: 1 up, -1 down, 0 flat/unknown.
const trendDir = (first: number | null, last: number | null): -1 | 0 | 1 => {
  if (first == null || last == null || first === last) return 0;
  return last > first ? 1 : -1;
};

export default function StudentAssessments() {
  const { locale } = useLocale();
  const isPt = !!locale?.startsWith("pt");
  const t = (en: string, pt: string) => (isPt ? pt : en);

  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(true); // false when the module is off (404)

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/assessments");
        // 404 = training module off / clinic patient → not available (not an error).
        if (r.status === 404) { if (live) { setAvailable(false); setList([]); } return; }
        if (!r.ok) throw new Error(String(r.status));
        const data = await r.json();
        if (live) setList(Array.isArray(data) ? data : []);
      } catch {
        if (live) setError(t("Could not load your assessments.", "Não foi possível carregar suas avaliações."));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading your assessments…", "Carregando suas avaliações…")}
      </div>
    );
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(isPt ? "pt-BR" : "en-GB");
  // Chronological series for trends (list comes newest-first).
  const chrono = [...list].reverse();
  const seriesOf = (pick: (a: Assessment) => number | null) => chrono.map(pick).filter((v): v is number => v != null);
  const weightSeries = seriesOf((a) => a.weightKg);
  const bfSeries = seriesOf((a) => a.bodyFatPct);
  const waistSeries = seriesOf((a) => a.girths?.waist ?? null);

  const trendRow = (label: string, series: number[], unit: string) => {
    if (series.length === 0) return null;
    const first = series[0];
    const last = series[series.length - 1];
    const dir = trendDir(first, last); // single source of truth for icon + colour
    const Icon = dir > 0 ? TrendingUp : dir < 0 ? TrendingDown : Minus;
    // For weight/waist/body-fat, down is good → green; up → red.
    const color = dir < 0 ? "text-green-600" : dir > 0 ? "text-red-500" : "text-muted-foreground";
    return (
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className={`flex items-center gap-1 ${color}`}>
          <Icon className="h-3.5 w-3.5" />
          {first}{first !== last ? `→${last}` : ""} {unit}
        </span>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <HeartPulse className="h-5 w-5 text-primary" /> {t("My Assessments", "Minhas Avaliações")}
      </h1>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {list.length === 0 ? (
        !error && (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {!available
              ? t("Assessments aren't available on your plan.", "Avaliações não estão disponíveis no seu plano.")
              : t("No assessments yet. Your trainer will record these.", "Nenhuma avaliação ainda. Seu personal vai registrar.")}
          </p>
        )
      ) : (
        <>
          {/* Trends */}
          <div className="rounded-md border p-4 space-y-2">
            <p className="text-xs text-muted-foreground">{t("Evolution (first → latest)", "Evolução (primeira → última)")}</p>
            {trendRow(t("Weight", "Peso"), weightSeries, "kg")}
            {trendRow(t("Body fat", "Gordura"), bfSeries, "%")}
            {trendRow(t("Waist", "Cintura"), waistSeries, "cm")}
          </div>

          {/* History */}
          <div className="space-y-2">
            {list.map((a) => (
              <div key={a.id} className="rounded-md border p-3">
                <p className="font-medium">{fmt(a.performedAt)}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {a.weightKg != null && <span>{a.weightKg} kg</span>}
                  {a.bmi != null && <span>BMI {a.bmi}</span>}
                  {a.bodyFatPct != null && <span>{a.bodyFatPct}% {t("body fat", "gordura")}</span>}
                  {a.leanMassKg != null && <span>{t("lean", "magra")} {a.leanMassKg} kg</span>}
                  {a.whr != null && <span>WHR {a.whr}</span>}
                  {a.restingHr != null && <span>{t("resting HR", "FC repouso")} {a.restingHr}</span>}
                </div>
                {a.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.photos.map((p) => (
                      <img key={p.id} src={p.url} alt={p.pose} title={p.pose} className="h-20 w-14 rounded object-cover" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
