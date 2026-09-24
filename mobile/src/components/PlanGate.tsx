import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t } from "@/lib/i18n";
import { fetchAccess } from "@/api/access";

/**
 * Shows a screen only if the patient's plan includes it.
 *
 * This is the app's half of a disagreement it was losing. The web gates its
 * pages on `lib/patient-access.ts`; the app went straight to the data routes,
 * most of which do not gate, so a patient who had just been told "upgrade your
 * plan" on the web opened the app and read the very same appointments and
 * documents. Whatever the right answer is, the two surfaces have to give it.
 *
 * It is a plan gate, not a security boundary: everything behind it is the
 * patient's own data, and a determined caller still reaches the route. What it
 * stops is the product contradicting itself.
 *
 * **Decides on the last answer the server gave.** A failed refetch is not a
 * revocation — the same rule ModuleGuard follows, for the same reason: this
 * app refetches on every mount, and treating a network hiccup as "no" would
 * throw an entitled patient out of their own record.
 */
export function PlanGate({
  module,
  children,
}: {
  module: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const lang = useLang();
  const { data, isLoading } = useQuery({ queryKey: ["patient-access"], queryFn: fetchAccess });

  if (isLoading && !data) {
    return (
      <Screen>
        <Spinner center />
      </Screen>
    );
  }

  // No answer at all is not a refusal: without it the app would lock every
  // screen the first time the network blinked.
  if (!data) return <>{children}</>;

  if (data.modules.includes(module)) return <>{children}</>;

  return (
    <Screen>
      <Card>
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 32 }}>
          <Ionicons name="lock-closed-outline" size={36} color={theme.colors.textMuted} />
          <Text variant="subtitle" style={{ textAlign: "center" }}>
            {t(lang, {
              en: "Not included in your plan",
              pt: "Não incluído no seu plano",
            })}
          </Text>
          <Text
            variant="caption"
            color={theme.colors.textSecondary}
            style={{ textAlign: "center", lineHeight: 18 }}
          >
            {t(lang, {
              en: "Your clinic can add this to your plan. Ask them if you think this is wrong.",
              pt: "Sua clínica pode incluir isto no seu plano. Fale com eles se achar que está errado.",
            })}
          </Text>
          {/* Uma tela que só diz "não" precisa de uma porta. Sem isto, quem
              chegasse aqui ficava olhando um cadeado — e, dependendo de como
              chegou, sem nem o gesto de voltar (achado no iPhone, 24/09). */}
          {router.canGoBack() && (
            <Button
              title={t(lang, { en: "Go back", pt: "Voltar" })}
              variant="greige"
              size="sm"
              onPress={() => router.back()}
              testID="plan-gate-back"
            />
          )}
        </View>
      </Card>
    </Screen>
  );
}
