import { useMemo, useState } from "react";
import { View, FlatList, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Spinner, Chip } from "@/components/ui";
import { fetchLabCatalog, fetchLabOrders, type LabProduct } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { stageCopy } from "@/lib/lab-stage-copy";
import { usePullToRefresh } from "@/lib/pull-to-refresh";

/**
 * O catálogo (081, T-3): o que você quer saber? Nome, o que mede, prazo e o
 * preço de venda. Em cima, quando existe, o pedido que precisa de você —
 * registrar o kit é o ponto de falha do produto inteiro.
 */
/** Quantas categorias cabem em duas fileiras num telefone. */
const CATEGORIAS_VISIVEIS = 7;

export default function LabsHub() {
  const t = useTheme();
  const { controle } = usePullToRefresh();
  const lang = useLang();
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [todasCategorias, setTodasCategorias] = useState(false);

  const catalog = useQuery({ queryKey: ["lab-catalog"], queryFn: fetchLabCatalog });
  const orders = useQuery({ queryKey: ["lab-orders"], queryFn: fetchLabOrders });

  const products = catalog.data?.products ?? [];
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c))),
    [products]
  );

  const filtered = products.filter((p: LabProduct) => {
    const q = searchText.trim().toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.biomarkers.some((b) => b.toLowerCase().includes(q));
    const matchesCategory = category === "all" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  // O pedido parado esperando a pessoa. Um só, o mais recente — o resto está
  // na aba de pedidos.
  const pendente = (orders.data?.orders ?? []).find((o) => o.stage === "register_kit" || o.stage === "collect_and_post" || o.stage === "released");

  const dias = (n: number | null) =>
    n ? tr(lang, { en: `Results in ${n} working day${n === 1 ? "" : "s"}`, pt: `Resultado em ${n} dia${n === 1 ? " útil" : "s úteis"}` }) : "";

  /**
   * O cabeçalho rola **junto** com a lista.
   *
   * Ele era fixo, e o Bruno: *"fica congelado, aquelas palavras lá em cima, e
   * fica pouca opção de visualização das rolagens dos exames embaixo."* Com
   * título, subtítulo, busca e as categorias parados no topo, sobrava uma
   * janelinha de um exame e meio — num catálogo de vinte e dois.
   *
   * Como `ListHeaderComponent`, ele sai de cena ao rolar e a lista fica com a
   * tela inteira.
   */
  const cabecalho = (
    <View style={{ gap: 16 }}>
        <View>
          <Text variant="title">{tr(lang, { en: "Blood tests", pt: "Exames de sangue" })}</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
            {tr(lang, { en: "A kit at home or a collection point near you. The result comes straight to you.", pt: "Kit em casa ou um ponto de coleta perto de você. O resultado vem direto para você." })}
          </Text>
          {/* No menu ela também está, mas ninguém abre um menu para descobrir
              se pode comprar sem encaminhamento. A pergunta nasce aqui. */}
          <Pressable
            onPress={() => router.push("/(app)/(lab)/how-it-works")}
            accessibilityRole="button"
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}
            testID="lab-como-funciona"
          >
            <Ionicons name="help-circle-outline" size={15} color={t.colors.lab} />
            <Text variant="caption" color={t.colors.lab} style={{ fontWeight: "600" }}>
              {tr(lang, { en: "How it works", pt: "Como funciona" })}
            </Text>
          </Pressable>
        </View>

        {pendente && (
          <Pressable onPress={() => router.push(`/(app)/(lab)/order/${pendente.id}`)} testID="lab-pending-banner">
            <Card style={{ backgroundColor: pendente.stage === "released" ? t.colors.okSoft : t.colors.labWarmSoft, borderWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Ionicons
                  name={pendente.stage === "released" ? "checkmark-circle" : "alert-circle"}
                  size={22}
                  color={pendente.stage === "released" ? t.colors.ok : t.colors.labWarm}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ fontWeight: "600" }}>{stageCopy(pendente.stage, lang, orders.data?.reviewDays ?? 2).title}</Text>
                  <Text variant="caption" color={t.colors.textSecondary}>#{pendente.orderNumber} · {pendente.items[0]?.productName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
              </View>
            </Card>
          </Pressable>
        )}

        <Input
          placeholder={tr(lang, { en: "Search tests or biomarkers…", pt: "Buscar exame ou biomarcador…" })}
          value={searchText}
          onChangeText={setSearchText}
          icon={<Ionicons name="search-outline" size={18} color={t.colors.textMuted} />}
        />

        {/* Duas correções no mesmo lugar, e a segunda desfaz o excesso da
            primeira.

            Era um ScrollView horizontal e a última categoria ficava fatiada na
            borda — "Alle..." em vez de "Allergy", sem nada indicando que dava
            para arrastar. Quebrei em linha, e com **doze** categorias isso
            virou quatro fileiras comendo a tela: sobrava um exame e meio
            visível (aparelho do Bruno, 26/09/2026, duas horas depois).

            Nada escondido na borda **e** nada engolindo a lista: mostra o que
            cabe em duas linhas e o resto entra num toque. */}
        {categories.length > 1 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label={tr(lang, { en: "All", pt: "Todos" })} selected={category === "all"} onPress={() => setCategory("all")} accentColor={t.colors.lab} />
            {(todasCategorias ? categories : categories.slice(0, CATEGORIAS_VISIVEIS)).map((cat) => (
              <Chip key={cat} label={cat} selected={category === cat} onPress={() => setCategory(cat)} accentColor={t.colors.lab} />
            ))}
            {categories.length > CATEGORIAS_VISIVEIS && (
              <Chip
                label={
                  todasCategorias
                    ? tr(lang, { en: "Less", pt: "Menos" })
                    : `+${categories.length - CATEGORIAS_VISIVEIS}`
                }
                onPress={() => setTodasCategorias((v) => !v)}
                accentColor={t.colors.lab}
              />
            )}
          </View>
        )}
    </View>
  );

  return (
    <Screen testID="labs-hub">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Blood tests", pt: "Exames de sangue" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ flex: 1 }}>
        {/* Carregando, erro e vazio não têm lista, então o cabeçalho vem
            solto nesses três — ele é o que diz onde a pessoa está. */}
        {catalog.isLoading || catalog.isError || filtered.length === 0 ? cabecalho : null}

        {catalog.isLoading ? (
          <Spinner center />
        ) : catalog.isError ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="alert-circle" size={20} color={t.colors.bad} />
              <Text color={t.colors.bad}>{tr(lang, { en: "We could not load the tests.", pt: "Não foi possível carregar os exames." })}</Text>
            </View>
          </Card>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
            <Ionicons name="flask-outline" size={48} color={t.colors.textMuted} />
            <Text variant="subtitle" color={t.colors.textSecondary}>
              {products.length === 0
                ? tr(lang, { en: "No tests available yet", pt: "Nenhum exame disponível ainda" })
                : tr(lang, { en: "No tests match", pt: "Nenhum exame encontrado" })}
            </Text>
          </View>
        ) : (
          <FlatList
            ListHeaderComponent={cabecalho}
            refreshControl={controle}
            data={filtered}
            keyExtractor={(item) => item.id}
            // A lista fica com a tela inteira ao rolar: o cabeçalho ficava
            // fixo e sobrava uma janelinha para os exames.
            contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
            // O vão entre o cabeçalho e o primeiro exame; o `gap` do
            // `contentContainerStyle` não alcança o `ListHeaderComponent`.
            ListHeaderComponentStyle={{ marginBottom: 16 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/(app)/(lab)/${item.id}`)} testID={`lab-product-${item.code}`}>
                <Card>
                  <View style={{ gap: 8 }}>
                    <Text variant="label" style={{ fontWeight: "600" }}>{item.name}</Text>
                    <Text variant="caption" color={t.colors.textSecondary} numberOfLines={2}>
                      {lang === "pt" ? item.description.pt || item.description.en : item.description.en}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {item.category ? (
                        <View style={{ backgroundColor: t.colors.labSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                          <Text variant="caption" color={t.colors.lab} style={{ fontSize: 11 }}>{item.category}</Text>
                        </View>
                      ) : null}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="time-outline" size={13} color={t.colors.textMuted} />
                        <Text variant="caption" color={t.colors.textMuted}>{dias(item.turnaroundDays)}</Text>
                      </View>
                    </View>
                    <Text variant="subtitle" color={t.colors.lab} style={{ fontWeight: "700" }}>£{item.price.toFixed(2)}</Text>
                  </View>
                </Card>
              </Pressable>
            )}
          />
        )}
      </View>
    </Screen>
  );
}
