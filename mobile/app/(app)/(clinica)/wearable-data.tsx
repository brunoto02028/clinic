import { View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchWearableData } from "@/api/wearables";
import { useLang, t as tr } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { LoadFailure } from "@/components/LoadFailure";

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

function WearableDataScreen() {
  const t = useTheme();
  const lang = useLang();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["wearable-data"],
    queryFn: () => fetchWearableData(7),
  });

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

  const fmtDuration = (mins: number | null) => {
    if (mins == null) return "—";
    return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
  };

  return (
    <Screen scroll testID="wearable-data-screen">
      <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "Wearable data", pt: "Dados do wearable" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>

        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <LoadFailure error={error} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center", gap: 12 }}>
            <Text variant="caption" color={t.colors.textSecondary} style={{ textAlign: "center" }}>
              {tr(lang, {
                en: "No data yet. Connect a wearable and wait for the first sync.",
                pt: "Nenhum dado ainda. Conecte um wearable e aguarde a sincronização.",
              })}
            </Text>
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
                  { label: "HRV", value: sleep.hrv != null ? `${Math.round(sleep.hrv)} ms` : "—", color: t.colors.bad },
                ]}
              />
            )}

            {body && (
              <MetricCard
                title={tr(lang, { en: "Recovery", pt: "Recuperação" })}
                metrics={[
                  { label: "HRV", value: body.hrv != null ? `${Math.round(body.hrv)} ms` : "—", color: body.hrv && body.hrv > 40 ? t.colors.ok : t.colors.warn },
                  { label: tr(lang, { en: "Resting HR", pt: "FC repouso" }), value: body.restingHr != null ? `${Math.round(body.restingHr)} bpm` : "—", color: body.restingHr && body.restingHr < 65 ? t.colors.ok : t.colors.warn },
                  { label: "SpO2", value: body.spo2 != null ? `${Math.round(body.spo2)}%` : "—", color: body.spo2 && body.spo2 > 95 ? t.colors.ok : t.colors.warn },
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
