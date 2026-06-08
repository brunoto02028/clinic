import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchPrescriptions } from "@/api/exercises";

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });

  const rx = data?.find((p) => p.id === id);

  return (
    <Screen scroll testID="exercise-detail">
      <Stack.Screen options={{ headerShown: true, title: "Exercício" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar o exercício.</Text>
      ) : !rx ? (
        <Text muted>Exercício não encontrado.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          <Text variant="title">{rx.exercise.name}</Text>
          <Card>
            <View style={{ flexDirection: "row", gap: 16 }}>
              {rx.sets ? <Text variant="label">Séries: <Text muted>{rx.sets}</Text></Text> : null}
              {rx.reps ? <Text variant="label">Reps: <Text muted>{rx.reps}</Text></Text> : null}
              {rx.frequency ? <Text variant="label">Freq.: <Text muted>{rx.frequency}</Text></Text> : null}
            </View>
          </Card>
          {rx.exercise.description ? (
            <Card>
              <Text variant="label">Descrição</Text>
              <Text muted>{rx.exercise.description}</Text>
            </Card>
          ) : null}
          {rx.exercise.instructions ? (
            <Card>
              <Text variant="label">Instruções</Text>
              <Text muted>{rx.exercise.instructions}</Text>
            </Card>
          ) : null}
          {rx.notes ? (
            <Card>
              <Text variant="label">Nota do terapeuta</Text>
              <Text muted>{rx.notes}</Text>
            </Card>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
