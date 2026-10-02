import React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, ListItem, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { fetchRelatorios, pedirRelatorio, type RelatorioDoPaciente } from "@/api/reports";
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
  const queryClient = useQueryClient();

  /**
   * **O paciente pede um, agora** (118 T-5).
   *
   * > *"Quero poder gerar esses reports detalhados que servirão para os
   * > pacientes buscarem ajuda médica ou de outros profissionais quando
   * > quiserem."*
   *
   * Até aqui havia dois caminhos para um relatório existir — a clínica emitir
   * para alguém, e o cron emitir na cadência da clínica — e nenhum dos dois era
   * dele. A tela vazia dizia *"o primeiro chega no fim do período que a sua
   * clínica configurou"*, que é verdade e é uma espera que ninguém escolheu.
   *
   * O relatório abre **sozinho** quando fica pronto: quem carregou no botão
   * quer o papel, não uma linha nova numa lista.
   */
  const [aPedir, setAPedir] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const pedir = async () => {
    setAPedir(true);
    setErro(null);
    try {
      const r = await pedirRelatorio();
      await queryClient.invalidateQueries({ queryKey: ["patient-reports"] });
      await WebBrowser.openBrowserAsync(r.url);
    } catch {
      /*
       * Aqui o erro **diz-se**, ao contrário do gesto de puxar a tela: a pessoa
       * carregou num botão e está à espera de um documento. Silêncio depois de
       * um toque deliberado lê-se como "o botão não funciona".
       */
      setErro(
        tr(lang, {
          en: "Could not prepare the report. Try again.",
          pt: "Não foi possível preparar o relatório. Tente outra vez.",
        })
      );
    } finally {
      setAPedir(false);
    }
  };

  const periodo = (r: RelatorioDoPaciente) => {
    const de = r.periodStart.slice(0, 10);
    const ate = r.periodEnd.slice(0, 10);
    return r.cadence === "DAILY" ? de : `${de} — ${ate}`;
  };

  const botaoDePedir = (
    <View style={{ marginTop: 12, gap: 6 }}>
      <Pressable
        onPress={() => void pedir()}
        disabled={aPedir}
        accessibilityRole="button"
        testID="pedir-relatorio"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 14,
          borderRadius: t.radius.lg,
          backgroundColor: aPedir ? t.colors.surface : t.colors.primary,
          borderWidth: 1,
          borderColor: aPedir ? t.colors.border : t.colors.primary,
        }}
      >
        {aPedir ? (
          <ActivityIndicator size="small" color={t.colors.textSecondary} />
        ) : (
          <Ionicons name="download-outline" size={18} color={t.colors.primaryFg} />
        )}
        <Text
          variant="body"
          color={aPedir ? t.colors.textSecondary : t.colors.primaryFg}
          style={{ fontWeight: "600" }}
        >
          {aPedir
            ? tr(lang, { en: "Preparing…", pt: "A preparar…" })
            : tr(lang, { en: "Create a report now", pt: "Gerar um relatório agora" })}
        </Text>
      </Pressable>

      <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 11 }}>
        {tr(lang, {
          en: "Covers the last 90 days — everything measured, to hand to a doctor.",
          pt: "Cobre os últimos 90 dias — tudo o que foi medido, para entregar a um médico.",
        })}
      </Text>

      {erro && (
        <Text variant="caption" color={t.colors.bad} style={{ fontSize: 12 }} testID="erro-pedir-relatorio">
          {erro}
        </Text>
      )}
    </View>
  );

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
          {/*
            * Uma tela vazia que explica vale mais que uma lista vazia.
            *
            * **E o texto mudou com a T-5.** Ele dizia *"o primeiro chega no fim
            * do período que a sua clínica configurou"* — uma espera que agora o
            * botão logo abaixo acaba. Prometer a espera e oferecer o atalho na
            * mesma tela faz a pessoa duvidar de qual dos dois é verdade.
            */}
          <Text variant="body" color={t.colors.textSecondary}>
            {tr(lang, {
              en: "No reports yet. Your clinic sends them on a schedule — or you can create one now, below.",
              pt: "Ainda não há relatórios. A sua clínica envia-os periodicamente — ou pode gerar um agora, abaixo.",
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
                  : r.cadence === "ON_DEMAND"
                    ? tr(lang, { en: "You asked for this one", pt: "Pedido por si" })
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

      {botaoDePedir}

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
