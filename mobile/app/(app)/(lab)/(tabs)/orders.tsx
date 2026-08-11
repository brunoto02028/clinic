import { View, FlatList, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Spinner } from "@/components/ui";
import { fetchLabOrders, LabOrder } from "@/api/labs";

const INK = "#20242D";
const INK_60 = "#6B6F78";
const INK_40 = "#A5A8AE";
const INK_80 = "#3A3E48";
const BONE = "#F5F4F1";
const SAGE = "#65807B";
const SAGE_DARK = "#4F6864";
const SAGE_FOG = "#E4EDE7";
const WARN = "#B8823A";
const WARN_BG = "#F5EFDD";
const HAIR = "rgba(32,36,45,0.08)";
const CARD_BORDER = "rgba(32,36,45,0.05)";

type PillVariant = "ok" | "sage" | "warn" | "ghost";

const STATUS_PILL: Record<string, { variant: PillVariant; label: string }> = {
  BASKET: { variant: "ghost", label: "Draft" },
  CONFIRMED: { variant: "ok", label: "Confirmed" },
  KIT_DISPATCHED: { variant: "sage", label: "Kit dispatched" },
  SAMPLE_RECEIVED: { variant: "sage", label: "Sample received" },
  PROCESSING_LAB: { variant: "sage", label: "Processing" },
  RESULTS_READY: { variant: "warn", label: "Results ready" },
  CANCELLED_LAB: { variant: "ghost", label: "Cancelled" },
};

const PILL_STYLES: Record<PillVariant, { bg: string; color: string }> = {
  ok: { bg: SAGE_FOG, color: SAGE_DARK },
  sage: { bg: SAGE, color: "#FFFFFF" },
  warn: { bg: WARN_BG, color: WARN },
  ghost: { bg: "#DDE0E4", color: INK_80 },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LabOrders() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-orders"],
    queryFn: fetchLabOrders,
  });

  return (
    <Screen testID="lab-orders" style={{ backgroundColor: BONE }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "My Orders",
          headerStyle: { backgroundColor: BONE },
          headerTintColor: INK,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: "Sora_600SemiBold",
            fontSize: 14,
          },
        }}
      />

      <View style={{ flex: 1, gap: 10 }}>
        {isLoading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Spinner />
          </View>
        ) : isError ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#A24738" />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: "#A24738",
              }}
            >
              Failed to load orders.
            </Text>
          </View>
        ) : (data ?? []).length === 0 ? (
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
            <Ionicons name="clipboard-outline" size={48} color={INK_40} />
            <Text
              style={{
                fontFamily: "Sora_600SemiBold",
                fontSize: 14,
                color: INK_60,
              }}
            >
              No orders yet
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_400Regular",
                color: INK_40,
                textAlign: "center",
              }}
            >
              Your lab test orders will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: LabOrder }) => {
              const pill =
                STATUS_PILL[item.status] ?? STATUS_PILL.BASKET;
              const pillStyle = PILL_STYLES[pill.variant];
              const testName =
                item.items?.[0]?.productName || "Lab order";

              return (
                <Pressable
                  onPress={() =>
                    router.push(`/(app)/(lab)/order/${item.id}`)
                  }
                >
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      gap: 10,
                    }}
                  >
                    {/* Top row: order number + status pill */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Sora_600SemiBold",
                          fontSize: 11.5,
                          color: INK,
                        }}
                      >
                        #{item.orderNumber}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 4,
                          borderRadius: 20,
                          backgroundColor: pillStyle.bg,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Sora_700Bold",
                            fontSize: 9.5,
                            color: pillStyle.color,
                          }}
                        >
                          {pill.label}
                        </Text>
                      </View>
                    </View>

                    {/* Test name */}
                    <Text
                      style={{
                        fontFamily: "Sora_600SemiBold",
                        fontSize: 12,
                        color: INK,
                      }}
                      numberOfLines={1}
                    >
                      {testName}
                    </Text>

                    {/* Bottom row: date + total */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontFamily: "Inter_400Regular",
                          color: INK_40,
                        }}
                      >
                        {formatDate(item.createdAt)}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Sora_600SemiBold",
                          fontSize: 11.5,
                          color: INK,
                        }}
                      >
                        {"£"}{item.total.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}
