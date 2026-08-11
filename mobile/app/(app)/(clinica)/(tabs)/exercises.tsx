import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchPrescriptions } from "@/api/exercises";
import { useTheme } from "@/theme/useTheme";

const REGION_ICONS: Record<string, string> = {
  LOWER_BODY: "footsteps-outline",
  UPPER_BODY: "body-outline",
  CORE: "fitness-outline",
  FULL_BODY: "accessibility-outline",
};

export default function Exercises() {
  const t = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });

  return (
    <Screen testID="exercises-screen">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Text variant="title">Exercícios</Text>
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
              {data!.length} exercício{data!.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>Não foi possível carregar os exercícios.</Text>
          </View>
        </Card>
      ) : (data ?? []).length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Ionicons name="barbell-outline" size={48} color={t.colors.textMuted} />
          <Text muted testID="exercises-empty">Nenhum exercício prescrito.</Text>
        </View>
      ) : (
        <FlatList
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
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: t.colors.healthSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name={iconName as any} size={22} color={t.colors.health} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" style={{ fontWeight: "600" }}>{item.exercise.name}</Text>
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
