import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * "This is not an emergency service" (activity 074, T-13).
 *
 * The wording is the same as the web's `lib/non-emergency-notice.ts`, which is
 * the source of truth — it is repeated here because the app bundles from
 * `mobile/src` and cannot import it. If one changes, change both; the version
 * recorded with the patient's acceptance refers to that file.
 *
 * It says what the clinic actually does: a therapist reads the alerts during
 * the working day. An app that sends alerts without saying this is implying a
 * watch nobody is keeping.
 */
export function NonEmergencyNotice({ compact }: { compact?: boolean }) {
  const t = useTheme();
  const lang = useLang();

  const short = tr(lang, {
    en: "Readings are reviewed during business hours, not continuously. For symptoms, call 999 or 111 — do not wait for a reply.",
    pt: "As medidas são revisadas em horário comercial, não continuamente. Com sintomas, ligue para a emergência — não espere resposta.",
  });

  if (compact) {
    return (
      <Text variant="caption" color={t.colors.textMuted} style={{ lineHeight: 16 }}>
        {short}
      </Text>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surfaceMuted,
      }}
    >
      <Ionicons name="shield-outline" size={16} color={t.colors.textMuted} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" style={{ fontWeight: "700" }}>
          {tr(lang, { en: "This is not an emergency service", pt: "Isto não é um serviço de emergência" })}
        </Text>
        <Text variant="caption" color={t.colors.textMuted} style={{ lineHeight: 16, marginTop: 2 }}>
          {tr(lang, {
            en: "Your readings are reviewed by your therapist during business hours, not continuously. If you feel unwell — chest pain, breathlessness, severe headache, weakness on one side, or anything that frightens you — do not wait for us. Call 999 for an emergency, or 111 for urgent advice, or contact your GP.",
            pt: "Suas medidas são revisadas pelo seu terapeuta em horário comercial, não continuamente. Se você não estiver bem — dor no peito, falta de ar, dor de cabeça forte, fraqueza de um lado do corpo, ou qualquer coisa que te assuste — não espere por nós. Ligue para a emergência ou procure seu médico agora.",
          })}
        </Text>
      </View>
    </View>
  );
}
