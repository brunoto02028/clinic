import { useState } from "react";
import { FlatList, Linking, Pressable, View, Platform, Alert } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchDocuments } from "@/api/documents";
import { formatDate } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";
import { API_URL } from "@/api/config";
import { tokenStorage } from "@/lib/secure-storage";

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  MEDICAL_REFERRAL: { icon: "document-text-outline", color: "#60a5fa" },
  REPORT: { icon: "clipboard-outline", color: "#5dc9c0" },
  PRESCRIPTION: { icon: "medical-outline", color: "#34d399" },
  IMAGING: { icon: "scan-outline", color: "#f59e0b" },
  INSURANCE: { icon: "shield-checkmark-outline", color: "#8b5cf6" },
  OTHER: { icon: "document-outline", color: "#64748b" },
};

async function uploadDocument(uri: string, fileName: string, mimeType: string) {
  const formData = new FormData();
  formData.append("file", { uri, name: fileName, type: mimeType } as any);
  formData.append("title", fileName);
  formData.append("documentType", "OTHER");
  formData.append("source", "PATIENT_UPLOAD");

  const token = await tokenStorage.getAccess();
  const res = await fetch(`${API_URL}/api/patient/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Falha no upload");
  return res.json();
}

export default function Documents() {
  const t = useTheme();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
  const [uploading, setUploading] = useState(false);

  const pickImage = async (source: "camera" | "gallery") => {
    const permission = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Permita o acesso para continuar.");
      return;
    }

    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const fileName = asset.fileName ?? `doc-${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? "image/jpeg";

    setUploading(true);
    try {
      await uploadDocument(asset.uri, fileName, mimeType);
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      Alert.alert("Erro", "Não foi possível fazer o upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen testID="documents-screen">
      <Stack.Screen
        options={{ headerShown: true, title: "Documentos", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 16, flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text variant="title">Documentos</Text>
            <Text variant="caption" color={t.colors.textSecondary}>Laudos, exames e receitas</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => pickImage("camera")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(107,163,176,0.3)" }}
            >
              <Ionicons name="camera-outline" size={18} color={t.colors.accent} />
              <Text variant="caption" color={t.colors.accent} style={{ fontWeight: "600" }}>Foto</Text>
            </Pressable>
            <Pressable
              onPress={() => pickImage("gallery")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(74,124,138,0.15)" }}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#5dc9c0" />
              <Text variant="caption" color="#5dc9c0" style={{ fontWeight: "600" }}>Upload</Text>
            </Pressable>
          </View>
        </View>

        {uploading && (
          <Card variant="highlight">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Spinner size="small" />
              <Text variant="caption" color={t.colors.textSecondary}>Enviando documento...</Text>
            </View>
          </Card>
        )}

        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <Card><Text color={t.colors.danger}>Não foi possível carregar.</Text></Card>
        ) : (data ?? []).length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <Ionicons name="folder-open-outline" size={48} color={t.colors.textMuted} />
              <Text variant="subtitle" color={t.colors.textSecondary}>Nenhum documento</Text>
              <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center" }}>
                Faça upload de documentos ou tire fotos{"\n"}de receitas e laudos.
              </Text>
            </View>
          </Card>
        ) : (
          <FlatList
            data={data}
            keyExtractor={d => d.id}
            contentContainerStyle={{ gap: 10 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const typeInfo = TYPE_ICONS[item.fileType] ?? TYPE_ICONS.OTHER;
              return (
                <Pressable onPress={() => Linking.openURL(item.fileUrl).catch(() => {})}>
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${typeInfo.color}15`, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={typeInfo.icon as any} size={22} color={typeInfo.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="label" style={{ fontWeight: "600" }}>{item.title || item.fileName}</Text>
                        <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                          {item.fileType?.replace(/_/g, " ")}{item.documentDate ? ` · ${formatDate(item.documentDate)}` : ""}
                        </Text>
                      </View>
                      <Ionicons name="open-outline" size={16} color={t.colors.textMuted} />
                    </View>
                  </Card>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}
