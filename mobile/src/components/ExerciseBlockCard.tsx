import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Text, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import type { ExerciseClearance } from "@/api/exercises";

/**
 * Blood pressure above the clinic's training limit stops today's session
 * (activity 074, T-11).
 *
 * It says the reading, the time and what to do — a locked screen with no
 * reason is read as a bug, and the patient then trains anyway. The wording
 * stays inside what a therapist may say: rest, measure again, and if it
 * persists this is for a doctor. Same text as the web, deliberately.
 */
export function ExerciseBlockCard({ clearance }: { clearance: ExerciseClearance }) {
  const t = useTheme();
  const lang = useLang();
  const r = clearance.reading;
  const l = clearance.limits;
  const measured = r
    ? new Date(r.measuredAt).toLocaleTimeString(lang === "pt" ? "pt-BR" : "en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
        <Text variant="label" color={t.colors.danger} style={{ fontWeight: "700" }}>
          {tr(lang, { en: "No training today", pt: "Hoje não vamos treinar" })}
        </Text>
      </View>
      <Text variant="body" style={{ lineHeight: 21 }}>
        {tr(lang, {
          en: `Your reading at ${measured} was ${r?.systolic}/${r?.diastolic} mmHg, above the ${l?.blockSystolic}/${l?.blockDiastolic} limit we use to clear exercise.`,
          pt: `Sua pressão às ${measured} foi ${r?.systolic}/${r?.diastolic} mmHg, acima do limite de ${l?.blockSystolic}/${l?.blockDiastolic} que usamos para liberar o exercício.`,
        })}
      </Text>
      <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 21, marginTop: 6 }}>
        {tr(lang, {
          en: "Rest seated for 5 minutes and measure again. If it stays high, speak to your doctor. Your therapist has been notified.",
          pt: "Descanse sentado por 5 minutos e meça de novo. Se continuar alto, fale com seu médico. Seu terapeuta já foi avisado.",
        })}
      </Text>
      <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 6 }}>
        {tr(lang, {
          en: "With chest pain, breathlessness or dizziness, call the emergency services. This app is not an emergency service.",
          pt: "Com dor no peito, falta de ar ou tontura, ligue para a emergência. Este aplicativo não é serviço de emergência.",
        })}
      </Text>
      <View style={{ marginTop: 10 }}>
        <Button
          title={tr(lang, { en: "Log a new reading", pt: "Registrar nova medida" })}
          variant="greige"
          onPress={() => router.push("/blood-pressure")}
        />
      </View>
    </Card>
  );
}
