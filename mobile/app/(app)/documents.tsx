import { FlatList, Linking, Pressable } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchDocuments } from "@/api/documents";
import { formatDate } from "@/lib/format";

export default function Documents() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
  });

  const open = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Screen testID="documents-screen">
      <Stack.Screen options={{ headerShown: true, title: "Documentos" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar os documentos.</Text>
      ) : (data ?? []).length === 0 ? (
        <Text muted testID="documents-empty">Nenhum documento.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable testID={`doc-${item.id}`} onPress={() => open(item.fileUrl)}>
              <Card>
                <Text variant="subtitle">{item.title || item.fileName}</Text>
                <Text variant="caption" muted>
                  {item.fileType}
                  {item.documentDate ? ` · ${formatDate(item.documentDate)}` : ""}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
