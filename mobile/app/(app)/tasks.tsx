import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchTasks, completeTask } from "@/api/tasks";

export default function Tasks() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const mutation = useMutation({
    mutationFn: (taskId: string) => completeTask(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <Screen testID="tasks-screen">
      <Stack.Screen options={{ headerShown: true, title: "Tarefas" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar as tarefas.</Text>
      ) : (data ?? []).length === 0 ? (
        <Text muted testID="tasks-empty">Nenhuma tarefa pendente.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Card>
              <Text variant="subtitle">{item.titlePt || item.title}</Text>
              {item.descriptionPt || item.description ? (
                <Text muted>{item.descriptionPt || item.description}</Text>
              ) : null}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="caption" muted>{item.priority}</Text>
                <View style={{ width: 140 }}>
                  <Button
                    title="Concluir"
                    onPress={() => mutation.mutate(item.id)}
                    loading={mutation.isPending && mutation.variables === item.id}
                    testID={`task-done-${item.id}`}
                  />
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
