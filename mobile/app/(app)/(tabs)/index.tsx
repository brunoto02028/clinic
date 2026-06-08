import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchMe } from "@/api/patient";
import { fetchAppointments, nextUpcoming } from "@/api/appointments";
import { formatDateTime } from "@/lib/format";

export default function Home() {
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const appts = useQuery({ queryKey: ["appointments"], queryFn: fetchAppointments });

  const next = appts.data ? nextUpcoming(appts.data) : null;

  return (
    <Screen scroll testID="home-screen">
      <View style={{ gap: 16 }}>
        <Text variant="title">
          {me.data ? `Olá, ${me.data.user.firstName}` : "Início"}
        </Text>

        <Text variant="subtitle">Próximo agendamento</Text>
        {appts.isLoading ? (
          <Spinner />
        ) : appts.isError ? (
          <Card>
            <Text color="#dc2626">Não foi possível carregar seus agendamentos.</Text>
          </Card>
        ) : next ? (
          <Card>
            <Text variant="subtitle" testID="next-appt-type">
              {next.treatmentType}
            </Text>
            <Text muted testID="next-appt-date">{formatDateTime(next.dateTime)}</Text>
            {next.therapist ? (
              <Text variant="caption" muted>
                com {next.therapist.firstName} {next.therapist.lastName}
              </Text>
            ) : null}
          </Card>
        ) : (
          <Card>
            <Text muted testID="next-appt-empty">Nenhum agendamento futuro.</Text>
          </Card>
        )}

        <Text variant="subtitle">Atalhos</Text>
        <View style={{ gap: 8 }}>
          <Button title="Ver agenda" variant="secondary" onPress={() => router.push("/appointments")} />
          <Button title="Meus exercícios" variant="secondary" onPress={() => router.push("/exercises")} />
          <Button title="Meu perfil" variant="ghost" onPress={() => router.push("/profile")} />
        </View>
      </View>
    </Screen>
  );
}
