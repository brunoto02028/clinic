import { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchWorkouts, type Workout } from "@/api/training";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TrainingList() {
  const t = useTheme();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setWorkouts(await fetchWorkouts());
      } catch {
        setError("Could not load your workouts.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Screen scroll testID="training-list">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 }}>
        <Ionicons name="barbell-outline" size={24} color={t.colors.text} />
        <Text variant="hero">My Workouts</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={t.colors.text} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text variant="body" color={t.colors.bad}>{error}</Text>
      ) : workouts.length === 0 ? (
        <Text variant="body" color={t.colors.textMuted}>
          No workouts assigned yet. Your trainer will set these up.
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {workouts.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => router.push(`/(app)/(treino)/${w.id}` as any)}
              testID={`workout-${w.id}`}
              style={({ pressed }) => ({
                backgroundColor: pressed ? t.colors.surfaceMuted : t.colors.card,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.borderSubtle,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              })}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontFamily: "Inter_700Bold" }}>{w.name}</Text>
                <Text variant="caption" color={t.colors.textMuted}>
                  {w.exercises.length} exercises
                  {w.phase ? ` · ${w.phase}` : ""}
                  {w.daysOfWeek?.length ? ` · ${w.daysOfWeek.map((d) => DAYS[d]).join(", ")}` : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
