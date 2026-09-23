import { FlatList, View, Pressable, Alert } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { fetchProtocols, updateProtocolItem } from "@/api/protocol";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr, type Lang } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { LoadFailure } from "@/components/LoadFailure";

// Same wording the web uses (app/dashboard/treatment/page.tsx). The screen
// printed the enum key straight through, so the patient read "Fase SHORT_TERM".
const PHASE_LABEL: Record<string, { en: string; pt: string }> = {
  SHORT_TERM: { en: "Short term (acute)", pt: "Curto Prazo (Agudo)" },
  MEDIUM_TERM: { en: "Medium term (rehabilitation)", pt: "Médio Prazo (Reabilitação)" },
  LONG_TERM: { en: "Long term (maintenance)", pt: "Longo Prazo (Manutenção)" },
};

/** The phase in the patient's language — a module constant cannot read a hook. */
function phaseLabel(lang: Lang, key: string): string {
  const pair = PHASE_LABEL[key];
  return pair ? tr(lang, pair) : key;
}

function TreatmentProtocolScreen() {
  const lang = useLang();
  const t = useTheme();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, error } = useQuery({ queryKey: ["protocols"], queryFn: fetchProtocols });

  const completeMut = useMutation({
    mutationFn: (itemId: string) => updateProtocolItem(itemId, { completed: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["protocols"] }),
    onError: (e) => Alert.alert("Erro", (e as Error).message),
  });

  const protocols = data ?? [];

  return (
    <Screen testID="protocol-screen">
      <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "Treatment plan", pt: "Protocolo" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 16, flex: 1 }}>
        <View>
          <Text variant="title">{tr(lang, { en: "Treatment plan", pt: "Plano de Tratamento" })}</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>{tr(lang, { en: "Prescribed by your therapist", pt: "Protocolo prescrito pelo terapeuta" })}</Text>
        </View>

        {isLoading ? <Spinner center /> : isError ? (
          /* tr(lang, { en: "No plan yet — your therapist will create one", pt: "Nenhum protocolo · seu terapeuta criará um plano" }) was shown to
             patients who already had one, whenever the request failed. */
          <LoadFailure error={error} onRetry={() => refetch()} />
        ) : protocols.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <Ionicons name="list-outline" size={48} color={t.colors.textMuted} />
              <Text variant="subtitle" color={t.colors.textSecondary}>{tr(lang, { en: "No treatment plan", pt: "Nenhum protocolo" })}</Text>
              <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center" }}>
                Seu terapeuta criara um plano de tratamento{"\n"}personalizado apos a avaliacao.
              </Text>
            </View>
          </Card>
        ) : (
          <FlatList data={protocols} keyExtractor={p => p.id} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}
            renderItem={({ item: protocol }) => (
              <View style={{ gap: 8 }}>
                <Card variant="elevated">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="clipboard-outline" size={18} color={t.colors.secondary} />
                    <Text variant="label" style={{ fontWeight: "600", flex: 1 }}>
                      Protocolo — {protocol.therapist.firstName} {protocol.therapist.lastName}
                    </Text>
                  </View>
                  {protocol.diagnosis?.summary && (
                    <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>{protocol.diagnosis.summary}</Text>
                  )}
                </Card>
                {protocol.items.map((item) => (
                  <Pressable key={item.id} onPress={() => !item.isCompleted && completeMut.mutate(item.id)}>
                    <Card>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{
                          width: 28, height: 28, borderRadius: 8,
                          borderWidth: 1.5, borderColor: item.isCompleted ? t.colors.ok : t.colors.border,
                          backgroundColor: item.isCompleted ? t.colors.okSoft : "transparent",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          {item.isCompleted && <Ionicons name="checkmark" size={16} color={t.colors.ok} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="label" style={{ fontWeight: "600", textDecorationLine: item.isCompleted ? "line-through" : "none" }}>
                            {item.title}
                          </Text>
                          {item.exercise && (
                            <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                              {item.sets ?? item.exercise.defaultSets}x{item.reps ?? item.exercise.defaultReps} · {item.exercise.name}
                            </Text>
                          )}
                          {item.completedCount > 0 && (
                            <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>
                              Concluido {item.completedCount}x
                            </Text>
                          )}
                        </View>
                        <Text variant="caption" color={t.colors.textMuted}>{phaseLabel(lang, item.phase)}</Text>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

/**
 * Gated on `mod_treatment` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function TreatmentProtocol() {
  return (
    <PlanGate module="mod_treatment">
      <TreatmentProtocolScreen />
    </PlanGate>
  );
}
