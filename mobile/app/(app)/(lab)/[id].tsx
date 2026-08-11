import { View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchLabProduct } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";

const SAGE = "#65807B";
const SAGE_FOG = "#E4EDE7";
const SAGE_DARK = "#4F6864";

export default function LabTestDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-product", id],
    queryFn: () => fetchLabProduct(id),
    enabled: !!id,
  });

  if (isLoading) return <Screen><Spinner center /></Screen>;
  if (isError || !data) return <Screen><Text>Test not found.</Text></Screen>;

  const price = `£${data.price.toFixed(2)}`;

  return (
    <Screen scroll testID="lab-detail-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: data.name,
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 14 }}>
        <Card style={{ backgroundColor: SAGE_FOG, alignItems: "center", paddingVertical: 22 }}>
          <Ionicons name="flask" size={40} color={SAGE_DARK} />
          <Text variant="subtitle" style={{ fontFamily: "Sora_700Bold", fontSize: 17, marginTop: 10 }}>
            {data.name}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>
            {price} · results in {data.turnaroundDays || 2}-{(data.turnaroundDays || 2) + 1} working days
          </Text>
        </Card>

        {data.description ? (
          <Card>
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 6 }}>
              About this test
            </Text>
            <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 20 }}>
              {data.description}
            </Text>
          </Card>
        ) : null}

        {data.biomarkers && data.biomarkers.length > 0 ? (
          <Card>
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>
              What is measured ({data.biomarkers.length})
            </Text>
            {data.biomarkers.map((marker: string, idx: number) => (
              <View key={idx} style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                paddingVertical: 8,
                borderBottomWidth: idx < data.biomarkers.length - 1 ? 1 : 0,
                borderBottomColor: t.colors.border,
              }}>
                <Ionicons name="checkmark-circle" size={16} color={SAGE} />
                <Text variant="body" style={{ fontFamily: "Sora_600SemiBold", fontSize: 12 }}>{marker}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>
            How it works
          </Text>
          {["Choose how to collect: at home, at BPR, or with a phlebotomist",
            "Your sample is sent to the laboratory for analysis",
            "Your result appears in the app with your physiotherapist's commentary",
          ].map((step, idx) => (
            <View key={idx} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.surfaceMuted,
                alignItems: "center", justifyContent: "center",
              }}>
                <Text variant="caption" style={{ fontFamily: "Sora_600SemiBold", fontSize: 10 }}>{idx + 1}</Text>
              </View>
              <Text variant="body" style={{ flex: 1, fontSize: 12, paddingTop: 3 }}>{step}</Text>
            </View>
          ))}
        </Card>

        <Button title={`Continue · ${price}`} variant="primary" size="lg"
          onPress={() => router.push({
            pathname: "/(app)/(lab)/collection-method" as any,
            params: { id: data.id, name: data.name, price: data.price.toFixed(2) },
          })}
          style={{ backgroundColor: SAGE }}
        />
      </View>
    </Screen>
  );
}
