import { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchAssessments, type Assessment } from "@/api/assessments";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB");
const METHOD_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  BIA: "Bioimpedance",
  SKINFOLD: "Skinfolds (Jackson-Pollock)",
};
// Human labels for the girth keys stored in JSON.
const GIRTH_LABEL: Record<string, string> = {
  neck: "Neck",
  chest: "Chest",
  waist: "Waist",
  hip: "Hip",
  armRelaxed: "Arm (relaxed)",
  armFlexed: "Arm (flexed)",
  thigh: "Thigh",
  calf: "Calf",
};

export default function AssessmentDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [a, setA] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await fetchAssessments();
        setA(all.find((x) => x.id === id) || null);
      } catch {
        setError("Could not load the assessment.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text variant="body" color={t.colors.textMuted}>{label}</Text>
      <Text variant="body" style={{ fontFamily: "Inter_700Bold" }}>{value}</Text>
    </View>
  );

  const card = {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    padding: 14,
  } as const;

  return (
    <Screen scroll testID="assessment-detail">
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 16 }}
        testID="assessment-back"
      >
        <Ionicons name="chevron-back" size={22} color={t.colors.text} />
        <Text variant="body">Assessments</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={t.colors.text} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text variant="body" color={t.colors.bad}>{error}</Text>
      ) : !a ? (
        <Text variant="body" color={t.colors.textMuted}>Assessment not found.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          <View>
            <Text variant="hero">{fmt(a.performedAt)}</Text>
            {a.assessmentType ? (
              <Text variant="body" color={t.colors.textMuted}>{a.assessmentType}</Text>
            ) : null}
          </View>

          {/* Body composition */}
          <View style={card}>
            <Text variant="caption" color={t.colors.textMuted} style={{ marginBottom: 6 }}>Body composition</Text>
            {a.weightKg != null && <Row label="Weight" value={`${a.weightKg} kg`} />}
            {a.heightCm != null && <Row label="Height" value={`${a.heightCm} cm`} />}
            {a.bmi != null && <Row label="BMI" value={String(a.bmi)} />}
            {a.bodyFatPct != null && <Row label="Body fat" value={`${a.bodyFatPct}% · ${METHOD_LABEL[a.bfMethod] || a.bfMethod}`} />}
            {a.leanMassKg != null && <Row label="Lean mass" value={`${a.leanMassKg} kg`} />}
            {a.fatMassKg != null && <Row label="Fat mass" value={`${a.fatMassKg} kg`} />}
            {a.whr != null && <Row label="Waist-to-hip" value={String(a.whr)} />}
          </View>

          {/* Vitals */}
          {(a.restingHr != null || a.systolic != null || a.diastolic != null) && (
            <View style={card}>
              <Text variant="caption" color={t.colors.textMuted} style={{ marginBottom: 6 }}>Vitals</Text>
              {a.restingHr != null && <Row label="Resting HR" value={`${a.restingHr} bpm`} />}
              {(a.systolic != null && a.diastolic != null) && <Row label="Blood pressure" value={`${a.systolic}/${a.diastolic} mmHg`} />}
            </View>
          )}

          {/* Girths */}
          {a.girths && Object.keys(a.girths).length > 0 && (
            <View style={card}>
              <Text variant="caption" color={t.colors.textMuted} style={{ marginBottom: 6 }}>Measurements</Text>
              {Object.entries(a.girths).map(([k, v]) =>
                v != null ? <Row key={k} label={GIRTH_LABEL[k] || k} value={`${v} cm`} /> : null
              )}
            </View>
          )}

          {/* Notes */}
          {a.notes ? (
            <View style={card}>
              <Text variant="caption" color={t.colors.textMuted} style={{ marginBottom: 6 }}>Notes</Text>
              <Text variant="body">{a.notes}</Text>
            </View>
          ) : null}

          {/* Photos */}
          {a.photos.length > 0 && (
            <View style={card}>
              <Text variant="caption" color={t.colors.textMuted} style={{ marginBottom: 6 }}>Progress photos</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {a.photos.map((p) => (
                  <View key={p.id} style={{ alignItems: "center" }}>
                    <Image
                      source={{ uri: p.url }}
                      style={{ width: 96, height: 128, borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceMuted }}
                      resizeMode="cover"
                    />
                    <Text variant="caption" color={t.colors.textMuted}>{p.pose}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
