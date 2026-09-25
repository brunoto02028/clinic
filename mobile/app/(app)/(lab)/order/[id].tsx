import { View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchLabOrder } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { stageCopy, STAGE_ORDER, COLLECTION_STEPS } from "@/lib/lab-stage-copy";

const SAGE = "#65807B";
const SAGE_FOG = "#E4EDE7";
const AMBER = "#B8823A";
const AMBER_BG = "#F5EFDD";

/**
 * O acompanhamento (081, T-3): onde o pedido está, com os estados de verdade —
 * "kit a caminho", "registre seu kit", "amostra recebida", "no laboratório",
 * "em revisão com o seu terapeuta" — e não uma barra genérica.
 *
 * Só um estágio pede a pessoa: registrar o kit. Ele fica em âmbar e com os
 * passos na tela. O resultado só aparece depois que a clínica libera.
 */
export default function LabOrderTracking() {
  const t = useTheme();
  const lang = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => fetchLabOrder(id),
    enabled: !!id,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Screen><Spinner center /></Screen>;
  if (isError || !data) {
    return <Screen><Text>{tr(lang, { en: "Order not found.", pt: "Pedido não encontrado." })}</Text></Screen>;
  }

  const o = data.order;
  const copy = stageCopy(o.stage, lang, data.reviewDays);
  const precisaDeVoce = o.stage === "register_kit" || o.stage === "collect_and_post";
  const idx = STAGE_ORDER.indexOf(o.stage);
  const testName = o.items.map((i) => i.productName).join(", ");

  return (
    <Screen scroll testID="lab-order-tracking-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: `#${o.orderNumber}`,
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 14 }}>
        <Card style={{ backgroundColor: precisaDeVoce ? AMBER_BG : o.stage === "released" ? t.colors.okSoft : SAGE_FOG, borderWidth: 0 }} testID={`lab-stage-${o.stage}`}>
          <Text variant="caption" color={t.colors.textSecondary}>{testName}</Text>
          <Text variant="subtitle" style={{ fontFamily: "Sora_700Bold", marginTop: 4, color: precisaDeVoce ? AMBER : t.colors.text }}>{copy.title}</Text>
          <Text variant="body" style={{ fontSize: 12, marginTop: 6, lineHeight: 18 }}>{copy.body}</Text>
        </Card>

        {o.stage === "register_kit" && (
          <Card>
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 6 }}>{tr(lang, { en: "When the kit arrives", pt: "Quando o kit chegar" })}</Text>
            {o.registration?.canRegister ? (
              <Button
                title={tr(lang, { en: "Register my kit", pt: "Registrar meu kit" })} variant="primary" size="lg" style={{ backgroundColor: SAGE }} testID="lab-register-kit"
                onPress={() => router.push({ pathname: "/(app)/(lab)/order/[id]/register" as any, params: { id: o.id } })}
              />
            ) : (
              <Text variant="body" style={{ fontSize: 12, lineHeight: 18 }} color={t.colors.textSecondary}>
                {tr(lang, {
                  en: "Registration opens in this screen as soon as the laboratory confirms dispatch. Keep the kit sealed until then.",
                  pt: "O registro abre nesta tela assim que o laboratório confirmar o envio. Mantenha o kit fechado até lá.",
                })}
              </Text>
            )}
          </Card>
        )}

        {(o.stage === "register_kit" || o.stage === "collect_and_post") && (
          <Card>
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>{tr(lang, { en: "How to collect", pt: "Como coletar" })}</Text>
            {COLLECTION_STEPS.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
                  <Text variant="caption" style={{ fontFamily: "Sora_600SemiBold", fontSize: 10 }}>{i + 1}</Text>
                </View>
                <Text variant="body" style={{ flex: 1, fontSize: 12, paddingTop: 3, lineHeight: 18 }}>{tr(lang, step)}</Text>
              </View>
            ))}
          </Card>
        )}

        {o.stage !== "cancelled" && o.stage !== "basket" && (
          <Card style={{ paddingVertical: 18, paddingHorizontal: 20 }}>
            <View style={{ paddingLeft: 22 }}>
              {STAGE_ORDER.map((stage, i) => {
                const state = i < idx ? "done" : i === idx ? "active" : "pending";
                const dot = state === "pending" ? "#DDE0E4" : state === "active" && precisaDeVoce ? AMBER : SAGE;
                const line = state === "done" ? SAGE : "#DDE0E4";
                const last = i === STAGE_ORDER.length - 1;
                return (
                  <View key={stage} style={{ position: "relative", paddingBottom: last ? 0 : 22 }}>
                    <View style={{ position: "absolute", left: -22, top: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: dot, borderWidth: 2, borderColor: t.colors.background }} />
                    {!last && <View style={{ position: "absolute", left: -17, top: 14, width: 2, height: "100%", backgroundColor: line }} />}
                    <Text variant="body" style={{ fontFamily: "Sora_600SemiBold", fontSize: 12, color: state === "pending" ? t.colors.textMuted : t.colors.text }}>
                      {stageCopy(stage, lang, data.reviewDays).title}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {o.stage === "released" && (
          <Button
            title={tr(lang, { en: "See my result", pt: "Ver meu resultado" })} variant="primary" size="lg" style={{ backgroundColor: SAGE }} testID="lab-see-result"
            onPress={() => router.push({ pathname: "/(app)/(lab)/result/[id]" as any, params: { id: o.id } })}
          />
        )}

        <Button
          title={tr(lang, { en: "Ask your therapist", pt: "Falar com o terapeuta" })}
          variant="ghost" size="md"
          onPress={() => router.push("/(app)/(clinica)/messages" as any)}
        />
      </View>
    </Screen>
  );
}
