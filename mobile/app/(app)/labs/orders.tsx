import { View, FlatList, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Pill } from "@/components/ui";
import { fetchLabOrders, LabOrder } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";

const STATUS_PILL: Record<string, "warn" | "work" | "ok" | "bad" | "muted"> = {
  pending: "warn",
  confirmed: "work",
  processing: "work",
  results_ready: "ok",
  completed: "ok",
  cancelled: "bad",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function LabOrders() {
  const t = useTheme();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-orders"],
    queryFn: fetchLabOrders,
  });

  return (
    <Screen testID="lab-orders">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "My Orders",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 16, flex: 1 }}>
        <View>
          <Text variant="title">My Orders</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
            Track your lab test orders
          </Text>
        </View>

        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="alert-circle" size={20} color={t.colors.bad} />
              <Text color={t.colors.bad}>Failed to load orders.</Text>
            </View>
          </Card>
        ) : (data ?? []).length === 0 ? (
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
            <Ionicons name="clipboard-outline" size={48} color={t.colors.textMuted} />
            <Text variant="subtitle" color={t.colors.textSecondary}>No orders yet</Text>
            <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center" }}>
              Your lab test orders will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: LabOrder }) => (
              <Pressable onPress={() => router.push(`/(app)/labs/order/${item.id}`)}>
                <Card>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text variant="label" style={{ fontWeight: "600" }}>
                        #{item.orderNumber}
                      </Text>
                      <Pill
                        label={item.status.replace(/_/g, " ")}
                        variant={STATUS_PILL[item.status] ?? "muted"}
                      />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text variant="caption" color={t.colors.textMuted}>
                        {formatDate(item.createdAt)}
                      </Text>
                      <Text variant="subtitle" color={t.colors.text} style={{ fontWeight: "700" }}>
                        £{item.total.toFixed(2)}
                      </Text>
                    </View>
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
