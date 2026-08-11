import { View, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAppointment } from "@/api/appointments";
import { useTheme } from "@/theme/useTheme";

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

  const STATUS_MAP: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    SCHEDULED: { bg: t.colors.workSoft, text: t.colors.work, label: "Agendado", icon: "time-outline" },
    CONFIRMED: { bg: t.colors.okSoft, text: t.colors.ok, label: "Confirmado", icon: "checkmark-circle-outline" },
    COMPLETED: { bg: t.colors.surfaceMuted, text: t.colors.textMuted, label: "Concluído", icon: "checkbox-outline" },
    CANCELLED: { bg: t.colors.badSoft, text: t.colors.bad, label: "Cancelado", icon: "close-circle-outline" },
    NO_SHOW: { bg: t.colors.warnSoft, text: t.colors.warn, label: "Faltou", icon: "alert-circle-outline" },
  };

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
                backgroundColor: t.colors.surfaceMuted,
                borderWidth: 1.5,
                borderColor: t.colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="person-outline" size={28} color={t.colors.ok} />
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
                  backgroundColor: t.colors.okSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="calendar-outline" size={20} color={t.colors.ok} />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>Data</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{formatDate(data.dateTime)}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: t.colors.borderSubtle }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: t.colors.workSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="time-outline" size={20} color={t.colors.work} />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>Horário</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{formatTime(data.dateTime)}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: t.colors.borderSubtle }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: t.colors.warnSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="hourglass-outline" size={20} color={t.colors.warn} />
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
