"use client";

/**
 * "Measure blood pressure" on a patient's record (activity 074, T-15).
 *
 * The therapist opens a three-minute window, the patient uses the clinic's
 * cuff, and the reading files itself into this record. What the therapist sees
 * has to be honest at every step, because the alternative to this screen is
 * typing numbers by hand and knowing they went in:
 *
 * - while waiting, a countdown and the device's name, not a spinner;
 * - when it lands, the numbers, so nobody has to go and check;
 * - when the window runs out, where the reading went (the inbox) instead of
 *   silence;
 * - when another patient already has the device, who it is.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Loader2, X, CheckCircle2, Inbox, AlertCircle } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const POLL_MS = 3000;

const UI = {
  "en-GB": {
    measure: "Measure blood pressure",
    context: "When is this reading from?",
    pre: "Before the session",
    post: "After the session",
    other: "Other",
    waiting: (name: string) => `Waiting for ${name}'s reading…`,
    onDevice: "on",
    cancel: "Cancel",
    saved: (name: string) => `Saved to ${name}'s record`,
    expired: "No reading arrived",
    expiredHint: "If you did measure, it is in the inbox.",
    inbox: "Open the inbox",
    again: "Open again",
    busy: (name: string) => `${name} is being measured on this device right now.`,
    failed: "We could not open the measurement.",
    cancelled: "Measurement cancelled.",
  },
  "pt-BR": {
    measure: "Medir pressão",
    context: "De quando é esta medida?",
    pre: "Antes da sessão",
    post: "Depois da sessão",
    other: "Outro",
    waiting: (name: string) => `Aguardando a medição de ${name}…`,
    onDevice: "em",
    cancel: "Cancelar",
    saved: (name: string) => `Salvo no histórico de ${name}`,
    expired: "Nenhuma medição chegou",
    expiredHint: "Se você mediu, ela está na caixa de entrada.",
    inbox: "Abrir a caixa de entrada",
    again: "Abrir de novo",
    busy: (name: string) => `${name} está sendo medido neste aparelho agora.`,
    failed: "Não foi possível abrir a medição.",
    cancelled: "Medição cancelada.",
  },
} as const;

type Phase = "idle" | "choosing" | "waiting" | "done" | "expired" | "error";

export default function ClinicMeasurementButton({
  patientId,
  patientName,
  onReading,
}: {
  patientId: string;
  patientName: string;
  onReading?: () => void;
}) {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const ui = UI[isPt ? "pt-BR" : "en-GB"];

  const [device, setDevice] = useState<{ id: string; label: string | null } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<any | null>(null);
  const [reading, setReading] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  // Does this clinic even have a device? Without one the button must not
  // exist — offering an action that cannot work is worse than not offering it.
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/measurement-sessions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.device) setDevice(d.device);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (poll.current) {
      clearInterval(poll.current);
      poll.current = null;
    }
  }, []);

  // Stops when the component goes away, so a therapist who navigates off is
  // not leaving a request every three seconds behind them.
  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    if (phase !== "waiting" || !session) return;
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [phase, session]);

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      poll.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/measurement-sessions/${id}`);
          if (!res.ok) return;
          const data = await res.json();
          const s = data.session;
          if (s.status === "COMPLETED") {
            stopPolling();
            setReading(s.reading);
            setPhase("done");
            onReading?.();
          } else if (s.status === "EXPIRED" || s.status === "CANCELLED") {
            stopPolling();
            setPhase(s.status === "EXPIRED" ? "expired" : "idle");
            if (s.status === "CANCELLED") setMessage(ui.cancelled);
          }
        } catch {
          // A failed poll is not a failed measurement; the next tick tries again.
        }
      }, POLL_MS);
    },
    [onReading, stopPolling, ui.cancelled]
  );

  const open = async (context: "PRE_SESSION" | "POST_SESSION" | "OTHER") => {
    setMessage(null);
    setReading(null);
    try {
      const res = await fetch("/api/admin/measurement-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, context }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        const other = data?.open?.patient;
        setMessage(ui.busy(other ? `${other.firstName} ${other.lastName}` : "Someone"));
        setPhase("error");
        return;
      }
      if (!res.ok) {
        setMessage((isPt ? data?.errorPt : null) ?? data?.error ?? ui.failed);
        setPhase("error");
        return;
      }
      setSession(data.session);
      setPhase("waiting");
      startPolling(data.session.id);
    } catch {
      setMessage(ui.failed);
      setPhase("error");
    }
  };

  const cancel = async () => {
    if (!session) return;
    stopPolling();
    setPhase("idle");
    setMessage(ui.cancelled);
    await fetch(`/api/admin/measurement-sessions/${session.id}/cancel`, { method: "POST" }).catch(() => {});
  };

  if (!device) return null;

  if (phase === "waiting" && session) {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(1, "0");
    const ss = String(secondsLeft % 60).padStart(2, "0");
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ba1-health/40 bg-ba1-health/5 px-3 py-1.5 min-w-0 max-w-full">
        <Loader2 className="h-4 w-4 animate-spin text-ba1-health" />
        <span className="text-sm">{ui.waiting(patientName)}</span>
        <Badge variant="outline" className="font-mono text-[11px]">{mm}:{ss}</Badge>
        {device.label && (
          <span className="text-xs text-muted-foreground">{ui.onDevice} {device.label}</span>
        )}
        <Button size="sm" variant="ghost" className="h-7" onClick={cancel}>
          <X className="h-3.5 w-3.5 mr-1" />{ui.cancel}
        </Button>
      </div>
    );
  }

  if (phase === "done" && reading) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 min-w-0 max-w-full">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-semibold">
          {reading.systolic}/{reading.diastolic} mmHg
          {reading.heartRate ? ` · ${reading.heartRate} bpm` : ""}
        </span>
        <span className="text-xs text-muted-foreground">{ui.saved(patientName)}</span>
        <Button size="sm" variant="ghost" className="h-7" onClick={() => setPhase("idle")}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-1.5 flex-wrap min-w-0 max-w-full">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <span className="text-sm">{ui.expired}</span>
        <span className="text-xs text-muted-foreground">{ui.expiredHint}</span>
        <Link href="/admin/measurements/inbox">
          <Button size="sm" variant="outline" className="h-7 text-xs">
            <Inbox className="h-3.5 w-3.5 mr-1" />{ui.inbox}
          </Button>
        </Link>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPhase("choosing")}>
          {ui.again}
        </Button>
      </div>
    );
  }

  if (phase === "choosing") {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 flex-wrap min-w-0 max-w-full">
        <span className="text-xs text-muted-foreground">{ui.context}</span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => open("PRE_SESSION")}>{ui.pre}</Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => open("POST_SESSION")}>{ui.post}</Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => open("OTHER")}>{ui.other}</Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={() => setPhase("idle")}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPhase("choosing")}>
        <Activity className="h-3.5 w-3.5 mr-1" />{ui.measure}
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
