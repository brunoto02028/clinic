import { useState, useEffect } from "react";
import { View, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchOutcomeMeasures, saveOutcomeMeasures } from "@/api/outcome-measures";
import { useTheme } from "@/theme/useTheme";
import { PlanGate } from "@/components/PlanGate";
import { useLang, t as tr } from "@/lib/i18n";

function OutcomeMeasuresScreen() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["outcome-measures"],
    queryFn: fetchOutcomeMeasures,
    // Formulário em edição não pode ser sobrescrito pelo servidor no meio
    // (revalidação no foco, 075 T-12 — a mesma razão da triagem).
    refetchOnWindowFocus: false,
  });

  const [vasScore, setVasScore] = useState(0);
  const [overallFunction, setOverallFunction] = useState(50);

  useEffect(() => {
    if (data) {
      setVasScore(data.vasScore ?? 0);
      setOverallFunction(data.overallFunction ?? 50);
    }
  }, [data]);

  const mutation = useMutation({
    // The app collects the pain score and overall function; it does not carry
    // the FAAM questionnaires (13 ADL + 6 Sport questions on the web). It used
    // to post empty objects and null percentages for them — and because the
    // endpoint appends a row that the GET then reads back as the latest,
    // saving a pain score from the app erased the patient's FAAM outright.
    // Carry the stored values through until the questionnaires are ported.
    mutationFn: () => saveOutcomeMeasures({
      vasScore, overallFunction,
      faamAdl: data?.faamAdl ?? {},
      faamSport: data?.faamSport ?? {},
      faamAdlPercent: data?.faamAdlPercent ?? null,
      faamSportPercent: data?.faamSportPercent ?? null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outcome-measures"] });
      Alert.alert(
        tr(lang, { en: "Saved", pt: "Salvo!" }),
        tr(lang, { en: "Your measures have been recorded.", pt: "Suas medidas foram registradas." }),
      );
    },
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message),
  });

  if (isLoading) return <Screen><Spinner center /></Screen>;

  // Refuse to render the form when the load failed. Showing zeros and a live
  // Save button was how a patient's FAAM got erased: the screen looked like a
  // blank questionnaire, and saving it posted blanks over real scores.
  if (isError) {
    return (
      <Screen testID="outcome-measures-screen">
        <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "Outcome measures", pt: "Medidas de evolução" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 }}>
          <Ionicons name="cloud-offline-outline" size={32} color={t.colors.textMuted} />
          <Text variant="body" style={{ textAlign: "center" }}>
            {tr(lang, {
              en: "We could not load your measures.",
              pt: "Não foi possível carregar suas medidas.",
            })}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ textAlign: "center" }}>
            {tr(lang, {
              en: "Saving is not possible before loading — it would overwrite what is already recorded.",
              pt: "Não é possível salvar sem carregar antes — salvar agora apagaria o que já está registrado.",
            })}
          </Text>
          <Button title={tr(lang, { en: "Try again", pt: "Tentar de novo" })} variant="health" size="sm" onPress={() => refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="outcome-measures-screen">
      <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "Outcome measures", pt: "Medidas de evolução" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>
        <View>
          <Text variant="body" color={t.colors.textSecondary}>
            {tr(lang, {
              en: "Rate your pain and functional ability",
              pt: "Avalie sua dor e funcionalidade",
            })}
          </Text>
        </View>

        {/* VAS Score */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="pulse-outline" size={18} color={t.colors.bad} />
            <Text variant="label" style={{ fontWeight: "600" }}>{tr(lang, { en: "Visual Analogue Scale (VAS)", pt: "Escala de Dor (VAS)" })}</Text>
          </View>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginBottom: 8 }}>
            {tr(lang, {
              en: "0 = No pain, 10 = Worst pain imaginable",
              pt: "0 = Sem dor, 10 = Pior dor imaginável",
            })}
          </Text>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Text variant="title" color={vasScore > 6 ? t.colors.bad : vasScore > 3 ? t.colors.warn : t.colors.ok} style={{ fontSize: 36 }}>
              {vasScore}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="caption" color={t.colors.textMuted}>0</Text>
            <View style={{ flex: 1 }}>
              <View style={{ height: 36, justifyContent: "center" }}>
                <View style={{ height: 6, backgroundColor: t.colors.surfaceMuted, borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ height: 6, width: `${vasScore * 10}%`, backgroundColor: vasScore > 6 ? t.colors.bad : vasScore > 3 ? t.colors.warn : t.colors.ok, borderRadius: 3 }} />
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                  <View
                    key={v}
                    onTouchEnd={() => setVasScore(v)}
                    style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: v === vasScore ? t.colors.okSoft : "transparent" }}
                  >
                    <Text variant="caption" color={v === vasScore ? t.colors.ok : t.colors.textMuted} style={{ fontSize: 10 }}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text variant="caption" color={t.colors.textMuted}>10</Text>
          </View>
        </Card>

        {/* Overall function */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="accessibility-outline" size={18} color={t.colors.ok} />
            <Text variant="label" style={{ fontWeight: "600" }}>{tr(lang, { en: "Overall function", pt: "Funcionalidade geral" })}</Text>
          </View>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginBottom: 8 }}>
            {tr(lang, {
              en: "0% = Total disability, 100% = Full normal function",
              pt: "0% = Incapacidade total, 100% = Função normal completa",
            })}
          </Text>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Text variant="title" color={t.colors.ok} style={{ fontSize: 36 }}>{overallFunction}%</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="caption" color={t.colors.textMuted}>0%</Text>
            <View style={{ flex: 1, height: 6, backgroundColor: t.colors.surfaceMuted, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ height: 6, width: `${overallFunction}%`, backgroundColor: t.colors.ok, borderRadius: 3 }} />
            </View>
            <Text variant="caption" color={t.colors.textMuted}>100%</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            {[0, 25, 50, 75, 100].map(v => (
              <View
                key={v}
                onTouchEnd={() => setOverallFunction(v)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: overallFunction === v ? t.colors.okSoft : t.colors.surfaceMuted }}
              >
                <Text variant="caption" color={overallFunction === v ? t.colors.ok : t.colors.textMuted}>{v}%</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button title={tr(lang, { en: "Save measures", pt: "Salvar medidas" })} onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </View>
    </Screen>
  );
}

/**
 * Gated on `mod_records` — the web reaches these scores through My Records and
 * refuses them with the plan closed. The app not only showed them, it let the
 * patient write a new row.
 */
export default function OutcomeMeasures() {
  return (
    <PlanGate module="mod_records">
      <OutcomeMeasuresScreen />
    </PlanGate>
  );
}
