import { useState } from "react";
import { View, Alert } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Input, Button } from "@/components/ui";
import { createLabOrder } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";

export default function LabCheckout() {
  const t = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string; name: string; price: string; method: string }>();
  const needsAddress = params.method === "POSTAL" || params.method === "HOME_VISIT_PHLEBOTOMIST";
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", postcode: "" });
  const price = parseFloat(params.price || "0");
  const total = `£${price.toFixed(2)}`;

  const mutation = useMutation({
    mutationFn: () =>
      createLabOrder({
        items: [{ productId: params.id, quantity: 1 }],
        // Sent for forward compat — see note in src/api/labs.ts: the create
        // order endpoint does not persist shipping fields yet.
        shippingAddress: needsAddress
          ? [address.line1, address.line2, address.city].filter(Boolean).join(", ")
          : undefined,
        shippingPostcode: needsAddress ? address.postcode : undefined,
      }),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["lab-orders"] });
      router.replace({ pathname: "/(app)/(lab)/order/[id]" as any, params: { id: order.id } });
    },
    onError: (e) => Alert.alert("Error", (e as Error).message || "Could not place order."),
  });

  const addressValid = !needsAddress || (address.line1 && address.city && address.postcode);

  return (
    <Screen scroll testID="lab-checkout-screen">
      <Stack.Screen options={{
        headerShown: true, title: "Checkout",
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.text, headerShadowVisible: false,
      }} />
      <View style={{ gap: 16 }}>
        <Card>
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 4 }}>Order summary</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text variant="body">{params.name}</Text>
            <Text variant="body" style={{ fontFamily: "Sora_700Bold" }}>{total}</Text>
          </View>
          <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 4 }}>
            Collection: {params.method === "BRAND_LOCATION" ? "At the clinic" :
              params.method === "POSTAL" ? "Home kit (postal)" : "Phlebotomist at home"}
          </Text>
        </Card>

        {needsAddress && (
          <Card>
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>
              {params.method === "POSTAL" ? "Delivery address" : "Visit address"}
            </Text>
            <View style={{ gap: 4 }}>
              <Input label="Address line 1" value={address.line1}
                onChangeText={(v) => setAddress((a) => ({ ...a, line1: v }))} />
              <Input label="Address line 2 (optional)" value={address.line2}
                onChangeText={(v) => setAddress((a) => ({ ...a, line2: v }))} />
              <Input label="City" value={address.city}
                onChangeText={(v) => setAddress((a) => ({ ...a, city: v }))} />
              <Input label="Postcode" value={address.postcode}
                onChangeText={(v) => setAddress((a) => ({ ...a, postcode: v }))} autoCapitalize="characters" />
            </View>
          </Card>
        )}

        <Button title={mutation.isPending ? "Placing order..." : `Pay ${total}`}
          variant="primary" size="lg"
          onPress={() => mutation.mutate()}
          disabled={!addressValid || mutation.isPending} loading={mutation.isPending}
        />
      </View>
    </Screen>
  );
}
