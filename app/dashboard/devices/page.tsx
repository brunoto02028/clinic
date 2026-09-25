"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Watch, Activity, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { OW_PROVIDERS } from "@/lib/open-wearables";
import { ConnectDeviceCard } from "@/components/wearables/connect-device-card";
import { SleepSummary } from "@/components/wearables/sleep-summary";
import { RecoveryCard } from "@/components/wearables/recovery-card";
import { ActivityCard } from "@/components/wearables/activity-card";
import { NonEmergencyNotice } from "@/components/patient/non-emergency-notice";

/**
 * Connected devices and what they measured, on a page of their own.
 *
 * They used to share /dashboard/biohacking with the daily check-in, which is a
 * different thing governed by a different module (`mod_journey`). The app has
 * always split them — Devices and Daily check-in are two screens — so the two
 * surfaces disagreed about what a page is, and `mod_devices` could not be given
 * an address without taking the check-in from anyone who has the journey but
 * not the devices. Splitting here is what lets the module own a route.
 */

interface WearableConnection {
  id: string;
  provider: string;
  status: string;
  lastSyncedAt: string | null;
  createdAt: string;
  /** Se o provedor confirmou que vai enviar — ver lib/withings-subscriptions. */
  delivery?: 'receiving' | 'partial' | 'silent' | 'unchecked';
  missingBloodPressure?: boolean;
}

interface WearableDataPoint {
  id: string;
  dataDate: string;
  dataType: string;
  provider: string;
  sleepDuration?: number | null;
  sleepEfficiency?: number | null;
  deepMinutes?: number | null;
  remMinutes?: number | null;
  lightMinutes?: number | null;
  awakeMinutes?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  spo2?: number | null;
  bodyTemperature?: number | null;
  steps?: number | null;
  activeCalories?: number | null;
  totalCalories?: number | null;
  activeMinutes?: number | null;
}

