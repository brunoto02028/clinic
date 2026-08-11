import { useState } from "react";
import { View, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

const SAGE = "#65807B";
const SAGE_FOG = "#E4EDE7";
const SAGE_DARK = "#4F6864";

// NOTE: the backend has no CollectionMethod concept yet (see Task 17 —
// LabProduct/LabOrder still predate the LML collection-method design).
// This screen captures the choice for the checkout flow/UX only; it is
// carried forward as a display string, not persisted server-side.
type Method = "BRAND_LOCATION" | "POSTAL" | "HOME_VISIT_PHLEBOTOMIST";

const METHODS: { key: Method; icon: string; title: string; desc: string }[] = [
  { key: "BRAND_LOCATION", icon: "business-outline", title: "Collect at the clinic", desc: "Use your next session. No extra travel cost." },
  { key: "POSTAL", icon: "mail-outline", title: "Home kit", desc: "Arrives by post in 1-2 days. Self-collect and return prepaid." },
  { key: "HOME_VISIT_PHLEBOTOMIST", icon: "person-outline", title: "Phlebotomist at home", desc: "A professional visits you. Availability and fee confirmed by the clinic." },
];

export default function CollectionMethod() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id: string; name: string; price: string }>();
  const [selected, setSelected] = useState<Method>("BRAND_LOCATION");

  const price = `£${parseFloat(params.price || "0").toFixed(2)}`;

  return (
    <Screen scroll testID="collection-method-screen">
      <Stack.Screen options={{
        headerShown: true, title: "How to collect?",
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.text, headerShadowVisible: false,
      }} />
      <View style={{ gap: 12 }}>
        {METHODS.map((m) => {
          const active = selected === m.key;
          return (
            <Pressable key={m.key} onPress={() => setSelected(m.key)} style={{
              flexDirection: "row", alignItems: "flex-start", gap: 12,
              borderWidth: 1.5, borderColor: active ? SAGE : t.colors.border,
              backgroundColor: active ? SAGE_FOG : "#FFFFFF", borderRadius: 14, padding: 14,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10, backgroundColor: "#FFFFFF",
                borderWidth: 1, borderColor: t.colors.border,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name={m.icon as any} size={18} color={SAGE_DARK} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontFamily: "Sora_600SemiBold", fontSize: 13 }}>{m.title}</Text>
                <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2, lineHeight: 16 }}>{m.desc}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color={SAGE} />}
            </Pressable>
          );
        })}
        <View style={{ marginTop: 20 }}>
          <Button title={`Continue · ${price}`} variant="primary" size="lg"
            onPress={() => router.push({
              pathname: "/(app)/(lab)/checkout" as any,
              params: { id: params.id, name: params.name, price: params.price, method: selected },
            })}
            style={{ backgroundColor: "#20242D" }}
          />
        </View>
      </View>
    </Screen>
  );
}
