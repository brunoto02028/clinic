import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { fetchAssessmentProgress } from "@/api/assessment-progress";
import { useTheme } from "@/theme/useTheme";
import { LoadFailure } from "@/components/LoadFailure";
import { useLang, pick, t as tr } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";

const STEP_ICONS: Record<string, string> = {
  screening: "clipboard-outline",
  outcome_measures: "pulse-outline",
  results: "analytics-outline",
};

const STEP_PATHS: Record<string, string> = {
  screening: "/screening",
  outcome_measures: "/outcome-measures",
  // Era `"/"`, que o próprio guarda do app documenta como proibido: sete
  // arquivos resolvem para essa rota — a tela de boas-vindas e o índice de
  // cada grupo, já que um (grupo) não acrescenta segmento — e o roteador podia
  // cair de volta dentro do guarda, redirecionando para sempre.
  results: "/(app)/(clinica)/(tabs)",
};

function AssessmentProgressScreen() {
  const lang = useLang();
  const t = useTheme();
  const { data, isLoading, isError, refetch, error } = useQuery({ queryKey: ["assessment-progress"], queryFn: fetchAssessmentProgress });

  const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: t.colors.okSoft, text: t.colors.ok, label: tr(lang, { en: "Done", pt: "Concluído" }) },
    in_progress: { bg: t.colors.workSoft, text: t.colors.work, label: tr(lang, { en: "In progress", pt: "Em andamento" }) },
    processing: { bg: t.colors.warnSoft, text: t.colors.warn, label: tr(lang, { en: "Processing", pt: "Processando" }) },
    partial: { bg: t.colors.communitySoft, text: t.colors.community, label: tr(lang, { en: "Partial", pt: "Parcial" }) },
    pending: { bg: t.colors.surfaceMuted, text: t.colors.textMuted, label: tr(lang, { en: "Pending", pt: "Pendente" }) },
  };

  return (
    <Screen scroll testID="assessment-progress-screen">
      <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "My progress", pt: "Meu progresso" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>
        <View>
          <Text variant="body" color={t.colors.textSecondary}>
            {tr(lang, { en: "Follow each step of the process", pt: "Acompanhe cada etapa do processo" })}
          </Text>
        </View>

        {isLoading ? <Spinner center /> : isError ? (
          /* The client stopped swallowing failures, but this branch never
             looked at isError — so a failed request still fell into the
             "no progress yet" state below. */
          <LoadFailure error={error} onRetry={() => refetch()} />
        ) : !data ? (
          <Card><Text muted>{tr(lang, { en: "We could not load this.", pt: "Não foi possível carregar." })}</Text></Card>
        ) : (
          <>
            {/* Progress bar */}
            <Card variant="highlight">
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text variant="label" style={{ fontWeight: "600" }}>{tr(lang, { en: "Overall progress", pt: "Progresso geral" })}</Text>
                <Text variant="label" color={t.colors.ok} style={{ fontWeight: "700" }}>{data.progressPercent}%</Text>
              </View>
              <View style={{ height: 8, backgroundColor: t.colors.surfaceMuted, borderRadius: 4 }}>
                <View style={{ height: 8, width: `${data.progressPercent}%`, backgroundColor: t.colors.ok, borderRadius: 4 }} />
              </View>
              <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 6 }}>
                {lang === "pt"
                  ? `${data.completedCount} de ${data.totalSteps} etapas concluídas`
                  : `${data.completedCount} of ${data.totalSteps} steps completed`}
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
                        <Text variant="label" style={{ fontWeight: "600" }}>{pick(lang, step.label, step.labelPt)}</Text>
                        {isNext && <Text variant="caption" color={t.colors.ok} style={{ marginTop: 2 }}>{tr(lang, { en: "Next step", pt: "Próximo passo" })}</Text>}
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

/**
 * Gated on `mod_screening` — every step it tracks is the assessment's
 * (screening, outcome measures, results), and the screening screen itself is
 * already behind that key. Without this the progress of a locked assessment
 * was still on show.
 */
export default function AssessmentProgress() {
  return (
    <PlanGate module="mod_screening">
      <AssessmentProgressScreen />
    </PlanGate>
  );
}
