import { View, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Spinner } from "@/components/ui";
import { fetchLabOrder } from "@/api/labs";

const INK = "#20242D";
const INK_60 = "#6B6F78";
const INK_40 = "#A5A8AE";
const INK_80 = "#3A3E48";
const BONE = "#F5F4F1";
const SAGE = "#65807B";
const SAGE_DARK = "#4F6864";
const SAGE_FOG = "#E4EDE7";
const HAIR = "rgba(32,36,45,0.08)";
const CARD_BORDER = "rgba(32,36,45,0.05)";

const TIMELINE_STEPS = [
  { status: "CONFIRMED", label: "Order confirmed", sub: "Payment received" },
  {
    status: "KIT_DISPATCHED",
    label: "Kit dispatched",
    sub: "Collection arranged",
  },
  {
    status: "SAMPLE_RECEIVED",
    label: "Sample received",
    sub: "Arrived at the lab",
  },
  { status: "PROCESSING_LAB", label: "Processing", sub: "Analysis in progress" },
  {
    status: "RESULTS_READY",
    label: "Results ready",
    sub: "View your results",
  },
];

const STATUS_ORDER = [
  "BASKET",
  "CONFIRMED",
  "KIT_DISPATCHED",
  "SAMPLE_RECEIVED",
  "PROCESSING_LAB",
  "RESULTS_READY",
];

function stepState(
  orderStatus: string,
  stepStatus: string
): "done" | "active" | "pending" {
  const orderIdx = STATUS_ORDER.indexOf(orderStatus);
  const stepIdx = STATUS_ORDER.indexOf(stepStatus);
  if (orderIdx < 0) return "pending";
  if (stepIdx < orderIdx) return "done";
  if (stepIdx === orderIdx) return "active";
  return "pending";
}

function statusLabel(status: string, isCancelled: boolean): string {
  if (isCancelled) return "Cancelled";
  const labels: Record<string, string> = {
    BASKET: "Draft",
    CONFIRMED: "Confirmed",
    KIT_DISPATCHED: "Kit dispatched",
    SAMPLE_RECEIVED: "Sample received",
    PROCESSING_LAB: "Processing",
    RESULTS_READY: "Results ready",
  };
  return labels[status] || status.replace(/_/g, " ");
}

export default function LabOrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => fetchLabOrder(id),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  if (isLoading)
    return (
      <Screen style={{ backgroundColor: BONE }}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Spinner />
        </View>
      </Screen>
    );
  if (isError || !data)
    return (
      <Screen style={{ backgroundColor: BONE }}>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            color: INK_60,
          }}
        >
          Order not found.
        </Text>
      </Screen>
    );

  const isReady = data.status === "RESULTS_READY";
  const isCancelled = data.status === "CANCELLED_LAB";
  const testName = data.items?.[0]?.productName || "Lab order";

  return (
    <Screen
      scroll
      testID="lab-order-tracking-screen"
      style={{ backgroundColor: BONE }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: `#${data.orderNumber}`,
          headerStyle: { backgroundColor: BONE },
          headerTintColor: INK,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: "Sora_600SemiBold",
            fontSize: 14,
          },
        }}
      />

      <View style={{ gap: 14 }}>
        {/* Header card */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 14,
            paddingVertical: 20,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 10,
              color: INK_60,
            }}
          >
            {testName}
          </Text>
          <Text
            style={{
              fontFamily: "Sora_700Bold",
              fontSize: 14,
              color: INK,
              marginTop: 4,
            }}
          >
            {statusLabel(data.status, isCancelled)}
          </Text>
        </View>

        {/* Cancelled notice */}
        {isCancelled ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: CARD_BORDER,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#A24738",
                lineHeight: 18,
              }}
            >
              This order was cancelled. Contact the clinic if you believe this is
              a mistake.
            </Text>
          </View>
        ) : (
          /* Timeline card */
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 14,
              paddingVertical: 18,
              paddingHorizontal: 20,
              borderWidth: 1,
              borderColor: CARD_BORDER,
            }}
          >
            <View style={{ paddingLeft: 22 }}>
              {TIMELINE_STEPS.map((step, idx) => {
                const state = stepState(data.status, step.status);
                const dotColor = state === "pending" ? "#DDE0E4" : SAGE;
                const lineColor = state === "done" ? SAGE : "#DDE0E4";
                const isLast = idx === TIMELINE_STEPS.length - 1;

                return (
                  <View
                    key={step.status}
                    style={{
                      position: "relative",
                      paddingBottom: isLast ? 0 : 24,
                    }}
                  >
                    {/* Dot */}
                    <View
                      style={{
                        position: "absolute",
                        left: -22,
                        top: 2,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: dotColor,
                        ...(state === "active"
                          ? {
                              shadowColor: SAGE_FOG,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.8,
                              shadowRadius: 6,
                              elevation: 3,
                            }
                          : {}),
                      }}
                    />

                    {/* Connecting line */}
                    {!isLast && (
                      <View
                        style={{
                          position: "absolute",
                          left: -17,
                          top: 14,
                          width: 2,
                          height: "100%" as any,
                          backgroundColor: lineColor,
                        }}
                      />
                    )}

                    {/* Step text */}
                    <Text
                      style={{
                        fontFamily: "Sora_600SemiBold",
                        fontSize: 11.5,
                        color:
                          state === "pending" ? INK_40 : INK,
                      }}
                    >
                      {step.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 9.5,
                        color: INK_60,
                        marginTop: 1,
                      }}
                    >
                      {step.sub}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* View result button */}
        {isReady && (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(app)/(lab)/result/[id]" as any,
                params: { id: data.id },
              })
            }
            style={{
              backgroundColor: SAGE,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Sora_600SemiBold",
                fontSize: 14,
                color: BONE,
              }}
            >
              View result
            </Text>
          </Pressable>
        )}

        {/* Questions card */}
        <View
          style={{
            backgroundColor: SAGE_FOG,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: INK,
            }}
          >
            Questions about the test?
          </Text>
          <View
            style={{
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 20,
              backgroundColor: SAGE,
            }}
          >
            <Text
              style={{
                fontFamily: "Sora_700Bold",
                fontSize: 9.5,
                color: "#FFFFFF",
              }}
            >
              Talk to clinic
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
