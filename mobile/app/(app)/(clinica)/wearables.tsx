import { View, Pressable, Linking, Alert } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchConnections, disconnectProvider, syncProvider, OW_PROVIDERS } from "@/api/wearables";
import { API_URL } from "@/api/config";

export default function Wearables() {
  const t = useTheme();
  const qc = useQueryClient();
  const { data: connections, isLoading } = useQuery({
    queryKey: ["wearable-connections"],
    queryFn: fetchConnections,
  });

  const disconnectMut = useMutation({
    mutationFn: disconnectProvider,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wearable-connections"] }),
    onError: (e) => Alert.alert("Erro", (e as Error).message),
  });

  const syncMut = useMutation({
    mutationFn: syncProvider,
    onSuccess: () => Alert.alert("Sincronização", "Sincronização iniciada. Os dados serão atualizados em breve."),
    onError: (e) => Alert.alert("Erro", (e as Error).message),
  });

  const connectedProviders = new Set((connections || []).map((c) => c.provider.toLowerCase()));

  const handleConnect = (providerKey: string) => {
    Linking.openURL(`${API_URL}/api/wearables/connect/${providerKey}`);
  };

  return (
    <Screen scroll testID="wearables-screen">
      <Stack.Screen options={{ headerShown: true, title: "Dispositivos", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>
        <Text variant="title">Dispositivos</Text>
        <Text variant="caption" color={t.colors.textSecondary}>
          Conecte seu wearable para sincronizar dados de sono, atividade e recuperação automaticamente.
        </Text>

        {isLoading ? (
          <Spinner center />
        ) : (
          <View style={{ gap: 12 }}>
            {OW_PROVIDERS.map((p) => {
              const isConnected = connectedProviders.has(p.key);
              const conn = (connections || []).find((c) => c.provider.toLowerCase() === p.key);

              return (
                <View
                  key={p.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    backgroundColor: isConnected ? t.colors.okSoft : t.colors.surfaceMuted,
                    borderRadius: t.radius.lg,
                    borderWidth: 1,
                    borderColor: isConnected ? t.colors.ok : t.colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontSize: 28 }}>{p.icon}</Text>
                    <View>
                      <Text variant="label" style={{ fontWeight: "600" }}>
                        {p.name}
                      </Text>
                      {isConnected && conn?.lastSyncedAt && (
                        <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                          Último sync: {new Date(conn.lastSyncedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>

                  {isConnected ? (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => syncMut.mutate(p.key)}
                        disabled={syncMut.isPending}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: t.colors.health,
                          opacity: syncMut.isPending ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                          {syncMut.isPending ? "..." : "Sync"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert("Desconectar", `Desconectar ${p.name}?`, [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Desconectar",
                              style: "destructive",
                              onPress: () => disconnectMut.mutate(p.key),
                            },
                          ])
                        }
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: t.colors.bad,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: t.colors.bad }}>Remover</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleConnect(p.key)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: t.colors.primary,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>Conectar</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}
