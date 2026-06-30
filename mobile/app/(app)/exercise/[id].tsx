import { View, Pressable, Linking, Alert } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { fetchPrescriptions, completeExercise } from "@/api/exercises";
import { useTheme } from "@/theme/useTheme";

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  EASY: { label: "Fácil", color: "#34d399" },
  MEDIUM: { label: "Moderado", color: "#fbbf24" },
  HARD: { label: "Avançado", color: "#f87171" },
};

const REGION_MAP: Record<string, { label: string; icon: string }> = {
  LOWER_BODY: { label: "Membros Inferiores", icon: "footsteps-outline" },
  UPPER_BODY: { label: "Membros Superiores", icon: "body-outline" },
  CORE: { label: "Core / Tronco", icon: "fitness-outline" },
  FULL_BODY: { label: "Corpo Inteiro", icon: "accessibility-outline" },
};

export default function ExerciseDetail() {
  const t = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });

  const completeMutation = useMutation({
    mutationFn: () => completeExercise(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      Alert.alert("Exercício concluído!", "Parabéns por completar mais uma sessão.");
    },
    onError: (e) => Alert.alert("Erro", (e as Error).message || "Não foi possível registrar."),
  });

  const rx = data?.find((p) => p.id === id);

  return (
    <Screen scroll testID="exercise-detail">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Exercício",
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
            <Text color={t.colors.danger}>Não foi possível carregar.</Text>
          </View>
        </Card>
      ) : !rx ? (
        <Text muted>Exercício não encontrado.</Text>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Header */}
          <View style={{ gap: 8 }}>
            <Text variant="title">{rx.exercise.name}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(() => {
                const region = REGION_MAP[rx.exercise.bodyRegion];
                return region ? (
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "rgba(74, 124, 138, 0.1)",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 14,
                  }}>
                    <Ionicons name={region.icon as any} size={14} color={t.colors.secondary} />
                    <Text variant="caption" color={t.colors.secondary}>{region.label}</Text>
                  </View>
                ) : null;
              })()}
              {(() => {
                const diff = DIFFICULTY_MAP[rx.exercise.difficulty];
                return diff ? (
                  <View style={{
                    backgroundColor: `${diff.color}18`,
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
                backgroundColor: "rgba(74, 124, 138, 0.08)",
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: "rgba(74, 124, 138, 0.1)",
              }}>
                <Text variant="title" color={t.colors.secondary} style={{ fontSize: 24 }}>{rx.sets}</Text>
                <Text variant="caption" color={t.colors.textMuted}>Séries</Text>
              </View>
            ) : null}
            {rx.reps ? (
              <View style={{
                flex: 1,
                alignItems: "center",
                padding: 14,
                backgroundColor: "rgba(74, 124, 138, 0.08)",
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: "rgba(74, 124, 138, 0.1)",
              }}>
                <Text variant="title" color={t.colors.secondary} style={{ fontSize: 24 }}>{rx.reps}</Text>
                <Text variant="caption" color={t.colors.textMuted}>Repetições</Text>
              </View>
            ) : null}
            {rx.holdSeconds ? (
              <View style={{
                flex: 1,
                alignItems: "center",
                padding: 14,
                backgroundColor: "rgba(74, 124, 138, 0.08)",
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: "rgba(74, 124, 138, 0.1)",
              }}>
                <Text variant="title" color={t.colors.secondary} style={{ fontSize: 24 }}>{rx.holdSeconds}s</Text>
                <Text variant="caption" color={t.colors.textMuted}>Sustentação</Text>
              </View>
            ) : null}
            {rx.frequency ? (
              <View style={{
                flex: 1,
                alignItems: "center",
                padding: 14,
                backgroundColor: "rgba(74, 124, 138, 0.08)",
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: "rgba(74, 124, 138, 0.1)",
              }}>
                <Ionicons name="repeat-outline" size={22} color={t.colors.secondary} />
                <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 4 }}>{rx.frequency}</Text>
              </View>
            ) : null}
          </View>

          {/* Video button */}
          {rx.exercise.videoUrl ? (
            <Pressable
              onPress={() => Linking.openURL(rx.exercise.videoUrl!)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 16,
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                borderRadius: t.radius.lg,
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.15)",
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="play" size={24} color="#f87171" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontWeight: "600" }}>Assistir vídeo</Text>
                <Text variant="caption" color={t.colors.textMuted}>Ver demonstração do exercício</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={t.colors.textMuted} />
            </Pressable>
          ) : null}

          {/* Description */}
          {rx.exercise.description ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="information-circle-outline" size={18} color={t.colors.secondary} />
                <Text variant="label" style={{ fontWeight: "600" }}>Descrição</Text>
              </View>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>
                {rx.exercise.description}
              </Text>
            </Card>
          ) : null}

          {/* Instructions */}
          {rx.exercise.instructions ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="list-outline" size={18} color={t.colors.secondary} />
                <Text variant="label" style={{ fontWeight: "600" }}>Instruções</Text>
              </View>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>
                {rx.exercise.instructions}
              </Text>
            </Card>
          ) : null}

          {/* Complete button */}
          <Button
            title={completeMutation.isPending ? "Registrando..." : "Marcar como concluído"}
            onPress={() => completeMutation.mutate()}
            loading={completeMutation.isPending}
            icon={<Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
          />

          {/* Therapist notes */}
          {rx.notes ? (
            <Card variant="highlight">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="chatbubble-outline" size={16} color={t.colors.secondary} />
                <Text variant="label" style={{ fontWeight: "600" }}>Nota do terapeuta</Text>
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
        </View>
      )}
    </Screen>
  );
}
