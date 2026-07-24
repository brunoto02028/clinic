import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { fetchLabProduct } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";

export default function LabProductDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-product", id],
    queryFn: () => fetchLabProduct(id),
    enabled: !!id,
  });

  return (
    <Screen scroll testID="lab-product-detail">
      <Stack.Screen
        options={{
          headerShown: true,
          title: data?.name ?? "Test Details",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError || !data ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.bad} />
            <Text color={t.colors.bad}>Failed to load test details.</Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Hero */}
          <View style={{ gap: 8 }}>
            <Text variant="title">{data.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  backgroundColor: t.colors.workSoft,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                }}
              >
                <Text variant="caption" color={t.colors.work} style={{ fontSize: 11 }}>
                  {data.category}
                </Text>
              </View>
            </View>
            <Text variant="title" color={t.colors.work} style={{ fontWeight: "700", fontSize: 28 }}>
              £{data.price.toFixed(2)}
            </Text>
            <Text variant="caption" color={t.colors.textMuted}>{data.currency}</Text>
          </View>

          {/* Description */}
          {data.description ? (
            <Card>
              <Text variant="label" style={{ fontWeight: "600", marginBottom: 6 }}>Description</Text>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>
                {data.description}
              </Text>
            </Card>
          ) : null}

          {/* Biomarkers */}
          {data.biomarkers && data.biomarkers.length > 0 ? (
            <Card>
              <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>
                Biomarkers ({data.biomarkers.length})
              </Text>
              <View style={{ gap: 8 }}>
                {data.biomarkers.map((marker: string, idx: number) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={18} color={t.colors.ok} />
                    <Text variant="body" color={t.colors.text}>{marker}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Info */}
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>Test Information</Text>
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: t.colors.workSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="flask-outline" size={20} color={t.colors.work} />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>Sample Type</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{data.sampleType}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: t.colors.border }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: t.colors.warnSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="time-outline" size={20} color={t.colors.warn} />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>Turnaround Time</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{data.turnaroundDays} days</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Add to Basket */}
          <Button
            title="Add to Basket"
            variant="work"
            onPress={() => {}}
          />
        </View>
      )}
    </Screen>
  );
}
