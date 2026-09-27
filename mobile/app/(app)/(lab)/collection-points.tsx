import { useState } from "react";
import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Input, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { abrirNoMapa } from "@/lib/mapa";
import { fetchPontosDeColeta } from "@/api/labs";

/**
 * Onde você faz sua coleta (091 T-1).
 *
 * O Bruno, testando o build 17: *"A gente não tem ainda onde buscar os pontos
 * de coletas. Não tem um lugar para fazer uma busca por postcode... Eu preciso
 * de mais clareza e de mais informações aqui no app."*
 *
 * Existia — no rodapé da página "Como funciona", depois de quatro passos e de
 * três formas de coleta, e lendo só o código postal do cadastro. **Uma coisa
 * que só aparece depois de rolar a tela inteira é, para quem usa, uma coisa
 * que não existe.**
 *
 * Duas correções, e a segunda é a que mais muda entendimento:
 *
 * 1. A busca é livre. Quem quer conferir se há ponto perto do trabalho, ou da
 *    casa de quem vai levar a criança, não tem por que editar o perfil para
 *    fazer uma pergunta.
 * 2. **O exame não é feito no laboratório.** Ele é feito num ponto de coleta,
 *    e há pontos por todo o Reino Unido — muitos dentro de farmácias. O
 *    laboratório só analisa. O texto anterior permitia entender o contrário, e
 *    quem entende errado isso acha que precisa viajar até Londres.
 */

