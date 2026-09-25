import { useState } from "react";
import { View, Alert } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Input, Button } from "@/components/ui";
import { createLabOrder } from "@/api/labs";
import { ApiError } from "@/api/client";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * Endereço e pagamento (081). Só um método de coleta existe: o kit vai pelo
 * correio, então endereço e CEP são obrigatórios.
 *
 * O pagamento pelo Stripe entra na T-6; até lá o detalhe do exame não chega
 * aqui (a compra fica fechada pelo servidor), e esta tela cria só o pedido.
 */
export default function LabCheckout() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string; name: string; price: string }>();
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", postcode: "" });
  const price = parseFloat(params.price || "0");
  const total = `£${price.toFixed(2)}`;

  const mutation = useMutation({
    mutationFn: () =>
      createLabOrder({
        items: [{ productId: params.id, quantity: 1 }],
        shippingAddress: [address.line1, address.line2, address.city].filter(Boolean).join(", "),
        shippingPostcode: address.postcode,
      }),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["lab-orders"] });
      router.replace({ pathname: "/(app)/(lab)/order/[id]" as any, params: { id: order.id } });
    },
    onError: (e) => {
      const err = e as ApiError;
      Alert.alert(
        tr(lang, { en: "Could not place the order", pt: "Não foi possível fazer o pedido" }),
        err.code === "ordering_unavailable"
          ? tr(lang, { en: "Ordering is not open yet.", pt: "A compra ainda não está aberta." })
          : err.code === "shipping_required"
          ? tr(lang, { en: "The kit goes by post: address and postcode are required.", pt: "O kit vai pelo correio: endereço e CEP são obrigatórios." })
          : err.message
      );
    },
  });

  const addressValid = !!(address.line1.trim() && address.city.trim() && address.postcode.trim());

  return (
    <Screen scroll testID="lab-checkout-screen">
      <Stack.Screen options={{
        headerShown: true, title: tr(lang, { en: "Checkout", pt: "Finalizar" }),
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.text, headerShadowVisible: false,
      }} />
      <View style={{ gap: 16 }}>
        <Card>
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 4 }}>{tr(lang, { en: "Order summary", pt: "Resumo do pedido" })}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text variant="body">{params.name}</Text>
            <Text variant="body" style={{ fontFamily: "Sora_700Bold" }}>{total}</Text>
          </View>
          <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 4 }}>
            {tr(lang, { en: "Home kit, by post. Finger-prick sample.", pt: "Kit de casa, pelo correio. Amostra por picada no dedo." })}
          </Text>
        </Card>

        <Card>
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>{tr(lang, { en: "Delivery address", pt: "Endereço de entrega" })}</Text>
          <View style={{ gap: 4 }}>
            <Input label={tr(lang, { en: "Address line 1", pt: "Endereço" })} value={address.line1} onChangeText={(v) => setAddress((a) => ({ ...a, line1: v }))} />
            <Input label={tr(lang, { en: "Address line 2 (optional)", pt: "Complemento (opcional)" })} value={address.line2} onChangeText={(v) => setAddress((a) => ({ ...a, line2: v }))} />
            <Input label={tr(lang, { en: "City", pt: "Cidade" })} value={address.city} onChangeText={(v) => setAddress((a) => ({ ...a, city: v }))} />
            <Input label={tr(lang, { en: "Postcode", pt: "CEP" })} value={address.postcode} onChangeText={(v) => setAddress((a) => ({ ...a, postcode: v }))} autoCapitalize="characters" testID="lab-postcode" />
          </View>
          {!addressValid && (
            <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 6 }}>
              {tr(lang, { en: "Address, city and postcode are required — the kit goes by post.", pt: "Endereço, cidade e CEP são obrigatórios — o kit vai pelo correio." })}
            </Text>
          )}
        </Card>

        <Button
          title={mutation.isPending ? tr(lang, { en: "Placing order…", pt: "Fazendo o pedido…" }) : tr(lang, { en: `Continue to payment · ${total}`, pt: `Continuar para o pagamento · ${total}` })}
          variant="primary" size="lg" testID="lab-pay"
          onPress={() => mutation.mutate()}
          disabled={!addressValid || mutation.isPending} loading={mutation.isPending}
        />
      </View>
    </Screen>
  );
}
