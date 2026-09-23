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
import { useLang, t as tr } from "@/lib/i18n";
import { isPlanError } from "@/lib/plan";
import { fetchAppointments, nextUpcoming } from "@/api/appointments";
import { fetchPrescriptions } from "@/api/exercises";
import { fetchProtocols } from "@/api/protocol";
import { fetchMessages, unreadFromStaff } from "@/api/messages";

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
  const lang = useLang();
  const t = useTheme();

  const appts = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });
  const exercises = useQuery({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });
  const protocols = useQuery({
    queryKey: ["protocols"],
    queryFn: fetchProtocols,
  });
  const messages = useQuery({
    queryKey: ["messages"],
    queryFn: () => fetchMessages(),
  });

  const next = appts.data ? nextUpcoming(appts.data) : null;
  // `?? 0` turned a failed request — and a 403 from the plan gate — into the
  // sentence "0 exercises today", which is not an error message and not a
  // paywall: it is a false statement about the patient's own plan. The count
  // is only a count when there is data.
  const exerciseCount = exercises.data?.length ?? null;
  const exercisesUnavailable = exerciseCount === null;
  // The patient's own diagnosis, or nothing. This card used to read
  // "YOUR PLAN · Shoulder" and "Day 12 of 42" as literals in the JSX — a knee
  // patient on their third of eight sessions read it as their own chart. There
  // is no day-of-plan figure in the API, so none is shown.
  const planLabel = protocols.data?.[0]?.diagnosis?.summary ?? null;
  const unreadMessages = unreadFromStaff(messages.data ?? []);

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

              {/* "Directions" lived here with `onPress={() => {}}`. A button
                  that does nothing is worse than no button: the patient taps it
                  before the session and concludes the app is broken. It comes
                  back when there is an address to open a map with. */}
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
              {planLabel ? `YOUR PLAN · ${planLabel}` : "YOUR PLAN"}
            </Text>
          </View>

          {/* The "~N min" beside this was exerciseCount × 5 — a number with no
              source, shown as if the therapist had set it. */}
          <Text variant="heading">
            {exercisesUnavailable
              ? tr(lang, {
                  en: isPlanError(exercises.error) ? "Not included in your plan" : "We could not load today's exercises",
                  pt: isPlanError(exercises.error) ? "Nao incluido no seu plano" : "Nao foi possivel carregar os exercicios de hoje",
                })
              : `${exerciseCount} ${exerciseCount === 1 ? tr(lang, { en: "exercise", pt: "exercicio" }) : tr(lang, { en: "exercises", pt: "exercicios" })} ${tr(lang, { en: "today", pt: "hoje" })}`}
          </Text>

          <TriBar work health />

          <Button
            title="Start today's exercises"
            variant="health"
            onPress={() => router.push("/exercises")}
          />
        </Card>

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
            icon={<Avatar label="📋" pillar="health" size={36} />}
            title="My records"
            subtitle="Notes from your sessions"
            right={
              <Ionicons
                name="chevron-forward"
                size={16}
                color={t.colors.textMuted}
              />
            }
            onPress={() => router.push("/clinical-notes")}
          />
          {/* This link used to say "Message the clinic" and open the
              therapist's read-only SOAP notes, because the channel did not
              exist in the app. Now it does, and the badge counts what the
              clinic has sent and the patient has not read. */}
          <ListItem
            icon={<Avatar label="💬" pillar="health" size={36} />}
            title="Message the clinic"
            subtitle="Send a message to your therapist"
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {unreadMessages > 0 && (
                  <Pill label={String(unreadMessages)} variant="health" />
                )}
                <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
              </View>
            }
            onPress={() => router.push("/messages")}
            last
          />
        </Card>
      </View>
    </Screen>
  );
}
