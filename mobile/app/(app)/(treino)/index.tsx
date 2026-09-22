import { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchWorkouts, type Workout } from "@/api/training";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// scheduledDate is a UTC-midnight-anchored "date-only" value (see
// assign/route.ts's scheduledDateFor) — reading it with local getters would
// shift it by a day for any negative-offset timezone (Brazil included,
// UTC-3 year-round), so this compares/formats in UTC to match how it was
// written, not the device's local wall-clock time.
function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

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

  // Program-generated workouts (activity 33) carry a scheduledDate and are
  // shown grouped by date, oldest first, with today highlighted. Manually
  // assigned recurring workouts (scheduledDate: null) keep today's plain list
  // — unchanged from before this activity.
  const recurring = workouts.filter((w) => !w.scheduledDate);
  const scheduled = workouts
    .filter((w) => w.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());

  function renderCard(w: Workout, subtitle: string) {
    return (
      <Pressable
        key={w.id}
        onPress={() => router.push(`/(app)/(treino)/${w.id}` as any)}
        testID={`workout-${w.id}`}
        style={({ pressed }) => ({
          backgroundColor: pressed ? t.colors.surfaceMuted : t.colors.card,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: w.scheduledDate && isToday(w.scheduledDate) ? t.colors.text : t.colors.borderSubtle,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        })}
      >
        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontFamily: "Inter_700Bold" }}>{w.name}</Text>
          <Text variant="caption" color={t.colors.textMuted}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.colors.textMuted} />
      </Pressable>
    );
  }

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
        <View style={{ gap: 16 }}>
          {scheduled.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text variant="caption" color={t.colors.textMuted}>PROGRAM</Text>
              {scheduled.map((w) =>
                renderCard(
                  w,
                  `${isToday(w.scheduledDate!) ? "Today · " : formatDate(w.scheduledDate!) + " · "}${w.exercises.length} exercises${w.phase ? ` · ${w.phase}` : ""}`
                )
              )}
            </View>
          )}
          {recurring.length > 0 && (
            <View style={{ gap: 10 }}>
              {scheduled.length > 0 && <Text variant="caption" color={t.colors.textMuted}>RECURRING</Text>}
              {recurring.map((w) =>
                renderCard(
                  w,
                  `${w.exercises.length} exercises${w.phase ? ` · ${w.phase}` : ""}${w.daysOfWeek?.length ? ` · ${w.daysOfWeek.map((d) => DAYS[d]).join(", ")}` : ""}`
                )
              )}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
