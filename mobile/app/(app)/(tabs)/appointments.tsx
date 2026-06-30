import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAppointments } from "@/api/appointments";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  SCHEDULED: { bg: "rgba(59, 130, 246, 0.12)", text: "#60a5fa", label: "Agendado" },
  CONFIRMED: { bg: "rgba(16, 185, 129, 0.12)", text: "#34d399", label: "Confirmado" },
  COMPLETED: { bg: "rgba(107, 163, 176, 0.12)", text: "#8494a7", label: "Concluído" },
  CANCELLED: { bg: "rgba(239, 68, 68, 0.12)", text: "#f87171", label: "Cancelado" },
  NO_SHOW: { bg: "rgba(245, 158, 11, 0.12)", text: "#fbbf24", label: "Faltou" },
};

export default function Appointments() {
  const t = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const sorted = (data ?? [])
    .slice()
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return (
    <Screen testID="appointments-screen">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text variant="title">Agenda</Text>
        <Pressable
          onPress={() => router.push("/book-appointment")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(93,201,192,0.15)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(93,201,192,0.25)" }}
        >
          <Ionicons name="add" size={16} color="#5dc9c0" />
          <Text variant="caption" color="#5dc9c0" style={{ fontWeight: "600" }}>Agendar</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>Não foi possível carregar a agenda.</Text>
          </View>
        </Card>
      ) : sorted.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Ionicons name="calendar-outline" size={48} color={t.colors.textMuted} />
          <Text muted testID="appointments-empty">Você não tem agendamentos.</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const status = STATUS_COLORS[item.status] ?? STATUS_COLORS.SCHEDULED;
            return (
              <Pressable
                testID={`appt-${item.id}`}
                onPress={() => router.push(`/appointment/${item.id}`)}
              >
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: "rgba(74, 124, 138, 0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="medical-outline" size={22} color="#5dc9c0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" style={{ fontWeight: "600" }}>{item.treatmentType}</Text>
                      <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                        {formatDateTime(item.dateTime)}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: status.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                    }}>
                      <Text variant="caption" color={status.text} style={{ fontWeight: "600", fontSize: 11 }}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                  {item.therapist ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginLeft: 56 }}>
                      <Ionicons name="person-outline" size={14} color={t.colors.textMuted} />
                      <Text variant="caption" muted>
                        {item.therapist.firstName} {item.therapist.lastName}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
