import { ApiError } from "@/api/client";
import { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchAssessments, type Assessment } from "@/api/assessments";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

// Direction of change: 1 up, -1 down, 0 flat/unknown.
const trendDir = (first: number | null, last: number | null): -1 | 0 | 1 => {
  if (first == null || last == null || first === last) return 0;
  return last > first ? 1 : -1;
};

export default function AssessmentsList() {
  const t = useTheme();
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setList(await fetchAssessments());
      } catch (e) {
        // 403 não é falha de carregamento: é o servidor dizendo que esta
        // área não é desta conta (lib/workout-access.ts recusa quem não é
        // paciente). "Não foi possível carregar" convida a tentar de novo,
        // e tentar de novo nunca vai resolver — foi o que aconteceu com uma
        // conta da equipe entrando no app do paciente, 24/09/2026.
        setError(
          e instanceof ApiError && e.status === 403
            ? "This area is not available for your account."
            : "Could not load your assessments."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Chronological series for trends (list comes newest-first).
  const chrono = [...list].reverse();
  const seriesOf = (pick: (a: Assessment) => number | null) => chrono.map(pick).filter((v): v is number => v != null);
  const weightSeries = seriesOf((a) => a.weightKg);
  const bfSeries = seriesOf((a) => a.bodyFatPct);
  const waistSeries = seriesOf((a) => a.girths?.waist ?? null);

  const trendRow = (label: string, series: number[], unit: string) => {
    if (series.length === 0) return null;
    const first = series[0];
    const last = series[series.length - 1];
    const dir = trendDir(first, last);
    const icon = dir > 0 ? "trending-up" : dir < 0 ? "trending-down" : "remove";
    // For weight/waist/body-fat, down is good → green; up → red.
    const color = dir < 0 ? t.colors.ok : dir > 0 ? t.colors.bad : t.colors.textMuted;
    return (
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 3 }}>
        <Text variant="body">{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name={icon as any} size={14} color={color} />
          <Text variant="body" color={color}>
            {first}{first !== last ? `→${last}` : ""} {unit}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Screen scroll testID="assessments-list">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 }}>
        <Ionicons name="body-outline" size={24} color={t.colors.text} />
        <Text variant="hero">My Assessments</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={t.colors.text} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text variant="body" color={t.colors.bad}>{error}</Text>
      ) : list.length === 0 ? (
        <Text variant="body" color={t.colors.textMuted}>
          No assessments yet. Your trainer will record these.
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {/* Trends */}
          {(weightSeries.length || bfSeries.length || waistSeries.length) ? (
            <View
              style={{
                backgroundColor: t.colors.surface,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.borderSubtle,
                padding: 14,
              }}
            >
              <Text variant="caption" color={t.colors.textMuted} style={{ marginBottom: 6 }}>
                Evolution (first → latest)
              </Text>
              {trendRow("Weight", weightSeries, "kg")}
              {trendRow("Body fat", bfSeries, "%")}
              {trendRow("Waist", waistSeries, "cm")}
            </View>
          ) : null}

          {/* History */}
          {list.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => router.push(`/(app)/(avaliacoes)/${a.id}` as any)}
              testID={`assessment-${a.id}`}
              style={({ pressed }) => ({
                backgroundColor: pressed ? t.colors.surfaceMuted : t.colors.surface,
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
                <Text variant="body" style={{ fontFamily: "Inter_700Bold" }}>
                  {fmt(a.performedAt)}{a.assessmentType ? ` · ${a.assessmentType}` : ""}
                </Text>
                <Text variant="caption" color={t.colors.textMuted}>
                  {[
                    a.weightKg != null ? `${a.weightKg} kg` : null,
                    a.bmi != null ? `BMI ${a.bmi}` : null,
                    a.bodyFatPct != null ? `${a.bodyFatPct}% body fat` : null,
                  ].filter(Boolean).join(" · ") || "Details"}
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
