import { View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchLabProduct, fetchLabConsent, acceptLabConsent } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";


/**
 * Um exame (081, T-3): o que mede, que é picada no dedo em casa, e o que
 * acontece depois. O botão de comprar só existe quando a compra está aberta
 * de ponta a ponta — antes disso a tela diz que abre em breve, em vez de
 * prometer uma porta que não está lá.
 */
export default function LabTestDetail() {
  const t = useTheme();
  const lang = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-product", id],
    queryFn: () => fetchLabProduct(id),
    enabled: !!id,
  });

  // O consentimento (T-4) é perguntado aqui, antes do botão, para a recusa do
  // servidor nunca precisar acontecer.
  const qc = useQueryClient();
  const consent = useQuery({
    queryKey: ["lab-consent", lang],
    queryFn: () => fetchLabConsent(lang === "pt" ? "pt-BR" : "en-GB"),
    enabled: !!data?.orderingEnabled,
  });
  const aceitar = useMutation({
    mutationFn: acceptLabConsent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-consent"] }),
  });

  if (isLoading) return <Screen><Spinner center /></Screen>;
  if (isError || !data) {
    return (
      <Screen><Text>{tr(lang, { en: "This test is not available.", pt: "Este exame não está disponível." })}</Text></Screen>
    );
  }

  const p = data.product;
  const price = `£${p.price.toFixed(2)}`;
  const description = lang === "pt" ? p.description.pt || p.description.en : p.description.en;
  const swab = p.sampleType.includes("swab");

  const steps = [
    { en: "The kit arrives by post. You register it in the app when it lands.", pt: "O kit chega pelo correio. Você o registra no app quando chegar." },
    swab
      ? { en: "A finger-prick and a swab at home, following the steps in the app. Post it back the same day.", pt: "Picada no dedo e swab em casa, seguindo os passos do app. Poste no mesmo dia." }
      : { en: "A finger-prick at home, following the steps in the app. Post it back the same day.", pt: "Picada no dedo em casa, seguindo os passos do app. Poste no mesmo dia." },
    // Ninguém da clínica lê antes (26/09/2026) — e os termos publicados
    // prometem isso em duas línguas.
    { en: "The laboratory sends the result, and it appears here. It is yours to share with whichever doctor you prefer.", pt: "O laboratório envia o resultado, e ele aparece aqui. Ele é seu, para compartilhar com o médico que preferir." },
  ];

  return (
    <Screen scroll testID="lab-detail-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: p.name,
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 14 }}>
        <Card style={{ backgroundColor: t.colors.labSoft, alignItems: "center", paddingVertical: 22 }}>
          <Ionicons name="flask" size={40} color={t.colors.lab} />
          <Text variant="subtitle" style={{ fontFamily: "Sora_700Bold", fontSize: 17, marginTop: 10, textAlign: "center" }}>{p.name}</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>
            {price}
            {p.turnaroundDays
              ? ` · ${tr(lang, { en: `results in ${p.turnaroundDays} working day${p.turnaroundDays === 1 ? "" : "s"}`, pt: `resultado em ${p.turnaroundDays} dia${p.turnaroundDays === 1 ? " útil" : "s úteis"}` })}`
              : ""}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
            <Ionicons name="water-outline" size={14} color={t.colors.lab} />
            <Text variant="caption" color={t.colors.lab} testID="lab-sample-type">
              {swab
                ? tr(lang, { en: "Finger-prick and swab, at home", pt: "Picada no dedo e swab, em casa" })
                : tr(lang, { en: "Finger-prick, at home", pt: "Picada no dedo, em casa" })}
            </Text>
          </View>
        </Card>

        {description ? (
          <Card>
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 6 }}>{tr(lang, { en: "About this test", pt: "Sobre este exame" })}</Text>
            <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 20 }}>{description}</Text>
          </Card>
        ) : null}

        {p.biomarkers.length > 0 ? (
          <Card>
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>
              {tr(lang, { en: `What is measured (${p.biomarkers.length})`, pt: `O que é medido (${p.biomarkers.length})` })}
            </Text>
            {p.biomarkers.map((marker, idx) => (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: idx < p.biomarkers.length - 1 ? 1 : 0, borderBottomColor: t.colors.border }}>
                <Ionicons name="checkmark-circle" size={16} color={t.colors.lab} />
                <Text variant="body" style={{ fontFamily: "Sora_600SemiBold", fontSize: 12 }}>{marker}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>{tr(lang, { en: "How it works", pt: "Como funciona" })}</Text>
          {steps.map((step, idx) => (
            <View key={idx} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
                <Text variant="caption" style={{ fontFamily: "Sora_600SemiBold", fontSize: 10 }}>{idx + 1}</Text>
              </View>
              <Text variant="body" style={{ flex: 1, fontSize: 12, paddingTop: 3 }}>{tr(lang, step)}</Text>
            </View>
          ))}
          {p.notUnder16 && (
            <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 4 }}>
              {tr(lang, { en: "Not advisable under the age of 16.", pt: "Não indicado para menores de 16 anos." })}
            </Text>
          )}
        </Card>

        {data.orderingEnabled && consent.data && !consent.data.accepted ? (
          <Card testID="lab-consent">
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 8 }}>{consent.data.text.title}</Text>
            {consent.data.text.points.map((pt, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <Ionicons name="ellipse" size={6} color={t.colors.textMuted} style={{ marginTop: 6 }} />
                <Text variant="body" style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>{pt}</Text>
              </View>
            ))}
            <Button
              title={consent.data.text.accept} variant="primary" size="lg" style={{ backgroundColor: t.colors.lab, marginTop: 6 }} testID="lab-consent-accept"
              onPress={() => aceitar.mutate()} loading={aceitar.isPending} disabled={aceitar.isPending}
            />
          </Card>
        ) : data.orderingEnabled ? (
          <Button
            title={tr(lang, { en: `Continue · ${price}`, pt: `Continuar · ${price}` })}
            variant="primary" size="lg" style={{ backgroundColor: t.colors.lab }} testID="lab-continue"
            onPress={() => router.push({ pathname: "/(app)/(lab)/checkout" as any, params: { id: p.id, name: p.name, price: p.price.toFixed(2) } })}
          />
        ) : (
          <Card style={{ backgroundColor: t.colors.surfaceMuted }} testID="lab-ordering-soon">
            <Text variant="body" style={{ fontSize: 12, textAlign: "center" }} color={t.colors.textSecondary}>
              {tr(lang, { en: "Ordering opens soon. Your clinic will let you know.", pt: "A compra abre em breve. Sua clínica vai avisar." })}
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}
