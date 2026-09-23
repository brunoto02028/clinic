"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  CloudOff,
  Eye,
  ArrowRight,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

interface AlertRow {
  id: string;
  ruleCode: string;
  priority: Priority;
  status: Status;
  title: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  ackAt: string | null;
  resolvedAt: string | null;
  patient: { id: string; firstName: string; lastName: string } | null;
  ackBy: { firstName: string; lastName: string } | null;
  resolvedBy: { firstName: string; lastName: string } | null;
}

/** English canonical, Portuguese by the staff member's locale. */
const UI = {
  "en-GB": {
    title: "Alerts",
    subtitle: "What the automation noticed. Nothing here was sent to the patient.",
    open: "Open",
    acknowledged: "Acknowledged",
    resolved: "Resolved",
    all: "All",
    empty: "Nothing needs your attention.",
    emptyHint: "Alerts appear here when a rule fires.",
    failed: "We could not load the alerts.",
    failedHint: "This does not mean there are none — the request failed.",
    retry: "Try again",
    ack: "Acknowledge",
    resolve: "Resolve",
    ackedBy: "Acknowledged by",
    resolvedBy: "Resolved by",
    viewPatient: "Open patient",
    why: "Why it fired",
    stale: "Someone else already handled this one. The list has been refreshed.",
    actionFailed: "That did not go through. The list has been refreshed.",
  },
  "pt-BR": {
    title: "Alertas",
    subtitle: "O que a automação percebeu. Nada aqui foi enviado ao paciente.",
    open: "Abertos",
    acknowledged: "Ciente",
    resolved: "Resolvidos",
    all: "Todos",
    empty: "Nada precisa da sua atenção.",
    emptyHint: "Os alertas aparecem aqui quando uma regra dispara.",
    failed: "Não foi possível carregar os alertas.",
    failedHint: "Isto não quer dizer que não existam — a consulta falhou.",
    retry: "Tentar de novo",
    ack: "Ciente",
    resolve: "Resolver",
    ackedBy: "Ciente por",
    resolvedBy: "Resolvido por",
    viewPatient: "Abrir paciente",
    why: "Por que disparou",
    stale: "Outra pessoa já tratou deste. A lista foi atualizada.",
    actionFailed: "Não deu certo. A lista foi atualizada.",
  },
} as const;

const PRIORITY_STYLE: Record<Priority, string> = {
  URGENT: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function AlertsCentre() {
  const { locale } = useLocale();
  const ui = UI[locale === "pt-BR" ? "pt-BR" : "en-GB"];

  const [rows, setRows] = useState<AlertRow[] | null>(null);
  // An empty list and a failed request must not look alike.
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "ALL">("OPEN");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const qs = filter === "ALL" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/alerts${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setRows(Array.isArray(data.alerts) ? data.alerts : []);
    } catch {
      setFailed(true);
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "acknowledge" | "resolve") => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        // A colleague may have resolved it while this list sat open. Say so and
        // reload either way: a click that does nothing, on a row that stays put,
        // is indistinguishable from a click that did not register — so the
        // therapist clicks again.
        setActionError(res.status === 409 ? ui.stale : ui.actionFailed);
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-6 space-y-6" data-testid="alerts-centre">
      <div className="flex items-start gap-3">
        <Bell className="h-6 w-6 text-slate-700 mt-0.5" />
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{ui.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{ui.subtitle}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["OPEN", "ACKNOWLEDGED", "RESOLVED", "ALL"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "OPEN" ? ui.open : f === "ACKNOWLEDGED" ? ui.acknowledged : f === "RESOLVED" ? ui.resolved : ui.all}
          </Button>
        ))}
      </div>

      {actionError && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : failed ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CloudOff className="h-8 w-8 text-slate-400" />
            <p className="text-slate-800">{ui.failed}</p>
            <p className="text-sm text-slate-500">{ui.failedHint}</p>
            <Button variant="outline" size="sm" onClick={load}>
              {ui.retry}
            </Button>
          </CardContent>
        </Card>
      ) : rows && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-slate-800">{ui.empty}</p>
            <p className="text-sm text-slate-500">{ui.emptyHint}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows?.map((a) => (
            <Card key={a.id} data-testid="alert-row">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={PRIORITY_STYLE[a.priority]}>
                        {a.priority}
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">{a.ruleCode}</span>
                      <span className="text-xs text-slate-400">{fmt(a.createdAt)}</span>
                    </div>
                    <p className="font-medium text-slate-900">{a.title}</p>
                    {a.patient && (
                      <Link
                        href={`/dashboard/patients/${a.patient.id}`}
                        className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                      >
                        {a.patient.firstName} {a.patient.lastName}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {a.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === a.id}
                        onClick={() => act(a.id, "acknowledge")}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        {ui.ack}
                      </Button>
                    )}
                    {a.status !== "RESOLVED" && (
                      <Button
                        size="sm"
                        disabled={busyId === a.id}
                        onClick={() => act(a.id, "resolve")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        {ui.resolve}
                      </Button>
                    )}
                  </div>
                </div>

                {/* The figures the rule looked at, so the therapist can judge
                    without going to fetch the data themselves. */}
                {a.details && Object.keys(a.details).length > 0 && (
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-xs font-medium text-slate-500 mb-1">{ui.why}</p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {Object.entries(a.details).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-slate-500">{k}</dt>
                          <dd className="text-slate-800">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {a.ackAt && a.ackBy && (
                  <p className="text-xs text-slate-500">
                    {ui.ackedBy} {a.ackBy.firstName} {a.ackBy.lastName} · {fmt(a.ackAt)}
                  </p>
                )}
                {a.resolvedAt && a.resolvedBy && (
                  <p className="text-xs text-slate-500">
                    {ui.resolvedBy} {a.resolvedBy.firstName} {a.resolvedBy.lastName} ·{" "}
                    {fmt(a.resolvedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {rows && rows.some((a) => a.priority === "URGENT" && a.status === "OPEN") && (
        <p className="flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {locale === "pt-BR"
            ? "Há alertas urgentes em aberto."
            : "There are open urgent alerts."}
        </p>
      )}
    </div>
  );
}
