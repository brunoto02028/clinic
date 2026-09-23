import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t } from "@/lib/i18n";
import { isPlanError, planMessage } from "@/lib/plan";

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
 */
export function LoadFailure({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const theme = useTheme();
  const lang = useLang();
  const locked = isPlanError(error);

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
