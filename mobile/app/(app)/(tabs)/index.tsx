import { View, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchMe } from "@/api/patient";
import { fetchAppointments, nextUpcoming } from "@/api/appointments";
import { fetchAICoachTip } from "@/api/notifications";
import { fetchConnections, fetchWearableData } from "@/api/wearables";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";

// ── Quick actions grid ──
const QUICK_ACTIONS = [
  { icon: "calendar-outline" as const, label: "Agendar", path: "/appointments", color: "#5dc9c0" },
  { icon: "clipboard-outline" as const, label: "Registros", path: "/clinical-notes", color: "#60a5fa" },
  { icon: "trophy-outline" as const, label: "Plano", path: "/membership", color: "#f59e0b" },
  { icon: "body-outline" as const, label: "Avaliação", path: "/screening", color: "#8b5cf6" },
] as const;

// ── Health shortcuts ──
const HEALTH_LINKS = [
  { icon: "fitness-outline" as const, label: "Exercícios", path: "/exercises", color: "#5dc9c0" },
  { icon: "document-text-outline" as const, label: "Documentos", path: "/documents", color: "#60a5fa" },
  { icon: "school-outline" as const, label: "Educação", path: "/education", color: "#8b5cf6" },
  { icon: "checkbox-outline" as const, label: "Tarefas", path: "/tasks", color: "#f59e0b" },
] as const;

