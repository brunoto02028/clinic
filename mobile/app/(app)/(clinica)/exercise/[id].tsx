import { View, Pressable, Linking, Alert } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ExerciseVideo } from "@/components/ExerciseVideo";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { fetchPrescriptions, completeExercise, fetchExerciseClearance } from "@/api/exercises";
import { ExerciseBlockCard } from "@/components/ExerciseBlockCard";
import { useTheme } from "@/theme/useTheme";
import { PlanGate } from "@/components/PlanGate";
import { ExerciseSubmissions } from "@/components/ExerciseSubmissions";
import { useLang, pick, t as tr } from "@/lib/i18n";

// The badge beside the exercise name. These were Portuguese-only, so an en-GB
// patient read "Membros Inferiores" on a screen that was otherwise English.
const REGION_MAP: Record<string, { label: { en: string; pt: string }; icon: string }> = {
  LOWER_BODY: { label: { en: "Lower body", pt: "Membros inferiores" }, icon: "footsteps-outline" },
  UPPER_BODY: { label: { en: "Upper body", pt: "Membros superiores" }, icon: "body-outline" },
  CORE: { label: { en: "Core / trunk", pt: "Core / tronco" }, icon: "fitness-outline" },
  FULL_BODY: { label: { en: "Full body", pt: "Corpo inteiro" }, icon: "accessibility-outline" },
};

