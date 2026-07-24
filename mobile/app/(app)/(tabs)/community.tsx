import { useState } from "react";
import { View, ScrollView, Pressable, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen, Text, Card, Pill, Avatar, Chip } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import type { Pillar } from "@/theme/tokens";

// ── Placeholder data ──

const FILTERS = ["For you", "Plumbers UK", "Luton", "First year"];

interface Post {
  id: string;
  initials: string;
  name: string;
  pillLabel: string;
  pillVariant: "community" | "health" | "work" | "ok" | "muted";
  subtitle: string;
  body: string;
  reactions: { emoji: string; count: number }[];
  avatarPillar: Pillar;
  cardAccent?: Pillar;
}

const POSTS: Post[] = [
  {
    id: "1",
    initials: "JF",
    name: "Joao Ferreira",
    pillLabel: "Win",
    pillVariant: "community",
    subtitle: "Electrician · London · 2h",
    body: "One year in the UK today. 92 jobs, first employee starts Monday. If you told me this a year ago I wouldn’t believe it. Keep going.",
    reactions: [
      { emoji: "🎉", count: 47 },
      { emoji: "💪", count: 23 },
      { emoji: "💬", count: 23 },
    ],
    avatarPillar: "community",
    cardAccent: "community",
  },
  {
    id: "2",
    initials: "CM",
    name: "Carla Mendes",
    pillLabel: "Question",
    pillVariant: "work",
    subtitle: "Plumber · Manchester · 5h",
    body: "Client asked for a VAT invoice but I’m not registered yet. Do I need to register before hitting the threshold or can I wait?",
    reactions: [
      { emoji: "💬", count: 14 },
      { emoji: "💪", count: 5 },
    ],
    avatarPillar: "community",
  },
  {
    id: "3",
    initials: "ML",
    name: "Maria Lopes",
    pillLabel: "Tip",
    pillVariant: "community",
    subtitle: "Cleaner · Birmingham · 8h",
    body: "If you’re self-employed and earn under £1,000, you don’t need to register for Self Assessment. Saved me a headache last year.",
    reactions: [
      { emoji: "🎉", count: 31 },
      { emoji: "💪", count: 18 },
      { emoji: "💬", count: 9 },
    ],
    avatarPillar: "community",
  },
  {
    id: "4",
    initials: "RA",
    name: "Ricardo Almeida",
    pillLabel: "Solved",
    pillVariant: "ok",
    subtitle: "Plumber · Luton · 1d",
    body: "Fixed! The issue was my Gas Safe registration hadn’t been linked to the new address. Called them and sorted in 10 minutes.",
    reactions: [
      { emoji: "🎉", count: 8 },
      { emoji: "💬", count: 3 },
    ],
    avatarPillar: "community",
  },
];

// ── Post card ──

function PostCard({ post, t }: { post: Post; t: ReturnType<typeof useTheme> }) {
  return (
    <Card accent={post.cardAccent}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <Avatar label={post.initials} round pillar={post.avatarPillar} size={38} />
        <View style={styles.authorInfo}>
          <View style={styles.nameRow}>
            <Text variant="label">{post.name}</Text>
            <Pill label={post.pillLabel} variant={post.pillVariant} />
          </View>
          <Text variant="caption" color={t.colors.textMuted}>
            {post.subtitle}
          </Text>
        </View>
      </View>

      {/* Body */}
      <Text variant="body" style={styles.bodyText}>
        {post.body}
      </Text>

      {/* Reactions */}
      <View style={styles.reactionsRow}>
        {post.reactions.map((r) => (
          <Pressable
            key={r.emoji}
            style={({ pressed }) => [
              styles.reactionChip,
              {
                backgroundColor: t.colors.surfaceMuted,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text variant="caption" color={t.colors.textSecondary}>
              {r.emoji} {r.count}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

// ── Community screen ──

export default function Community() {
  const t = useTheme();
  const [selectedFilter, setSelectedFilter] = useState(0);

  return (
    <Screen scroll testID="community-screen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="title" style={{ fontFamily: "Sora_700Bold" }}>
            Community
          </Text>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Search"
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: t.colors.surface,
                  borderColor: t.colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="search-outline" size={15} color={t.colors.text} />
            </Pressable>

            <Pressable
              accessibilityLabel="Groups"
              onPress={() => router.push("/(app)/community/groups")}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: t.colors.surface,
                  borderColor: t.colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="people-outline" size={15} color={t.colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {FILTERS.map((label, idx) => (
            <Chip
              key={label}
              label={label}
              selected={idx === selectedFilter}
              accentColor={t.colors.community}
              onPress={() => setSelectedFilter(idx)}
            />
          ))}
        </ScrollView>

        {/* Posts */}
        <View style={styles.postsList}>
          {POSTS.map((post) => (
            <PostCard key={post.id} post={post} t={t} />
          ))}
        </View>
      </View>

      {/* FAB */}
      <Pressable
        accessibilityLabel="New post"
        onPress={() => router.push("/(app)/community/new-post")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: t.colors.community,
            opacity: pressed ? 0.85 : 1,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
              },
              android: { elevation: 4 },
            }),
          },
        ]}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipScroll: { gap: 8 },
  postsList: { gap: 14 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  bodyText: { lineHeight: 20, marginTop: 4 },
  reactionsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  reactionChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
});
