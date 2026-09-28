import { View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, ListItem, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { fetchRelatorios, type RelatorioDoPaciente } from "@/api/reports";
import { PlanGate } from "@/components/PlanGate";

/**
 * Meus relatórios (099 T-5).
 *
 * ## Por que abrir no navegador, e não numa tela daqui
 *
 * O relatório é HTML guardado — o retrato de um período, como ele ficou.
 * Reimplementá-lo em componentes nativos criaria uma segunda versão do mesmo
 * documento, e as duas divergiriam no primeiro campo novo.
 *
 * O link é assinado e curto porque o navegador do telefone não carrega o
 * bearer: a permissão viaja no próprio link, presa a um relatório, a uma
 * pessoa e a cinco minutos.
 */
function ReportsScreen() {
  const t = useTheme();
  const lang = useLang();
  const { data, isLoading } = useQuery({ queryKey: ["patient-reports"], queryFn: fetchRelatorios });

  const periodo = (r: RelatorioDoPaciente) => {
    const de = r.periodStart.slice(0, 10);
    const ate = r.periodEnd.slice(0, 10);
    return r.cadence === "DAILY" ? de : `${de} — ${ate}`;
  };

  return (
    <Screen scroll testID="reports-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "My reports", pt: "Meus relatórios" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      {isLoading ? (
        <Spinner center />
      ) : !data || data.length === 0 ? (
        <Card>
          {/* Uma tela vazia que explica vale mais que uma lista vazia: quem
              acabou de ligar o acompanhamento precisa saber que o primeiro
              relatório chega no fim do período, não agora. */}
          <Text variant="body" color={t.colors.textSecondary}>
            {tr(lang, {
              en: "No reports yet. The first one arrives at the end of the period your clinic set up.",
              pt: "Ainda não há relatórios. O primeiro chega no fim do período que a sua clínica configurou.",
            })}
          </Text>
        </Card>
      ) : (
        <Card>
          {data.map((r, i) => (
            <ListItem
              key={r.id}
              title={periodo(r)}
              subtitle={
                r.therapistNote
                  ? tr(lang, { en: "With a note from your therapist", pt: "Com um recado do seu terapeuta" })
                  : r.cadence === "DAILY"
                    ? tr(lang, { en: "Daily", pt: "Diário" })
                    : tr(lang, { en: "Weekly", pt: "Semanal" })
              }
              icon={<Ionicons name="document-text-outline" size={18} color={t.colors.text} />}
              right={<Ionicons name="open-outline" size={16} color={t.colors.textMuted} />}
              last={i === data.length - 1}
              testID={`report-${r.id}`}
              onPress={() => void WebBrowser.openBrowserAsync(r.url)}
            />
          ))}
        </Card>
      )}

      <View style={{ marginTop: 12 }}>
        <Text variant="caption" color={t.colors.textMuted}>
          {tr(lang, {
            en: "These reports show what was measured and what changed. They are not a diagnosis — talk to your therapist about what they mean.",
            pt: "Estes relatórios mostram o que foi medido e o que mudou. Não são um diagnóstico — fale com o seu terapeuta sobre o que eles significam.",
          })}
        </Text>
      </View>
    </Screen>
  );
}

export default function Reports() {
  return (
    <PlanGate module="mod_records">
      <ReportsScreen />
    </PlanGate>
  );
}
