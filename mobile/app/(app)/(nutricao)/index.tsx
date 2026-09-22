import { useEffect, useState, useCallback } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchMealPlan, markMeal, unmarkMeal, type MealPlan } from "@/api/nutrition";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function NutritionScreen() {
  const t = useTheme();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPlan(await fetchMealPlan());
    } catch {
      setError("Could not load your meal plan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doneToday = (mealId: string) =>
    !!plan?.logs.some((l) => l.mealId === mealId && l.loggedDate.slice(0, 10) === todayStr());

  const toggle = async (mealId: string) => {
    if (!plan) return;
    setBusy(mealId);
    try {
      if (doneToday(mealId)) await unmarkMeal(plan.id, mealId, todayStr());
      else await markMeal(plan.id, { mealId, date: todayStr() });
      await load();
    } catch {
      setError("Could not update. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const week = (() => {
    if (!plan) return { logged: 0, planned: 0, pct: 0 };
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const seen = new Set<string>();
    for (const l of plan.logs) {
      if (!l.mealId || new Date(l.performedAt) < cutoff) continue;
      seen.add(`${l.mealId}|${l.loggedDate.slice(0, 10)}`);
    }
    const planned = plan.meals.length * 7;
    return { logged: seen.size, planned, pct: planned === 0 ? 0 : Math.min(1, seen.size / planned) };
  })();

  return (
    <Screen scroll testID="nutrition-screen">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 }}>
        <Ionicons name="nutrition-outline" size={24} color={t.colors.text} />
        <Text variant="hero">Nutrition</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={t.colors.text} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text variant="body" color={t.colors.bad}>{error}</Text>
      ) : !plan ? (
        <Text variant="body" color={t.colors.textMuted}>
          Your trainer hasn&apos;t set a meal plan yet.
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={{ backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.borderSubtle, padding: 14 }}>
            <Text variant="body" style={{ fontFamily: "Inter_700Bold" }}>{plan.name}</Text>
            {(plan.targetKcal != null || plan.targetProteinG != null || plan.targetCarbsG != null || plan.targetFatG != null) && (
              <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>
                Daily targets: {plan.targetKcal != null ? `${plan.targetKcal} kcal` : "–"} · {plan.targetProteinG ?? "–"}P / {plan.targetCarbsG ?? "–"}C / {plan.targetFatG ?? "–"}F
              </Text>
            )}
            <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 6 }}>
              Adherence (7 days): {week.logged}/{week.planned} · {Math.round(week.pct * 100)}%
            </Text>
          </View>

          {plan.meals.map((m) => {
            const done = doneToday(m.id);
            return (
              <View
                key={m.id}
                testID={`meal-${m.id}`}
                style={{
                  backgroundColor: t.colors.card,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: done ? t.colors.ok : t.colors.borderSubtle,
                  padding: 14,
                }}
              >
                <Text variant="body" style={{ fontFamily: "Inter_700Bold" }}>
                  {m.timeOfDay ? `${m.timeOfDay} · ` : ""}{m.name}
                </Text>
                {m.description ? (
                  <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>{m.description}</Text>
                ) : null}
                {(m.kcal != null || m.proteinG != null || m.carbsG != null || m.fatG != null) && (
                  <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>
                    {m.kcal != null ? `${m.kcal} kcal · ` : ""}{m.proteinG ?? "–"}P / {m.carbsG ?? "–"}C / {m.fatG ?? "–"}F
                  </Text>
                )}
                <Pressable
                  onPress={() => toggle(m.id)}
                  disabled={busy === m.id}
                  testID={`meal-toggle-${m.id}`}
                  style={({ pressed }) => ({
                    marginTop: 10,
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: done ? t.colors.ok : pressed ? t.colors.surfaceMuted : t.colors.surfaceMuted,
                    borderRadius: t.radius.sm,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                  })}
                >
                  {busy === m.id ? (
                    <ActivityIndicator size="small" color={done ? "#fff" : t.colors.text} />
                  ) : (
                    <Ionicons name="checkmark" size={16} color={done ? "#fff" : t.colors.text} />
                  )}
                  <Text variant="caption" color={done ? "#fff" : t.colors.text} style={{ fontFamily: "Inter_700Bold" }}>
                    {done ? "Done" : "Mark done"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
