import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchBodyAssessments } from "@/api/body-assessments";
import { useTheme } from "@/theme/useTheme";

export default function BodyAssessments() {
  const t = useTheme();
  const { data, isLoading } = useQuery({ queryKey: ["body-assessments"], queryFn: fetchBodyAssessments });

  return (
    <Screen testID="body-assessments-screen">
      <Stack.Screen options={{ headerShown: true, title: "Body Assessment", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 16, flex: 1 }}>
        <View>
          <Text variant="title">Body Assessment</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>Avaliações corporais do seu terapeuta</Text>
        </View>
        {isLoading ? <Spinner center /> : (data ?? []).length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <Ionicons name="body-outline" size={48} color={t.colors.textMuted} />
              <Text variant="subtitle" color={t.colors.textSecondary}>Nenhuma avaliação</Text>
              <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center" }}>
                Suas avaliações corporais aparecerão aqui{"\n"}após serem realizadas pelo terapeuta.
              </Text>
            </View>
          </Card>
        ) : (
          <FlatList data={data} keyExtractor={a => a.id} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(139,92,246,0.1)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="body-outline" size={22} color="#8b5cf6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={{ fontWeight: "600" }}>Avaliação #{item.assessmentNumber ?? "—"}</Text>
                    <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                      {item.therapist.firstName} {item.therapist.lastName} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: item.status === "COMPLETED" ? "rgba(16,185,129,0.12)" : "rgba(59,130,246,0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text variant="caption" color={item.status === "COMPLETED" ? "#34d399" : "#60a5fa"} style={{ fontWeight: "600", fontSize: 10 }}>
                      {item.status === "COMPLETED" ? "Concluída" : "Enviada"}
                    </Text>
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </View>
    </Screen>
  );
}
