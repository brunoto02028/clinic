import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { fetchBPReadings, createBPReading } from "@/api/health";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";

function getBPStatus(sys: number, dia: number): { label: string; color: string } {
  if (sys < 120 && dia < 80) return { label: "Normal", color: "#34d399" };
  if (sys < 130 && dia < 80) return { label: "Elevada", color: "#fbbf24" };
  if (sys < 140 || dia < 90) return { label: "Hipertensão G1", color: "#f59e0b" };
  return { label: "Hipertensão G2", color: "#f87171" };
}

export default function BloodPressure() {
  const t = useTheme();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["bp"],
    queryFn: fetchBPReadings,
  });

  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const s = parseInt(sys, 10);
      const d = parseInt(dia, 10);
      if (!s || !d) throw new Error("Informe sistólica e diastólica.");
      return createBPReading({ systolic: s, diastolic: d });
    },
    onSuccess: () => {
      setSys(""); setDia(""); setError(null);
      qc.invalidateQueries({ queryKey: ["bp"] });
    },
    onError: (e) => setError((e as Error).message || "Falha ao registrar."),
  });

  return (
    <Screen testID="bp-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Pressão arterial",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      {/* New reading form */}
      <Card variant="elevated" style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Ionicons name="add-circle-outline" size={20} color={t.colors.secondary} />
          <Text variant="label" style={{ fontWeight: "600" }}>Nova leitura</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input label="Sistólica" value={sys} onChangeText={setSys} keyboardType="number-pad" placeholder="120" testID="bp-sys" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Diastólica" value={dia} onChangeText={setDia} keyboardType="number-pad" placeholder="80" testID="bp-dia" />
          </View>
        </View>
        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="alert-circle" size={14} color={t.colors.danger} />
            <Text variant="caption" color={t.colors.danger}>{error}</Text>
          </View>
        ) : null}
        <Button title="Registrar" onPress={() => mutation.mutate()} loading={mutation.isPending} testID="bp-save" />
      </Card>

      <Text variant="subtitle" style={{ marginBottom: 12 }}>Histórico</Text>
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>Não foi possível carregar.</Text>
          </View>
        </Card>
      ) : (data ?? []).length === 0 ? (
        <View style={{ alignItems: "center", gap: 12, paddingTop: 32 }}>
          <Ionicons name="pulse-outline" size={48} color={t.colors.textMuted} />
          <Text muted testID="bp-empty">Nenhuma leitura registrada.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const status = getBPStatus(item.systolic, item.diastolic);
            return (
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                    <Text variant="subtitle" style={{ fontSize: 22 }}>
                      {item.systolic}/{item.diastolic}
                    </Text>
                    <Text variant="caption" color={t.colors.textMuted}>mmHg</Text>
                  </View>
                  <View style={{
                    backgroundColor: `${status.color}18`,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                    <Text variant="caption" color={status.color} style={{ fontWeight: "600", fontSize: 11 }}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                <Text variant="caption" color={t.colors.textMuted}>{formatDateTime(item.measuredAt)}</Text>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
