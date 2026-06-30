import { View, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAppointment } from "@/api/appointments";
import { useTheme } from "@/theme/useTheme";

const STATUS_MAP: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  SCHEDULED: { bg: "rgba(59, 130, 246, 0.12)", text: "#60a5fa", label: "Agendado", icon: "time-outline" },
  CONFIRMED: { bg: "rgba(16, 185, 129, 0.12)", text: "#34d399", label: "Confirmado", icon: "checkmark-circle-outline" },
  COMPLETED: { bg: "rgba(107, 163, 176, 0.12)", text: "#8494a7", label: "Concluído", icon: "checkbox-outline" },
  CANCELLED: { bg: "rgba(239, 68, 68, 0.12)", text: "#f87171", label: "Cancelado", icon: "close-circle-outline" },
  NO_SHOW: { bg: "rgba(245, 158, 11, 0.12)", text: "#fbbf24", label: "Faltou", icon: "alert-circle-outline" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function AppointmentDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["appointment", id],
    queryFn: () => fetchAppointment(id),
    enabled: !!id,
  });

  return (
    <Screen scroll testID="appointment-detail">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Agendamento",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError || !data ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>Não foi possível carregar.</Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Therapist card */}
          <Card variant="elevated">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: "rgba(74, 124, 138, 0.15)",
                borderWidth: 1.5,
                borderColor: "rgba(93, 201, 192, 0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="person-outline" size={28} color="#5dc9c0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="subtitle">
                  {data.therapist ? `${data.therapist.firstName} ${data.therapist.lastName}` : "Terapeuta"}
                </Text>
                <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                  {data.treatmentType}
                </Text>
              </View>
              {data.price ? (
                <Text variant="subtitle" color={t.colors.secondary}>
                  £{data.price}
                </Text>
              ) : null}
            </View>
          </Card>

          {/* Status badge */}
          {(() => {
            const s = STATUS_MAP[data.status] ?? STATUS_MAP.SCHEDULED;
            return (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                alignSelf: "flex-start",
                backgroundColor: s.bg,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Ionicons name={s.icon as any} size={16} color={s.text} />
                <Text variant="label" color={s.text} style={{ fontWeight: "600" }}>{s.label}</Text>
              </View>
            );
          })()}

          {/* Details section */}
          {data.notes ? (
            <Card>
              <Text variant="label" style={{ fontWeight: "600", marginBottom: 4 }}>Detalhes</Text>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>
                {data.notes}
              </Text>
            </Card>
          ) : null}

          {/* Date & Time info */}
          <Card>
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "rgba(93, 201, 192, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="calendar-outline" size={20} color="#5dc9c0" />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>Data</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{formatDate(data.dateTime)}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.04)" }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="time-outline" size={20} color="#60a5fa" />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>Horário</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{formatTime(data.dateTime)}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.04)" }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="hourglass-outline" size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>Duração</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{data.duration} minutos</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>
      )}
    </Screen>
  );
}
