import { View, Alert } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { openFileInApp } from "@/components/FileViewer";
import { fetchLabOrder, type LabResultValue } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { API_URL } from "@/api/config";

const SAGE = "#65807B";
const AMBER = "#B8823A";
const AMBER_BG = "#F5EFDD";

/**
 * O resultado (081, T-3) — e só depois que o terapeuta liberou. A nota dele
 * vem em cima; embaixo, cada biomarcador com valor, unidade e faixa. O que
 * está fora da faixa é marcado em âmbar, nunca em vermelho: é assunto para a
 * consulta, não uma emergência na tela.
 */
function fmtValue(v: LabResultValue) {
  if (v.value === null || v.value === undefined) return v.valueText ?? "—";
  return `${v.value}${v.unit ? ` ${v.unit}` : ""}`;
}
function fmtRange(v: LabResultValue) {
  if (v.minRange === null && v.maxRange === null) return "";
  if (v.minRange !== null && v.maxRange !== null) return `${v.minRange}–${v.maxRange}${v.unit ? ` ${v.unit}` : ""}`;
  if (v.minRange !== null) return `≥ ${v.minRange}${v.unit ? ` ${v.unit}` : ""}`;
  return `≤ ${v.maxRange}${v.unit ? ` ${v.unit}` : ""}`;
}

export default function LabResult() {
  const t = useTheme();
  const lang = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => fetchLabOrder(id),
    enabled: !!id,
  });

  if (isLoading) return <Screen><Spinner center /></Screen>;
  if (isError || !data) {
    return <Screen><Text>{tr(lang, { en: "Result not found.", pt: "Resultado não encontrado." })}</Text></Screen>;
  }

  // Não liberado: a tela não existe. Nada de "em breve" que sugira que já há
  // um número esperando — a posição certa é a do acompanhamento.
  if (!data.result) {
    return (
      <Screen testID="lab-result-not-released">
        <Stack.Screen options={{ headerShown: true, title: "", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
        <Card>
          <Text variant="body" style={{ fontSize: 12, textAlign: "center" }} color={t.colors.textSecondary}>
            {tr(lang, { en: "Nothing to see here yet.", pt: "Nada para ver aqui ainda." })}
          </Text>
        </Card>
        <Button title={tr(lang, { en: "Back to the order", pt: "Voltar ao pedido" })} variant="ghost" size="md" onPress={() => router.replace(`/(app)/(lab)/order/${id}` as any)} />
      </Screen>
    );
  }

  const o = data.order;
  const r = data.result;
  const note = lang === "pt" ? r.notePt || r.noteEn : r.noteEn;
  const testName = o.items.map((i) => i.productName).join(", ");

  const openReport = async () => {
    try {
      // O laudo também abre dentro do app (mesma razão dos documentos). A rota
      // passa o token pela sessão do WebView; sem PDF guardado, o botão não existe.
      await openFileInApp(`${API_URL}/api/mobile/labs/orders/${o.id}/result-pdf`);
    } catch {
      Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), tr(lang, { en: "Could not open the report.", pt: "Não foi possível abrir o laudo." }));
    }
  };

  return (
    <Screen scroll testID="lab-result-screen">
      <Stack.Screen
        options={{ headerShown: true, title: tr(lang, { en: "Result", pt: "Resultado" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 14 }}>
        <Card>
          <Text variant="subtitle" style={{ fontFamily: "Sora_700Bold", fontSize: 14 }}>{testName}</Text>
          <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 4 }}>
            #{o.orderNumber} · {tr(lang, { en: "reviewed", pt: "revisado em" })} {new Date(r.releasedAt).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </Card>

        <Card style={{ backgroundColor: AMBER_BG, borderWidth: 0 }} testID="lab-therapist-note">
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", color: AMBER, marginBottom: 6 }}>
            {tr(lang, { en: "Your therapist's note", pt: "Nota do seu terapeuta" })}
          </Text>
          <Text variant="body" style={{ fontSize: 12, lineHeight: 18 }}>
            {note.trim() || tr(lang, { en: "Reviewed. No comments.", pt: "Revisado. Sem comentários." })}
          </Text>
        </Card>

        <Card>
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 8 }}>{tr(lang, { en: "Your values", pt: "Seus valores" })}</Text>
          {r.values.map((v, i) => (
            <View key={v.id} style={{ paddingVertical: 9, borderBottomWidth: i < r.values.length - 1 ? 1 : 0, borderBottomColor: t.colors.border }} testID={`lab-value-${v.biomarker}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <Text variant="body" style={{ fontFamily: "Sora_600SemiBold", fontSize: 12, flex: 1 }}>{v.biomarker}</Text>
                <Text style={{ fontFamily: "Sora_700Bold", fontSize: 13, color: v.outOfRange ? AMBER : t.colors.text }}>{fmtValue(v)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
                <Text variant="caption" color={t.colors.textMuted}>{fmtRange(v) ? `${tr(lang, { en: "Reference", pt: "Referência" })}: ${fmtRange(v)}` : ""}</Text>
                {v.outOfRange && <Text variant="caption" color={AMBER}>{tr(lang, { en: "outside range", pt: "fora da faixa" })}</Text>}
              </View>
            </View>
          ))}
        </Card>

        <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center", paddingHorizontal: 8 }} testID="lab-non-diagnostic">
          {tr(lang, {
            en: "These results are for information and do not replace a consultation. Your therapist has reviewed them.",
            pt: "Estes resultados são informativos e não substituem uma consulta. Seu terapeuta os revisou.",
          })}
        </Text>

        {r.pdfAvailable && (
          <Button title={tr(lang, { en: "Open the full report", pt: "Abrir o laudo completo" })} variant="primary" size="lg" onPress={openReport} style={{ backgroundColor: SAGE }} testID="lab-open-pdf" />
        )}

        <Button
          title={tr(lang, { en: "Discuss with your therapist", pt: "Conversar com o terapeuta" })}
          variant="ghost" size="md"
          onPress={() => router.push("/(app)/(clinica)/messages" as any)}
        />
      </View>
    </Screen>
  );
}
