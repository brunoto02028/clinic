import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Text,
  Card,
  Pill,
  Avatar,
  TriBar,
  Button,
  ListItem,
  Spinner,
} from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchAppointments, nextUpcoming } from "@/api/appointments";
import { fetchPrescriptions } from "@/api/exercises";

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${weekday} ${day} ${month} · ${hours}:${minutes}`;
}

export default function Health() {
  const t = useTheme();

  const appts = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });
  const exercises = useQuery({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });

  const next = appts.data ? nextUpcoming(appts.data) : null;
  const exerciseCount = exercises.data?.length ?? 0;
  const estimatedMinutes = exerciseCount * 5;

  if (appts.isLoading && exercises.isLoading) {
    return (
      <Screen testID="health-screen">
        <Spinner center />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="health-screen">
      <View style={{ gap: 20 }}>
        {/* ── Header ── */}
        <Text variant="title">Health</Text>

        {/* ── Next session card ── */}
        {next ? (
          <View
            style={{
              backgroundColor: t.colors.health,
              borderRadius: t.radius.lg,
              padding: 20,
              gap: 10,
            }}
          >
            <Text
              variant="eyebrow"
              color="#CBDCD2"
              style={{ textTransform: "uppercase" }}
            >
              NEXT SESSION
            </Text>
            <Text
              variant="subtitle"
              color="#FFFFFF"
              style={{ fontFamily: "Sora_700Bold" }}
            >
              {formatSessionDate(next.dateTime)}
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.85)">
              {next.treatmentType}
              {next.therapist
                ? ` · with ${next.therapist.firstName}`
                : ""}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <Pressable
                onPress={() => router.push(`/appointment/${next.id}`)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                  borderRadius: t.radius.md,
                  backgroundColor: pressed
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,255,255,0.15)",
                })}
              >
                <Text
                  variant="label"
                  color="#FFFFFF"
                  style={{ fontFamily: "Sora_700Bold", fontSize: 13 }}
                >
                  Reschedule
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {}}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                  borderRadius: t.radius.md,
                  backgroundColor: pressed
                    ? "rgba(255,255,255,0.88)"
                    : "#FFFFFF",
                })}
              >
                <Text
                  variant="label"
                  color={t.colors.health}
                  style={{ fontFamily: "Sora_700Bold", fontSize: 13 }}
                >
                  Directions
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: t.colors.healthSoft,
              borderRadius: t.radius.lg,
              padding: 20,
              gap: 12,
              alignItems: "center",
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={32}
              color={t.colors.health}
            />
            <Text variant="heading" color={t.colors.health}>
              No upcoming sessions
            </Text>
            <Text
              variant="body"
              color={t.colors.textSecondary}
              style={{ textAlign: "center" }}
            >
              Book your next rehab session to stay on track.
            </Text>
            <Button
              title="Book a session"
              variant="health"
              size="sm"
              onPress={() => router.push("/appointments")}
            />
          </View>
        )}

        {/* ── Your plan card ── */}
        <Card accent="health">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text
              variant="eyebrow"
              color={t.colors.textMuted}
              style={{ textTransform: "uppercase" }}
            >
              YOUR PLAN · Shoulder
            </Text>
            <Pill label="Day 12 of 42" variant="health" />
          </View>

          <Text variant="heading">
            {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} today
            {" "}· ~{estimatedMinutes} min
          </Text>

          <TriBar work health />

          <Button
            title="Start today's exercises"
            variant="health"
            onPress={() => router.push("/exercises")}
          />
        </Card>

        {/* ── Lab tests entry (ink card from UX mock) ── */}
        <Pressable
          onPress={() => router.push("/(app)/(lab)/(tabs)" as any)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#2A2E38" : "#20242D",
            borderRadius: 14,
            padding: 14,
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Sora_600SemiBold",
                  fontSize: 9.5,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: "#B8CEC2",
                  marginBottom: 5,
                }}
              >
                New
              </Text>
              <Text
                style={{
                  fontFamily: "Sora_700Bold",
                  fontSize: 13,
                  color: "#F5F4F1",
                }}
              >
                Blood tests
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 10,
                  color: "rgba(245,244,241,0.65)",
                  marginTop: 3,
                  lineHeight: 14,
                }}
              >
                Complete your assessment with blood tests — home kit or collect at the clinic.
              </Text>
            </View>
            <Ionicons name="flask-outline" size={22} color="#B8CEC2" style={{ marginTop: 4 }} />
          </View>
          <View
            style={{
              marginTop: 10,
              backgroundColor: "#B8CEC2",
              borderRadius: 12,
              paddingVertical: 9,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Sora_600SemiBold",
                fontSize: 12,
                color: "#20242D",
              }}
            >
              View tests →
            </Text>
          </View>
        </Pressable>

        {/* ── Quick links ── */}
        <Card>
          <ListItem
            icon={<Avatar label="📈" pillar="health" size={36} />}
            title="Pain trend"
            subtitle="Track your progress over time"
            right={
              <Ionicons
                name="chevron-forward"
                size={16}
                color={t.colors.textMuted}
              />
            }
            onPress={() => router.push("/outcome-measures")}
          />
          <ListItem
            icon={<Avatar label="🗓" pillar="health" size={36} />}
            title="Book a new session"
            subtitle="Schedule your next appointment"
            right={
              <Ionicons
                name="chevron-forward"
                size={16}
                color={t.colors.textMuted}
              />
            }
            onPress={() => router.push("/appointments")}
          />
          <ListItem
            icon={<Avatar label="💬" pillar="health" size={36} />}
            title="Message the clinic"
            subtitle="Send a message to your therapist"
            right={
              <Ionicons
                name="chevron-forward"
                size={16}
                color={t.colors.textMuted}
              />
            }
            onPress={() => router.push("/clinical-notes")}
            last
          />
        </Card>
      </View>
    </Screen>
  );
}
