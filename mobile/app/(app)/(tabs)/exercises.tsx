import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchPrescriptions } from "@/api/exercises";

export default function Exercises() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });

  return (
    <Screen testID="exercises-screen">
      <Text variant="title" style={{ marginBottom: 12 }}>Exercícios</Text>

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar os exercícios.</Text>
      ) : (data ?? []).length === 0 ? (
        <Text muted testID="exercises-empty">Nenhum exercício prescrito.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              testID={`rx-${item.id}`}
              onPress={() => router.push(`/exercise/${item.id}`)}
            >
              <Card>
                <Text variant="subtitle">{item.exercise.name}</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {item.sets && item.reps ? (
                    <Text variant="caption" muted>{item.sets}x{item.reps}</Text>
                  ) : null}
                  {item.frequency ? (
                    <Text variant="caption" muted>{item.frequency}</Text>
                  ) : null}
                  <Text variant="caption" muted>{item.exercise.bodyRegion}</Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
