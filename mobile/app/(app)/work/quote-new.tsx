import { useState } from "react";
import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Button, Input } from "@/components/ui";
import { createQuote, type QuoteItem } from "@/api/work";
import { useTheme } from "@/theme/useTheme";

const EMPTY_ITEM: QuoteItem = { description: "", quantity: 1, unitPrice: 0 };
const VAT_RATE = 0.2;

function fmt(n: number): string {
  return n.toFixed(2);
}

export default function QuoteNew() {
  const t = useTheme();
  const queryClient = useQueryClient();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([{ ...EMPTY_ITEM }]);
  const [actionType, setActionType] = useState<"draft" | "send">("draft");

  // -- derived totals
  const subtotal = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0,
  );
  const vatAmount = subtotal * VAT_RATE;
  const total = subtotal + vatAmount;

  // -- validation
  const isValid =
    clientName.trim().length > 0 &&
    clientEmail.trim().length > 0 &&
    items.some((it) => it.description.trim().length > 0);

  // -- mutation
  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof createQuote>[0]) => createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      router.back();
    },
  });

  function handleSubmit(type: "draft" | "send") {
    if (!isValid) return;
    setActionType(type);
    mutation.mutate({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientAddress: clientAddress.trim() || undefined,
      items: items.filter((it) => it.description.trim().length > 0),
      vatRate: VAT_RATE * 100,
    });
  }

  // -- item helpers
  function updateItem(index: number, field: keyof QuoteItem, raw: string) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        if (field === "description") return { ...it, description: raw };
        const parsed = parseFloat(raw) || 0;
        return { ...it, [field]: parsed };
      }),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Screen scroll testID="quote-new-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "New Quote",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={{ gap: 20, paddingBottom: 40 }}>
        {/* -- Client info -- */}
        <Card>
          <Text
            variant="label"
            style={{ fontFamily: "Sora_700Bold", marginBottom: 4 }}
          >
            Client Details
          </Text>
          <Input
            label="Name *"
            value={clientName}
            onChangeText={setClientName}
            placeholder="Client name"
          />
          <Input
            label="Email *"
            value={clientEmail}
            onChangeText={setClientEmail}
            placeholder="client@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Address"
            value={clientAddress}
            onChangeText={setClientAddress}
            placeholder="Address (optional)"
          />
        </Card>

        {/* -- Line items -- */}
        <View style={{ gap: 12 }}>
          <Text
            variant="label"
            style={{ fontFamily: "Sora_700Bold" }}
          >
            Items
          </Text>

          {items.map((item, idx) => (
            <Card key={idx}>
              <View style={{ gap: 4 }}>
                {items.length > 1 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text variant="caption" color={t.colors.textMuted}>
                      Item {idx + 1}
                    </Text>
                    <Pressable
                      onPress={() => removeItem(idx)}
                      hitSlop={8}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={t.colors.bad}
                      />
                    </Pressable>
                  </View>
                )}
                <Input
                  label="Description"
                  value={item.description}
                  onChangeText={(v) => updateItem(idx, "description", v)}
                  placeholder="What's the work?"
                />
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Qty"
                      value={item.quantity > 0 ? String(item.quantity) : ""}
                      onChangeText={(v) => updateItem(idx, "quantity", v)}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Unit Price (£)"
                      value={item.unitPrice > 0 ? String(item.unitPrice) : ""}
                      onChangeText={(v) => updateItem(idx, "unitPrice", v)}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: 4,
                  }}
                >
                  <Text variant="caption" color={t.colors.textSecondary}>
                    Line total: {"£"}{fmt(item.quantity * item.unitPrice)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}

          <Button
            title="Add item"
            variant="ghost"
            icon={
              <Ionicons
                name="add-outline"
                size={18}
                color={t.colors.text}
              />
            }
            onPress={addItem}
          />
        </View>

        {/* -- Totals -- */}
        <Card>
          <View style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text variant="body" color={t.colors.textSecondary}>
                Subtotal
              </Text>
              <Text variant="body">{"£"}{fmt(subtotal)}</Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text variant="body" color={t.colors.textSecondary}>
                VAT (20%)
              </Text>
              <Text variant="body">{"£"}{fmt(vatAmount)}</Text>
            </View>
            <View
              style={{
                height: 1,
                backgroundColor: t.colors.border,
                marginVertical: 2,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                variant="subtitle"
                style={{ fontFamily: "Sora_700Bold" }}
              >
                Total
              </Text>
              <Text
                variant="subtitle"
                style={{ fontFamily: "Sora_700Bold" }}
              >
                {"£"}{fmt(total)}
              </Text>
            </View>
          </View>
        </Card>

        {/* -- Actions -- */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Save Draft"
              variant="greige"
              onPress={() => handleSubmit("draft")}
              loading={mutation.isPending && actionType === "draft"}
              disabled={!isValid || mutation.isPending}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Send Quote"
              variant="work"
              onPress={() => handleSubmit("send")}
              loading={mutation.isPending && actionType === "send"}
              disabled={!isValid || mutation.isPending}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
