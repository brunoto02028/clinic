import { FlatList } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchQuizzes } from "@/api/extras";

export default function Quizzes() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["quizzes"],
    queryFn: fetchQuizzes,
  });

  return (
    <Screen testID="quizzes-screen">
      <Stack.Screen options={{ headerShown: true, title: "Quizzes" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar os quizzes.</Text>
      ) : (data ?? []).length === 0 ? (
        <Text muted testID="quizzes-empty">Nenhum quiz disponível.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(q) => q.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Card>
              <Text variant="subtitle">{item.title || "Quiz"}</Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
