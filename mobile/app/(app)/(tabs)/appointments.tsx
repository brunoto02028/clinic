import { Screen, Text } from "@/components/ui";

export default function Appointments() {
  return (
    <Screen testID="appointments-screen">
      <Text variant="title">Agenda</Text>
      <Text muted>Seus agendamentos aparecerão aqui.</Text>
    </Screen>
  );
}
