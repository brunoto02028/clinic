import { View, Pressable, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Avatar, ListItem, Pill } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

// ── Hardcoded data ──

interface Group {
  id: string;
  emoji: string;
  name: string;
  members: number;
  detail: string;
  pillLabel?: string;
  pillVariant?: "ok" | "warn" | "community" | "muted";
}

const JOINED_GROUPS: Group[] = [
  {
    id: "1",
    emoji: "🔧",
    name: "Plumbers UK",
    members: 847,
    detail: "12 new posts today",
    pillLabel: "Active",
    pillVariant: "ok",
  },
  {
    id: "2",
    emoji: "🌱",
    name: "First year in business",
    members: 1204,
    detail: "Weekly Q&A Thursdays",
    pillLabel: "Event",
    pillVariant: "community",
  },
];

interface SuggestedGroup {
  id: string;
  emoji: string;
  name: string;
  members: number;
  reason: string;
}

const SUGGESTED_GROUPS: SuggestedGroup[] = [
  { id: "s1", emoji: "📍", name: "Luton & Beds trades", members: 312, reason: "Near you" },
  { id: "s2", emoji: "🧶", name: "Tax & compliance Q&A", members: 589, reason: "Moderated" },
  { id: "s3", emoji: "🏃", name: "Healthy tradespeople", members: 456, reason: "Backs & shoulders" },
];

export default function Groups() {
  const t = useTheme();

  return (
    <Screen scroll testID="groups-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Groups",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable hitSlop={8}>
              <Ionicons name="search-outline" size={20} color={t.colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Your groups */}
        <View style={styles.section}>
          <Text
            variant="caption"
            color={t.colors.textMuted}
            style={styles.sectionLabel}
          >
            YOUR GROUPS
          </Text>

          <Card>
            {JOINED_GROUPS.map((group, idx) => (
              <ListItem
                key={group.id}
                last={idx === JOINED_GROUPS.length - 1}
                icon={
                  <View
                    style={[
                      styles.groupAvatar,
                      { backgroundColor: t.colors.communitySoft },
                    ]}
                  >
                    <Text style={styles.groupEmoji}>{group.emoji}</Text>
                  </View>
                }
                title={group.name}
                subtitle={`${group.members} members · ${group.detail}`}
                right={
                  group.pillLabel ? (
                    <Pill label={group.pillLabel} variant={group.pillVariant} />
                  ) : undefined
                }
                onPress={() => {}}
              />
            ))}
          </Card>
        </View>

        {/* Suggested groups */}
        <View style={styles.section}>
          <Text
            variant="caption"
            color={t.colors.textMuted}
            style={styles.sectionLabel}
          >
            SUGGESTED FOR YOU
          </Text>

          <Card>
            {SUGGESTED_GROUPS.map((group, idx) => (
              <ListItem
                key={group.id}
                last={idx === SUGGESTED_GROUPS.length - 1}
                icon={
                  <View
                    style={[
                      styles.groupAvatar,
                      { backgroundColor: t.colors.communitySoft },
                    ]}
                  >
                    <Text style={styles.groupEmoji}>{group.emoji}</Text>
                  </View>
                }
                title={group.name}
                subtitle={`${group.members} members · ${group.reason}`}
                right={
                  <Button
                    title="Join"
                    variant="ghost"
                    size="sm"
                    style={{ minHeight: 30, paddingHorizontal: 12 }}
                    onPress={() => {}}
                  />
                }
              />
            ))}
          </Card>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 24, paddingBottom: 40 },
  section: { gap: 10 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    fontSize: 10,
    marginLeft: 2,
  },
  groupAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  groupEmoji: { fontSize: 18 },
});
