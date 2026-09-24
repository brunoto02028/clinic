import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t } from "@/lib/i18n";
import { isConsentError, isPlanError, planMessage } from "@/lib/plan";

/**
 * What a screen shows when it has nothing to show, and why.
 *
 * Three states used to be one. A request that failed, a plan that does not
 * include this, and a patient who genuinely has no records all rendered the
 * same "we could not load it — try again". The retry helps in exactly one of
 * those cases and is cruel in the other two: it invites someone to press a
 * button that can never work, over and over, about their own health record.
 *
 * The server already distinguishes them. A 403 carries its own sentence —
 * "My Records is not included in your plan" — and this shows it.
 *
 * A fourth state joined them when the terms started being enforced on the
 * server: refused until the patient accepts. That one is not a dead end and
 * must not read like one — the tick is on the last step of the assessment, so
 * this offers to open it.
 */
export function LoadFailure({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const theme = useTheme();
  const lang = useLang();
  const locked = isPlanError(error);
  const needsConsent = isConsentError(error);

  if (needsConsent) {
    return (
      <Card>
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
          <Ionicons name="document-text-outline" size={32} color={theme.colors.textMuted} />
          <Text variant="body" style={{ textAlign: "center" }}>
            {t(lang, {
              en: "Accept the terms to continue.",
              pt: "Aceite os termos para continuar.",
            })}
          </Text>
          <Text variant="caption" color={theme.colors.textSecondary} style={{ textAlign: "center" }}>
            {t(lang, {
              en: "The consent is the last step of your assessment.",
              pt: "O aceite é a última etapa da sua avaliação.",
            })}
          </Text>
          <Button
            title={t(lang, { en: "Open the assessment", pt: "Abrir a avaliação" })}
            variant="health"
            size="sm"
            onPress={() => router.push("/(app)/(clinica)/screening")}
          />
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
        <Ionicons
          name={locked ? "lock-closed-outline" : "cloud-offline-outline"}
          size={32}
          color={theme.colors.textMuted}
        />
        <Text variant="body" style={{ textAlign: "center" }}>
          {locked
            ? planMessage(error) ??
              t(lang, { en: "This is not included in your plan.", pt: "Isto não está incluído no seu plano." })
            : t(lang, { en: "We could not load this.", pt: "Não foi possível carregar." })}
        </Text>
        <Text
          variant="caption"
          color={theme.colors.textSecondary}
          style={{ textAlign: "center" }}
        >
          {locked
            ? t(lang, {
                en: "Ask your clinic if you think this is wrong.",
                pt: "Fale com sua clínica se achar que isto está errado.",
              })
            : t(lang, {
                en: "This does not mean it is empty — the request failed.",
                pt: "Isto não quer dizer que está vazio — a consulta falhou.",
              })}
        </Text>
        {/* No retry on a locked screen: pressing it again cannot change a plan. */}
        {!locked && onRetry && (
          <Button
            title={t(lang, { en: "Try again", pt: "Tentar de novo" })}
            variant="health"
            size="sm"
            onPress={onRetry}
          />
        )}
      </View>
    </Card>
  );
}
