import { View, StyleSheet, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchScreening } from "@/api/screening";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Pill } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

// ---------------------------------------------------------------------------
// Defaults (used when no route params are provided)
// ---------------------------------------------------------------------------

// No address, clinic name or therapist is defaulted here any more. This block
// used to fall back to "Ipswich clinic", "12 Crown Street, Ipswich IP1 3HA" and
// a date in July — presented as fact to a patient of any tenant, who would then
// travel to another clinic's address. In a multi-tenant product a placeholder
// that looks like real data is worse than a blank.
const DEFAULTS = {
  serviceName: "Appointment",
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function BookingConfirmed() {
  const t = useTheme();
  const { data: screening } = useQuery({ queryKey: ["screening"], queryFn: fetchScreening });
  const params = useLocalSearchParams<{
    serviceName?: string;
    dateTime?: string;
    location?: string;
    address?: string;
  }>();

  const serviceName = params.serviceName || DEFAULTS.serviceName;
  const dateTime = params.dateTime || null;
  const location = params.location || null;
  const address = params.address || null;

  return (
    <Screen testID="booking-confirmed-screen" style={styles.center}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        {/* Success icon */}
        <View
          style={[
            styles.iconBox,
            { backgroundColor: t.colors.healthSoft },
          ]}
        >
          <Ionicons name="checkmark" size={28} color={t.colors.health} />
        </View>

        {/* Title */}
        <Text
          variant="hero"
          style={{ textAlign: "center", marginTop: 16 }}
        >
          You're booked
        </Text>

        {/* Details */}
        <Text
          variant="body"
          color={t.colors.textMuted}
          style={{ textAlign: "center", marginTop: 8, lineHeight: 18 }}
        >
          {serviceName}
          {"\n"}
          <Text
            variant="body"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            {[dateTime, location].filter(Boolean).join(" · ")}
          </Text>
          {"\n"}
          {address}
        </Text>

        {/* The triage card now reflects the patient's real screening. It used
            to say "Your triage is done · Sent" to everyone — including patients
            with no screening at all — which is the same invented-data problem
            the rest of this screen had. A patient who has not done it is told
            so, with the way to do it; screening is required before the visit. */}
        {screening?.isSubmitted ? (
          <Card style={{ marginTop: 24, width: "100%" }}>
            <View style={styles.cardRow}>
              <View style={[styles.smallIcon, { backgroundColor: t.colors.healthSoft }]}>
                <Ionicons name="clipboard" size={18} color={t.colors.health} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label">Sua avaliação foi enviada</Text>
                <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 1 }}>
                  Seu terapeuta vai revisar antes da consulta
                </Text>
              </View>
              <Pill label="Enviada" variant="ok" />
            </View>
          </Card>
        ) : screening !== undefined ? (
          <Pressable onPress={() => router.push("/(app)/(clinica)/screening")} style={{ width: "100%" }}>
            <Card style={{ marginTop: 24, width: "100%" }}>
              <View style={styles.cardRow}>
                <View style={[styles.smallIcon, { backgroundColor: t.colors.warnSoft }]}>
                  <Ionicons name="clipboard-outline" size={18} color={t.colors.warn} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label">Falta a sua avaliação</Text>
                  <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 1 }}>
                    Preencha antes da consulta
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* What to bring card */}
        <Card style={{ width: "100%" }}>
          <View style={styles.cardRow}>
            <View
              style={[
                styles.smallIcon,
                { backgroundColor: t.colors.healthSoft },
              ]}
            >
              <Ionicons
                name="shirt"
                size={18}
                color={t.colors.health}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label">What to bring</Text>
              <Text
                variant="caption"
                color={t.colors.textMuted}
                style={{ marginTop: 1 }}
              >
                Comfortable clothes · shorts if it's a lower-limb issue
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        {/* "Add to calendar" sat here with an empty onPress. Removed rather
            than left as a button that silently does nothing. */}

        <Button
          title="Back to Health"
          variant="health"
          onPress={() => router.replace("/(app)/(clinica)/(tabs)")}
          style={{ marginTop: 8, width: "100%" }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    width: "100%",
    gap: 0,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
