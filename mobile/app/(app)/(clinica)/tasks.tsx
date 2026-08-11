import { FlatList, View, Pressable, Alert } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchTasks, completeTask } from "@/api/tasks";
import { useTheme } from "@/theme/useTheme";

export default function Tasks() {
  const t = useTheme();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });

  const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
    urgent: { bg: t.colors.badSoft, text: t.colors.bad },
    high: { bg: t.colors.warnSoft, text: t.colors.warn },
    normal: { bg: t.colors.workSoft, text: t.colors.work },
    low: { bg: t.colors.surfaceMuted, text: t.colors.textMuted },
  };

  const completeMut = useMutation({
    mutationFn: (taskId: string) => completeTask(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      Alert.alert("Tarefa concluida!");
    },
    onError: (e) => Alert.alert("Erro", (e as Error).message),
  });

  const tasks = data ?? [];
  const pending = tasks.filter(t => t.status !== "completed");
  const completed = tasks.filter(t => t.status === "completed");

  return (
    <Screen testID="tasks-screen">
      <Stack.Screen options={{ headerShown: true, title: "Tarefas", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 16, flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="title">Tarefas</Text>
          {pending.length > 0 && (
            <View style={{ backgroundColor: t.colors.warnSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text variant="caption" color={t.colors.warn} style={{ fontWeight: "700" }}>{pending.length} pendente{pending.length !== 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>

        {isLoading ? <Spinner center /> : tasks.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <Ionicons name="checkbox-outline" size={48} color={t.colors.textMuted} />
              <Text variant="subtitle" color={t.colors.textSecondary}>Nenhuma tarefa</Text>
              <Text variant="caption" color={t.colors.textMuted}>Tarefas atribuidas pela clinica aparecerao aqui.</Text>
            </View>
          </Card>
        ) : (
          <FlatList
            data={[...pending, ...completed]}
            keyExtractor={t => t.id}
            contentContainerStyle={{ gap: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isDone = item.status === "completed";
              const prio = PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.normal;
              return (
                <Pressable onPress={() => !isDone && completeMut.mutate(item.id)}>
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 8,
                        borderWidth: 1.5, borderColor: isDone ? t.colors.ok : t.colors.border,
                        backgroundColor: isDone ? t.colors.okSoft : "transparent",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {isDone && <Ionicons name="checkmark" size={16} color={t.colors.ok} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="label" style={{ fontWeight: "600", textDecorationLine: isDone ? "line-through" : "none", color: isDone ? t.colors.textMuted : t.colors.text }}>
                          {item.titlePt || item.title}
                        </Text>
                        {(item.descriptionPt || item.description) ? (
                          <Text variant="caption" color={t.colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
                            {item.descriptionPt || item.description}
                          </Text>
                        ) : null}
                      </View>
                      {!isDone && (
                        <View style={{ backgroundColor: prio.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text variant="caption" color={prio.text} style={{ fontWeight: "600", fontSize: 10 }}>{item.priority}</Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}
