import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Pill, Avatar, TriBar, Button, Spinner } from "@/components/ui";
import { fetchMe } from "@/api/patient";
import { fetchAppointments, nextUpcoming } from "@/api/appointments";
import { fetchCheckIns } from "@/api/daily-checkin";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";

// ── Helpers ──

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getInitials(first?: string, last?: string): string {
  const f = first?.[0] ?? "";
  const l = last?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

// ── Home Screen ──

export default function Home() {
  const t = useTheme();

  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const appts = useQuery({ queryKey: ["appointments"], queryFn: fetchAppointments });
  const checkinData = useQuery({ queryKey: ["daily-checkin"], queryFn: fetchCheckIns });

  const firstName = me.data?.user?.firstName;
  const lastName = me.data?.user?.lastName;
  const initials = getInitials(firstName, lastName);
  const next = appts.data ? nextUpcoming(appts.data) : null;
  const streak = checkinData.data?.progress;
  const didCheckinToday = !!checkinData.data?.today;

  // Derive pillar completion for the Today card
  const hasWorkActivity = !!next;
  const hasHealthActivity = didCheckinToday;
  const hasCommunityActivity = false;

  const doneCount = [hasWorkActivity, hasHealthActivity, hasCommunityActivity].filter(Boolean).length;
  const totalCount = 3;

  // Build summary line
  const summaryParts: string[] = [];
  if (hasWorkActivity && next) {
    summaryParts.push(`Appointment booked ✓`);
  }
  if (hasHealthActivity) {
    summaryParts.push(`Check-in done ✓`);
  }
  if (!hasCommunityActivity) {
    summaryParts.push("1 community action pending");
  }
  const summaryText = summaryParts.join(" · ");

  const isLoading = me.isLoading || appts.isLoading || checkinData.isLoading;

  if (isLoading) {
    return (
      <Screen testID="home-screen">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="home-screen">
      <View style={{ gap: 20 }}>

        {/* ── 1. Header ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar label={initials} round size={44} />
            <View>
              <Text
                variant="subtitle"
                style={{ fontFamily: "Sora_700Bold" }}
              >
                {getGreeting()}, {firstName ?? "there"}
              </Text>
              <Text variant="caption" muted style={{ marginTop: 2 }}>
                {getFormattedDate()}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityLabel="Notifications"
            style={({ pressed }) => ({
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: t.colors.surface,
              borderWidth: 1,
              borderColor: t.colors.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="notifications-outline" size={15} color={t.colors.text} />
          </Pressable>
        </View>

        {/* ── 2. Today Card (dark) ── */}
        <Card dark>
          <Text
            variant="eyebrow"
            color={t.colors.textMuted}
            style={{ textTransform: "uppercase" }}
          >
            TODAY
          </Text>

          <Text
            variant="caption"
            color="#FFFFFF"
            style={{ opacity: 0.7, marginTop: 2 }}
          >
            {doneCount} of {totalCount} done
          </Text>

          <TriBar
            work={hasWorkActivity}
            health={hasHealthActivity}
            community={hasCommunityActivity}
            style={{ marginTop: 8 }}
          />

          <Text
            variant="body"
            color="#FFFFFF"
            style={{ opacity: 0.65, marginTop: 8, lineHeight: 18 }}
          >
            {summaryText}
          </Text>
        </Card>

        {/* ── 3. Work Card ── */}
        <Card accent="work">
          <Text
            variant="eyebrow"
            color={t.colors.work}
            style={{ textTransform: "uppercase" }}
          >
            WORK
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            {next ? (
              <Pill label={formatDateTime(next.dateTime)} variant="work" />
            ) : (
              <Pill label="No upcoming" variant="muted" />
            )}
          </View>

          <Text
            variant="heading"
            style={{ fontFamily: "Sora_700Bold", marginTop: 8 }}
          >
            {next ? next.treatmentType : "Schedule your next session"}
          </Text>

          <Text variant="body" muted style={{ marginTop: 2 }}>
            {next && next.therapist
              ? `with ${next.therapist.firstName} ${next.therapist.lastName}`
              : "Keep your treatment plan on track"}
          </Text>

          <Button
            title={next ? "View appointment" : "Book now"}
            variant="primary"
            size="sm"
            onPress={() =>
              next
                ? router.push(`/appointment/${next.id}`)
                : router.push("/appointments")
            }
            style={{ alignSelf: "flex-start", marginTop: 10 }}
          />
        </Card>

        {/* ── 4. Health Card ── */}
        <Card accent="health">
          <Text
            variant="eyebrow"
            color={t.colors.health}
            style={{ textTransform: "uppercase" }}
          >
            HEALTH
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            {streak && streak.streakDays > 0 ? (
              <Pill
                label={`Day ${streak.streakDays} of ${streak.longestStreak > streak.streakDays ? streak.longestStreak : streak.streakDays + 30}`}
                variant="health"
              />
            ) : (
              <Pill label="Start today" variant="muted" />
            )}
          </View>

          <Text
            variant="heading"
            style={{ fontFamily: "Sora_700Bold", marginTop: 8 }}
          >
            {didCheckinToday ? "Check-in complete" : "Daily check-in"}
          </Text>

          <Text variant="body" muted style={{ marginTop: 2 }}>
            {didCheckinToday
              ? `${streak?.xp ?? 0} XP earned. Keep the streak going.`
              : "Log how you feel and track your progress"}
          </Text>

          <Button
            title={didCheckinToday ? "View progress" : "Check in now"}
            variant="health"
            size="sm"
            onPress={() => router.push("/daily-checkin")}
            style={{ alignSelf: "flex-start", marginTop: 10 }}
          />
        </Card>

        {/* ── 5. Community Card ── */}
        <Card accent="community">
          <Text
            variant="eyebrow"
            color={t.colors.community}
            style={{ textTransform: "uppercase" }}
          >
            COMMUNITY
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Pill label="5 new" variant="community" />
          </View>

          <Text
            variant="heading"
            style={{ fontFamily: "Sora_700Bold", marginTop: 8 }}
          >
            Education & resources
          </Text>

          <Text variant="body" muted style={{ marginTop: 2 }}>
            New articles and exercises available for you
          </Text>

          <Button
            title="Explore"
            variant="community"
            size="sm"
            onPress={() => router.push("/education")}
            style={{ alignSelf: "flex-start", marginTop: 10 }}
          />
        </Card>

      </View>
    </Screen>
  );
}
