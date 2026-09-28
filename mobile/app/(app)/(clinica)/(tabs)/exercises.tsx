import { FlatList, Pressable, View, Image } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { fetchPrescriptions, fetchExerciseClearance } from "@/api/exercises";
import { ExerciseBlockCard } from "@/components/ExerciseBlockCard";
import { useTheme } from "@/theme/useTheme";
import { PlanGate } from "@/components/PlanGate";
import { useLang, pick, t as tr } from "@/lib/i18n";
import { usePullToRefresh } from "@/lib/pull-to-refresh";

const REGION_ICONS: Record<string, string> = {
  LOWER_BODY: "footsteps-outline",
  UPPER_BODY: "body-outline",
  CORE: "fitness-outline",
  FULL_BODY: "accessibility-outline",
};

function ExercisesScreen() {
  const lang = useLang();
  const t = useTheme();
  const { controle } = usePullToRefresh();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });
  // A failed check is not a block: the patient whose pressure nobody measured
  // must not be stopped by our own outage. Only a real reading blocks.
  const { data: clearance } = useQuery({
    queryKey: ["exercise-clearance"],
    queryFn: fetchExerciseClearance,
    retry: false,
  });

  return (
    <Screen testID="exercises-screen">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Text variant="title">{tr(lang, { en: "Exercises", pt: "Exercícios" })}</Text>
        {(data ?? []).length > 0 && (
          <View style={{
            backgroundColor: t.colors.healthSoft,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: t.colors.health,
          }}>
            <Text variant="caption" color={t.colors.textSecondary}>
              {data!.length} {tr(lang, { en: data!.length === 1 ? "exercise" : "exercises", pt: data!.length === 1 ? "exercício" : "exercícios" })}
            </Text>
          </View>
        )}
      </View>

      {clearance?.blocked ? (
        <View style={{ marginBottom: 12 }}>
          <ExerciseBlockCard clearance={clearance} />
        </View>
      ) : null}

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>{tr(lang, { en: "We could not load your exercises.", pt: "Não foi possível carregar os exercícios." })}</Text>
          </View>
        </Card>
      ) : (data ?? []).length === 0 ? (
        /* Um vazio que só diz "vazio" deixa a pessoa sem saber se é erro dela,
           do app, ou da clínica. Aqui ele diz de quem é a vez — e abre a porta
           que já existe, em vez de terminar a frase. */
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 28 }}>
          <Ionicons name="barbell-outline" size={48} color={t.colors.textMuted} />
          <Text muted testID="exercises-empty" style={{ textAlign: "center" }}>
            {tr(lang, {
              en: "No exercises yet",
              pt: "Nenhum exercício ainda",
            })}
          </Text>
          <Text
            variant="caption"
            color={t.colors.textSecondary}
            style={{ textAlign: "center", lineHeight: 18 }}
          >
            {tr(lang, {
              en: "Your therapist builds your programme during your session. It shows up here, and you can film yourself doing it at home.",
              pt: "Seu terapeuta monta seu programa na consulta. Ele aparece aqui, e você pode se filmar fazendo em casa.",
            })}
          </Text>
          <Button
            title={tr(lang, { en: "Message your clinic", pt: "Falar com a clínica" })}
            variant="ghost"
            size="sm"
            onPress={() => router.push("/(app)/(clinica)/messages")}
            testID="exercises-empty-message"
          />
        </View>
      ) : (
        <FlatList
            refreshControl={controle}
          data={data}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const iconName = REGION_ICONS[item.exercise.bodyRegion] ?? "fitness-outline";
            return (
              <Pressable
                testID={`rx-${item.id}`}
                onPress={() => router.push(`/exercise/${item.id}`)}
              >
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {/* A miniatura do exercício, quando existe. Dez linhas com
                        o mesmo ícone de coração não distinguem "Advanced Core
                        008" de "Advanced Core 009" — e é o que a pessoa precisa
                        reconhecer para saber qual abrir. Com um play em cima,
                        para dizer que há vídeo. */}
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: t.colors.healthSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      {item.exercise.thumbnailUrl ? (
                        <>
                          <Image
                            source={{ uri: item.exercise.thumbnailUrl }}
                            style={{ position: "absolute", width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                          {item.exercise.videoUrl ? (
                            <View style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: "rgba(0,0,0,0.5)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                              <Ionicons name="play" size={11} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <Ionicons name={iconName as any} size={22} color={t.colors.health} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" style={{ fontWeight: "600" }}>{pick(lang, item.exercise.name, item.exercise.namePt)}</Text>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                        {item.sets && item.reps ? (
                          <View style={{
                            backgroundColor: t.colors.healthSoft,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}>
                            <Text variant="caption" color={t.colors.textSecondary}>
                              {item.sets}x{item.reps}
                            </Text>
                          </View>
                        ) : null}
                        {item.frequency ? (
                          <View style={{
                            backgroundColor: t.colors.surfaceMuted,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}>
                            <Text variant="caption" color={t.colors.accent}>
                              {item.frequency}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

/**
 * Gated on `mod_exercises` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function Exercises() {
  return (
    <PlanGate module="mod_exercises">
      <ExercisesScreen />
    </PlanGate>
  );
}
