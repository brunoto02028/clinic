import { View, StyleSheet } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Pill } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

// ---------------------------------------------------------------------------
// Defaults (used when no route params are provided)
// ---------------------------------------------------------------------------

const DEFAULTS = {
  serviceName: "Biomechanical assessment",
  dateTime: "Thu 24 July · 14:30",
  location: "Ipswich clinic",
  address: "12 Crown Street, Ipswich IP1 3HA",
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function BookingConfirmed() {
  const t = useTheme();
  const params = useLocalSearchParams<{
    serviceName?: string;
    dateTime?: string;
    location?: string;
    address?: string;
  }>();

  const serviceName = params.serviceName || DEFAULTS.serviceName;
  const dateTime = params.dateTime || DEFAULTS.dateTime;
  const location = params.location || DEFAULTS.location;
  const address = params.address || DEFAULTS.address;

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
            {dateTime} · {location}
          </Text>
          {"\n"}
          {address}
        </Text>

        {/* Triage card */}
        <Card style={{ marginTop: 24, width: "100%" }}>
          <View style={styles.cardRow}>
            <View
              style={[
                styles.smallIcon,
                { backgroundColor: t.colors.healthSoft },
              ]}
            >
              <Ionicons
                name="clipboard"
                size={18}
                color={t.colors.health}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label">Your triage is done</Text>
              <Text
                variant="caption"
                color={t.colors.textMuted}
                style={{ marginTop: 1 }}
              >
                Bruno will review it before you arrive
              </Text>
            </View>
            <Pill label="Sent" variant="ok" />
          </View>
        </Card>

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
        <Button
          title="Add to calendar"
          variant="ghost"
          size="sm"
          onPress={() => {}}
          style={{ marginTop: 8 }}
        />

        <Button
          title="Back to Health"
          variant="health"
          onPress={() => router.replace("/(app)/(tabs)/health")}
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
