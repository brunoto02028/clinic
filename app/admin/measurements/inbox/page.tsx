"use client";

/**
 * Readings from the clinic's cuff that arrived without a window open
 * (activity 074, T-15).
 *
 * This screen is the reason the system is allowed to refuse to guess. A
 * measurement with no session — the therapist forgot to press the button, or
 * the window had run out — is not lost and is not filed into a record by
 * chance: it waits here until a person says whose it is, or says it was a test
 * and why.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Inbox, Loader2, CloudOff, Check, Trash2, Search } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const UI = {
  "en-GB": {
    back: "Back to patients",
    title: "Measurements waiting to be assigned",
    subtitle:
      "Readings from the clinic's device that matched no measurement window. Nothing here is in a patient's record yet.",
    empty: "Nothing waiting. Every reading found its record.",
    failed: "We could not load the inbox.",
    failedHint: "This does not mean it is empty — the request failed.",
    retry: "Try again",
    reading: "Reading", measuredAt: "Measured", device: "Device",
    assign: "Assign to a patient", search: "Search by name or email",
    context: "When is this reading from?",
    pre: "Before the session", post: "After the session", home: "At home", other: "Other",
    confirm: "Assign", cancel: "Cancel",
    discard: "Discard", discardReason: "Why is this being discarded?",
    discardPlaceholder: "Test reading, visitor, wrong cuff…",
    discardConfirm: "Discard",
    assigned: "Assigned.", discarded: "Discarded.",
    noPatients: "No patient found.",
    deviceNone: "No clinic device connected yet.",
    deviceNoneHint: "Connect the clinic's Withings account once, and readings taken on it will file themselves.",
    connect: "Connect the clinic device",
    deviceOn: "Clinic device connected",
    deviceSilent: "Connected, but Withings has not confirmed it will send readings.",
    deviceQuiet: "Nothing has arrived from this device in {d} days.",
    deviceFix: "Try again",
    deviceFixed: "Withings will send readings now.",
    deviceStillSilent: "Withings still has not confirmed.",
  },
  "pt-BR": {
    back: "Voltar aos pacientes",
    title: "Medições esperando atribuição",
    subtitle:
      "Leituras do aparelho da clínica que não caíram em nenhuma janela de medição. Nada aqui está no prontuário de ninguém.",
    empty: "Nada esperando. Toda leitura encontrou seu prontuário.",
    failed: "Não foi possível carregar a caixa de entrada.",
    failedHint: "Isto não quer dizer que está vazia — a consulta falhou.",
    retry: "Tentar de novo",
    reading: "Leitura", measuredAt: "Medida em", device: "Aparelho",
    assign: "Atribuir a um paciente", search: "Buscar por nome ou e-mail",
    context: "De quando é esta medida?",
    pre: "Antes da sessão", post: "Depois da sessão", home: "Em casa", other: "Outro",
    confirm: "Atribuir", cancel: "Cancelar",
    discard: "Descartar", discardReason: "Por que está sendo descartada?",
    discardPlaceholder: "Medida de teste, visitante, manguito errado…",
    discardConfirm: "Descartar",
    assigned: "Atribuída.", discarded: "Descartada.",
    noPatients: "Nenhum paciente encontrado.",
    deviceNone: "Nenhum aparelho da clínica conectado ainda.",
    deviceNoneHint: "Conecte a conta Withings da clínica uma vez, e as medidas feitas nele se arquivam sozinhas.",
    connect: "Conectar o aparelho da clínica",
    deviceOn: "Aparelho da clínica conectado",
    deviceSilent: "Conectado, mas a Withings não confirmou que vai enviar as leituras.",
    deviceQuiet: "Nada chega deste aparelho há {d} dias.",
    deviceFix: "Tentar de novo",
    deviceFixed: "A Withings vai enviar as leituras agora.",
    deviceStillSilent: "A Withings ainda não confirmou.",
  },
} as const;

const CONTEXTS = ["PRE_SESSION", "POST_SESSION", "HOME", "OTHER"] as const;

export default function MeasurementInboxPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const ui = UI[isPt ? "pt-BR" : "en-GB"];
  const dateFmt = isPt ? "pt-BR" : "en-GB";

  const [rows, setRows] = useState<any[] | null>(null);
  // The device itself, so this screen can say why nothing ever arrives when
  // there is none — and be the one place that connects it.
  const [device, setDevice] = useState<
    {
      id: string;
      label: string | null;
      delivery?: "receiving" | "partial" | "silent" | "unchecked";
      daysSilent?: number | null;
      silent?: boolean;
    } | null | undefined
  >(undefined);
  const [fixing, setFixing] = useState(false);
  const [deviceMsg, setDeviceMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [assigning, setAssigning] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [context, setContext] = useState<(typeof CONTEXTS)[number]>("OTHER");
  const [reason, setReason] = useState("");

  const contextLabel = useMemo(
    () => ({ PRE_SESSION: ui.pre, POST_SESSION: ui.post, HOME: ui.home, OTHER: ui.other }),
    [ui]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/measurements/unassigned");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (!Array.isArray(data?.measurements)) throw new Error("malformed");
      setRows(data.measurements);
    } catch {
      setRows(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDevice = useCallback(() => {
    fetch("/api/admin/measurement-sessions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDevice(d?.device ?? null))
      .catch(() => setDevice(null));
  }, []);

  useEffect(() => {
    load();
    loadDevice();
  }, [load, loadDevice]);

  // The patient list is only fetched once a reading is actually being
  // assigned — the inbox itself has no business listing patients.
  useEffect(() => {
    if (!assigning) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/patients?search=${encodeURIComponent(query)}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients ?? data ?? []);
        }
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [assigning, query]);

  const assign = async (id: string, patientId: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/measurements/unassigned/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, context }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(res.ok ? ui.assigned : (isPt ? data?.errorPt : null) ?? data?.error ?? ui.failed);
      if (res.ok) {
        setAssigning(null);
        setQuery("");
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const discard = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/measurements/unassigned/${id}/discard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(res.ok ? ui.discarded : (isPt ? data?.errorPt : null) ?? data?.error ?? ui.failed);
      if (res.ok) {
        setDiscarding(null);
        setReason("");
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <Link href="/admin/patients" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />{ui.back}
        </Link>
        <h1 className="text-xl font-bold mt-1 flex items-center gap-2">
          <Inbox className="h-5 w-5 text-muted-foreground" />{ui.title}
        </h1>
        <p className="text-sm text-muted-foreground">{ui.subtitle}</p>
      </div>

      {message && (
        <p className="text-sm bg-muted/40 border rounded-md px-3 py-2">{message}</p>
      )}

      {device === null && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium">{ui.deviceNone}</p>
              <p className="text-xs text-muted-foreground">{ui.deviceNoneHint}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { window.location.href = "/api/wearables/connect/withings?clinic=1"; }}
            >
              {ui.connect}
            </Button>
          </CardContent>
        </Card>
      )}

      {device && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {ui.deviceOn}{device.label ? `: ${device.label}` : ""}
          </p>
          {/* "Conectado" dizia só que a autorização funcionou. Este manguito
              alimenta vários pacientes: se a Withings não confirmou o envio,
              ninguém ficava sabendo — e a clínica mediria achando que a leitura
              ia chegar (atividade 075, T-10). */}
          {device.silent && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {ui.deviceQuiet.replace("{d}", String(device.daysSilent ?? "?"))}
            </p>
          )}
          {(device.delivery === "silent" || device.delivery === "partial") && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <span>{ui.deviceSilent}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px]"
                disabled={fixing}
                onClick={async () => {
                  setFixing(true);
                  try {
                    const res = await fetch("/api/wearables/resubscribe", { method: "POST" });
                    const data = await res.json().catch(() => null);
                    setDeviceMsg(
                      res.ok && data?.delivery === "receiving" ? ui.deviceFixed : ui.deviceStillSilent
                    );
                  } catch {
                    setDeviceMsg(ui.deviceStillSilent);
                  }
                  setFixing(false);
                  loadDevice();
                }}
              >
                {ui.deviceFix}
              </Button>
              {deviceMsg && <span>{deviceMsg}</span>}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {!loading && failed && (
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <CloudOff className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="font-medium">{ui.failed}</p>
            <p className="text-sm text-muted-foreground">{ui.failedHint}</p>
            <Button size="sm" variant="outline" onClick={load}>{ui.retry}</Button>
          </CardContent>
        </Card>
      )}

      {!loading && rows && rows.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">{ui.empty}</CardContent>
        </Card>
      )}

      {!loading && rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-lg font-semibold">
                      {m.systolic}/{m.diastolic} mmHg
                      {m.heartRate ? <span className="text-sm font-normal text-muted-foreground"> · {m.heartRate} bpm</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ui.measuredAt}: {new Date(m.measuredAt).toLocaleString(dateFmt, { dateStyle: "short", timeStyle: "short" })}
                      {m.connection?.deviceLabel ? ` · ${ui.device}: ${m.connection.deviceLabel}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === m.id}
                      onClick={() => { setDiscarding(null); setAssigning(assigning === m.id ? null : m.id); }}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />{ui.assign}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === m.id}
                      onClick={() => { setAssigning(null); setDiscarding(discarding === m.id ? null : m.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />{ui.discard}
                    </Button>
                  </div>
                </div>

                {assigning === m.id && (
                  <div className="border-t pt-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground mr-1">{ui.context}</span>
                      {CONTEXTS.map((c) => (
                        <Button
                          key={c}
                          size="sm"
                          variant={context === c ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => setContext(c)}
                        >
                          {contextLabel[c]}
                        </Button>
                      ))}
                    </div>
                    <div>
                      <Label className="text-xs">{ui.search}</Label>
                      <div className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-8" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {patients.length === 0 && (
                        <p className="text-xs text-muted-foreground">{ui.noPatients}</p>
                      )}
                      {patients.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between border rounded-md px-2.5 py-1.5">
                          <span className="text-sm">
                            {p.firstName} {p.lastName}
                            <span className="text-xs text-muted-foreground ml-2">{p.email}</span>
                          </span>
                          <Button size="sm" className="h-7 text-xs" disabled={busy === m.id} onClick={() => assign(m.id, p.id)}>
                            {ui.confirm}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {discarding === m.id && (
                  <div className="border-t pt-3 space-y-2">
                    <Label className="text-xs">{ui.discardReason}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={reason}
                        placeholder={ui.discardPlaceholder}
                        onChange={(e) => setReason(e.target.value)}
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs"
                        disabled={reason.trim().length < 3 || busy === m.id}
                        onClick={() => discard(m.id)}
                      >
                        {ui.discardConfirm}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setDiscarding(null); setReason(""); }}>
                        {ui.cancel}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          <Badge variant="outline" className="text-xs">{rows.length}</Badge>
        </div>
      )}
    </div>
  );
}
