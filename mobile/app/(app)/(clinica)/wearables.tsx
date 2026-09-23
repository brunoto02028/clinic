import { View, Pressable, Linking, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchConnections, disconnectProvider, syncProvider, OW_PROVIDERS } from "@/api/wearables";
import { API_URL } from "@/api/config";
import { useLang, t as tr } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export default function Wearables() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const { data: connections, isLoading } = useQuery({
    queryKey: ["wearable-connections"],
    queryFn: fetchConnections,
  });

  const disconnectMut = useMutation({
    mutationFn: disconnectProvider,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wearable-connections"] }),
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message),
  });

  const syncMut = useMutation({
    mutationFn: syncProvider,
    onSuccess: () => Alert.alert(
      tr(lang, { en: "Sync", pt: "Sincronização" }),
      tr(lang, {
        en: "Sync started. Your data will be updated shortly.",
        pt: "Sincronização iniciada. Os dados serão atualizados em breve.",
      }),
    ),
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message),
  });

  const connectedProviders = new Set((connections || []).map((c) => c.provider.toLowerCase()));

  const handleConnect = (providerKey: string) => {
    Linking.openURL(`${API_URL}/api/wearables/connect/${providerKey}`);
  };

  return (
    <Screen scroll testID="wearables-screen">
      <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "Devices", pt: "Dispositivos" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>
        <Text variant="caption" color={t.colors.textSecondary}>
          {tr(lang, {
            en: "Connect your wearable to sync sleep, activity and recovery data automatically.",
            pt: "Conecte seu wearable para sincronizar dados de sono, atividade e recuperação automaticamente.",
          })}
        </Text>

        {/* `wearable-data` had no entry point anywhere in the app — it was the
            one screen the navigation pass missed, reachable only by typed URL.
            Shown once something is connected, since it has nothing to plot
            otherwise. */}
        {connectedProviders.size > 0 && (
          <Pressable
            onPress={() => router.push("/(app)/(clinica)/wearable-data")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: pressed ? t.colors.surfaceMuted : "transparent",
            })}
          >
            <Text variant="label">{tr(lang, { en: "View my data", pt: "Ver meus dados" })}</Text>
            <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
          </Pressable>
        )}

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
                          {tr(lang, { en: "Last sync", pt: "Último sync" })}: {formatDate(conn.lastSyncedAt, lang)}
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
                          {syncMut.isPending ? "..." : tr(lang, { en: "Sync", pt: "Sincronizar" })}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            tr(lang, { en: "Disconnect", pt: "Desconectar" }),
                            tr(lang, { en: `Disconnect ${p.name}?`, pt: `Desconectar ${p.name}?` }),
                            [
                              { text: tr(lang, { en: "Cancel", pt: "Cancelar" }), style: "cancel" },
                              {
                                text: tr(lang, { en: "Disconnect", pt: "Desconectar" }),
                                style: "destructive",
                                onPress: () => disconnectMut.mutate(p.key),
                              },
                            ],
                          )
                        }
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: t.colors.bad,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: t.colors.bad }}>{tr(lang, { en: "Remove", pt: "Remover" })}</Text>
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
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>{tr(lang, { en: "Connect", pt: "Conectar" })}</Text>
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