function ExerciseDetailScreen() {
  const lang = useLang();
  const t = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const DIFFICULTY_MAP: Record<string, { label: string; color: string; bg: string }> = {
    EASY: { label: tr(lang, { en: "Easy", pt: "Fácil" }), color: t.colors.ok, bg: t.colors.okSoft },
    MEDIUM: { label: tr(lang, { en: "Moderate", pt: "Moderado" }), color: t.colors.warn, bg: t.colors.warnSoft },
    HARD: { label: tr(lang, { en: "Advanced", pt: "Avançado" }), color: t.colors.bad, bg: t.colors.badSoft },
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });
  const { data: clearance } = useQuery({
    queryKey: ["exercise-clearance"],
    queryFn: fetchExerciseClearance,
    retry: false,
  });

  const completeMutation = useMutation({
    mutationFn: () => completeExercise(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      Alert.alert(
        tr(lang, { en: "Exercise completed", pt: "Exercício concluído!" }),
        tr(lang, { en: "Well done — one more session in the bag.", pt: "Parabéns por completar mais uma sessão." }),
      );
    },
    onError: (e) => Alert.alert(
      tr(lang, { en: "Error", pt: "Erro" }),
      (e as Error).message || tr(lang, { en: "We could not record that.", pt: "Não foi possível registrar." }),
    ),
  });

  const rx = data?.find((p) => p.id === id);

  return (
    <Screen scroll testID="exercise-detail">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Exercise", pt: "Exercício" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>{tr(lang, { en: "We could not load this.", pt: "Não foi possível carregar." })}</Text>
          </View>
        </Card>
      ) : !rx ? (
        <Text muted>{tr(lang, { en: "Exercise not found.", pt: "Exercício não encontrado." })}</Text>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Header */}
          <View style={{ gap: 8 }}>
            <Text variant="title">{pick(lang, rx.exercise.name, rx.exercise.namePt)}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(() => {
                const region = REGION_MAP[rx.exercise.bodyRegion];
                return region ? (
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: t.colors.surfaceMuted,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 14,
                  }}>
                    <Ionicons name={region.icon as any} size={14} color={t.colors.secondary} />
                    <Text variant="caption" color={t.colors.secondary}>{tr(lang, region.label)}</Text>
                  </View>
                ) : null;
              })()}
              {(() => {
                const diff = DIFFICULTY_MAP[rx.exercise.difficulty];
                return diff ? (
                  <View style={{
                    backgroundColor: diff.bg,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 14,
                  }}>
                    <Text variant="caption" color={diff.color}>{diff.label}</Text>
                  </View>
                ) : null;
              })()}
            </View>
          </View>

          {/* Parameters */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {rx.sets ? (
              <View style={{
                flex: 1,
                alignItems: "center",
                padding: 14,
                backgroundColor: t.colors.surfaceMuted,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.borderSubtle,
              }}>
                <Text variant="title" color={t.colors.secondary} style={{ fontSize: 24 }}>{rx.sets}</Text>
                <Text variant="caption" color={t.colors.textMuted}>{tr(lang, { en: "Sets", pt: "Séries" })}</Text>
              </View>
            ) : null}
            {rx.reps ? (
              <View style={{
                flex: 1,
                alignItems: "center",
                padding: 14,
                backgroundColor: t.colors.surfaceMuted,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.borderSubtle,
              }}>
                <Text variant="title" color={t.colors.secondary} style={{ fontSize: 24 }}>{rx.reps}</Text>
                <Text variant="caption" color={t.colors.textMuted}>{tr(lang, { en: "Reps", pt: "Repetições" })}</Text>
              </View>
            ) : null}
            {rx.holdSeconds ? (
              <View style={{
                flex: 1,
                alignItems: "center",
                padding: 14,
                backgroundColor: t.colors.surfaceMuted,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.borderSubtle,
              }}>
                <Text variant="title" color={t.colors.secondary} style={{ fontSize: 24 }}>{rx.holdSeconds}s</Text>
                <Text variant="caption" color={t.colors.textMuted}>{tr(lang, { en: "Hold", pt: "Sustentação" })}</Text>
              </View>
            ) : null}
            {rx.frequency ? (
              <View style={{
                flex: 1,
                alignItems: "center",
                padding: 14,
                backgroundColor: t.colors.surfaceMuted,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.borderSubtle,
              }}>
                <Ionicons name="repeat-outline" size={22} color={t.colors.secondary} />
                <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 4 }}>{rx.frequency}</Text>
              </View>
            ) : null}
          </View>

          {/* Video button */}
          {rx.exercise.videoUrl ? (
            <ExerciseVideo
              videoUrl={rx.exercise.videoUrl}
              thumbnailUrl={rx.exercise.thumbnailUrl}
            />
          ) : null}

          {/* Description */}
          {rx.exercise.description ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="information-circle-outline" size={18} color={t.colors.secondary} />
                <Text variant="label" style={{ fontWeight: "600" }}>{tr(lang, { en: "Description", pt: "Descrição" })}</Text>
              </View>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>
                {pick(lang, rx.exercise.description, rx.exercise.descriptionPt)}
              </Text>
            </Card>
          ) : null}

          {/* Instructions */}
          {pick(lang, rx.exercise.instructions, rx.exercise.instructionsPt) ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="list-outline" size={18} color={t.colors.secondary} />
                <Text variant="label" style={{ fontWeight: "600" }}>{tr(lang, { en: "Instructions", pt: "Instruções" })}</Text>
              </View>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>
                {pick(lang, rx.exercise.instructions, rx.exercise.instructionsPt)}
              </Text>
            </Card>
          ) : null}

          {/* Complete button — off while blood pressure blocks today's session
              (activity 074, T-11), with the reason above it rather than a
              button that simply does nothing. */}
          {clearance?.blocked ? (
            <ExerciseBlockCard clearance={clearance} />
          ) : (
            <Button
              title={completeMutation.isPending
                ? tr(lang, { en: "Recording...", pt: "Registrando..." })
                : tr(lang, { en: "Mark as done", pt: "Marcar como concluído" })}
              onPress={() => completeMutation.mutate()}
              loading={completeMutation.isPending}
              icon={<Ionicons name="checkmark-circle-outline" size={20} color={t.colors.primaryFg} />}
            />
          )}

          {/* Therapist notes */}
          {rx.notes ? (
            <Card variant="highlight">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="chatbubble-outline" size={16} color={t.colors.secondary} />
                <Text variant="label" style={{ fontWeight: "600" }}>{tr(lang, { en: "Note from your therapist", pt: "Nota do terapeuta" })}</Text>
              </View>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22, fontStyle: "italic" }}>
                "{rx.notes}"
              </Text>
              {rx.therapist ? (
                <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 6 }}>
                  — {rx.therapist.firstName} {rx.therapist.lastName}
                </Text>
              ) : null}
            </Card>
          ) : null}

          {/* Mostrar como faz em casa. É o que fecha o atendimento híbrido:
              sem isto o terapeuta corrige uma execução que nunca viu. */}
          <ExerciseSubmissions prescriptionId={rx.id} />
        </View>
      )}
    </Screen>
  );
}

/**
 * Gated on `mod_exercises` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function ExerciseDetail() {
  return (
    <PlanGate module="mod_exercises">
      <ExerciseDetailScreen />
    </PlanGate>
  );
}
