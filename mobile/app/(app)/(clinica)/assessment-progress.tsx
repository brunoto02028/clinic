import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAssessmentProgress } from "@/api/assessment-progress";
import { useTheme } from "@/theme/useTheme";

const STEP_ICONS: Record<string, string> = {
  screening: "clipboard-outline",
  outcome_measures: "pulse-outline",
  results: "analytics-outline",
};

const STEP_PATHS: Record<string, string> = {
  screening: "/screening",
  outcome_measures: "/outcome-measures",
  results: "/",
};

export default function AssessmentProgressScreen() {
  const t = useTheme();
  const { data, isLoading } = useQuery({ queryKey: ["assessment-progress"], queryFn: fetchAssessmentProgress });

  const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: t.colors.okSoft, text: t.colors.ok, label: "Concluido" },
    in_progress: { bg: t.colors.workSoft, text: t.colors.work, label: "Em andamento" },
    processing: { bg: t.colors.warnSoft, text: t.colors.warn, label: "Processando" },
    partial: { bg: t.colors.communitySoft, text: t.colors.community, label: "Parcial" },
    pending: { bg: t.colors.surfaceMuted, text: t.colors.textMuted, label: "Pendente" },
  };

  return (
    <Screen scroll testID="assessment-progress-screen">
      <Stack.Screen options={{ headerShown: true, title: "Progresso", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>
        <View>
          <Text variant="title">Progresso da Avaliacao</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>Acompanhe cada etapa do processo</Text>
        </View>

        {isLoading ? <Spinner center /> : !data ? (
          <Card><Text muted>Nao foi possivel carregar.</Text></Card>
        ) : (
          <>
            {/* Progress bar */}
            <Card variant="highlight">
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text variant="label" style={{ fontWeight: "600" }}>Progresso geral</Text>
                <Text variant="label" color={t.colors.ok} style={{ fontWeight: "700" }}>{data.progressPercent}%</Text>
              </View>
              <View style={{ height: 8, backgroundColor: t.colors.surfaceMuted, borderRadius: 4 }}>
                <View style={{ height: 8, width: `${data.progressPercent}%`, backgroundColor: t.colors.ok, borderRadius: 4 }} />
              </View>
              <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 6 }}>
                {data.completedCount} de {data.totalSteps} etapas concluidas
              </Text>
            </Card>

            {/* Steps */}
            {data.steps.map((step, i) => {
              const status = STATUS_COLORS[step.status] ?? STATUS_COLORS.pending;
              const icon = STEP_ICONS[step.id] ?? "ellipse-outline";
              const path = STEP_PATHS[step.id];
              const isNext = data.nextStep === step.id;

              return (
                <Pressable key={step.id} onPress={() => path && router.push(path)}>
                  <Card variant={isNext ? "elevated" : "default"}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{
                        width: 44, height: 44, borderRadius: 14,
                        backgroundColor: step.status === "completed" ? t.colors.okSoft : isNext ? t.colors.okSoft : t.colors.surfaceMuted,
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {step.status === "completed" ? (
                          <Ionicons name="checkmark-circle" size={24} color={t.colors.ok} />
                        ) : (
                          <Ionicons name={icon as any} size={22} color={isNext ? t.colors.ok : t.colors.textMuted} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="label" style={{ fontWeight: "600" }}>{step.labelPt || step.label}</Text>
                        {isNext && <Text variant="caption" color={t.colors.ok} style={{ marginTop: 2 }}>Proximo passo</Text>}
                      </View>
                      <View style={{ backgroundColor: status.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <Text variant="caption" color={status.text} style={{ fontWeight: "600", fontSize: 10 }}>{status.label}</Text>
                      </View>
                    </View>
                    {/* Connector line */}
                    {i < data.steps.length - 1 && (
                      <View style={{ position: "absolute", left: 37, bottom: -10, width: 2, height: 10, backgroundColor: t.colors.border }} />
                    )}
                  </Card>
                </Pressable>
              );
            })}
          </>
        )}
      </View>
    </Screen>
  );
}
