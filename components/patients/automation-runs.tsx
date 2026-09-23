"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, CloudOff, Activity, AlertTriangle } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Run {
  id: string;
  ruleCode: string;
  window: string;
  status: "RUNNING" | "DONE" | "FAILED";
  result: string | null;
  details: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  createdAt: string;
}

const UI = {
  "en-GB": {
    title: "What the automation did",
    subtitle: "Which rule ran, when, and on what figures.",
    empty: "No rule has run for this patient yet.",
    failed: "We could not load the history.",
    failedHint: "This does not mean nothing ran — the request failed.",
    retry: "Try again",
    window: "Window",
    attempts: "attempts",
  },
  "pt-BR": {
    title: "O que a automação fez",
    subtitle: "Qual regra rodou, quando, e com que números.",
    empty: "Nenhuma regra rodou para este paciente ainda.",
    failed: "Não foi possível carregar o histórico.",
    failedHint: "Isto não quer dizer que nada rodou — a consulta falhou.",
    retry: "Tentar de novo",
    window: "Janela",
    attempts: "tentativas",
  },
} as const;

export default function AutomationRuns({ patientId }: { patientId: string }) {
  const { locale } = useLocale();
  const ui = UI[locale === "pt-BR" ? "pt-BR" : "en-GB"];

  const [runs, setRuns] = useState<Run[] | null>(null);
  // An empty history and a failed request must not look alike.
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/patients/${patientId}/automation-runs`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setRuns(Array.isArray(data.runs) ? data.runs : []);
    } catch {
      setFailed(true);
      setRuns(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (failed) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CloudOff className="h-8 w-8 text-muted-foreground" />
          <p>{ui.failed}</p>
          <p className="text-sm text-muted-foreground">{ui.failedHint}</p>
          <Button variant="outline" size="sm" onClick={load}>{ui.retry}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="automation-runs">
      <div>
        <h3 className="font-medium">{ui.title}</h3>
        <p className="text-sm text-muted-foreground">{ui.subtitle}</p>
      </div>

      {runs && runs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Activity className="h-8 w-8 text-muted-foreground" />
            <p>{ui.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {runs?.map((r) => (
            <Card key={r.id} data-testid="automation-run">
              <CardContent className="py-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">{r.ruleCode}</Badge>
                  {r.result && <Badge variant="secondary">{r.result}</Badge>}
                  {r.status === "FAILED" && (
                    <Badge variant="outline" className="border-red-200 text-red-700">FAILED</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{fmt(r.createdAt)}</span>
                  <span className="text-xs text-muted-foreground">{ui.window}: {r.window}</span>
                  {r.attempts > 1 && (
                    <span className="text-xs text-muted-foreground">{r.attempts} {ui.attempts}</span>
                  )}
                </div>

                {/* The figures the rule looked at — the "on what" of the answer. */}
                {r.details && Object.keys(r.details).length > 0 && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm rounded-md bg-muted/40 px-3 py-2">
                    {Object.entries(r.details).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd>{Array.isArray(v) ? v.join(" · ") : String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {r.error && (
                  <p className="text-sm text-red-700 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />{r.error}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
