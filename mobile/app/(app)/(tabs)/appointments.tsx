import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAppointments } from "@/api/appointments";
import { formatDateTime } from "@/lib/format";

export default function Appointments() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const sorted = (data ?? [])
    .slice()
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return (
    <Screen testID="appointments-screen">
      <Text variant="title" style={{ marginBottom: 12 }}>Agenda</Text>

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar a agenda.</Text>
      ) : sorted.length === 0 ? (
        <Text muted testID="appointments-empty">Você não tem agendamentos.</Text>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              testID={`appt-${item.id}`}
              onPress={() => router.push(`/appointment/${item.id}`)}
            >
              <Card>
                <Text variant="subtitle">{item.treatmentType}</Text>
                <Text muted>{formatDateTime(item.dateTime)}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="caption" muted>
                    {item.therapist ? `${item.therapist.firstName} ${item.therapist.lastName}` : ""}
                  </Text>
                  <Text variant="caption" muted>{item.status}</Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
