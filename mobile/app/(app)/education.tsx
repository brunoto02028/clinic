import { FlatList, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchEducation, educationList } from "@/api/education";

export default function Education() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["education"],
    queryFn: fetchEducation,
  });

  const list = data ? educationList(data) : [];

  return (
    <Screen testID="education-screen">
      <Stack.Screen options={{ headerShown: true, title: "Educação" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar os conteúdos.</Text>
      ) : list.length === 0 ? (
        <Text muted testID="education-empty">Nenhum conteúdo disponível.</Text>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable testID={`edu-${item.id}`} onPress={() => router.push(`/education/${item.id}`)}>
              <Card>
                <Text variant="subtitle">{item.title}</Text>
                {item.description ? <Text muted numberOfLines={2}>{item.description}</Text> : null}
                <Text variant="caption" muted>
                  {item.category?.name ? `${item.category.name} · ` : ""}{item.contentType}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
