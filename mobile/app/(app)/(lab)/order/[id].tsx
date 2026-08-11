import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Pill, Button } from "@/components/ui";
import { fetchLabOrder, LabOrder, LabOrderEvent, LabOrderItem } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";

const STATUS_PILL: Record<string, "warn" | "work" | "ok" | "bad" | "muted"> = {
  pending: "warn",
  confirmed: "work",
  processing: "work",
  results_ready: "ok",
  completed: "ok",
  cancelled: "bad",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LabOrderDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => fetchLabOrder(id),
    enabled: !!id,
  });

  return (
    <Screen scroll testID="lab-order-detail">
      <Stack.Screen
        options={{
          headerShown: true,
          title: data ? `#${data.orderNumber}` : "Order Details",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError || !data ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.bad} />
            <Text color={t.colors.bad}>Failed to load order.</Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Header */}
          <View style={{ gap: 6 }}>
            <Text variant="title">Order #{data.orderNumber}</Text>
            <Pill
              label={data.status.replace(/_/g, " ")}
              variant={STATUS_PILL[data.status] ?? "muted"}
            />
          </View>

          {/* Timeline */}
          {data.events && data.events.length > 0 ? (
            <Card>
              <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>Timeline</Text>
              <View>
                {data.events.map((event: LabOrderEvent, idx: number) => {
                  const isLast = idx === data.events.length - 1;
                  return (
                    <View key={event.id} style={{ flexDirection: "row", gap: 12 }}>
                      {/* Dot + line */}
                      <View style={{ alignItems: "center", width: 20 }}>
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: idx === 0 ? t.colors.work : t.colors.textMuted,
                            marginTop: 4,
                          }}
                        />
                        {!isLast && (
                          <View
                            style={{
                              width: 2,
                              flex: 1,
                              backgroundColor: t.colors.border,
                              marginVertical: 2,
                            }}
                          />
                        )}
                      </View>
                      {/* Content */}
                      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                        <Text variant="label" style={{ fontWeight: "600" }}>
                          {eventLabel(event.type)}
                        </Text>
                        <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>
                          {formatDateTime(event.occurredAt)}
                        </Text>
                        {event.note ? (
                          <Text variant="body" color={t.colors.textSecondary} style={{ marginTop: 4, lineHeight: 20 }}>
                            {event.note}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}

          {/* Items */}
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>Items</Text>
            <View style={{ gap: 10 }}>
              {data.items.map((item: LabOrderItem, idx: number) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="body">{item.productName}</Text>
                    {item.quantity > 1 && (
                      <Text variant="caption" color={t.colors.textMuted}>
                        Qty: {item.quantity}
                      </Text>
                    )}
                  </View>
                  <Text variant="label" style={{ fontWeight: "600" }}>
                    £{item.price.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Totals */}
          <Card>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body" color={t.colors.textSecondary}>Subtotal</Text>
                <Text variant="body" color={t.colors.textSecondary}>£{data.subtotal.toFixed(2)}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: t.colors.border }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="label" style={{ fontWeight: "700" }}>Total</Text>
                <Text variant="label" style={{ fontWeight: "700" }}>£{data.total.toFixed(2)}</Text>
              </View>
            </View>
          </Card>

          {/* Results button */}
          {data.resultsUrl ? (
            <Button
              title="View Results"
              variant="primary"
              onPress={() => {}}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
