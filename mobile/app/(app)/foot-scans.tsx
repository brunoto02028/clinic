import { FlatList, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchFootScans } from "@/api/footscans";
import { formatDate } from "@/lib/format";

export default function FootScans() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["foot-scans"],
    queryFn: fetchFootScans,
  });

  return (
    <Screen testID="foot-scans-screen">
      <Stack.Screen options={{ headerShown: true, title: "Scans 3D" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar os scans.</Text>
      ) : (data ?? []).length === 0 ? (
        <Text muted testID="foot-scans-empty">Nenhum scan disponível.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable testID={`scan-${item.id}`} onPress={() => router.push(`/foot-scan/${item.id}`)}>
              <Card>
                <Text variant="subtitle">{item.scanNumber}</Text>
                <Text variant="caption" muted>
                  {item.status}
                  {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ""}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
