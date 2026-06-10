import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAppointment } from "@/api/appointments";
import { formatDateTime } from "@/lib/format";

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["appointment", id],
    queryFn: () => fetchAppointment(id),
    enabled: !!id,
  });

  return (
    <Screen scroll testID="appointment-detail">
      <Stack.Screen options={{ headerShown: true, title: "Agendamento" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError || !data ? (
        <Text color="#dc2626">Não foi possível carregar o agendamento.</Text>
      ) : (
        <Card>
          <Text variant="title">{data.treatmentType}</Text>
          <Text muted>{formatDateTime(data.dateTime)}</Text>
          <View style={{ gap: 4, marginTop: 8 }}>
            <Text variant="label">Status: <Text muted>{data.status}</Text></Text>
            <Text variant="label">Duração: <Text muted>{data.duration} min</Text></Text>
            {data.therapist ? (
              <Text variant="label">
                Terapeuta: <Text muted>{data.therapist.firstName} {data.therapist.lastName}</Text>
              </Text>
            ) : null}
            {data.notes ? (
              <Text variant="label">Notas: <Text muted>{data.notes}</Text></Text>
            ) : null}
          </View>
        </Card>
      )}
    </Screen>
  );
}