function Avatar({ name }: { name?: string }) {
  const initials = name
    ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return (
    <View style={{
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: "rgba(74, 124, 138, 0.2)",
      borderWidth: 1.5, borderColor: "rgba(93, 201, 192, 0.3)",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text variant="label" color="#5dc9c0" style={{ fontWeight: "700", fontSize: 16 }}>{initials}</Text>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Home() {
  const t = useTheme();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const appts = useQuery({ queryKey: ["appointments"], queryFn: fetchAppointments });

  const aiCoach = useQuery({ queryKey: ["ai-coach"], queryFn: fetchAICoachTip });
  const wConn = useQuery({ queryKey: ["wearable-connections"], queryFn: fetchConnections });
  const wData = useQuery({ queryKey: ["wearable-data-home"], queryFn: () => fetchWearableData(1) });
  const next = appts.data ? nextUpcoming(appts.data) : null;
  const firstName = me.data?.user?.firstName;

  const latestSleep = wData.data?.find((d) => d.dataType === "SLEEP");
  const latestBody = wData.data?.find((d) => d.dataType === "BODY");
  const latestActivity = wData.data?.find((d) => d.dataType === "ACTIVITY");

  return (
    <Screen scroll testID="home-screen">
      <View style={{ gap: 24 }}>

        {/* ── Header ── */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={firstName} />
            <View>
              <Text variant="caption" color={t.colors.textSecondary}>{getGreeting()}</Text>
              <Text variant="subtitle">{firstName ?? "Paciente"}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/notifications")}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: "rgba(74, 124, 138, 0.1)",
              borderWidth: 1, borderColor: "rgba(74, 124, 138, 0.15)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="notifications-outline" size={22} color={t.colors.textSecondary} />
          </Pressable>
        </View>

        {/* ── Assessment banner ── */}
        <Pressable onPress={() => router.push("/screening")} style={{ borderRadius: t.radius.lg, overflow: "hidden" }}>
          <LinearGradient
            colors={["#1a3a45", "#2c5f6e", "#4a7c8a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 20, borderRadius: t.radius.lg,
              borderWidth: 1, borderColor: "rgba(93, 201, 192, 0.15)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#5dc9c0" />
              <Text variant="label" color="#5dc9c0" style={{ fontWeight: "600" }}>Avaliação Biomecânica</Text>
            </View>
            <Text variant="body" color="rgba(255,255,255,0.8)" style={{ lineHeight: 20, marginBottom: 14 }}>
              Complete sua avaliação para que seu terapeuta crie um plano personalizado.
            </Text>
            <View style={{
              alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: "rgba(93, 201, 192, 0.2)",
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              borderWidth: 1, borderColor: "rgba(93, 201, 192, 0.3)",
            }}>
              <Text variant="label" color="#5dc9c0">Iniciar avaliação</Text>
              <Ionicons name="arrow-forward" size={14} color="#5dc9c0" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Quick actions (4 cards like web) ── */}
        <View style={{ gap: 12 }}>
          <Text variant="subtitle">Ações rápidas</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable
                key={a.path}
                onPress={() => router.push(a.path)}
                style={({ pressed }) => ({
                  flex: 1, alignItems: "center", gap: 8, paddingVertical: 16,
                  backgroundColor: pressed ? "rgba(74, 124, 138, 0.12)" : "rgba(74, 124, 138, 0.06)",
                  borderRadius: t.radius.md, borderWidth: 1, borderColor: "rgba(74, 124, 138, 0.1)",
                })}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: `${a.color}15`, alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name={a.icon} size={20} color={a.color} />
                </View>
                <Text variant="caption" color={t.colors.textSecondary} style={{ fontWeight: "500", fontSize: 11 }}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Wearable summary ── */}
        {wConn.data && wConn.data.length > 0 && (
          <Pressable
            onPress={() => router.push("/wearable-data")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              padding: 16,
              backgroundColor: pressed ? "rgba(93, 201, 192, 0.1)" : "rgba(26, 39, 64, 0.8)",
              borderRadius: t.radius.lg,
              borderWidth: 1,
              borderColor: "rgba(93, 201, 192, 0.15)",
            })}
          >
            <View style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: "rgba(93, 201, 192, 0.15)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="pulse-outline" size={22} color="#5dc9c0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ fontWeight: "600" }}>Wearable</Text>
              <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                {latestSleep?.sleepDuration != null
                  ? `Sono: ${Math.floor(latestSleep.sleepDuration / 60)}h ${Math.round(latestSleep.sleepDuration % 60)}m`
                  : latestBody?.hrv != null
                  ? `HRV: ${Math.round(latestBody.hrv)} ms`
                  : latestActivity?.steps != null
                  ? `Passos: ${latestActivity.steps.toLocaleString()}`
                  : "Toque para ver seus dados"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
          </Pressable>
        )}

        {/* ── Upcoming Appointment ── */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="subtitle">Próximo agendamento</Text>
            <Pressable onPress={() => router.push("/appointments")}>
              <Text variant="caption" color={t.colors.secondary}>Ver todos</Text>
            </Pressable>
          </View>
          {appts.isLoading ? (
            <Spinner />
          ) : next ? (
            <Pressable onPress={() => router.push(`/appointment/${next.id}`)}>
              <Card variant="elevated">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: "rgba(74, 124, 138, 0.15)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="medical-outline" size={24} color="#5dc9c0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={{ fontWeight: "600" }}>{next.treatmentType}</Text>
                    {next.therapist && (
                      <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                        {next.therapist.firstName} {next.therapist.lastName}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text variant="caption" color={t.colors.secondary}>{formatDateTime(next.dateTime)}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ) : (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="calendar-outline" size={20} color={t.colors.textMuted} />
                <Text muted>Nenhum agendamento futuro.</Text>
              </View>
            </Card>
          )}
        </View>

        {/* ── Daily check-in ── */}
        <Card variant="highlight">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Ionicons name="happy-outline" size={20} color="#5dc9c0" />
            <Text variant="label" style={{ fontWeight: "600" }}>Como você está hoje?</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {[
              { emoji: "😊", label: "Ótimo" },
              { emoji: "🙂", label: "Bem" },
              { emoji: "😐", label: "Normal" },
              { emoji: "😔", label: "Mal" },
              { emoji: "😣", label: "Péssimo" },
            ].map((m) => (
              <Pressable
                key={m.label}
                style={({ pressed }) => ({
                  alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 14,
                  backgroundColor: pressed ? "rgba(74, 124, 138, 0.15)" : "rgba(74, 124, 138, 0.06)",
                  borderRadius: 12, borderWidth: 1, borderColor: "rgba(74, 124, 138, 0.1)",
                })}
              >
                <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 10 }}>{m.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

        {/* ── Today's missions ── */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="flag-outline" size={18} color={t.colors.secondary} />
            <Text variant="subtitle">Missões de hoje</Text>
          </View>
          {[
            { icon: "fitness-outline" as const, text: "Complete 2 exercícios do plano", done: false },
            { icon: "checkbox-outline" as const, text: "Faça o check-in diário", done: false },
            { icon: "book-outline" as const, text: "Leia 1 artigo educativo", done: false },
          ].map((mission, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                paddingVertical: 10, paddingHorizontal: 4,
                borderBottomWidth: i < 2 ? 1 : 0,
                borderBottomColor: "rgba(255,255,255,0.04)",
              }}
            >
              <View style={{
                width: 28, height: 28, borderRadius: 8,
                borderWidth: 1.5, borderColor: "rgba(74, 124, 138, 0.3)",
                alignItems: "center", justifyContent: "center",
              }}>
                {mission.done && <Ionicons name="checkmark" size={16} color="#5dc9c0" />}
              </View>
              <Ionicons name={mission.icon} size={18} color={t.colors.textMuted} />
              <Text variant="body" color={t.colors.textSecondary} style={{ flex: 1 }}>{mission.text}</Text>
            </View>
          ))}
        </View>

        {/* ── AI Coach ── */}
        {aiCoach.data?.tip ? (
          <Card variant="elevated">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Ionicons name="sparkles-outline" size={18} color="#f59e0b" />
              <Text variant="label" style={{ fontWeight: "600" }}>AI Coach</Text>
              <Text variant="caption" color={t.colors.textMuted}>· Dica do dia</Text>
            </View>
            <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>
              {aiCoach.data.tip}
            </Text>
          </Card>
        ) : null}

        {/* ── Health & data shortcuts ── */}
        <View style={{ gap: 12 }}>
          <Text variant="subtitle">Saúde & Dados</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {HEALTH_LINKS.map((link) => (
              <Pressable
                key={link.path}
                onPress={() => router.push(link.path)}
                style={({ pressed }) => ({
                  width: "31%", flexGrow: 1, alignItems: "center", gap: 8, paddingVertical: 14,
                  backgroundColor: pressed ? "rgba(74, 124, 138, 0.12)" : "rgba(74, 124, 138, 0.06)",
                  borderRadius: t.radius.md, borderWidth: 1, borderColor: "rgba(74, 124, 138, 0.1)",
                })}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: `${link.color}15`, alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name={link.icon} size={20} color={link.color} />
                </View>
                <Text variant="caption" color={t.colors.textSecondary} style={{ fontWeight: "500", fontSize: 11 }}>
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

      </View>
    </Screen>
  );
}
