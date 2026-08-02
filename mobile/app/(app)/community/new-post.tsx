import { useState } from "react";
import { View, Alert, Pressable, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Input, Chip } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

const POST_TYPES = [
  { label: "🎉 Win", key: "win" },
  { label: "❓ Question", key: "question" },
  { label: "💡 Tip", key: "tip" },
  { label: "📅 Event", key: "event" },
];

const SHARE_TARGETS = [
  { label: "Everyone", key: "everyone" },
  { label: "Plumbers UK", key: "plumbers-uk" },
  { label: "Luton", key: "luton" },
];

export default function NewPost() {
  const t = useTheme();
  const [selectedType, setSelectedType] = useState("win");
  const [selectedTarget, setSelectedTarget] = useState("everyone");
  const [body, setBody] = useState("");

  function handlePost() {
    Alert.alert("Posted!", "Your post has been shared with the community.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  return (
    <Screen scroll testID="new-post-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "New post",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{ paddingRight: 12 }}
            >
              <Ionicons name="close" size={22} color={t.colors.text} />
            </Pressable>
          ),
          headerRight: () => (
            <Button
              title="Post"
              variant="community"
              size="sm"
              onPress={handlePost}
              disabled={body.trim().length === 0}
              style={{ minHeight: 32, paddingHorizontal: 16 }}
            />
          ),
        }}
      />

      <View style={styles.container}>
        {/* Post type */}
        <View style={styles.section}>
          <Text
            variant="caption"
            color={t.colors.textMuted}
            style={styles.sectionLabel}
          >
            POST TYPE
          </Text>
          <View style={styles.chipRow}>
            {POST_TYPES.map((type) => (
              <Chip
                key={type.key}
                label={type.label}
                selected={selectedType === type.key}
                accentColor={t.colors.community}
                onPress={() => setSelectedType(type.key)}
              />
            ))}
          </View>
        </View>

        {/* Share to */}
        <View style={styles.section}>
          <Text
            variant="caption"
            color={t.colors.textMuted}
            style={styles.sectionLabel}
          >
            SHARE TO
          </Text>
          <View style={styles.chipRow}>
            {SHARE_TARGETS.map((target) => (
              <Chip
                key={target.key}
                label={target.label}
                selected={selectedTarget === target.key}
                accentColor={t.colors.community}
                onPress={() => setSelectedTarget(target.key)}
              />
            ))}
          </View>
        </View>

        {/* Text area */}
        <Input
          placeholder="Share a win, ask a question, or drop a tip..."
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={styles.textArea}
        />

        {/* Attach from Work */}
        <Card>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              styles.attachRow,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.attachIcon, { backgroundColor: t.colors.workSoft }]}>
              <Ionicons name="document-text-outline" size={18} color={t.colors.work} />
            </View>
            <View style={styles.attachText}>
              <Text variant="label">Attach from Work</Text>
              <Text variant="caption" color={t.colors.textMuted}>
                Share a template or a milestone (amounts hidden by default)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
          </Pressable>
        </Card>

        {/* House rules note */}
        <Text variant="caption" color={t.colors.textMuted} style={styles.footerNote}>
          Be kind and keep it useful. No client names or addresses.{" "}
          <Text
            variant="caption"
            color={t.colors.community}
            style={{ textDecorationLine: "underline" }}
          >
            House rules
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20, paddingBottom: 40 },
  section: { gap: 8 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    fontSize: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  textArea: { minHeight: 120, paddingTop: 12 },
  attachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  attachIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  attachText: { flex: 1, gap: 2 },
  footerNote: { textAlign: "center", lineHeight: 16 },
});
