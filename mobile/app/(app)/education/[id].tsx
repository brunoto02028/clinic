import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchEducation, educationList } from "@/api/education";

export default function EducationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["education"],
    queryFn: fetchEducation,
  });

  const item = data ? educationList(data).find((c) => c.id === id) : undefined;

  return (
    <Screen scroll testID="education-detail">
      <Stack.Screen options={{ headerShown: true, title: "Conteúdo" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar o conteúdo.</Text>
      ) : !item ? (
        <Text muted>Conteúdo não encontrado.</Text>
      ) : (
        <>
          <Text variant="title">{item.title}</Text>
          {item.category?.name ? (
            <Text variant="caption" muted>{item.category.name}</Text>
          ) : null}
          {item.description ? (
            <Card style={{ marginTop: 12 }}>
              <Text muted>{item.description}</Text>
            </Card>
          ) : null}
          {item.body || item.content ? (
            <Card style={{ marginTop: 12 }}>
              <Text muted>{item.body || item.content}</Text>
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
