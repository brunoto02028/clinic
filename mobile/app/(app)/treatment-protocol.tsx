import { FlatList, View, Pressable, Alert } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchProtocols, updateProtocolItem } from "@/api/protocol";
import { useTheme } from "@/theme/useTheme";

export default function TreatmentProtocol() {
  const t = useTheme();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["protocols"], queryFn: fetchProtocols });

  const completeMut = useMutation({
    mutationFn: (itemId: string) => updateProtocolItem(itemId, { completed: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["protocols"] }),
    onError: (e) => Alert.alert("Erro", (e as Error).message),
  });

  const protocols = data ?? [];

  return (
    <Screen testID="protocol-screen">
      <Stack.Screen options={{ headerShown: true, title: "Protocolo", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 16, flex: 1 }}>
        <View>
          <Text variant="title">Plano de Tratamento</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>Protocolo prescrito pelo terapeuta</Text>
        </View>

        {isLoading ? <Spinner center /> : protocols.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <Ionicons name="list-outline" size={48} color={t.colors.textMuted} />
              <Text variant="subtitle" color={t.colors.textSecondary}>Nenhum protocolo</Text>
              <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center" }}>
                Seu terapeuta criará um plano de tratamento{"\n"}personalizado após a avaliação.
              </Text>
            </View>
          </Card>
        ) : (
          <FlatList data={protocols} keyExtractor={p => p.id} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}
            renderItem={({ item: protocol }) => (
              <View style={{ gap: 8 }}>
                <Card variant="elevated">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="clipboard-outline" size={18} color={t.colors.secondary} />
                    <Text variant="label" style={{ fontWeight: "600", flex: 1 }}>
                      Protocolo — {protocol.therapist.firstName} {protocol.therapist.lastName}
                    </Text>
                  </View>
                  {protocol.diagnosis?.summary && (
                    <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>{protocol.diagnosis.summary}</Text>
                  )}
                </Card>
                {protocol.items.map((item) => (
                  <Pressable key={item.id} onPress={() => !item.isCompleted && completeMut.mutate(item.id)}>
                    <Card>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{
                          width: 28, height: 28, borderRadius: 8,
                          borderWidth: 1.5, borderColor: item.isCompleted ? "#34d399" : "rgba(74,124,138,0.3)",
                          backgroundColor: item.isCompleted ? "rgba(16,185,129,0.15)" : "transparent",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          {item.isCompleted && <Ionicons name="checkmark" size={16} color="#34d399" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="label" style={{ fontWeight: "600", textDecorationLine: item.isCompleted ? "line-through" : "none" }}>
                            {item.title}
                          </Text>
                          {item.exercise && (
                            <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                              {item.exercise.defaultSets}x{item.exercise.defaultReps} · {item.exercise.name}
                            </Text>
                          )}
                          {item.completedCount > 0 && (
                            <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>
                              Concluído {item.completedCount}x
                            </Text>
                          )}
                        </View>
                        <Text variant="caption" color={t.colors.textMuted}>Fase {item.phase}</Text>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}
          />
        )}
      </View>
    </Screen>
  );
}
