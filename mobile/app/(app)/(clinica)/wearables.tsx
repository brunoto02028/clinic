import { View, Pressable, Linking, Alert } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Spinner, Card } from "@/components/ui";
import { NonEmergencyNotice } from "@/components/NonEmergencyNotice";
import { useTheme } from "@/theme/useTheme";
import {
  fetchConnections, disconnectProvider, syncProvider, fetchConnectUrl, OW_PROVIDERS,
  fetchMonitoringConsent, acceptMonitoringConsent, resubscribeWithings,
} from "@/api/wearables";
import { Button } from "@/components/ui";
import { useLang, t as tr } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { PlanGate } from "@/components/PlanGate";
import { LoadFailure } from "@/components/LoadFailure";

function WearablesScreen() {
  const t = useTheme();
  const lang = useLang();
  // The provider sends the patient back to bprclinic://wearables?connected=…
  // and nothing read it: authorising and refusing looked identical — the same
  // list, no word either way. The web has always said which happened.
  const { connected, error: oauthError } = useLocalSearchParams<{ connected?: string; error?: string }>();
  const returnMsg =
    connected === "1"
      ? tr(lang, { en: "Device connected. Data will sync shortly.", pt: "Dispositivo conectado. Os dados vão sincronizar em breve." })
      : connected === "0"
        ? tr(lang, { en: "We could not connect that device.", pt: "Não foi possível conectar esse dispositivo." })
        : null;
  const qc = useQueryClient();
  const { data: connections, isLoading, isError, error, refetch } = useQuery({
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

  // Pedir de novo, sem refazer a autorização: os tokens já são nossos, o que
  // faltou foi a Withings aceitar mandar. Antes disto o único remédio era
  // desconectar e autorizar tudo outra vez.
  const resubMut = useMutation({
    mutationFn: resubscribeWithings,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["wearable-connections"] });
      Alert.alert(
        tr(lang, { en: "Device", pt: "Aparelho" }),
        res.delivery === "receiving"
          ? tr(lang, {
              en: "Done — Withings will send your measurements now.",
              pt: "Pronto — a Withings vai enviar suas medições agora.",
            })
          : tr(lang, {
              en: "Withings still has not confirmed. Your clinic has been able to see this.",
              pt: "A Withings ainda não confirmou. Sua clínica consegue ver isso.",
            })
      );
    },
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message),
  });

  const connectedProviders = new Set((connections || []).map((c) => c.provider.toLowerCase()));

  // The patient says once that they read the non-emergency notice before the
  // first device is connected (activity 074, T-13). The server refuses without
  // it; asking here means the refusal never has to happen.
  const { data: consent } = useQuery({
    queryKey: ["monitoring-consent"],
    queryFn: fetchMonitoringConsent,
    retry: false,
  });
  const acceptMut = useMutation({
    mutationFn: acceptMonitoringConsent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monitoring-consent"] }),
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message),
  });

  const connectMut = useMutation({
    mutationFn: fetchConnectUrl,
    onSuccess: (url) => Linking.openURL(url),
    onError: (e) => Alert.alert(
      tr(lang, { en: "Devices", pt: "Dispositivos" }),
      (e as Error).message
        || tr(lang, {
          en: "We could not start the connection.",
          pt: "Não foi possível iniciar a conexão.",
        }),
    ),
  });

  return (
    <Screen scroll testID="wearables-screen">
      <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "Devices", pt: "Dispositivos" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>
        {/* Conectar um aparelho é o momento em que o paciente passa a esperar
            que alguém esteja olhando (activity 074, T-13). */}
        <NonEmergencyNotice />

        {consent && !consent.accepted && (
          <Card>
            <Text variant="caption" style={{ marginBottom: 8 }}>
              {tr(lang, {
                en: "Confirm you have read the notice above to connect a device.",
                pt: "Confirme que você leu o aviso acima para conectar um aparelho.",
              })}
            </Text>
            <Button
              title={tr(lang, { en: "I have read and understood", pt: "Li e entendi" })}
              onPress={() => acceptMut.mutate()}
              loading={acceptMut.isPending}
            />
          </Card>
        )}

        {returnMsg && (
          <Card accent={connected === "1" ? "health" : "work"}>
            <Text variant="caption" color={connected === "1" ? t.colors.ok : t.colors.bad}>
              {returnMsg}{oauthError ? ` (${oauthError})` : ""}
            </Text>
          </Card>
        )}
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
        ) : isError ? (
          /* A failed read showed every provider as disconnected with a live
             "Connect" button — an invitation to re-authorise a device that is
             already linked. */
          <LoadFailure error={error} onRetry={() => refetch()} />
        ) : (
          <View style={{ gap: 12 }}>
            {OW_PROVIDERS.map((p) => {
              const isConnected = connectedProviders.has(p.key);
              const conn = (connections || []).find((c) => c.provider.toLowerCase() === p.key);
              // "Conectado" só dizia que a autorização deu certo. Se a Withings
              // não confirmou o envio, o aparelho está autorizado e mudo — e
              // pintar isso de verde era a parte pior do problema.
              const delivery = conn?.delivery;
              const silent = isConnected && (delivery === "silent" || delivery === "partial");

              return (
                <View
                  key={p.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    backgroundColor: silent
                      ? t.colors.warnSoft
                      : isConnected
                      ? t.colors.okSoft
                      : t.colors.surfaceMuted,
                    borderRadius: t.radius.lg,
                    borderWidth: 1,
                    borderColor: silent ? t.colors.warn : isConnected ? t.colors.ok : t.colors.border,
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
                      {silent && (
                        <Text variant="caption" color={t.colors.warn} style={{ marginTop: 2, maxWidth: 190 }}>
                          {delivery === "silent"
                            ? tr(lang, {
                                en: "Authorised, but not sending measurements yet.",
                                pt: "Autorizado, mas ainda não está enviando medições.",
                              })
                            : tr(lang, {
                                en: "Sending only part of your measurements.",
                                pt: "Enviando só parte das suas medições.",
                              })}
                        </Text>
                      )}
                    </View>
                  </View>

                  {isConnected ? (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {silent && p.key === "withings" && (
                        <Pressable
                          onPress={() => resubMut.mutate()}
                          disabled={resubMut.isPending}
                          testID="wearables-resubscribe"
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: t.colors.warn,
                            opacity: resubMut.isPending ? 0.6 : 1,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                            {resubMut.isPending ? "..." : tr(lang, { en: "Fix", pt: "Corrigir" })}
                          </Text>
                        </Pressable>
                      )}
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
                      onPress={() => connectMut.mutate(p.key)}
                      // A recusa que vale é a do servidor; isto evita mandar o
                      // paciente para o provedor só para voltar com um erro.
                      disabled={connectMut.isPending || (!!consent && !consent.accepted)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: consent && !consent.accepted ? t.colors.surfaceMuted : t.colors.primary,
                        opacity: consent && !consent.accepted ? 0.6 : 1,
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

/**
 * Gated on `mod_devices`, the key that also governs the data screen. Devices
 * had no entry in the registry at all until now.
 */
export default function Wearables() {
  return (
    <PlanGate module="mod_devices">
      <WearablesScreen />
    </PlanGate>
  );
}
