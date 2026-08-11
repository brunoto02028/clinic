import { View, Pressable, Linking, Alert } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Spinner } from "@/components/ui";
import { fetchLabOrder } from "@/api/labs";

const INK = "#20242D";
const INK_60 = "#6B6F78";
const INK_40 = "#A5A8AE";
const INK_80 = "#3A3E48";
const INK_20 = "#DDE0E4";
const BONE = "#F5F4F1";
const SAGE = "#65807B";
const SAGE_DARK = "#4F6864";
const SAGE_FOG = "#E4EDE7";
const WARN = "#B8823A";
const WARN_BG = "#F5EFDD";
const HAIR = "rgba(32,36,45,0.08)";
const CARD_BORDER = "rgba(32,36,45,0.05)";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// NOTE: there is no structured biomarker-result endpoint yet (LabTestRegistration
// / LabResult models are still pending). This screen renders from the LabOrder
// itself: items ordered, and the LML report link once available
// (resultsUrl/resultsPdf), plus any clinician note left on the RESULTS_READY
// event. Once the result models land, swap this for a dedicated
// fetchLabResult(id) call with the per-biomarker breakdown.
export default function LabResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => fetchLabOrder(id),
    enabled: !!id,
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
          Result not found.
        </Text>
      </Screen>
    );

  const reportUrl = data.resultsUrl || data.resultsPdf || null;
  const readyEvent = data.events?.find(
    (e) => e.status === "RESULTS_READY" && e.note
  );
  const testName = data.items?.[0]?.productName || "Lab Test";

  const openReport = async () => {
    if (!reportUrl) return;
    try {
      await Linking.openURL(reportUrl);
    } catch {
      Alert.alert("Error", "Could not open the report.");
    }
  };

  return (
    <Screen
      scroll
      testID="lab-result-screen"
      style={{ backgroundColor: BONE }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Result",
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
        {/* Header card: test name + status pill + dates */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: CARD_BORDER,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontFamily: "Sora_700Bold",
                fontSize: 13,
                color: INK,
                flex: 1,
              }}
            >
              {testName}
            </Text>
            {/* Warn pill for out-of-range (placeholder) */}
            {readyEvent?.note && (
              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 20,
                  backgroundColor: WARN_BG,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Sora_700Bold",
                    fontSize: 9.5,
                    color: WARN,
                  }}
                >
                  Review needed
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 10,
              color: INK_60,
              marginTop: 4,
            }}
          >
            Order #{data.orderNumber} {"·"} {formatDate(data.createdAt)}
          </Text>
        </View>

        {/* Biomarker / items card */}
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
              fontFamily: "Sora_600SemiBold",
              fontSize: 9.5,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: INK,
              opacity: 0.65,
              marginBottom: 8,
            }}
          >
            Tests in this order
          </Text>
          {data.items.map((item, idx) => (
            <View
              key={item.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth: idx < data.items.length - 1 ? 1 : 0,
                borderBottomColor: HAIR,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Sora_600SemiBold",
                    fontSize: 11,
                    color: INK,
                  }}
                >
                  {item.productName}
                </Text>
                <Text
                  style={{
                    fontFamily: "JetBrainsMono_400Regular",
                    fontSize: 9,
                    color: INK_60,
                    marginTop: 1,
                  }}
                >
                  Qty {item.quantity}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "JetBrainsMono_500Medium",
                  fontSize: 11.5,
                  color: SAGE_DARK,
                }}
              >
                {"£"}{item.total.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Clinical comment card */}
        {readyEvent?.note ? (
          <View
            style={{
              backgroundColor: WARN_BG,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: CARD_BORDER,
            }}
          >
            <Text
              style={{
                fontFamily: "Sora_600SemiBold",
                fontSize: 9.5,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: WARN,
                marginBottom: 6,
              }}
            >
              Clinical comment
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 11,
                color: INK,
                lineHeight: 16.5,
              }}
            >
              {readyEvent.note}
            </Text>
          </View>
        ) : null}

        {/* Discuss with physiotherapist button (sage) */}
        <Pressable
          onPress={() => {}}
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
            Discuss with physiotherapist
          </Text>
        </Pressable>

        {/* Download PDF button (ghost) */}
        {reportUrl ? (
          <Pressable
            onPress={openReport}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: INK_20,
            }}
          >
            <Text
              style={{
                fontFamily: "Sora_600SemiBold",
                fontSize: 14,
                color: INK,
              }}
            >
              Download PDF
            </Text>
          </Pressable>
        ) : (
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
                color: INK_40,
                textAlign: "center",
              }}
            >
              Your report is being prepared and will appear here once ready.
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
