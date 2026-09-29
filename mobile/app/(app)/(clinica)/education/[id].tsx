import { useState } from "react";
import { View, Pressable, Linking, Image } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { fetchEducation, educationList } from "@/api/education";
import { ArtigoEmBlocos } from "@/components/ArtigoEmBlocos";
import { continuarLendo, TEXTO_CONTINUAR } from "@/lib/continuar-lendo";
import { cortarEmPalavra } from "@/lib/cortar-em-palavra";
import { updateEducationProgress } from "@/api/education-progress";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

export default function EducationDetail() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["education"],
    queryFn: fetchEducation,
  });

  const item = data ? educationList(data).find((c) => c.id === id) : undefined;
  const progress = data?.progress?.[id];
  const isCompleted = progress?.status === "completed";

  const completeMutation = useMutation({
    mutationFn: () => updateEducationProgress({
      contentId: id,
      status: "completed",
      rating: rating || undefined,
      feedback: feedback || undefined,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["education"] }),
  });

  return (
    <Screen scroll testID="education-detail">
      <Stack.Screen
        options={{ headerShown: true, title: tr(lang, { en: "Article", pt: "Conteúdo" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError || !item ? (
        <Card><Text color={t.colors.danger}>{tr(lang, { en: "We could not load this.", pt: "Não foi possível carregar." })}</Text></Card>
      ) : (
        <View style={{ gap: 16 }}>
          {/* A capa do artigo. Ela sempre veio na resposta e nenhuma tela a
              mostrava — o Bruno abriu o material e nao viu imagem nenhuma. */}
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={{ width: "100%", height: 180, borderRadius: t.radius.lg, backgroundColor: t.colors.surfaceMuted }}
              resizeMode="cover"
            />
          ) : null}

          <View>
            <Text variant="title">{item.title}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {item.category?.name && (
                <View style={{ backgroundColor: t.colors.surfaceMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text variant="caption" color={t.colors.secondary} style={{ fontSize: 11 }}>{item.category.name}</Text>
                </View>
              )}
              <View style={{ backgroundColor: t.colors.surfaceMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text variant="caption" color={t.colors.accent} style={{ fontSize: 11 }}>{item.contentType}</Text>
              </View>
              {isCompleted && (
                <View style={{ backgroundColor: t.colors.okSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={12} color={t.colors.ok} />
                  <Text variant="caption" color={t.colors.ok} style={{ fontSize: 11 }}>{tr(lang, { en: "Completed", pt: "Concluído" })}</Text>
                </View>
              )}
            </View>
          </View>

          {item.description && (
            <Card>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>{item.description}</Text>
            </Card>
          )}

          {/* O corpo, desenhado com a tipografia da casa.
              Sem `Card`: um artigo longo dentro de uma caixa cinza fica com
              cara de aviso, e o que se quer aqui e leitura. */}
          {item.blocks?.length ? (
            <ArtigoEmBlocos blocos={item.blocks} />
          ) : (item.body || item.content) ? (
            <Text variant="body" style={{ lineHeight: 25, fontSize: 15.5 }}>
              {item.body || item.content}
            </Text>
          ) : null}

          {item.videoUrl && (
            <Pressable onPress={() => Linking.openURL(item.videoUrl!)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: t.colors.badSoft, borderRadius: 14, borderWidth: 1, borderColor: t.colors.badSoft }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.badSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="play" size={24} color={t.colors.bad} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontWeight: "600" }}>
                  {tr(lang, { en: "Watch video", pt: "Assistir vídeo" })}
                </Text>
                <Text variant="caption" color={t.colors.textMuted}>
                  {tr(lang, { en: "Opens in your browser", pt: "Abrir no navegador" })}
                </Text>
              </View>
            </Pressable>
          )}

          {/* Rating & complete */}
          {!isCompleted && (
            <Card>
              <Text variant="label" style={{ fontWeight: "600", marginBottom: 8 }}>{tr(lang, { en: "Rate this article", pt: "Avaliar conteúdo" })}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={28}
                      color={star <= rating ? t.colors.warn : t.colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
              {/* Mesma cor medida do "Mark as done" do exercício (095 T-4):
                  concluir é a mesma ação, e vinha na mesma greige que sumia no
                  fundo — 1,53:1 no claro. */}
              <Button
                variant="health"
                title={tr(lang, { en: "Mark as completed", pt: "Marcar como concluído" })}
                onPress={() => completeMutation.mutate()}
                loading={completeMutation.isPending}
                icon={<Ionicons name="checkmark-circle-outline" size={20} color={t.colors.accentFg} />}
              />
            </Card>
          )}

          {/* Para onde ir depois de ler (107 T-2).

              O Bruno: *"ao final de cada artigo, dá pra colocar atalhos para
              outros, algo assim?"* O artigo acabava nas referências e
              terminava — quem gostou de ler não recebia nada, nem o próximo
              nem o caminho de volta.

              Os candidatos já estão na mão: esta tela carrega a lista inteira
              com a mesma chave de consulta da lista, então não há chamada nova
              nenhuma. */}
          {(() => {
            const todos = data ? educationList(data) : [];
            const { itens, motivo } = continuarLendo(todos, id, item?.category?.id);

            return (
              <View style={{ gap: 10, marginTop: 4 }}>
                {/* Seção vazia é pior que seção ausente: promete e não entrega.
                    Mas o **caminho de volta** não depende disso — e dependia,
                    até o QA apontar (29/09/2026). Quem é o único material da
                    clínica ficava sem saída nenhuma no fim do artigo, que é
                    exatamente o que esta tarefa foi corrigir. */}
                {itens.length > 0 ? (
                  <View style={{ gap: 10 }} testID="continuar-lendo">
                    <Text variant="label" style={{ fontWeight: "700" }}>
                      {tr(lang, TEXTO_CONTINUAR[motivo])}
                    </Text>

                    {itens.map((outro) => (
                      <Pressable
                        key={outro.id}
                        testID={`continuar-${outro.id}`}
                        // `push`, e não `replace`: quem encadeia leitura espera
                        // que o voltar desfaça a leitura, e não pule para a lista.
                        onPress={() => router.push(`/education/${outro.id}`)}
                      >
                        <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            {/* Reduzido de propósito: aqui a capa é pista, não
                                convite — o convite já foi aceito quando a pessoa
                                abriu este artigo. */}
                            {outro.thumbnailUrl ? (
                              <Image
                                source={{ uri: outro.thumbnailUrl }}
                                style={{ width: 86, height: 64, backgroundColor: t.colors.surfaceMuted }}
                                resizeMode="cover"
                              />
                            ) : null}
                            <View style={{ flex: 1, padding: 11, gap: 2 }}>
                              <Text variant="label" numberOfLines={2} style={{ fontWeight: "600", fontSize: 14, lineHeight: 18 }}>
                                {outro.title}
                              </Text>
                              {outro.description ? (
                                <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
                                  {cortarEmPalavra(outro.description, 70)}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        </Card>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {/* O caminho de volta só existia pela seta do cabeçalho — e
                    agora existe mesmo quando não há nada a sugerir. */}
                <Pressable
                  testID="ver-todos-materiais"
                  onPress={() => router.replace("/education")}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 12,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text variant="label" color={t.colors.textMuted} style={{ fontWeight: "600" }}>
                    {tr(lang, TEXTO_CONTINUAR.voltar)}
                  </Text>
                  <Ionicons name="arrow-forward" size={15} color={t.colors.textMuted} />
                </Pressable>
              </View>
            );
          })()}
        </View>
      )}
    </Screen>
  );
}
