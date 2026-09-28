import { View, Pressable, Alert, FlatList } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchCareLinks, endCareLink, type VinculoDeCuidado } from "@/api/care-links";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { usePullToRefresh } from "@/lib/pull-to-refresh";

/**
 * Quem tem acesso aos meus dados (102 T-3).
 *
 * ## Por que esta tela existe
 *
 * A 102 abre uma porta entre inquilinos de proposito: um medico de outra area
 * alcanca este paciente porque ele escolheu e pagou. A decisao do que cada um
 * ve e da clinica que cuida dele — mas **nada disso pode ser invisivel para a
 * pessoa de quem sao os dados**.
 *
 * Entao aqui esta a lista, com data, e o botao que encerra.
 *
 * ## O que encerrar faz, e o que nao faz
 *
 * Corta dali para frente. **Nao apaga nada**: a consulta que houve e a receita
 * que foi escrita sao registro clinico, e sumir com elas seria sumir com a
 * prova de uma prescricao.
 */
export default function QuemTemAcesso() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  // A mesma convenção das outras listas do app: puxar para atualizar.
  const { controle } = usePullToRefresh();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["care-links"],
    queryFn: fetchCareLinks,
  });

  const encerrar = useMutation({
    mutationFn: endCareLink,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["care-links"] }),
    onError: () =>
      Alert.alert(
        tr(lang, { en: "Could not end it", pt: "Nao foi possivel encerrar" }),
        tr(lang, { en: "Try again in a moment.", pt: "Tente de novo daqui a pouco." })
      ),
  });

  const perguntar = (v: VinculoDeCuidado) =>
    Alert.alert(
      tr(lang, { en: "End this access?", pt: "Encerrar este acesso?" }),
      tr(lang, {
        en: `${v.professional.name} will no longer see your data. What already happened — appointments, documents — stays.`,
        pt: `${v.professional.name} deixa de ver seus dados. O que ja aconteceu — consultas, documentos — continua.`,
      }),
      [
        { text: tr(lang, { en: "Cancel", pt: "Cancelar" }), style: "cancel" },
        {
          text: tr(lang, { en: "End access", pt: "Encerrar" }),
          style: "destructive",
          onPress: () => encerrar.mutate(v.id),
        },
      ]
    );

  const data_ = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <Screen testID="quem-tem-acesso">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Who has access", pt: "Quem tem acesso" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <Text color={t.colors.danger}>
            {tr(lang, { en: "We could not load this.", pt: "Nao foi possivel carregar." })}
          </Text>
        </Card>
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <Text variant="body" color={t.colors.textSecondary}>
            {tr(lang, {
              en: "Nobody outside your clinic has access to your data.",
              pt: "Ninguem fora da sua clinica tem acesso aos seus dados.",
            })}
          </Text>
        </Card>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(v) => v.id}
          refreshControl={controle}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={
            <Text variant="caption" muted style={{ marginBottom: 12 }}>
              {tr(lang, {
                en: "These professionals can act on your care. Ending an access stops it from here on — what already happened stays.",
                pt: "Estes profissionais podem agir no seu cuidado. Encerrar corta dali para frente — o que ja aconteceu continua.",
              })}
            </Text>
          }
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: item.active ? t.colors.healthSoft : t.colors.surfaceMuted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={item.active ? "shield-checkmark-outline" : "shield-outline"}
                    size={20}
                    color={item.active ? t.colors.health : t.colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label" style={{ fontWeight: "700" }}>
                    {item.professional.name}
                  </Text>
                  <Text variant="caption" muted>
                    {lang === "pt" ? item.professional.kindPt : item.professional.kind}
                    {/* O registro profissional ao lado do nome: em consulta a
                        distancia, saber quem atende faz parte do atendimento. */}
                    {item.professional.registry
                      ? ` · ${item.professional.registryKind ?? ""} ${item.professional.registry}`.trimEnd()
                      : ""}
                  </Text>
                  <Text variant="caption" muted>
                    {item.active
                      ? tr(lang, { en: "Since", pt: "Desde" }) + " " + data_(item.acceptedAt)
                      : tr(lang, { en: "Ended", pt: "Encerrado" }) + " " + data_(item.endedAt!)}
                  </Text>
                </View>

                {item.active && (
                  <Pressable
                    testID={`encerrar-${item.id}`}
                    accessibilityRole="button"
                    disabled={encerrar.isPending}
                    onPress={() => perguntar(item)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      opacity: pressed || encerrar.isPending ? 0.6 : 1,
                    })}
                  >
                    <Text variant="caption" color={t.colors.danger} style={{ fontWeight: "600" }}>
                      {tr(lang, { en: "End", pt: "Encerrar" })}
                    </Text>
                  </Pressable>
                )}
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
