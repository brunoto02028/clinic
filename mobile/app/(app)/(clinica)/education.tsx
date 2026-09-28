import { SectionList, Pressable, View } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchEducation, educationList } from "@/api/education";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { PlanGate } from "@/components/PlanGate";
import { usePullToRefresh } from "@/lib/pull-to-refresh";

const TYPE_ICONS: Record<string, { icon: string; colorKey: "work" | "bad" | "health" | "community" }> = {
  ARTICLE: { icon: "document-text-outline", colorKey: "work" },
  VIDEO: { icon: "videocam-outline", colorKey: "bad" },
  EXERCISE: { icon: "fitness-outline", colorKey: "health" },
  INFOGRAPHIC: { icon: "image-outline", colorKey: "community" },
};

function EducationScreen() {
  const lang = useLang();
  const t = useTheme();
  const { controle } = usePullToRefresh();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["education"],
    queryFn: fetchEducation,
  });

  /**
   * Duas seções, e a ordem não é estética (096 T-5).
   *
   * "Para você" é o que o terapeuta mandou — com a observação dele, o prazo e o
   * selo de obrigatório. "Da clínica" é a biblioteca aberta, para quem quiser
   * ler mais. Numa lista só, a leitura que alguém pediu some no meio de trinta
   * textos gerais.
   *
   * `educationList` continua existindo e continua sendo o que a tela de detalhe
   * usa para achar um item por id — lá o que importa é encontrar, não separar.
   */
  const atribuidos = data?.assignments ?? [];
  const idsAtribuidos = new Set(atribuidos.map((a) => a.content?.id).filter(Boolean));
  const biblioteca = (data?.published ?? []).filter((c) => !idsAtribuidos.has(c.id));
  const list = data ? educationList(data) : [];

  const secoes = [
    ...(atribuidos.length
      ? [{
          titulo: tr(lang, { en: "For you", pt: "Para você" }),
          dados: atribuidos.map((a) => ({ ...a.content, __atribuicao: a })),
        }]
      : []),
    ...(biblioteca.length
      ? [{
          titulo: tr(lang, { en: "From the clinic", pt: "Da clínica" }),
          dados: biblioteca.map((c) => ({ ...c, __atribuicao: null as any })),
        }]
      : []),
  ];

  return (
    <Screen testID="education-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Education", pt: "Educação" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>{tr(lang, { en: "We could not load this.", pt: "Não foi possível carregar." })}</Text>
          </View>
        </Card>
      ) : list.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Ionicons name="book-outline" size={48} color={t.colors.textMuted} />
          <Text muted testID="education-empty">{tr(lang, { en: "No content available.", pt: "Nenhum conteúdo disponível." })}</Text>
        </View>
      ) : (
        <SectionList
          refreshControl={controle}
          sections={secoes.map((s) => ({ title: s.titulo, data: s.dados }))}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) =>
            // Um cabeçalho só faz sentido quando há dois: com uma seção
            // sozinha, ele é enfeite sobre uma lista que já é óbvia.
            secoes.length > 1 ? (
              <Text
                variant="caption"
                color={t.colors.textSecondary}
                style={{ fontWeight: "700", textTransform: "uppercase", fontSize: 11, marginTop: 6 }}
              >
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const atribuicao = (item as any).__atribuicao;
            const typeInfo = TYPE_ICONS[item.contentType] ?? { icon: "document-outline", colorKey: "work" as const };
            const typeColor = t.colors[typeInfo.colorKey];
            const typeSoftKey = `${typeInfo.colorKey}Soft` as keyof typeof t.colors;
            const typeSoftColor = t.colors[typeSoftKey] ?? t.colors.surfaceMuted;
            return (
              <Pressable testID={`edu-${item.id}`} onPress={() => router.push(`/education/${item.id}`)}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: typeSoftColor,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name={typeInfo.icon as any} size={22} color={typeColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" style={{ fontWeight: "600" }}>{item.title}</Text>
                      {item.description ? (
                        <Text variant="caption" color={t.colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
                          {item.description}
                        </Text>
                      ) : null}
                      {/* O que o terapeuta escreveu **sobre este material,
                          para esta pessoa** (096 T-5). A rota sempre mandou;
                          o app não declarava o campo, e a observação nunca
                          chegou à tela. */}
                      {atribuicao?.note ? (
                        <Text
                          variant="caption"
                          color={t.colors.text}
                          numberOfLines={2}
                          style={{ marginTop: 4, fontStyle: "italic" }}
                        >
                          “{atribuicao.note}”
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {/* Obrigatório e prazo mudam o que a pessoa faz
                            primeiro — e é por isso que estão antes do selo de
                            concluído, não depois. */}
                        {atribuicao?.isRequired ? (
                          <View style={{ backgroundColor: t.colors.warnSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <Text variant="caption" color={t.colors.warn} style={{ fontSize: 10, fontWeight: "600" }}>
                              {tr(lang, { en: "Required", pt: "Obrigatório" })}
                            </Text>
                          </View>
                        ) : null}
                        {atribuicao?.dueDate ? (
                          <View style={{ backgroundColor: t.colors.surfaceMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 10 }}>
                              {tr(lang, { en: "by", pt: "até" })} {formatDate(atribuicao.dueDate, lang)}
                            </Text>
                          </View>
                        ) : null}
                        {/* The endpoint has always returned a progress map; the
                            client discarded it, so this badge never appeared and
                            finishing a piece changed nothing on screen. */}
                        {data?.progress?.[item.id]?.completedAt ? (
                          <View style={{
                            backgroundColor: t.colors.okSoft,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}>
                            <Text variant="caption" color={t.colors.ok} style={{ fontSize: 10, fontWeight: "600" }}>
                              {tr(lang, { en: "Done", pt: "Concluído" })}
                            </Text>
                          </View>
                        ) : null}
                        {item.category?.name ? (
                          <View style={{
                            backgroundColor: t.colors.healthSoft,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}>
                            <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 10 }}>
                              {item.category.name}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{
                          backgroundColor: typeSoftColor,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}>
                          <Text variant="caption" color={typeColor} style={{ fontSize: 10 }}>
                            {item.contentType}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

/**
 * Gated on `mod_education` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function Education() {
  return (
    <PlanGate module="mod_education">
      <EducationScreen />
    </PlanGate>
  );
}
