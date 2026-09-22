import { useEffect, useMemo, useState } from "react";
import { View, TextInput, Pressable, ActivityIndicator, Linking, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchWorkouts, fetchWorkoutHistory, logSession, type Workout, type WorkoutExercise, type SessionLog } from "@/api/training";

interface SetEntry { reps: string; loadKg: string; rpe: string; completed: boolean }
const numOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));

export default function TrainingSession() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [entries, setEntries] = useState<Record<string, SetEntry[]>>({});
  const [sessionRpe, setSessionRpe] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SessionLog[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const all = await fetchWorkouts();
        const w = all.find((x) => x.id === id) || null;
        setWorkout(w);
        if (w) {
          const init: Record<string, SetEntry[]> = {};
          for (const e of w.exercises) {
            const n = Math.max(1, e.sets ?? 1);
            init[e.id] = Array.from({ length: n }, () => ({
              reps: e.repsMax != null ? String(e.repsMax) : e.repsMin != null ? String(e.repsMin) : "",
              loadKg: e.loadKg != null ? String(e.loadKg) : "",
              rpe: e.rpe != null ? String(e.rpe) : "",
              completed: false,
            }));
          }
          setEntries(init);
          fetchWorkoutHistory(w.id).then(setHistory).catch(() => setHistory([]));
        }
      } catch {
        setError("Could not load the workout.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const cellStyle = useMemo(
    () => ({
      flex: 1,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.borderSubtle,
      borderRadius: t.radius.sm,
      color: t.colors.text,
      paddingHorizontal: 8,
      paddingVertical: 6,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
    }),
    [t]
  );

  function updateSet(exId: string, i: number, patch: Partial<SetEntry>) {
    setSaved(false);
    setEntries((prev) => ({ ...prev, [exId]: prev[exId].map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  }

  async function finish() {
    if (!workout) return;
    setSaving(true);
    setError(null);
    try {
      const sets = Object.entries(entries).flatMap(([exId, rows]) =>
        rows.map((r, idx) => ({
          workoutExerciseId: exId,
          setNumber: idx + 1,
          reps: numOrNull(r.reps),
          loadKg: numOrNull(r.loadKg),
          rpe: numOrNull(r.rpe),
          completed: r.completed,
        }))
      );
      await logSession(workout.id, { sessionRpe: numOrNull(sessionRpe), sets });
      setSaved(true);
      fetchWorkoutHistory(workout.id).then(setHistory).catch(() => {});
    } catch (e: any) {
      setError(e?.message || "Could not save the session.");
    } finally {
      setSaving(false);
    }
  }

  const summary = (e: WorkoutExercise) =>
    [
      e.sets != null ? `${e.sets} sets` : null,
      e.repsMin != null || e.repsMax != null ? `${e.repsMin ?? ""}${e.repsMin != null && e.repsMax != null ? "–" : ""}${e.repsMax ?? ""} reps` : null,
      e.loadKg != null ? `${e.loadKg} kg` : null,
      e.rpe != null ? `RPE ${e.rpe}` : null,
      e.cadence ? `cadence ${e.cadence}` : null,
      e.restSeconds != null ? `rest ${e.restSeconds}s` : null,
    ].filter(Boolean).join(" · ");

  if (loading) {
    return <Screen><ActivityIndicator color={t.colors.text} style={{ marginTop: 40 }} /></Screen>;
  }
  if (!workout) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={{ paddingVertical: 14 }}>
          <Text variant="body" color={t.colors.textMuted}>← Back</Text>
        </Pressable>
        <Text variant="body">Workout not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="training-session">
      <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 12 }}>
        <Ionicons name="chevron-back" size={18} color={t.colors.textMuted} />
        <Text variant="caption" color={t.colors.textMuted}>All workouts</Text>
      </Pressable>

      <Text variant="hero">{workout.name}</Text>

      {history.length > 0 && (
        <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 4 }}>
          {history.length} session{history.length === 1 ? "" : "s"} logged · last {new Date(history[0].performedAt).toLocaleDateString("en-GB")}
        </Text>
      )}

      <View style={{ gap: 14, marginTop: 16 }}>
        {workout.exercises.map((e) => (
          <View key={e.id} style={{ backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.borderSubtle, padding: 12, gap: 8 }}>
            <Text variant="body" style={{ fontFamily: "Inter_700Bold" }}>
              {e.exercise?.name ?? "Exercise"}
              {e.supersetGroup ? `  ·  SS ${e.supersetGroup}` : ""}
            </Text>
            <Text variant="caption" color={t.colors.textMuted}>{summary(e)}</Text>

            {e.exercise?.videoUrl ? (
              <Pressable
                onPress={() => Linking.openURL(e.exercise!.videoUrl!)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}
              >
                <Ionicons name="play-circle-outline" size={18} color={t.colors.greige} />
                <Text variant="caption" color={t.colors.greige}>Watch video</Text>
              </Pressable>
            ) : null}

            {/* Set logging */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Text variant="caption" color={t.colors.textMuted} style={{ width: 20 }}>#</Text>
                <Text variant="caption" color={t.colors.textMuted} style={{ flex: 1 }}>Reps</Text>
                <Text variant="caption" color={t.colors.textMuted} style={{ flex: 1 }}>Load kg</Text>
                <Text variant="caption" color={t.colors.textMuted} style={{ flex: 1 }}>RPE</Text>
                <Text variant="caption" color={t.colors.textMuted} style={{ width: 28 }}>✓</Text>
              </View>
              {(entries[e.id] || []).map((row, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text variant="caption" color={t.colors.textMuted} style={{ width: 20 }}>{i + 1}</Text>
                  <TextInput keyboardType="numeric" value={row.reps} onChangeText={(v) => updateSet(e.id, i, { reps: v })} style={cellStyle} testID={`set-reps-${e.id}-${i}`} />
                  <TextInput keyboardType="numeric" value={row.loadKg} onChangeText={(v) => updateSet(e.id, i, { loadKg: v })} style={cellStyle} testID={`set-load-${e.id}-${i}`} />
                  <TextInput keyboardType="numeric" value={row.rpe} onChangeText={(v) => updateSet(e.id, i, { rpe: v })} style={cellStyle} />
                  <Pressable onPress={() => updateSet(e.id, i, { completed: !row.completed })} style={{ width: 28, alignItems: "center" }}>
                    <Ionicons name={row.completed ? "checkbox" : "square-outline"} size={22} color={row.completed ? t.colors.greige : t.colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Session summary */}
      <View style={{ marginTop: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="caption" color={t.colors.textMuted}>Session RPE</Text>
          <TextInput keyboardType="numeric" value={sessionRpe} onChangeText={(v) => { setSaved(false); setSessionRpe(v); }} style={[cellStyle, { flex: 0, width: 64 }]} />
        </View>
        <Button title={saved ? "Saved ✓" : "Finish session"} variant="primary" size="lg" onPress={finish} loading={saving} disabled={saving || saved} testID="finish-session" />
        {error ? <Text variant="caption" color={t.colors.bad}>{error}</Text> : null}
      </View>
    </Screen>
  );
}
