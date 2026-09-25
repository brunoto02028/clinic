import { useMemo, useState } from "react";
import { View, FlatList, Pressable, ScrollView } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Spinner, Chip } from "@/components/ui";
import { fetchLabCatalog, fetchLabOrders, type LabProduct } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { stageCopy } from "@/lib/lab-stage-copy";

const SAGE = "#65807B";

/**
 * O catálogo (081, T-3): o que você quer saber? Nome, o que mede, prazo e o
 * preço de venda. Em cima, quando existe, o pedido que precisa de você —
 * registrar o kit é o ponto de falha do produto inteiro.
 */
export default function LabsHub() {
  const t = useTheme();
  const lang = useLang();
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<string>("all");

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
      <View style={{ gap: 16, flex: 1 }}>
        <View>
          <Text variant="title">{tr(lang, { en: "Blood tests", pt: "Exames de sangue" })}</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
            {tr(lang, { en: "A finger-prick kit at home. Your therapist reviews the result before you see it.", pt: "Kit de picada no dedo, em casa. Seu terapeuta revisa o resultado antes de você ver." })}
          </Text>
        </View>

        {pendente && (
          <Pressable onPress={() => router.push(`/(app)/(lab)/order/${pendente.id}`)} testID="lab-pending-banner">
            <Card style={{ backgroundColor: pendente.stage === "released" ? t.colors.okSoft : "#F5EFDD", borderWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Ionicons
                  name={pendente.stage === "released" ? "checkmark-circle" : "alert-circle"}
                  size={22}
                  color={pendente.stage === "released" ? t.colors.ok : "#B8823A"}
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

        {categories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label={tr(lang, { en: "All", pt: "Todos" })} selected={category === "all"} onPress={() => setCategory("all")} accentColor={SAGE} />
            {categories.map((cat) => (
              <Chip key={cat} label={cat} selected={category === cat} onPress={() => setCategory(cat)} accentColor={SAGE} />
            ))}
          </ScrollView>
        )}

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
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
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
                        <View style={{ backgroundColor: "#E4EDE7", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                          <Text variant="caption" color={SAGE} style={{ fontSize: 11 }}>{item.category}</Text>
                        </View>
                      ) : null}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="time-outline" size={13} color={t.colors.textMuted} />
                        <Text variant="caption" color={t.colors.textMuted}>{dias(item.turnaroundDays)}</Text>
                      </View>
                    </View>
                    <Text variant="subtitle" color={SAGE} style={{ fontWeight: "700" }}>£{item.price.toFixed(2)}</Text>
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
