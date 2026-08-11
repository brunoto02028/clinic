import { useState } from "react";
import { View, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text } from "@/components/ui";

const INK = "#20242D";
const INK_60 = "#6B6F78";
const INK_80 = "#3A3E48";
const BONE = "#F5F4F1";
const SAGE = "#65807B";
const SAGE_DARK = "#4F6864";
const SAGE_FOG = "#E4EDE7";
const HAIR = "rgba(32,36,45,0.08)";
const CARD_BORDER = "rgba(32,36,45,0.05)";

type Method = "BRAND_LOCATION" | "POSTAL" | "HOME_VISIT_PHLEBOTOMIST";

const METHODS: {
  key: Method;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}[] = [
  {
    key: "BRAND_LOCATION",
    icon: "business-outline",
    title: "Collect at the clinic",
    desc: "Use your next session. No extra travel cost.",
  },
  {
    key: "POSTAL",
    icon: "mail-outline",
    title: "Home kit",
    desc: "Arrives by post in 1-2 days. Self-collect and return prepaid.",
  },
  {
    key: "HOME_VISIT_PHLEBOTOMIST",
    icon: "person-outline",
    title: "Phlebotomist at home",
    desc: "A professional visits you. Availability and fee confirmed by the clinic.",
  },
];

export default function CollectionMethod() {
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    price: string;
  }>();
  const [selected, setSelected] = useState<Method>("BRAND_LOCATION");

  const price = `£${parseFloat(params.price || "0").toFixed(2)}`;

  return (
    <Screen
      scroll
      testID="collection-method-screen"
      style={{ backgroundColor: BONE }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: "How to collect?",
          headerStyle: { backgroundColor: BONE },
          headerTintColor: INK,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: "Sora_600SemiBold",
            fontSize: 14,
          },
        }}
      />

      <View style={{ gap: 12 }}>
        {METHODS.map((m) => {
          const active = selected === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => setSelected(m.key)}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                borderWidth: 1.5,
                borderColor: active ? SAGE : HAIR,
                backgroundColor: active ? SAGE_FOG : "#FFFFFF",
                borderRadius: 14,
                padding: 12,
              }}
            >
              {/* Method icon */}
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: HAIR,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={m.icon} size={16} color={SAGE_DARK} />
              </View>

              {/* Method info */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Sora_600SemiBold",
                    fontSize: 11.5,
                    color: INK,
                  }}
                >
                  {m.title}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 9.5,
                    color: INK_60,
                    marginTop: 2,
                    lineHeight: 14,
                  }}
                >
                  {m.desc}
                </Text>
              </View>

              {/* Checkmark when selected */}
              {active && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={SAGE}
                  style={{ marginTop: 2 }}
                />
              )}
            </Pressable>
          );
        })}

        {/* CTA button (primary / ink bg) */}
        <View style={{ marginTop: 20 }}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(app)/(lab)/checkout" as any,
                params: {
                  id: params.id,
                  name: params.name,
                  price: params.price,
                  method: selected,
                },
              })
            }
            style={{
              backgroundColor: INK,
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
              Confirm and pay {"·"} {price}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
