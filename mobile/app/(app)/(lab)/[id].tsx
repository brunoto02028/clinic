import { View, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Spinner } from "@/components/ui";
import { fetchLabProduct } from "@/api/labs";

const INK = "#20242D";
const INK_60 = "#6B6F78";
const INK_80 = "#3A3E48";
const INK_40 = "#A5A8AE";
const BONE = "#F5F4F1";
const SAGE = "#65807B";
const SAGE_DARK = "#4F6864";
const SAGE_FOG = "#E4EDE7";
const HAIR = "rgba(32,36,45,0.08)";
const CARD_BORDER = "rgba(32,36,45,0.05)";

export default function LabTestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-product", id],
    queryFn: () => fetchLabProduct(id),
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
          Test not found.
        </Text>
      </Screen>
    );

  const price = `£${data.price.toFixed(2)}`;
  const turnaround = data.turnaroundDays || 2;

  const STEPS = [
    "Choose how to collect: at home, at BPR, or with a phlebotomist",
    "Your sample is sent to the laboratory for analysis",
    "Your result appears in the app with your physiotherapist's commentary",
  ];

  return (
    <Screen scroll testID="lab-detail-screen" style={{ backgroundColor: BONE }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: data.name,
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
        {/* Hero card (sage-fog) */}
        <View
          style={{
            backgroundColor: SAGE_FOG,
            borderRadius: 14,
            padding: 14,
            paddingVertical: 24,
            alignItems: "center",
            borderWidth: 1,
            borderColor: CARD_BORDER,
          }}
        >
          <Ionicons name="flask" size={40} color={SAGE_DARK} />
          <Text
            style={{
              fontFamily: "Sora_700Bold",
              fontSize: 15,
              color: INK,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {data.name}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 11,
              color: INK_80,
              marginTop: 4,
            }}
          >
            {price} {"·"} results in {turnaround}-{turnaround + 1} working
            days
          </Text>
        </View>

        {/* Description card */}
        {data.description ? (
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
              About this test
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: INK_60,
                lineHeight: 20,
              }}
            >
              {data.description}
            </Text>
          </View>
        ) : null}

        {/* What is measured card */}
        {data.biomarkers && data.biomarkers.length > 0 ? (
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
              What is measured ({data.biomarkers.length})
            </Text>
            {data.biomarkers.map((marker: string, idx: number) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 8,
                  borderBottomWidth:
                    idx < data.biomarkers.length - 1 ? 1 : 0,
                  borderBottomColor: HAIR,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    backgroundColor: SAGE_FOG,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={SAGE_DARK}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Sora_600SemiBold",
                      fontSize: 11,
                      color: INK,
                    }}
                  >
                    {marker}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "JetBrainsMono_400Regular",
                      fontSize: 9,
                      color: INK_60,
                      marginTop: 1,
                    }}
                  >
                    Reference range
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* How it works card */}
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
              marginBottom: 10,
            }}
          >
            How it works
          </Text>
          {STEPS.map((step, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                gap: 10,
                marginBottom: idx < STEPS.length - 1 ? 12 : 0,
                alignItems: "flex-start",
              }}
            >
              {/* Ghost pill number */}
              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 20,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#DDE0E4",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Sora_700Bold",
                    fontSize: 9.5,
                    color: INK_80,
                  }}
                >
                  {idx + 1}
                </Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: INK_60,
                  paddingTop: 2,
                  lineHeight: 18,
                }}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA button (sage) */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(app)/(lab)/collection-method" as any,
              params: {
                id: data.id,
                name: data.name,
                price: data.price.toFixed(2),
              },
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
            Continue {"·"} {price}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
