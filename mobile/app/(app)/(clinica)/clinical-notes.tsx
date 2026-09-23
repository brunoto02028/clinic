import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Spinner, Button } from "@/components/ui";
import { fetchClinicalNotes } from "@/api/clinical-notes";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { LoadFailure } from "@/components/LoadFailure";

function ClinicalNotesScreen() {
  const lang = useLang();
  const t = useTheme();
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ["clinical-notes"],
    queryFn: fetchClinicalNotes,
  });

  const filtered = (data ?? []).filter(n =>
    !search || n.treatmentType?.toLowerCase().includes(search.toLowerCase()) || n.subjective?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Screen testID="clinical-notes-screen">
      <Stack.Screen
        options={{ headerShown: true, title: tr(lang, { en: "Clinical notes", pt: "Notas Clínicas" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 16, flex: 1 }}>
        <View>
          {/* "Documentação SOAP" was the Portuguese half of this line — internal
              jargon the English half deliberately avoids. Both say the same
              thing now. */}
          <Text variant="caption" color={t.colors.textSecondary}>{tr(lang, { en: "Your therapist's notes from each session", pt: "As notas do seu terapeuta a cada sessão" })}</Text>
        </View>
        <Input placeholder={tr(lang, { en: "Search by date or treatment...", pt: "Buscar por data ou tratamento..." })} value={search} onChangeText={setSearch} />
        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          /* An empty state here used to cover a failed request — the client
             caught everything and returned []. A patient with notes was told
             they had none. Failure has to look like failure. */
          <LoadFailure error={error} onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.healthSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="clipboard-outline" size={32} color={t.colors.textMuted} />
              </View>
              <Text variant="subtitle" color={t.colors.textSecondary}>{tr(lang, { en: "No clinical notes", pt: "Nenhuma nota clínica" })}</Text>
              <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center", lineHeight: 18 }}>
                Suas notas clínicas aparecerão aqui{"\n"}após suas sessões de tratamento.
              </Text>
            </View>
          </Card>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={n => n.id}
            contentContainerStyle={{ gap: 10 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="document-text-outline" size={20} color={t.colors.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={{ fontWeight: "600" }}>{item.treatmentType ?? tr(lang, { en: "Session", pt: "Sessão" })}</Text>
                    <Text variant="caption" color={t.colors.textSecondary}>{new Date(item.createdAt).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB")}</Text>
                  </View>
                  {item.therapist && <Text variant="caption" color={t.colors.textMuted}>{item.therapist.firstName}</Text>}
                </View>
                {item.subjective && <Text variant="caption" color={t.colors.textSecondary} numberOfLines={2} style={{ marginTop: 6 }}>{item.subjective}</Text>}
              </Card>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

/**
 * Gated on `mod_records` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function ClinicalNotes() {
  return (
    <PlanGate module="mod_records">
      <ClinicalNotesScreen />
    </PlanGate>
  );
}