export default function PontosDeColeta() {
  const t = useTheme();
  const lang = useLang();
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState<string | null>(null);

  const pontos = useQuery({
    // A busca entra na chave: sem isso, procurar um segundo código postal
    // devolveria o primeiro, do cache.
    queryKey: ["lab-collection-points", busca],
    queryFn: () => fetchPontosDeColeta(busca),
  });

  const estado = pontos.data?.estado;
  const procurou = busca !== null;
  const lista = pontos.data?.pontos ?? [];

  const procurar = () => {
    const limpo = texto.trim();
    setBusca(limpo ? limpo : null);
  };

  return (
    <Screen scroll testID="collection-points-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Collection points", pt: "Pontos de coleta" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Text variant="title">
            {tr(lang, { en: "Where you give your sample", pt: "Onde você faz sua coleta" })}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 19 }}>
            {tr(lang, {
              en: "Your sample is not given at the laboratory. It is given at a collection point — there are points across the UK, and many are inside pharmacies. The laboratory only analyses what arrives.",
              pt: "Sua amostra não é coletada no laboratório. Ela é coletada num ponto de coleta — há pontos por todo o Reino Unido, e muitos ficam dentro de farmácias. O laboratório só analisa o que chega.",
            })}
          </Text>
          <Text variant="caption" color={t.colors.textMuted} style={{ lineHeight: 19 }}>
            {tr(lang, {
              en: "Some tests do not need a point at all: the kit arrives at your home and you take the sample yourself. Each test page says which applies, before you pay.",
              pt: "Alguns exames não precisam de ponto nenhum: o kit chega na sua casa e você mesmo faz a coleta. A página de cada exame diz qual é o caso, antes de você pagar.",
            })}
          </Text>
        </View>

        {/* ── A busca ── */}
        <Card>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginBottom: 8 }}>
            {tr(lang, {
              en: "Search any postcode — yours, or wherever suits you.",
              pt: "Procure qualquer código postal — o seu, ou onde for melhor para você.",
            })}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Input
                value={texto}
                onChangeText={setTexto}
                placeholder="SW1A 1AA"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={procurar}
                testID="busca-postcode"
              />
            </View>
            <Button
              title={tr(lang, { en: "Search", pt: "Procurar" })}
              variant="primary"
              style={{ backgroundColor: t.colors.lab }}
              onPress={procurar}
              testID="busca-postcode-enviar"
            />
          </View>
          {procurou && (
            <Pressable onPress={() => { setTexto(""); setBusca(null); }} hitSlop={8} style={{ marginTop: 10 }}>
              <Text variant="caption" color={t.colors.lab}>
                {tr(lang, { en: "Use my profile postcode", pt: "Usar o código postal do meu perfil" })}
              </Text>
            </Pressable>
          )}
        </Card>

        {/* ── O resultado ── */}
        {pontos.isLoading ? (
          <Spinner center />
        ) : estado === "sem_postcode" ? (
          <Card testID="pontos-sem-postcode">
            <Text variant="caption" color={t.colors.textSecondary}>
              {tr(lang, {
                en: "Search a postcode above, or add yours to your profile and we will start from it.",
                pt: "Procure um código postal acima, ou adicione o seu ao perfil que partimos dele.",
              })}
            </Text>
            <Button
              title={tr(lang, { en: "Add my postcode", pt: "Adicionar meu código postal" })}
              variant="ghost"
              style={{ marginTop: 10 }}
              onPress={() => router.push("/(app)/profile-edit")}
              testID="pontos-ir-ao-perfil"
            />
          </Card>
        ) : estado === "postcode_desconhecido" ? (
          <Card testID="pontos-postcode-desconhecido">
            <Text variant="caption" color={t.colors.textSecondary}>
              {procurou
                ? tr(lang, {
                    en: `We could not find "${pontos.data?.postcode}". Check the spelling — a UK postcode looks like SW1A 1AA.`,
                    pt: `Não encontramos "${pontos.data?.postcode}". Confira a grafia — um código postal britânico tem a forma SW1A 1AA.`,
                  })
                : tr(lang, {
                    en: `We could not find the postcode on your profile (${pontos.data?.postcode}). Check it, or search another above.`,
                    pt: `Não encontramos o código postal do seu perfil (${pontos.data?.postcode}). Confira, ou procure outro acima.`,
                  })}
            </Text>
          </Card>
        ) : estado === "laboratorio_desconectado" ? (
          <Card testID="pontos-lab-desconectado">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="location" size={18} color={t.colors.lab} />
              <Text variant="label" style={{ fontWeight: "700" }}>
                {pontos.data?.postcode}
                {pontos.data?.local ? ` · ${pontos.data.local}` : ""}
              </Text>
            </View>
            <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 6, lineHeight: 19 }}>
              {tr(lang, {
                en: "Area confirmed. The list of collection points near it appears here as soon as the laboratory connection opens.",
                pt: "Área confirmada. A lista de pontos de coleta perto dela aparece aqui assim que a conexão com o laboratório abrir.",
              })}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {pontos.data?.local && (
              <Text variant="caption" color={t.colors.textMuted}>
                {tr(lang, {
                  en: `${lista.length} near ${pontos.data.postcode} · ${pontos.data.local}`,
                  pt: `${lista.length} perto de ${pontos.data.postcode} · ${pontos.data.local}`,
                })}
              </Text>
            )}
            {lista.map((ponto) => (
              <Pressable
                key={ponto.id}
                onPress={() => void abrirNoMapa(ponto.nome, ponto.endereco)}
                accessibilityRole="button"
                accessibilityLabel={tr(lang, {
                  en: `Open ${ponto.nome} in maps`,
                  pt: `Abrir ${ponto.nome} no mapa`,
                })}
                testID={`ponto-${ponto.id}`}
              >
                <Card>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <Text variant="label" style={{ fontWeight: "700", flex: 1 }}>{ponto.nome}</Text>
                    {ponto.distanciaKm != null && (
                      <Text variant="caption" color={t.colors.lab}>{ponto.distanciaKm.toFixed(1)} km</Text>
                    )}
                  </View>
                  <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 3 }}>
                    {ponto.endereco}
                  </Text>
                  {(ponto.trem || ponto.onibus) && (
                    <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 3 }}>
                      {[ponto.trem, ponto.onibus].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                    <Ionicons name="navigate-outline" size={14} color={t.colors.lab} />
                    <Text variant="caption" color={t.colors.lab} style={{ fontWeight: "600" }}>
                      {tr(lang, { en: "Open in maps", pt: "Abrir no mapa" })}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
