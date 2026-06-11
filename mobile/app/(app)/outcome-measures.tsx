import { useState, useEffect } from "react";
import { View, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchOutcomeMeasures, saveOutcomeMeasures } from "@/api/outcome-measures";
import { useTheme } from "@/theme/useTheme";

export default function OutcomeMeasuresScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["outcome-measures"], queryFn: fetchOutcomeMeasures });

  const [vasScore, setVasScore] = useState(0);
  const [overallFunction, setOverallFunction] = useState(50);

  useEffect(() => {
    if (data) {
      setVasScore(data.vasScore ?? 0);
      setOverallFunction(data.overallFunction ?? 50);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => saveOutcomeMeasures({
      vasScore, overallFunction,
      faamAdl: {}, faamSport: {},
      faamAdlPercent: null, faamSportPercent: null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outcome-measures"] });
      Alert.alert("Salvo!", "Suas medidas foram registradas.");
    },
    onError: (e) => Alert.alert("Erro", (e as Error).message),
  });

  if (isLoading) return <Screen><Spinner center /></Screen>;

  return (
    <Screen scroll testID="outcome-measures-screen">
      <Stack.Screen options={{ headerShown: true, title: "Outcome Measures", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>
        <View>
          <Text variant="title">Outcome Measures</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>Avalie sua dor e funcionalidade</Text>
        </View>

        {/* VAS Score */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="pulse-outline" size={18} color="#ef4444" />
            <Text variant="label" style={{ fontWeight: "600" }}>Escala de Dor (VAS)</Text>
          </View>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginBottom: 8 }}>
            0 = Sem dor, 10 = Pior dor imaginável
          </Text>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Text variant="title" color={vasScore > 6 ? "#ef4444" : vasScore > 3 ? "#f59e0b" : "#34d399"} style={{ fontSize: 36 }}>
              {vasScore}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="caption" color={t.colors.textMuted}>0</Text>
            <View style={{ flex: 1 }}>
              <View style={{ height: 36, justifyContent: "center" }}>
                <View style={{ height: 6, backgroundColor: "rgba(74,124,138,0.15)", borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ height: 6, width: `${vasScore * 10}%`, backgroundColor: vasScore > 6 ? "#ef4444" : vasScore > 3 ? "#f59e0b" : "#34d399", borderRadius: 3 }} />
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                  <View
                    key={v}
                    onTouchEnd={() => setVasScore(v)}
                    style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: v === vasScore ? "rgba(93,201,192,0.2)" : "transparent" }}
                  >
                    <Text variant="caption" color={v === vasScore ? "#5dc9c0" : t.colors.textMuted} style={{ fontSize: 10 }}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text variant="caption" color={t.colors.textMuted}>10</Text>
          </View>
        </Card>

        {/* Overall function */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="accessibility-outline" size={18} color="#5dc9c0" />
            <Text variant="label" style={{ fontWeight: "600" }}>Funcionalidade geral</Text>
          </View>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginBottom: 8 }}>
            0% = Incapacidade total, 100% = Função normal completa
          </Text>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Text variant="title" color="#5dc9c0" style={{ fontSize: 36 }}>{overallFunction}%</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="caption" color={t.colors.textMuted}>0%</Text>
            <View style={{ flex: 1, height: 6, backgroundColor: "rgba(74,124,138,0.15)", borderRadius: 3, overflow: "hidden" }}>
              <View style={{ height: 6, width: `${overallFunction}%`, backgroundColor: "#5dc9c0", borderRadius: 3 }} />
            </View>
            <Text variant="caption" color={t.colors.textMuted}>100%</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            {[0, 25, 50, 75, 100].map(v => (
              <View
                key={v}
                onTouchEnd={() => setOverallFunction(v)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: overallFunction === v ? "rgba(93,201,192,0.2)" : "rgba(74,124,138,0.06)" }}
              >
                <Text variant="caption" color={overallFunction === v ? "#5dc9c0" : t.colors.textMuted}>{v}%</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button title="Salvar medidas" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </View>
    </Screen>
  );
}
