import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Spinner } from "@/components/ui";
import { fetchClinicalNotes } from "@/api/clinical-notes";
import { useTheme } from "@/theme/useTheme";

export default function ClinicalNotes() {
  const t = useTheme();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["clinical-notes"],
    queryFn: fetchClinicalNotes,
  });

  const filtered = (data ?? []).filter(n =>
    !search || n.treatmentType?.toLowerCase().includes(search.toLowerCase()) || n.subjective?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Screen testID="clinical-notes-screen">
      <Stack.Screen
        options={{ headerShown: true, title: "Notas Clínicas", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 16, flex: 1 }}>
        <View>
          <Text variant="title" color={t.colors.secondary}>Notas Clínicas</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>Documentação SOAP das suas consultas</Text>
        </View>
        <Input placeholder="Buscar por data ou tratamento..." value={search} onChangeText={setSearch} />
        {isLoading ? (
          <Spinner center />
        ) : filtered.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(74,124,138,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="clipboard-outline" size={32} color={t.colors.textMuted} />
              </View>
              <Text variant="subtitle" color={t.colors.textSecondary}>Nenhuma nota clínica</Text>
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
                    <Text variant="label" style={{ fontWeight: "600" }}>{item.treatmentType ?? "Sessão"}</Text>
                    <Text variant="caption" color={t.colors.textSecondary}>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</Text>
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
