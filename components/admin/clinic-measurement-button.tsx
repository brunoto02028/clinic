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
import { Activity, Loader2, X, CheckCircle2, Inbox, AlertCircle, AlertTriangle } from "lucide-react";
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
    naoMedi: "I did not measure",
    expiredHint: "If you did measure, it is in the inbox.",
    inbox: "Open the inbox",
    again: "Open again",
    busy: (name: string) => `${name} is being measured on this device right now.`,
    failed: "We could not open the measurement.",
    cancelled: "Measurement cancelled.",
    fetchNow: "I have measured",
    fetching: "Fetching…",
    fetchedNone: "Nothing from the device yet. Give it a moment and try again.",
    fetchedElsewhere: "A reading arrived but matched no window — it is in the inbox.",
    aparelhoPrecisaReconectar:
      "The clinic device needs to be reconnected before you can measure a patient.",
    aparelhoParado: "The clinic device is not delivering right now — measurements cannot be attributed.",
    abrirAparelhos: "Reconnect the device",
    fetchedEcg: (n: number) =>
      n === 1
        ? "No blood pressure yet — one ECG was saved to this record."
        : `No blood pressure yet — ${n} ECGs were saved to this record.`,
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
    naoMedi: "Não medi",
    expiredHint: "Se você mediu, ela está na caixa de entrada.",
    inbox: "Abrir a caixa de entrada",
    again: "Abrir de novo",
    busy: (name: string) => `${name} está sendo medido neste aparelho agora.`,
    failed: "Não foi possível abrir a medição.",
    cancelled: "Medição cancelada.",
    fetchNow: "Já medi",
    fetching: "Buscando…",
    fetchedNone: "Nada veio do aparelho ainda. Espere um instante e tente de novo.",
    fetchedElsewhere: "Chegou uma leitura, mas fora desta janela — está na caixa de entrada.",
    aparelhoPrecisaReconectar:
      "O aparelho da clínica precisa ser reconectado antes de medir um paciente.",
    aparelhoParado: "O aparelho da clínica não está entregando — a medição não seria atribuída.",
    abrirAparelhos: "Reconectar o aparelho",
    fetchedEcg: (n: number) =>
      n === 1
        ? "Nenhuma pressão ainda — um ECG foi salvo neste histórico."
        : `Nenhuma pressão ainda — ${n} ECG foram salvos neste histórico.`,
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

  const [device, setDevice] = useState<{
    id: string;
    label: string | null;
    precisaReconectar?: boolean;
  } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<any | null>(null);
  const [reading, setReading] = useState<any | null>(null);
  // "Já medi": puxa da Withings em vez de esperar o empurrão (092 T-2).
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  /** Há aparelho da clínica, mas não está a servir — ver a rota (121 T-10). */
  const [parado, setParado] = useState<{ label: string | null; precisaReconectar: boolean } | null>(
    null
  );
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  // Does this clinic even have a device? Without one the button must not
  // exist — offering an action that cannot work is worse than not offering it.
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/measurement-sessions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (d?.device) setDevice(d.device);
        else if (d?.deviceParado) setParado(d.deviceParado);
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

  /**
   * "Já medi" — puxa da Withings agora, em vez de esperar o webhook (092 T-2).
   *
   * Três desfechos, e cada um precisa de uma frase diferente:
   *
   * - a leitura casou esta janela → é o caminho feliz, mesma tela de sempre;
   * - **veio leitura, mas fora da janela** → foi para a caixa de entrada, e a
   *   pessoa precisa saber onde procurar em vez de achar que sumiu;
   * - **não veio pressão, mas veio ECG** → o aparelho da clínica passou a ler
   *   ECG também (122 T-2), e um terapeuta que gravou um ECG e ouvisse "nada
   *   veio do aparelho" iria procurar o defeito que não existe. Esta frase
   *   **soma-se** à da caixa de entrada em vez de a esconder;
   * - não veio nada → o aparelho ainda não subiu; tentar de novo em instantes.
   */
  const buscarAgora = async () => {
    if (!session?.id) return;
    setBuscando(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/admin/measurement-sessions/${session.id}/fetch`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAviso((isPt ? data?.errorPt : data?.error) || ui.failed);
      } else if (data?.found && data?.reading) {
        stopPolling();
        setReading(data.reading);
        setPhase("done");
        onReading?.();
      } else {
        /*
         * **As frases somam-se, não se escondem.**
         *
         * Com o ramo do ECG antes do ramo do `lidas`, uma pressão que foi para
         * a caixa de entrada desaparecia da tela assim que houvesse um ECG — e
         * de três mensagens possíveis, a da caixa é a única que pede uma acção
         * humana.
         */
        const partes: string[] = [];
        if (data?.ecg > 0) partes.push(ui.fetchedEcg(data.ecg));
        if (data?.lidas > 0) partes.push(ui.fetchedElsewhere);
        setAviso(partes.length ? partes.join(" ") : ui.fetchedNone);
        if (data?.ecg > 0) onReading?.();
      }
    } catch {
      setAviso(ui.failed);
    } finally {
      setBuscando(false);
    }
  };

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

  /*
   * **Um aparelho que a rota devolve, mas cuja autorização morreu.**
   *
   * `clinicDevice` só filtra por `status`, e uma cadeia de tokens que morreu
   * antes de 03/10 deixou a ligação `CONNECTED`. Medir com ela produz uma
   * janela que nunca recebe leitura nenhuma — e o terapeuta só descobre três
   * minutos depois, com o paciente à frente.
   */
  const paradoOuMorto =
    parado ?? (device?.precisaReconectar ? { label: device.label, precisaReconectar: true } : null);

  if (!device || device.precisaReconectar) {
    /*
     * **Sem aparelho, nada** — oferecer uma acção que não pode funcionar é pior
     * do que não a oferecer. Mas **com aparelho parado, a razão**: a tela ficava
     * exactamente igual nos dois casos, e o terapeuta com o aparelho na mão
     * lia "esta clínica não tem aparelho", que é falso.
     */
    if (!paradoOuMorto) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-1.5 min-w-0 max-w-full">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-sm">
          {paradoOuMorto.precisaReconectar ? ui.aparelhoPrecisaReconectar : ui.aparelhoParado}
          {paradoOuMorto.label ? ` (${paradoOuMorto.label})` : ""}
        </span>
        {/* A caixa de entrada é "o único sítio que o liga" — é lá que está o
            botão de reconectar e o texto que explica o token morto. */}
        <Link href="/admin/measurements/inbox" className="text-xs underline underline-offset-2">
          {ui.abrirAparelhos}
        </Link>
      </div>
    );
  }

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
        {/* "Já medi — busca agora" (092 T-2).
            Até aqui esta tela **só escutava**: ficava consultando até a
            Withings resolver nos avisar. Se a notificação não vem — assinatura
            vencida, aparelho que só sobe horas depois, rede do consultório — a
            espera nunca termina e ninguém descobre que não veio.
            Quem sabe que a medição aconteceu é quem acabou de medir. */}
        <Button size="sm" variant="outline" className="h-7" disabled={buscando} onClick={buscarAgora}>
          {buscando ? ui.fetching : ui.fetchNow}
        </Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={cancel}>
          <X className="h-3.5 w-3.5 mr-1" />{ui.cancel}
        </Button>
        {aviso && <span className="text-xs text-muted-foreground">{aviso}</span>}
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
        {/*
          **"Não medi"** (achado do QA, 03/10). Uma janela expirada continua a
          reclamar medições — é de propósito, para a leitura que sobe horas
          depois não se perder. O efeito colateral é a janela abandonada: o
          terapeuta abre-a, não mede, e a medição seguinte **de quem quer que
          seja**, carimbada naqueles três minutos, entra nesta ficha. Até agora
          não havia como desdizer.
        */}
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancel}>
          {ui.naoMedi}
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
