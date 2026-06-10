import { View, Pressable, ScrollView, Platform } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchMe } from "@/api/patient";
import { fetchAppointments, nextUpcoming } from "@/api/appointments";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";

const QUICK_ACTIONS = [
  { icon: "calendar-outline" as const, label: "Agenda", path: "/appointments", color: "#5dc9c0" },
  { icon: "fitness-outline" as const, label: "Exercícios", path: "/exercises", color: "#4a7c8a" },
  { icon: "foot-outline" as const, label: "Scans 3D", path: "/foot-scans", color: "#6ba3b0" },
  { icon: "document-text-outline" as const, label: "Docs", path: "/documents", color: "#7dd4cd" },
  { icon: "school-outline" as const, label: "Educação", path: "/education", color: "#4ab3ab" },
  { icon: "pulse-outline" as const, label: "Pressão", path: "/blood-pressure", color: "#10b981" },
];

function Avatar({ name }: { name?: string }) {
  const initials = name
    ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return (
    <View style={{
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(74, 124, 138, 0.2)",
      borderWidth: 1.5,
      borderColor: "rgba(93, 201, 192, 0.3)",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <Text variant="label" color="#5dc9c0" style={{ fontWeight: "700", fontSize: 16 }}>
        {initials}
      </Text>
    </View>
  );
}

export default function Home() {
  const t = useTheme();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const appts = useQuery({ queryKey: ["appointments"], queryFn: fetchAppointments });

  const next = appts.data ? nextUpcoming(appts.data) : null;
  const firstName = me.data?.user?.firstName;
  const greeting = getGreeting();

  return (
    <Screen scroll testID="home-screen">
      <View style={{ gap: 24 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={firstName} />
            <View>
              <Text variant="body" color={t.colors.textSecondary}>{greeting}</Text>
              <Text variant="subtitle" style={{ marginTop: 2 }}>
                {firstName ?? "Paciente"}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/notifications")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(74, 124, 138, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(74, 124, 138, 0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="notifications-outline" size={22} color={t.colors.textSecondary} />
          </Pressable>
        </View>

        {/* Banner */}
        <Pressable onPress={() => router.push("/exercises")} style={{ borderRadius: t.radius.lg, overflow: "hidden" }}>
          <LinearGradient
            colors={["#1a3a45", "#2c5f6e", "#4a7c8a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 24,
              borderRadius: t.radius.lg,
              borderWidth: 1,
              borderColor: "rgba(93, 201, 192, 0.15)",
            }}
          >
            <Text variant="subtitle" color="#e2e8f0" style={{ marginBottom: 4 }}>
              Cuide da sua saúde,
            </Text>
            <Text variant="title" color="#ffffff" style={{ fontSize: 22, marginBottom: 8 }}>
              Viva melhor todos os dias
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.7)" style={{ marginBottom: 16, lineHeight: 18 }}>
              Acompanhe seus exercícios e mantenha{"\n"}seu corpo em equilíbrio
            </Text>
            <View style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(93, 201, 192, 0.2)",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(93, 201, 192, 0.3)",
            }}>
              <Text variant="label" color="#5dc9c0">Ver exercícios</Text>
              <Ionicons name="arrow-forward" size={14} color="#5dc9c0" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Upcoming Appointment */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="subtitle">Próximo agendamento</Text>
            <Pressable onPress={() => router.push("/appointments")}>
              <Text variant="caption" color={t.colors.secondary}>Ver todos</Text>
            </Pressable>
          </View>

          {appts.isLoading ? (
            <Spinner />
          ) : appts.isError ? (
            <Card>
              <Text color={t.colors.danger}>Não foi possível carregar.</Text>
            </Card>
          ) : next ? (
            <Pressable onPress={() => router.push(`/appointment/${next.id}`)}>
              <Card variant="elevated">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "rgba(74, 124, 138, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Ionicons name="medical-outline" size={24} color="#5dc9c0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" testID="next-appt-type" style={{ fontWeight: "600" }}>
                      {next.treatmentType}
                    </Text>
                    {next.therapist ? (
                      <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                        {next.therapist.firstName} {next.therapist.lastName}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text variant="caption" color={t.colors.secondary} testID="next-appt-date">
                      {formatDateTime(next.dateTime)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ) : (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="calendar-outline" size={20} color={t.colors.textMuted} />
                <Text muted testID="next-appt-empty">Nenhum agendamento futuro.</Text>
              </View>
            </Card>
          )}
        </View>

        {/* Quick Actions */}
        <View style={{ gap: 12 }}>
          <Text variant="subtitle">Acesso rápido</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.path}
                onPress={() => router.push(action.path)}
                style={({ pressed }) => ({
                  width: "30%",
                  flexGrow: 1,
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 16,
                  backgroundColor: pressed ? "rgba(74, 124, 138, 0.12)" : "rgba(74, 124, 138, 0.06)",
                  borderRadius: t.radius.lg,
                  borderWidth: 1,
                  borderColor: "rgba(74, 124, 138, 0.1)",
                })}
              >
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: `${action.color}15`,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text variant="caption" color={t.colors.textSecondary} style={{ fontWeight: "500" }}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia,";
  if (h < 18) return "Boa tarde,";
  return "Boa noite,";
}
