import { useState } from "react";
import { View, Pressable, FlatList } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchProfessionals, type Profissional } from "@/api/professionals";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { usePullToRefresh } from "@/lib/pull-to-refresh";

/**
 * Com quem marcar (102 T-5).
 *
 * ## Por que esta tela existe
 *
 * O Bruno: *"o paciente pode querer agendar uma consulta com a reabilitacao mas
 * ele pode escolher todos os profissionais disponiveis ali"*. Marcar passou a
 * ter um primeiro passo — **com quem** —, e ele vem antes da data.
 *
 * ## O filtro de idioma nao e enfeite
 *
 * *"Principalmente brasileiros que vivem no exterior e querem profissionais
 * brasileiros"* — o idioma e a razao de a pessoa escolher, entao ele e o
 * primeiro filtro e nao um detalhe no rodape do cartao.
 *
 * ## O que a tela nao decide
 *
 * Nada. Quem aparece e decidido no servidor (`podeAparecerNoApp`), o preco vem
 * de la, e o formato que da para pedir sai do tipo. A tela desenha.
 */
export default function EscolherProfissional() {
  const t = useTheme();
  const lang = useLang();
  const { controle } = usePullToRefresh();
  const [soMeuIdioma, setSoMeuIdioma] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["professionals", soMeuIdioma ? lang : null],
    queryFn: () => fetchProfessionals(soMeuIdioma ? lang : undefined),
  });

  const escolher = (p: Profissional) =>
    router.push(
      `/(app)/(clinica)/book-appointment?professionalId=${p.professionalUserId}` as never
    );

  return (
    <Screen testID="escolher-profissional">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Choose a professional", pt: "Escolher profissional" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      {/* O filtro de idioma, no topo: e a primeira pergunta de quem procura um
          profissional que fale a lingua dele. */}
      <Pressable
        testID="filtro-idioma"
        onPress={() => setSoMeuIdioma((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
          marginBottom: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: soMeuIdioma ? t.colors.health : t.colors.border,
          backgroundColor: soMeuIdioma ? t.colors.healthSoft : "transparent",
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons
          name={soMeuIdioma ? "checkbox" : "square-outline"}
          size={18}
          color={soMeuIdioma ? t.colors.health : t.colors.textMuted}
        />
        <Text variant="caption" color={soMeuIdioma ? t.colors.health : t.colors.textSecondary}>
          {tr(lang, {
            en: "Only professionals who speak English",
            pt: "Só profissionais que falam português",
          })}
        </Text>
      </Pressable>

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <Text color={t.colors.danger}>
            {tr(lang, { en: "We could not load this.", pt: "Não foi possível carregar." })}
          </Text>
        </Card>
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <Text variant="body" color={t.colors.textSecondary}>
            {soMeuIdioma
              ? tr(lang, {
                  en: "No professional speaks your language yet. Turn the filter off to see everyone.",
                  pt: "Nenhum profissional fala a sua língua ainda. Desligue o filtro para ver todos.",
                })
              : tr(lang, {
                  en: "No professionals are available right now.",
                  pt: "Nenhum profissional disponível no momento.",
                })}
          </Text>
        </Card>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          refreshControl={controle}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <Pressable testID={`profissional-${item.id}`} onPress={() => escolher(item)}>
              <Card>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: t.colors.healthSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="medkit-outline" size={22} color={t.colors.health} />
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    <Text variant="label" style={{ fontWeight: "700" }}>
                      {item.name}
                    </Text>
                    <Text variant="caption" muted>
                      {lang === "pt" ? item.kindPt : item.kind}
                      {/* O registro ao lado do tipo: em consulta a distancia,
                          saber quem atende faz parte do atendimento. */}
                      {item.registry
                        ? ` · ${item.registryKind ?? ""} ${item.registry}`.replace("  ", " ")
                        : ""}
                    </Text>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                      {item.price != null && (
                        <Etiqueta t={t} icone="pricetag-outline">
                          {item.currency === "GBP" ? "£" : ""}
                          {item.price}
                        </Etiqueta>
                      )}
                      {item.videoOnly && (
                        <Etiqueta t={t} icone="videocam-outline">
                          {tr(lang, { en: "Video", pt: "Vídeo" })}
                        </Etiqueta>
                      )}
                      {item.languages.length > 0 && (
                        <Etiqueta t={t} icone="language-outline">
                          {item.languages.map((l) => l.toUpperCase()).join(" · ")}
                        </Etiqueta>
                      )}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function Etiqueta({
  t,
  icone,
  children,
}: {
  t: ReturnType<typeof useTheme>;
  icone: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: t.colors.surfaceMuted,
      }}
    >
      <Ionicons name={icone} size={12} color={t.colors.textMuted} />
      <Text variant="caption" muted style={{ fontSize: 11 }}>
        {children}
      </Text>
    </View>
  );
}
