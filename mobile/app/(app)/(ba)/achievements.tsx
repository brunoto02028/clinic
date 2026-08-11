import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAchievements } from "@/api/extras";

export default function Achievements() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["achievements"],
    queryFn: fetchAchievements,
  });

  return (
    <Screen testID="achievements-screen">
      <Stack.Screen options={{ headerShown: true, title: "Conquistas" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar as conquistas.</Text>
      ) : (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Text variant="subtitle">
              {data?.totalUnlocked ?? 0}/{data?.totalAchievements ?? 0} desbloqueadas
            </Text>
            <Text muted>{data?.totalXp ?? 0} XP</Text>
          </Card>
          {(data?.achievements ?? []).length === 0 ? (
            <Text muted testID="achievements-empty">Nenhuma conquista ainda.</Text>
          ) : (
            <FlatList
              data={data!.achievements}
              keyExtractor={(a) => a.id}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => (
                <Card>
                  <Text variant="subtitle">{item.title || item.name}</Text>
                  {item.description ? <Text muted>{item.description}</Text> : null}
                </Card>
              )}
            />
          )}
        </>
      )}
    </Screen>
  );
}
