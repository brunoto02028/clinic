import React, { useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchWearableData, fetchConnections } from "@/api/wearables";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLang, t as tr } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { LoadFailure } from "@/components/LoadFailure";
import { Tendencia, PontoDaSerie } from "@/components/Tendencia";

function MetricCard({ title, metrics }: { title: string; metrics: { label: string; value: string; color?: string }[] }) {
  const t = useTheme();
  return (
    <View
      style={{
        padding: 16,
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
        gap: 12,
      }}
    >
      <Text
        variant="caption"
        color={t.colors.textSecondary}
        style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 11, fontWeight: "700" }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {metrics.map((m) => (
          <View key={m.label} style={{ minWidth: 80 }}>
            <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
              {m.label}
            </Text>
            <Text variant="subtitle" style={{ color: m.color || t.colors.text, fontWeight: "700" }}>
              {m.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Um cartão com o número de hoje **e a linha do período** (099 T-2).
 *
 * O `MetricCard` acima responde "quanto foi"; este responde "como anda", que é
 * a pergunta que faz o número significar alguma coisa.
 */
function CartaoDeTendencia({
  titulo,
  valorAtual,
  pontos,
  unidade,
  casas = 0,
  deZero = false,
}: {
  titulo: string;
  valorAtual: string;
  pontos: PontoDaSerie[];
  unidade: string;
  casas?: number;
  deZero?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        padding: 16,
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <Text
          variant="caption"
          color={t.colors.textSecondary}
          style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 11, fontWeight: "700" }}
        >
          {titulo}
        </Text>
        <Text variant="subtitle" style={{ fontWeight: "700" }}>
          {valorAtual}
        </Text>
      </View>
      <Tendencia pontos={pontos} unidade={unidade} casas={casas} deZero={deZero} />
    </View>
  );
}

function WearableDataScreen() {
  const t = useTheme();
  const lang = useLang();
  /**
   * A janela do período (099 T-2). **30 dias por omissão**, não 7.
   *
   * Sete dias mostram o que aconteceu; trinta mostram se está a mudar — que é
   * a pergunta que a pessoa tem. Noventa existe para quem já tem histórico.
   */
  const [janela, setJanela] = useState<7 | 30 | 90>(30);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["wearable-data", janela],
    queryFn: () => fetchWearableData(janela),
  });

  /**
   * Se ha aparelho ligado — e e isso que muda o texto do vazio.
   *
   * Sem esta pergunta, a tela so sabia dizer "conecte um wearable", que e
   * exatamente o conselho errado para quem ja conectou.
   */
  const { data: ligacoes } = useQuery({
    queryKey: ["wearable-connections"],
    queryFn: fetchConnections,
  });
  const temLigacao = (ligacoes?.length ?? 0) > 0;

  const latest = (type: string) => data?.find((d) => d.dataType === type);
  const sleep = latest("SLEEP");
  const body = latest("BODY");
  const activity = latest("ACTIVITY");

  /**
   * Os ECG do período (099 T-1).
   *
   * Eram guardados desde a 074 e **nenhuma tela lia** — um dado clínico que
   * existe no banco e em lugar nenhum dá a impressão de cobertura que não
   * existe. São vários por período, então aqui é lista, não o último.
   */
  const ecgs = (data ?? []).filter((d) => d.dataType === "ECG" && d.ecg);

  /**
   * A série de uma métrica, **um ponto por dia do período**.
   *
   * O servidor devolve só os dias que têm registo. Se a tela desenhasse essa
   * lista, catorze dias com três leituras virariam três barras encostadas, e a
   * forma mentiria sobre a frequência. Aqui o eixo é o calendário: todo dia da
   * janela existe, e o que não tem leitura fica `null` — que o gráfico desenha
   * como buraco.
   */
  const serie = (tipo: string, campo: (d: NonNullable<typeof data>[number]) => number | null): PontoDaSerie[] => {
    const porDia = new Map<string, number | null>();
    for (const d of data ?? []) {
      if (d.dataType !== tipo) continue;
      const v = campo(d);
      if (v !== null && v !== undefined) porDia.set(d.dataDate, v);
    }
    const pontos: PontoDaSerie[] = [];
    const hoje = new Date();
    for (let i = janela - 1; i >= 0; i--) {
      const dia = new Date(hoje);
      dia.setDate(dia.getDate() - i);
      const chave = dia.toISOString().slice(0, 10);
      pontos.push({ dia: chave, valor: porDia.has(chave) ? (porDia.get(chave) as number) : null });
    }
    return pontos;
  };

  const fmtDuration = (mins: number | null) => {
    if (mins == null) return "—";
    return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
  };

  return (
    <Screen scroll testID="wearable-data-screen">
      <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "Wearable data", pt: "Dados do wearable" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>

        {/*
          * A janela do período. Fica **acima** do conteúdo e não dentro dos
          * cartões: é a mesma escolha para tudo o que está abaixo, e repeti-la
          * por métrica faria a pessoa escolher cinco vezes a mesma coisa.
          */}
        {temLigacao && (
          <View style={{ flexDirection: "row", gap: 6 }} testID="janela-do-periodo">
            {([7, 30, 90] as const).map((d) => {
              const ativa = janela === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setJanela(d)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativa }}
                  testID={`janela-${d}`}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 13,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: ativa ? t.colors.primary : t.colors.border,
                    backgroundColor: ativa ? t.colors.primary : "transparent",
                  }}
                >
                  <Text
                    variant="caption"
                    style={{ fontSize: 12.5, fontWeight: "600" }}
                    color={ativa ? t.colors.background : t.colors.textSecondary}
                  >
                    {tr(lang, { en: `${d} days`, pt: `${d} dias` })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <LoadFailure error={error} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          /**
           * O vazio que **diz porque esta vazio** (114 T-4).
           *
           * Esta tela mostra sono, atividade e recuperacao. Um medidor de
           * pressao e uma bracadeira: mede pressao, e mais nada. Entao, para
           * quem so tem um deles ligado, ela mostra o conjunto vazio — com
           * razao — e dizia *"conecte um wearable e aguarde a sincronizacao"*,
           * que e falso duas vezes: ele ja conectou, e esperar nao vai trazer
           * nada.
           *
           * Foi o que fez o Bruno concluir que a ligacao estava partida. Ela
           * nao estava; o dado dele chegou, e esta noutra tela.
           */
          <View style={{ padding: 32, alignItems: "center", gap: 14 }}>
            <Text variant="caption" color={t.colors.textSecondary} style={{ textAlign: "center" }}>
              {temLigacao
                ? tr(lang, {
                    en: "Nothing here yet. This screen shows sleep, activity and recovery — a blood-pressure monitor does not send those.",
                    pt: "Nada aqui ainda. Esta tela mostra sono, atividade e recuperação — um medidor de pressão não envia isso.",
                  })
                : tr(lang, {
                    en: "No data yet. Connect a wearable and wait for the first sync.",
                    pt: "Nenhum dado ainda. Conecte um wearable e aguarde a sincronização.",
                  })}
            </Text>
            {temLigacao && (
              <Pressable
                onPress={() => router.push("/(app)/(clinica)/blood-pressure")}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: pressed ? t.colors.surfaceMuted : "transparent",
                })}
              >
                <Text variant="label">
                  {tr(lang, { en: "See my blood pressure", pt: "Ver minha pressão arterial" })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {sleep && (
              <MetricCard
                title={tr(lang, { en: "Sleep", pt: "Sono" })}
                metrics={[
                  { label: tr(lang, { en: "Duration", pt: "Duração" }), value: fmtDuration(sleep.sleepDuration) },
                  { label: tr(lang, { en: "Efficiency", pt: "Eficiência" }), value: sleep.sleepEfficiency != null ? `${Math.round(sleep.sleepEfficiency)}%` : "—" },
                  { label: tr(lang, { en: "Deep", pt: "Profundo" }), value: sleep.deepMinutes != null ? `${Math.round(sleep.deepMinutes)}m` : "—", color: t.colors.work },
                  { label: "REM", value: sleep.remMinutes != null ? `${Math.round(sleep.remMinutes)}m` : "—", color: t.colors.community },
                  { label: "HRV", value: sleep.hrv != null ? `${Math.round(sleep.hrv)} ms` : "—" },
                ]}
              />
            )}

            {body && (
              <MetricCard
                title={tr(lang, { en: "Recovery", pt: "Recuperação" })}
                metrics={[
                  /*
                   * **Sem cor por limiar** (099 T-2).
                   *
                   * Estes três valores eram pintados de verde ou âmbar por
                   * números fixos no código — HRV acima de 40, FC abaixo de 65,
                   * SpO2 acima de 95. Isso é faixa de referência, que é leitura
                   * clínica, e uma cor é uma afirmação: SpO2 de 95% saía em
                   * âmbar, e 95% é normal. A tela do paciente mostra o que foi
                   * medido e como mudou; quem interpreta é o terapeuta, no
                   * painel dele.
                   */
                  { label: "HRV", value: body.hrv != null ? `${Math.round(body.hrv)} ms` : "—" },
                  { label: tr(lang, { en: "Resting HR", pt: "FC repouso" }), value: body.restingHr != null ? `${Math.round(body.restingHr)} bpm` : "—" },
                  { label: "SpO2", value: body.spo2 != null ? `${Math.round(body.spo2)}%` : "—" },
                ]}
              />
            )}

            {activity && (
              <MetricCard
                title={tr(lang, { en: "Activity", pt: "Atividade" })}
                metrics={[
                  { label: tr(lang, { en: "Steps", pt: "Passos" }), value: activity.steps != null ? activity.steps.toLocaleString() : "—" },
                  { label: tr(lang, { en: "Active cal", pt: "Cal ativas" }), value: activity.activeCalories != null ? `${Math.round(activity.activeCalories)} kcal` : "—" },
                  { label: tr(lang, { en: "Active min", pt: "Min ativos" }), value: activity.activeMinutes != null ? `${activity.activeMinutes} min` : "—" },
                ]}
              />
            )}

            {/*
              * As tendências, que são o ponto da T-2: o mesmo dado de cima,
              * mas ao longo do período. Só aparece a métrica que tem leitura —
              * um gráfico vazio não ensina nada a ninguém.
              */}
            {(data ?? []).length > 0 && (
              <View style={{ gap: 12 }}>
                <Text
                  variant="caption"
                  color={t.colors.textSecondary}
                  style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 11, fontWeight: "700" }}
                >
                  {tr(lang, { en: "How it has been going", pt: "Como tem andado" })}
                </Text>

                {sleep?.sleepDuration != null && (
                  <CartaoDeTendencia
                    titulo={tr(lang, { en: "Sleep", pt: "Sono" })}
                    valorAtual={fmtDuration(sleep.sleepDuration)}
                    pontos={serie("SLEEP", (d) => (d.sleepDuration != null ? d.sleepDuration / 60 : null))}
                    unidade={tr(lang, { en: "h", pt: "h" })}
                    casas={1}
                  />
                )}

                {body?.restingHr != null && (
                  <CartaoDeTendencia
                    titulo={tr(lang, { en: "Resting heart rate", pt: "FC de repouso" })}
                    valorAtual={`${Math.round(body.restingHr)} bpm`}
                    pontos={serie("BODY", (d) => d.restingHr)}
                    unidade="bpm"
                  />
                )}

                {body?.hrv != null && (
                  <CartaoDeTendencia
                    titulo="HRV"
                    valorAtual={`${Math.round(body.hrv)} ms`}
                    pontos={serie("BODY", (d) => d.hrv)}
                    unidade="ms"
                  />
                )}

                {body?.spo2 != null && (
                  <CartaoDeTendencia
                    titulo="SpO2"
                    valorAtual={`${Math.round(body.spo2)}%`}
                    pontos={serie("BODY", (d) => d.spo2)}
                    unidade="%"
                  />
                )}

                {activity?.steps != null && (
                  <CartaoDeTendencia
                    titulo={tr(lang, { en: "Steps", pt: "Passos" })}
                    valorAtual={activity.steps.toLocaleString()}
                    pontos={serie("ACTIVITY", (d) => d.steps)}
                    unidade={tr(lang, { en: "steps", pt: "passos" })}
                    deZero
                  />
                )}
              </View>
            )}

            {ecgs.length > 0 && (
              <View
                style={{
                  padding: 16,
                  backgroundColor: t.colors.surface,
                  borderRadius: t.radius.lg,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  gap: 12,
                }}
              >
                <Text
                  variant="caption"
                  color={t.colors.textSecondary}
                  style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 11, fontWeight: "700" }}
                >
                  ECG
                </Text>
                {ecgs.map((d) => {
                  const e = d.ecg!;
                  // A conclusão é **do aparelho**. Não lemos traçado — não temos
                  // um, de propósito — e não acrescentamos opinião.
                  const grave = e.conclusao === "fibrilacao";
                  const frase =
                    e.conclusao === "normal"
                      ? tr(lang, { en: "Normal rhythm", pt: "Ritmo normal" })
                      : grave
                        ? tr(lang, { en: "Atrial fibrillation detected", pt: "Fibrilação atrial detectada" })
                        : e.conclusao === "sem_sinal"
                          ? tr(lang, { en: "No usable signal", pt: "Sem sinal utilizável" })
                          : tr(lang, { en: "Inconclusive", pt: "Inconclusivo" });
                  return (
                    <View key={d.id} style={{ gap: 2 }}>
                      <Text variant="body" color={grave ? t.colors.bad : t.colors.text} style={{ fontWeight: grave ? "700" : "400" }}>
                        {frase}
                      </Text>
                      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
                        {(e.recordedAt ?? d.dataDate).slice(0, 10)}
                        {e.heartRate != null ? ` · ${Math.round(e.heartRate)} bpm` : ""}
                      </Text>
                    </View>
                  );
                })}
                {/* Dito na tela, e não só nos termos: o aparelho conclui, nós
                    guardamos, e quem lê um ECG é um profissional. */}
                <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 11 }}>
                  {tr(lang, {
                    en: "This is what the watch concluded. Talk to your therapist about it — we do not read the trace.",
                    pt: "É o que o relógio concluiu. Fale com o seu terapeuta sobre isso — nós não lemos o traçado.",
                  })}
                </Text>
              </View>
            )}

            <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center", marginTop: 8 }}>
              {tr(lang, { en: "Last 7 days", pt: "Dados dos últimos 7 dias" })} • {sleep?.provider || body?.provider || activity?.provider || ""}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

/**
 * Same key as the Devices screen it is reached from: switching devices off
 * must take the readings with it, not leave them on a typed URL.
 */
export default function WearableData() {
  return (
    <PlanGate module="mod_devices">
      <WearableDataScreen />
    </PlanGate>
  );
}
