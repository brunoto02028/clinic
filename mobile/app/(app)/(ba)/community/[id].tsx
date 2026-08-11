import { View, Pressable, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Avatar, Pill, Chip, ListItem } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

// ── Hardcoded profile data ──

const PROFILE = {
  initials: "JF",
  name: "Joao Ferreira",
  profession: "Electrician",
  location: "London",
  flag: "🇬🇧",
  bio: "Self-employed sparky, 3 years in the UK. Happy to help with wiring regs and Part P questions. Always learning.",
  verified: true,
  rating: 4.8,
  reviewCount: 23,
};

const BADGES = [
  "🏅 Responsible Director",
  "💬 20 helpful answers",
  "📈 1 year member",
];

interface Review {
  id: string;
  initials: string;
  name: string;
  type: string;
  text: string;
  rating: number;
}

const REVIEWS: Review[] = [
  {
    id: "r1",
    initials: "SM",
    name: "Sarah Mitchell",
    type: "Customer",
    text: "Joao rewired our kitchen in two days. Tidy, on time, explained everything. Would recommend.",
    rating: 5,
  },
  {
    id: "r2",
    initials: "PA",
    name: "Pedro Alves",
    type: "Peer",
    text: "Solid work ethic. We partnered on a commercial fit-out and he was reliable throughout.",
    rating: 5,
  },
  {
    id: "r3",
    initials: "LC",
    name: "Lucy Chen",
    type: "Customer",
    text: "Fixed a tricky fault that two other electricians couldn’t diagnose. Very knowledgeable.",
    rating: 4,
  },
];

function StarRow({ rating }: { rating: number }) {
  const t = useTheme();
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= rating ? "star" : "star-outline"}
          size={12}
          color={n <= rating ? t.colors.community : t.colors.textMuted}
        />
      ))}
    </View>
  );
}

export default function MemberProfile() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen scroll testID="member-profile-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Profile",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable hitSlop={8}>
              <Ionicons name="share-outline" size={20} color={t.colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Profile card */}
        <Card accent="community">
          <View style={styles.profileCenter}>
            <Avatar
              label={PROFILE.initials}
              round
              pillar="community"
              size={56}
            />

            <Text
              variant="subtitle"
              style={{ fontFamily: "Sora_700Bold", marginTop: 8 }}
            >
              {PROFILE.name}
            </Text>

            <Text variant="caption" color={t.colors.textMuted}>
              {PROFILE.profession} · {PROFILE.location} {PROFILE.flag}
            </Text>

            {/* Badges */}
            <View style={styles.badgePills}>
              {PROFILE.verified && (
                <Pill label={"✓ Verified company"} variant="ok" />
              )}
              <Pill
                label={`⭐ ${PROFILE.rating} · ${PROFILE.reviewCount} reviews`}
                variant="community"
              />
            </View>

            {/* Bio */}
            <Text
              variant="body"
              color={t.colors.textSecondary}
              style={styles.bioText}
            >
              {PROFILE.bio}
            </Text>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <View style={{ flex: 1 }}>
                <Button title="Message" variant="ghost" size="sm" onPress={() => {}} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Recommend" variant="community" size="sm" onPress={() => {}} />
              </View>
            </View>
          </View>
        </Card>

        {/* Badges section */}
        <View style={styles.section}>
          <Text
            variant="caption"
            color={t.colors.textMuted}
            style={styles.sectionLabel}
          >
            BADGES
          </Text>
          <View style={styles.chipRow}>
            {BADGES.map((badge) => (
              <Chip
                key={badge}
                label={badge}
                accentColor={t.colors.community}
              />
            ))}
          </View>
        </View>

        {/* Recent reviews */}
        <View style={styles.section}>
          <Text
            variant="caption"
            color={t.colors.textMuted}
            style={styles.sectionLabel}
          >
            RECENT REVIEWS
          </Text>

          <Card>
            {REVIEWS.map((review, idx) => (
              <ListItem
                key={review.id}
                last={idx === REVIEWS.length - 1}
                icon={
                  <Avatar
                    label={review.initials}
                    round
                    pillar="community"
                    size={34}
                  />
                }
                title={review.name}
                subtitle={`${review.type} · ${review.text}`}
                right={<StarRow rating={review.rating} />}
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
  profileCenter: { alignItems: "center", gap: 4 },
  badgePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    justifyContent: "center",
  },
  bioText: { textAlign: "center", lineHeight: 20, marginTop: 8 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  section: { gap: 10 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    fontSize: 10,
    marginLeft: 2,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  starRow: { flexDirection: "row", gap: 2 },
});
