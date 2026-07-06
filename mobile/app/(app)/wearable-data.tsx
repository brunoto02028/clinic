import { View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchWearableData } from "@/api/wearables";

function MetricCard({ title, metrics }: { title: string; metrics: { label: string; value: string; color?: string }[] }) {
  const t = useTheme();
  return (
    <View
      style={{
        padding: 16,
        backgroundColor: "rgba(26, 39, 64, 0.8)",
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
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
            <Text variant="subtitle" style={{ color: m.color || "#fff", fontWeight: "700" }}>
              {m.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function WearableData() {
  const t = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ["wearable-data"],
    queryFn: () => fetchWearableData(7),
  });

  const latest = (type: string) => data?.find((d) => d.dataType === type);
  const sleep = latest("SLEEP");
  const body = latest("BODY");
  const activity = latest("ACTIVITY");

  const fmtDuration = (mins: number | null) => {
    if (mins == null) return "—";
    return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
  };

  return (
    <Screen scroll testID="wearable-data-screen">
      <Stack.Screen options={{ headerShown: true, title: "Dados do Wearable", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>
        <Text variant="title">Seus Dados</Text>

        {isLoading ? (
          <Spinner center />
        ) : !data || data.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center", gap: 12 }}>
            <Text variant="caption" color={t.colors.textSecondary} style={{ textAlign: "center" }}>
              Nenhum dado ainda. Conecte um wearable e aguarde a sincronização.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {sleep && (
              <MetricCard
                title="Sono"
                metrics={[
                  { label: "Duração", value: fmtDuration(sleep.sleepDuration) },
                  { label: "Eficiência", value: sleep.sleepEfficiency != null ? `${Math.round(sleep.sleepEfficiency)}%` : "—" },
                  { label: "Deep", value: sleep.deepMinutes != null ? `${Math.round(sleep.deepMinutes)}m` : "—", color: "#818cf8" },
                  { label: "REM", value: sleep.remMinutes != null ? `${Math.round(sleep.remMinutes)}m` : "—", color: "#a78bfa" },
                  { label: "HRV", value: sleep.hrv != null ? `${Math.round(sleep.hrv)} ms` : "—", color: "#f87171" },
                ]}
              />
            )}

            {body && (
              <MetricCard
                title="Recuperação"
                metrics={[
                  { label: "HRV", value: body.hrv != null ? `${Math.round(body.hrv)} ms` : "—", color: body.hrv && body.hrv > 40 ? "#34d399" : "#fbbf24" },
                  { label: "FC Repouso", value: body.restingHr != null ? `${Math.round(body.restingHr)} bpm` : "—", color: body.restingHr && body.restingHr < 65 ? "#34d399" : "#fbbf24" },
                  { label: "SpO2", value: body.spo2 != null ? `${Math.round(body.spo2)}%` : "—", color: body.spo2 && body.spo2 > 95 ? "#34d399" : "#fbbf24" },
                ]}
              />
            )}

            {activity && (
              <MetricCard
                title="Atividade"
                metrics={[
                  { label: "Passos", value: activity.steps != null ? activity.steps.toLocaleString() : "—" },
                  { label: "Cal Ativas", value: activity.activeCalories != null ? `${Math.round(activity.activeCalories)} kcal` : "—" },
                  { label: "Min Ativos", value: activity.activeMinutes != null ? `${activity.activeMinutes} min` : "—" },
                ]}
              />
            )}

            <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center", marginTop: 8 }}>
              Dados dos últimos 7 dias • {sleep?.provider || body?.provider || activity?.provider || ""}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
