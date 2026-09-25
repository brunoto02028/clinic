import { View, FlatList, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Pill } from "@/components/ui";
import { fetchLabOrders, type LabOrder, type LabStage } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { stageCopy } from "@/lib/lab-stage-copy";

/**
 * Os pedidos (081, T-3), cada um com a posição em que está. O que precisa de
 * você fica em âmbar; o resto fica quieto.
 */
const STAGE_PILL: Record<LabStage, "warn" | "work" | "ok" | "bad" | "muted"> = {
  basket: "muted",
  kit_preparing: "work",
  register_kit: "warn",
  collect_and_post: "warn",
  at_lab: "work",
  in_review: "work",
  released: "ok",
  cancelled: "bad",
};

export default function LabOrders() {
  const t = useTheme();
  const lang = useLang();
  const { data, isLoading, isError } = useQuery({ queryKey: ["lab-orders"], queryFn: fetchLabOrders });
  const reviewDays = data?.reviewDays ?? 2;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Screen testID="lab-orders">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "My orders", pt: "Meus pedidos" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 16, flex: 1 }}>
        <View>
          <Text variant="title">{tr(lang, { en: "My orders", pt: "Meus pedidos" })}</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
            {tr(lang, { en: "Where each test is, and whether it needs you.", pt: "Onde cada exame está, e se precisa de você." })}
          </Text>
        </View>

        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="alert-circle" size={20} color={t.colors.bad} />
              <Text color={t.colors.bad}>{tr(lang, { en: "We could not load your orders.", pt: "Não foi possível carregar os pedidos." })}</Text>
            </View>
          </Card>
        ) : (data?.orders ?? []).length === 0 ? (
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
            <Ionicons name="clipboard-outline" size={48} color={t.colors.textMuted} />
            <Text variant="subtitle" color={t.colors.textSecondary}>{tr(lang, { en: "No orders yet", pt: "Nenhum pedido ainda" })}</Text>
          </View>
        ) : (
          <FlatList
            data={data?.orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: LabOrder }) => {
              const copy = stageCopy(item.stage, lang, reviewDays);
              return (
                <Pressable onPress={() => router.push(`/(app)/(lab)/order/${item.id}`)} testID={`lab-order-${item.orderNumber}`}>
                  <Card>
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <Text variant="label" style={{ fontWeight: "600", flex: 1 }} numberOfLines={1}>
                          {item.items.map((i) => i.productName).join(", ")}
                        </Text>
                        <Pill label={copy.title} variant={STAGE_PILL[item.stage]} />
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text variant="caption" color={t.colors.textMuted}>#{item.orderNumber} · {formatDate(item.createdAt)}</Text>
                        <Text variant="caption" color={t.colors.text} style={{ fontWeight: "700" }}>£{item.total.toFixed(2)}</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}
