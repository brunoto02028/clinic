import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { fetchBPReadings, createBPReading } from "@/api/health";
import { formatDateTime } from "@/lib/format";

export default function BloodPressure() {
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
      <Stack.Screen options={{ headerShown: true, title: "Pressão arterial" }} />
      <Card style={{ marginBottom: 16 }}>
        <Text variant="label">Nova leitura</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input label="Sistólica" value={sys} onChangeText={setSys} keyboardType="number-pad" placeholder="120" testID="bp-sys" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Diastólica" value={dia} onChangeText={setDia} keyboardType="number-pad" placeholder="80" testID="bp-dia" />
          </View>
        </View>
        {error ? <Text variant="caption" color="#dc2626">{error}</Text> : null}
        <Button title="Registrar" onPress={() => mutation.mutate()} loading={mutation.isPending} testID="bp-save" />
      </Card>

      <Text variant="subtitle" style={{ marginBottom: 8 }}>Histórico</Text>
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color="#dc2626">Não foi possível carregar o histórico.</Text>
      ) : (data ?? []).length === 0 ? (
        <Text muted testID="bp-empty">Nenhuma leitura registrada.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Card>
              <Text variant="subtitle">{item.systolic}/{item.diastolic} mmHg</Text>
              <Text variant="caption" muted>{formatDateTime(item.measuredAt)}</Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
