import { View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner, Pill } from "@/components/ui";
import { fetchLabOrder } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";

const SAGE = "#65807B";
const SAGE_FOG = "#E4EDE7";

const TIMELINE_STEPS = [
  { status: "CONFIRMED", label: "Order confirmed" },
  { status: "KIT_DISPATCHED", label: "Kit dispatched / collection arranged" },
  { status: "SAMPLE_RECEIVED", label: "Sample received at lab" },
  { status: "PROCESSING_LAB", label: "Processing" },
  { status: "RESULTS_READY", label: "Results ready" },
];

const STATUS_ORDER = ["BASKET", "CONFIRMED", "KIT_DISPATCHED", "SAMPLE_RECEIVED", "PROCESSING_LAB", "RESULTS_READY"];

function stepState(orderStatus: string, stepStatus: string): "done" | "active" | "pending" {
  const orderIdx = STATUS_ORDER.indexOf(orderStatus);
  const stepIdx = STATUS_ORDER.indexOf(stepStatus);
  if (orderIdx < 0) return "pending";
  if (stepIdx < orderIdx) return "done";
  if (stepIdx === orderIdx) return "active";
  return "pending";
}

export default function LabOrderTracking() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => fetchLabOrder(id),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  if (isLoading) return <Screen><Spinner center /></Screen>;
  if (isError || !data) return <Screen><Text>Order not found.</Text></Screen>;

  const isReady = data.status === "RESULTS_READY";
  const isCancelled = data.status === "CANCELLED_LAB";
  const testName = data.items?.[0]?.productName || "Lab order";

  return (
    <Screen scroll testID="lab-order-tracking-screen">
      <Stack.Screen options={{
        headerShown: true, title: `#${data.orderNumber}`,
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.text, headerShadowVisible: false,
      }} />
      <View style={{ gap: 14 }}>
        <Card style={{ alignItems: "center", paddingVertical: 18 }}>
          <Text variant="caption" color={t.colors.textMuted}>{testName}</Text>
          <Text variant="subtitle" style={{ fontFamily: "Sora_700Bold", marginTop: 4 }}>
            {isCancelled ? "Cancelled" : data.status.replace(/_/g, " ")}
          </Text>
        </Card>

        {isCancelled ? (
          <Card style={{ backgroundColor: t.colors.badSoft }}>
            <Text variant="body" color={t.colors.bad} style={{ fontSize: 12 }}>
              This order was cancelled. Contact the clinic if you believe this is a mistake.
            </Text>
          </Card>
        ) : (
          <Card style={{ paddingVertical: 18, paddingHorizontal: 20 }}>
            <View style={{ paddingLeft: 22 }}>
              {TIMELINE_STEPS.map((step, idx) => {
                const state = stepState(data.status, step.status);
                const dotColor = state === "pending" ? "#DDE0E4" : SAGE;
                const lineColor = state === "done" ? SAGE : "#DDE0E4";
                const isLast = idx === TIMELINE_STEPS.length - 1;
                return (
                  <View key={step.status} style={{ position: "relative", paddingBottom: isLast ? 0 : 24 }}>
                    <View style={{
                      position: "absolute", left: -22, top: 2, width: 12, height: 12,
                      borderRadius: 6, backgroundColor: dotColor,
                      borderWidth: 2, borderColor: t.colors.background,
                      ...(state === "active" ? { shadowColor: SAGE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 4 } : {}),
                    }} />
                    {!isLast && (
                      <View style={{
                        position: "absolute", left: -17, top: 14, width: 2, height: "100%",
                        backgroundColor: lineColor,
                      }} />
                    )}
                    <Text variant="body" style={{
                      fontFamily: "Sora_600SemiBold", fontSize: 12,
                      color: state === "pending" ? t.colors.textMuted : t.colors.text,
                    }}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {isReady && (
          <Button title="View result" variant="primary" size="lg"
            onPress={() => router.push({ pathname: "/(app)/(lab)/result/[id]" as any, params: { id: data.id } })}
            style={{ backgroundColor: SAGE }}
          />
        )}

        <Card style={{ backgroundColor: SAGE_FOG }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="body" style={{ fontSize: 12 }}>Questions about the test?</Text>
            <Pill label="Talk to clinic" variant="ok" />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