export default function DevicesPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<WearableConnection[]>([]);
  const [wearableData, setWearableData] = useState<WearableDataPoint[]>([]);
  // `wearableMsg` é derivado do parâmetro de volta do provedor, não é estado.
  // O resultado de "Corrigir" precisa do próprio.
  const [fixMsg, setFixMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const connected = searchParams?.get("connected");
  const wearableMsg =
    connected === "1"
      ? isPt
        ? "Wearable conectado! Os dados vão sincronizar em breve."
        : "Wearable connected! Data will sync shortly."
      : connected === "0"
        ? isPt
          ? "Falha ao conectar o wearable. Tente novamente."
          : "Wearable connection failed. Please try again."
        : null;

  const load = useCallback(async () => {
    setLoading(true);
    const [connRes, dataRes] = await Promise.all([
      fetch("/api/wearables/connections"),
      fetch("/api/wearables/data?days=7"),
    ]);
    const connData = connRes.ok ? await connRes.json().catch(() => null) : null;
    const pointData = dataRes.ok ? await dataRes.json().catch(() => null) : null;
    setConnections(connData?.connections || []);
    setWearableData(pointData?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const [disconnected, setDisconnected] = useState<{ provider: string; url: string | null; subscriptionsRevoked: boolean | null } | null>(null);
  // Whether this patient has said they read the non-emergency notice
  // (activity 074, T-13). `null` = not asked yet; nothing is gated until the
  // answer arrives, so a slow request never looks like a refusal.
  const [noticeAccepted, setNoticeAccepted] = useState<boolean | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch("/api/patient/monitoring-consent")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNoticeAccepted(d ? !!d.accepted : null))
      .catch(() => setNoticeAccepted(null));
  }, []);

  const acceptNotice = async () => {
    setAccepting(true);
    try {
      const res = await fetch("/api/patient/monitoring-consent", { method: "POST" });
      if (res.ok) setNoticeAccepted(true);
    } finally {
      setAccepting(false);
    }
  };

  const handleConnect = (providerKey: string) => {
    window.location.href = "/api/wearables/connect/" + providerKey;
  };

  const handleDisconnect = async (providerKey: string) => {
    const res = await fetch("/api/wearables/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerKey }),
    });
    // What disconnecting does and does not do, said plainly (activity 074,
    // T-10): we drop the tokens and stop the notifications, but only the
    // account holder can remove the authorisation at the provider. A
    // "disconnected" that quietly leaves access standing is the kind of thing
    // a patient is right to be angry about.
    const data = await res.json().catch(() => ({}));
    setDisconnected({
      provider: providerKey,
      url: data?.providerRevokeUrl ?? null,
      subscriptionsRevoked: data?.subscriptionsRevoked ?? null,
    });
    load();
  };

  const handleSync = async (providerKey: string) => {
    try {
      await fetch("/api/wearables/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerKey }),
      });
    } catch {}
    load();
  };

  // Pedir de novo, sem refazer a autorização. O `load()` no fim é o que evita
  // dizer "pronto" e mostrar outra coisa: a tela relê o que ficou gravado.
  const handleFixDelivery = async () => {
    setFixMsg(null);
    try {
      const res = await fetch("/api/wearables/resubscribe", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFixMsg({
          text:
            (isPt ? data?.errorPt : data?.error) ||
            (isPt ? "Não foi possível corrigir agora." : "We could not fix this right now."),
          ok: false,
        });
      } else if (data?.delivery === "receiving") {
        setFixMsg({
          text: isPt
            ? "Pronto — a Withings vai enviar suas medições agora."
            : "Done — Withings will send your measurements now.",
          ok: true,
        });
      } else {
        setFixMsg({
          text: isPt
            ? "A Withings ainda não confirmou. Sua clínica também consegue ver isso."
            : "Withings still has not confirmed. Your clinic can see this too.",
          ok: false,
        });
      }
    } catch {
      setFixMsg({
        text: isPt ? "Não foi possível corrigir agora." : "We could not fix this right now.",
        ok: false,
      });
    }
    load();
  };

  const latestByType = (dataType: string) =>
    wearableData.find(d => d.dataType === dataType) || null;

  const latestSleep = latestByType("SLEEP");
  const latestRecovery = latestByType("BODY");
  const latestActivity = latestByType("ACTIVITY");

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4 animate-pulse">
        <div className="h-8 w-52 bg-muted rounded" />
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="h-40 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-ba1-health/15 flex items-center justify-center shrink-0">
          <Watch className="h-5 w-5 text-ba1-health" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isPt ? "Dispositivos" : "Devices"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isPt
              ? "Conecte seu wearable para sincronizar dados de sono, atividade e recuperação automaticamente."
              : "Connect your wearable to sync sleep, activity and recovery data automatically."}
          </p>
        </div>
      </div>

      {/* O aviso fica antes de tudo nesta tela: é aqui que o paciente conecta
          um aparelho e passa a esperar que alguém esteja olhando. Enquanto ele
          não disser que leu, conectar fica bloqueado — e o servidor recusa
          também, não só a tela. */}
      <NonEmergencyNotice />

      {noticeAccepted === false && (
        <div className="rounded-lg border border-ba1-health/40 bg-ba1-health/5 p-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs">
            {isPt
              ? "Confirme que você leu o aviso acima para conectar um aparelho."
              : "Confirm you have read the notice above to connect a device."}
          </p>
          <Button size="sm" onClick={acceptNotice} disabled={accepting}>
            {accepting
              ? (isPt ? "Registrando…" : "Recording…")
              : (isPt ? "Li e entendi" : "I have read and understood")}
          </Button>
        </div>
      )}

      {disconnected && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
          <p className="text-sm font-medium">
            {isPt ? "Desconectado." : "Disconnected."}
          </p>
          {/* Só afirma que as notificações pararam quando elas pararam mesmo.
              O QA pegou esta frase sendo exibida depois de as quatro
              revogações falharem com 401 — é exatamente a promessa falsa que
              esta tarefa existe para evitar. */}
          <p className="text-xs text-muted-foreground">
            {disconnected.subscriptionsRevoked === false
              ? isPt
                ? "Apagamos as chaves de acesso aqui, mas não conseguimos cancelar as notificações do fabricante — o token já não era mais válido. O histórico já sincronizado continua no seu prontuário."
                : "We deleted the access keys here, but we could not cancel the manufacturer's notifications — the token was no longer valid. Data already synced stays in your record."
              : isPt
                ? "Apagamos as chaves de acesso e paramos as notificações. O histórico já sincronizado continua no seu prontuário."
                : "We deleted the access keys and stopped the notifications. Data already synced stays in your record."}
          </p>
          {disconnected.url && (
            <p className="text-xs text-muted-foreground">
              {disconnected.subscriptionsRevoked === false
                ? isPt
                  ? "Por isso, retire a autorização na sua conta do fabricante — é o que interrompe tudo: "
                  : "So please withdraw the authorisation in your manufacturer account — that is what stops it for good: "
                : isPt
                  ? "Para retirar a autorização também do lado do fabricante, faça isso na sua conta: "
                  : "To withdraw the authorisation at the manufacturer as well, do it in your account: "}
              <a href={disconnected.url} target="_blank" rel="noreferrer" className="underline">
                {disconnected.url}
              </a>
            </p>
          )}
        </div>
      )}

      {/* Devices */}
      <Card className="border-ba1-health/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Watch className="h-4 w-4 text-ba1-health" />
            {isPt ? "Dispositivos Wearable" : "Wearable Devices"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {wearableMsg && (
            <div className={`text-sm p-3 rounded-lg ${
              connected === "1"
                ? "bg-ba1-ok/10 text-ba1-ok border border-ba1-ok/20"
                : "bg-ba1-bad/10 text-ba1-bad border border-ba1-bad/20"
            }`}>{wearableMsg}</div>
          )}
          {fixMsg && (
            <div className={`text-sm p-3 rounded-lg ${
              fixMsg.ok
                ? "bg-ba1-ok/10 text-ba1-ok border border-ba1-ok/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}>{fixMsg.text}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Só o que a clínica providenciou de fato — mais qualquer aparelho
                que este paciente já tenha ligado, para que uma conexão viva
                nunca desapareça da tela por causa de um interruptor. */}
            {OW_PROVIDERS.filter(p =>
              p.enabled || connections.some(c => c.provider === p.key.toUpperCase())
            ).map(provider => {
              const conn = connections.find(c => c.provider === provider.key.toUpperCase());
              return (
                <ConnectDeviceCard
                  key={provider.key}
                  provider={provider}
                  connected={!!conn}
                  delivery={conn?.delivery}
                  missingBloodPressure={conn?.missingBloodPressure}
                  onFixDelivery={provider.key === 'withings' ? handleFixDelivery : undefined}
                  lastSync={conn?.lastSyncedAt || undefined}
                  onConnect={() => {
                    // A recusa do servidor é a que vale; isto só evita mandar
                    // o paciente para o provedor para voltar com um erro.
                    if (noticeAccepted === false) return;
                    handleConnect(provider.key);
                  }}
                  // Um botão que parece ativo e não faz nada é pior que um
                  // desabilitado: o paciente clica, nada acontece, e ele acha
                  // que o app está quebrado (achado do QA da T-13).
                  connectDisabled={noticeAccepted === false}
                  connectDisabledReason={
                    isPt
                      ? "Confirme que você leu o aviso acima"
                      : "Confirm you have read the notice above"
                  }
                  onDisconnect={() => handleDisconnect(provider.key)}
                  onSync={() => handleSync(provider.key)}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Metrics */}
      {(latestSleep || latestRecovery || latestActivity) ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-ba1-ok" />
            {isPt ? "Métricas de Hoje" : "Today's Metrics"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SleepSummary data={latestSleep} />
            <RecoveryCard data={latestRecovery} />
            <ActivityCard data={latestActivity} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isPt
            ? "Nenhum dado ainda. Conecte um wearable e aguarde a primeira sincronização."
            : "No data yet. Connect a wearable and wait for the first sync."}
        </p>
      )}

      {/* The check-in moved out of this page; say where it went. */}
      <Link
        href="/dashboard/biohacking"
        className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm text-foreground">
          {isPt ? "Check-in diário e tendências" : "Daily check-in and trends"}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>
    </div>
  );
}
