import { useState } from "react";
import { View, Alert, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text } from "@/components/ui";
import { createLabOrder } from "@/api/labs";

const INK = "#20242D";
const INK_60 = "#6B6F78";
const INK_40 = "#A5A8AE";
const INK_80 = "#3A3E48";
const INK_20 = "#DDE0E4";
const BONE = "#F5F4F1";
const HAIR = "rgba(32,36,45,0.08)";
const CARD_BORDER = "rgba(32,36,45,0.05)";

const METHOD_LABELS: Record<string, string> = {
  BRAND_LOCATION: "At the clinic",
  POSTAL: "Home kit (postal)",
  HOME_VISIT_PHLEBOTOMIST: "Phlebotomist at home",
};

export default function LabCheckout() {
  const qc = useQueryClient();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    price: string;
    method: string;
  }>();
  const needsAddress =
    params.method === "POSTAL" || params.method === "HOME_VISIT_PHLEBOTOMIST";
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    postcode: "",
  });
  const price = parseFloat(params.price || "0");
  const total = `£${price.toFixed(2)}`;

  const mutation = useMutation({
    mutationFn: () =>
      createLabOrder({
        items: [{ productId: params.id, quantity: 1 }],
        shippingAddress: needsAddress
          ? [address.line1, address.line2, address.city]
              .filter(Boolean)
              .join(", ")
          : undefined,
        shippingPostcode: needsAddress ? address.postcode : undefined,
      }),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["lab-orders"] });
      router.replace({
        pathname: "/(app)/(lab)/order/[id]" as any,
        params: { id: order.id },
      });
    },
    onError: (e) =>
      Alert.alert("Error", (e as Error).message || "Could not place order."),
  });

  const addressValid =
    !needsAddress || (address.line1 && address.city && address.postcode);

  return (
    <Screen
      scroll
      testID="lab-checkout-screen"
      style={{ backgroundColor: BONE }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Checkout",
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
        {/* Order summary card */}
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
            Order summary
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: HAIR,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: INK,
                flex: 1,
              }}
            >
              {params.name}
            </Text>
            <Text
              style={{
                fontFamily: "Sora_600SemiBold",
                fontSize: 11.5,
                color: INK,
              }}
            >
              {total}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 10,
              color: INK_60,
              marginTop: 8,
            }}
          >
            Collection: {METHOD_LABELS[params.method || ""] || params.method}
          </Text>
        </View>

        {/* Address form */}
        {needsAddress && (
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
                marginBottom: 12,
              }}
            >
              {params.method === "POSTAL"
                ? "Delivery address"
                : "Visit address"}
            </Text>

            <View style={{ gap: 10 }}>
              {[
                {
                  label: "Address line 1",
                  key: "line1" as const,
                  required: true,
                },
                {
                  label: "Address line 2 (optional)",
                  key: "line2" as const,
                  required: false,
                },
                { label: "City", key: "city" as const, required: true },
                {
                  label: "Postcode",
                  key: "postcode" as const,
                  required: true,
                  caps: true,
                },
              ].map((field) => (
                <View key={field.key}>
                  <Text
                    style={{
                      fontFamily: "Sora_600SemiBold",
                      fontSize: 9.5,
                      color: INK_60,
                      marginBottom: 4,
                    }}
                  >
                    {field.label}
                  </Text>
                  <TextInput
                    value={address[field.key]}
                    onChangeText={(v) =>
                      setAddress((a) => ({ ...a, [field.key]: v }))
                    }
                    autoCapitalize={
                      field.caps ? "characters" : "sentences"
                    }
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: HAIR,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: INK,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CTA button (primary / ink bg) */}
        <Pressable
          onPress={() => mutation.mutate()}
          disabled={!addressValid || mutation.isPending}
          style={{
            backgroundColor:
              !addressValid || mutation.isPending
                ? INK_40
                : INK,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            opacity: !addressValid || mutation.isPending ? 0.7 : 1,
          }}
        >
          {mutation.isPending ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ActivityIndicator size="small" color={BONE} />
              <Text
                style={{
                  fontFamily: "Sora_600SemiBold",
                  fontSize: 14,
                  color: BONE,
                }}
              >
                Placing order...
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontFamily: "Sora_600SemiBold",
                fontSize: 14,
                color: BONE,
              }}
            >
              Confirm and pay {"·"} {total}
            </Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}
