"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Loader2, CloudOff, Inbox, Trash2, Eye, Clock, AlertTriangle } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = "AWAITING_APPROVAL" | "APPROVED" | "SENT" | "FAILED" | "DISCARDED";

interface Row {
  id: string;
  ruleCode: string;
  channel: string;
  status: Status;
  holdReason: string | null;
  subjectEn: string;
  subjectPt: string;
  bodyEn: string;
  bodyPt: string;
  createdAt: string;
  sentAt: string | null;
  providerError: string | null;
  patient: { id: string; firstName: string; lastName: string; preferredLocale: string | null } | null;
  approvedBy: { firstName: string; lastName: string } | null;
}

/** English canonical, Portuguese by the staff member's locale. */
const UI = {
  "en-GB": {
    title: "Waiting for you",
    subtitle: "The automation wrote these. Nothing goes out until you approve it.",
    waiting: "Waiting", approved: "Approved", sent: "Sent", discarded: "Discarded", all: "All",
    empty: "Nothing waiting.", emptyHint: "Messages appear here when a rule wants to write to someone.",
    failed: "We could not load the queue.",
    failedHint: "This does not mean it is empty — the request failed.",
    retry: "Try again", preview: "Read it", approve: "Approve and send", discard: "Discard",
    previewFailed: "We could not render the preview. Not approving something nobody can read.",
    stale: "This changed since you read it. Open it again.",
    actionFailed: "That did not go through. The list has been refreshed.",
    held: "Approved, not sent yet",
    holdReasons: {
      QUIET_HOURS: "inside the patient's quiet hours — it goes out when they end",
      DAILY_CAP: "the patient already had the day's messages — it goes out tomorrow",
      NO_CONSENT: "this patient has not accepted the terms",
      NO_EMAIL: "this patient has no e-mail address on file",
    } as Record<string, string>,
    rule: "Rule", to: "To", whatGoesOut: "What goes out",
  },
  "pt-BR": {
    title: "Esperando você",
    subtitle: "A automação escreveu estas. Nada sai até você aprovar.",
    waiting: "Esperando", approved: "Aprovadas", sent: "Enviadas", discarded: "Descartadas", all: "Todas",
    empty: "Nada esperando.", emptyHint: "As mensagens aparecem aqui quando uma regra quer escrever para alguém.",
    failed: "Não foi possível carregar a fila.",
    failedHint: "Isto não quer dizer que está vazia — a consulta falhou.",
    retry: "Tentar de novo", preview: "Ler", approve: "Aprovar e enviar", discard: "Descartar",
    previewFailed: "Não foi possível montar a prévia. Não dá para aprovar o que ninguém consegue ler.",
    stale: "Isto mudou desde que você leu. Abra de novo.",
    actionFailed: "Não deu certo. A lista foi atualizada.",
    held: "Aprovada, ainda não enviada",
    holdReasons: {
      QUIET_HOURS: "dentro do horário de silêncio do paciente — sai quando terminar",
      DAILY_CAP: "o paciente já recebeu as mensagens do dia — sai amanhã",
      NO_CONSENT: "este paciente não aceitou os termos",
      NO_EMAIL: "este paciente não tem e-mail cadastrado",
    } as Record<string, string>,
    rule: "Regra", to: "Para", whatGoesOut: "O que vai sair",
  },
} as const;

export default function OutboxQueue() {
  const { locale } = useLocale();
  const ui = UI[locale === "pt-BR" ? "pt-BR" : "en-GB"];

  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "ALL">("AWAITING_APPROVAL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ html: string; hash: string } | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const qs = filter === "ALL" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/outbox${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setRows(Array.isArray(data.messages) ? data.messages : []);
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

  // Reading it is what unlocks approving: the hash the server returns is what
  // the approval is bound to, so nobody can approve a text they never saw.
  const openPreview = async (id: string) => {
    setOpenId(id);
    setPreview(null);
    setPreviewFailed(false);
    try {
      const res = await fetch(`/api/outbox/${id}/preview`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setPreview({ html: data.html, hash: data.hash });
    } catch {
      setPreviewFailed(true);
    }
  };

  const act = async (id: string, action: "approve" | "discard") => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/outbox/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "approve" ? { hash: preview?.hash } : {}),
      });
      if (!res.ok) setActionError(res.status === 409 ? ui.stale : ui.actionFailed);
      setOpenId(null);
      setPreview(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="p-6 space-y-6" data-testid="outbox-queue">
      <div className="flex items-start gap-3">
        <Send className="h-6 w-6 text-foreground mt-0.5" />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{ui.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{ui.subtitle}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["AWAITING_APPROVAL", "APPROVED", "SENT", "DISCARDED", "ALL"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "AWAITING_APPROVAL" ? ui.waiting : f === "APPROVED" ? ui.approved
              : f === "SENT" ? ui.sent : f === "DISCARDED" ? ui.discarded : ui.all}
          </Button>
        ))}
      </div>

      {actionError && (
        <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : failed ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CloudOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-foreground">{ui.failed}</p>
            <p className="text-sm text-muted-foreground">{ui.failedHint}</p>
            <Button variant="outline" size="sm" onClick={load}>{ui.retry}</Button>
          </CardContent>
        </Card>
      ) : rows && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-foreground">{ui.empty}</p>
            <p className="text-sm text-muted-foreground">{ui.emptyHint}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows?.map((m) => (
            <Card key={m.id} data-testid="outbox-row">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{m.status}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{m.ruleCode}</span>
                      <span className="text-xs text-muted-foreground">{fmt(m.createdAt)}</span>
                    </div>
                    <p className="font-medium text-foreground">{m.subjectEn}</p>
                    {m.patient && (
                      <p className="text-sm text-muted-foreground">
                        {ui.to}: {m.patient.firstName} {m.patient.lastName}
                      </p>
                    )}
                    {m.holdReason && (
                      <p className="text-sm text-amber-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {ui.held} — {ui.holdReasons[m.holdReason] ?? m.holdReason}
                      </p>
                    )}
                    {m.providerError && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {m.providerError}
                      </p>
                    )}
                  </div>

                  {m.status === "AWAITING_APPROVAL" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openPreview(m.id)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />{ui.preview}
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act(m.id, "discard")}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />{ui.discard}
                      </Button>
                    </div>
                  )}
                </div>

                {openId === m.id && (
                  <div className="border-t pt-3 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">{ui.whatGoesOut}</p>
                    {previewFailed ? (
                      <p className="text-sm text-red-400">{ui.previewFailed}</p>
                    ) : !preview ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        {/* The real thing, BPR layout and both languages — not a
                            paraphrase of it. Sandboxed: this is e-mail HTML. */}
                        <iframe
                          title="preview"
                          sandbox=""
                          srcDoc={preview.html}
                          className="w-full h-96 border rounded-md bg-white"
                        />
                        <Button size="sm" disabled={busy} onClick={() => act(m.id, "approve")}>
                          <Send className="h-3.5 w-3.5 mr-1" />{ui.approve}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
