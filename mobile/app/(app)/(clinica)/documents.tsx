import { useState } from "react";
import { FlatList, Linking, Pressable, View, Platform, Alert } from "react-native";
import { Stack, usePathname} from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { DocumentThumb } from "@/components/DocumentThumb";
import { ImageViewer, isImageFile, openFileInApp } from "@/components/FileViewer";
import * as ImagePicker from "expo-image-picker";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchDocuments } from "@/api/documents";
import { formatDate } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { API_URL } from "@/api/config";
import { tokenStorage } from "@/lib/secure-storage";
import { explainDeniedPermission } from "@/lib/ask-permission";

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

function DocumentsScreen() {
  const lang = useLang();
  const caminho = usePathname();
  const t = useTheme();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
  const [uploading, setUploading] = useState(false);
  const [imagemAberta, setImagemAberta] = useState<{ uri: string; titulo: string } | null>(null);

  // Same values as the web's DOC_TYPES (app/dashboard/documents/page.tsx). The
  // card was printing the enum key with underscores swapped for spaces, so a
  // Portuguese screen read "MEDICAL REFERRAL".
  const DOC_TYPE_LABEL: Record<string, string> = {
    MEDICAL_REFERRAL: tr(lang, { en: "Medical referral", pt: "Encaminhamento Médico" }),
    MEDICAL_REPORT: tr(lang, { en: "Medical report", pt: "Laudo Médico" }),
    // Present in the DocumentType enum; without it a signed consent form read "Outro".
    CONSENT_FORM: tr(lang, { en: "Consent form", pt: "Termo de Consentimento" }),
    PRESCRIPTION: tr(lang, { en: "Prescription", pt: "Prescrição" }),
    IMAGING: tr(lang, { en: "Imaging", pt: "Exames de Imagem" }),
    INSURANCE: tr(lang, { en: "Insurance", pt: "Seguro" }),
    PREVIOUS_TREATMENT: tr(lang, { en: "Previous treatment", pt: "Tratamento Anterior" }),
    OTHER: tr(lang, { en: "Other", pt: "Outro" }),
  };

  const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
    MEDICAL_REFERRAL: { icon: "document-text-outline", color: t.colors.work, bg: t.colors.workSoft },
    // Keyed to the enum. This was `REPORT`, which no document has, so every
    // medical report fell through to the generic icon.
    MEDICAL_REPORT: { icon: "clipboard-outline", color: t.colors.ok, bg: t.colors.okSoft },
    CONSENT_FORM: { icon: "create-outline", color: t.colors.work, bg: t.colors.workSoft },
    PRESCRIPTION: { icon: "medical-outline", color: t.colors.ok, bg: t.colors.okSoft },
    IMAGING: { icon: "scan-outline", color: t.colors.warn, bg: t.colors.warnSoft },
    INSURANCE: { icon: "shield-checkmark-outline", color: t.colors.community, bg: t.colors.communitySoft },
    OTHER: { icon: "document-outline", color: t.colors.textMuted, bg: t.colors.surfaceMuted },
  };

  const pickImage = async (source: "camera" | "gallery") => {
    const permission = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      explainDeniedPermission(permission, source === "camera" ? "camera" : "library", lang, caminho);
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
      Alert.alert(
        tr(lang, { en: "Error", pt: "Erro" }),
        tr(lang, { en: "We could not upload that.", pt: "Não foi possível fazer o upload." }),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen testID="documents-screen">
      <Stack.Screen
        options={{ headerShown: true, title: tr(lang, { en: "Documents", pt: "Documentos" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 16, flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text variant="caption" color={t.colors.textSecondary}>{tr(lang, { en: "Reports, tests and prescriptions", pt: "Laudos, exames e receitas" })}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => pickImage("camera")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: t.colors.border }}
            >
              <Ionicons name="camera-outline" size={18} color={t.colors.accent} />
              <Text variant="caption" color={t.colors.accent} style={{ fontWeight: "600" }}>{tr(lang, { en: "Photo", pt: "Foto" })}</Text>
            </Pressable>
            <Pressable
              onPress={() => pickImage("gallery")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: t.colors.surfaceMuted }}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={t.colors.ok} />
              <Text variant="caption" color={t.colors.ok} style={{ fontWeight: "600" }}>Upload</Text>
            </Pressable>
          </View>
        </View>

        {uploading && (
          <Card variant="highlight">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Spinner size="small" />
              <Text variant="caption" color={t.colors.textSecondary}>{tr(lang, { en: "Uploading…", pt: "Enviando documento..." })}</Text>
            </View>
          </Card>
        )}

        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <Card><Text color={t.colors.danger}>{tr(lang, { en: "We could not load this.", pt: "Não foi possível carregar." })}</Text></Card>
        ) : (data ?? []).length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <Ionicons name="folder-open-outline" size={48} color={t.colors.textMuted} />
              <Text variant="subtitle" color={t.colors.textSecondary}>{tr(lang, { en: "No documents", pt: "Nenhum documento" })}</Text>
              <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center" }}>
                {tr(lang, {
                  en: "Upload a document, or photograph a prescription or report.",
                  pt: "Faça upload de documentos ou tire fotos de receitas e laudos.",
                })}
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
              const typeInfo = TYPE_ICONS[item.documentType ?? "OTHER"] ?? TYPE_ICONS.OTHER;
              return (
                <Pressable
                  onPress={async () => {
                    // `fileUrl` is relative and behind a cookie the system
                    // viewer does not have: tapping a document did nothing,
                    // silently, because the failure was swallowed. `openUrl`
                    // is absolute and signed; and when it is missing, the
                    // patient is told rather than left tapping.
                    const url = item.openUrl;
                    if (!url) {
                      Alert.alert(
                        tr(lang, { en: "Document", pt: "Documento" }),
                        tr(lang, {
                          en: "We could not open this document. Please try again from the web portal.",
                          pt: "Não foi possível abrir este documento. Tente pelo portal na web.",
                        })
                      );
                      return;
                    }
                    try {
                      // Imagem abre aqui, em tela cheia; PDF e o resto, no
                      // navegador **de dentro** do app. Antes tudo ia para o
                      // Safari, e o paciente saía do BPR para ver o próprio
                      // exame — levando junto a URL assinada para o histórico
                      // de um navegador que não é nosso.
                      if (isImageFile(item.fileType, item.fileName)) {
                        setImagemAberta({ uri: url, titulo: item.title || item.fileName });
                      } else {
                        await openFileInApp(url);
                      }
                    } catch {
                      Alert.alert(
                        tr(lang, { en: "Document", pt: "Documento" }),
                        tr(lang, {
                          en: "Your phone could not open this file.",
                          pt: "Seu telefone não conseguiu abrir este arquivo.",
                        })
                      );
                    }
                  }}
                >
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <DocumentThumb
                        uri={item.openUrl}
                        isImage={(item.fileType || "").startsWith("image/")}
                        icon={typeInfo.icon}
                        color={typeInfo.color}
                        bg={typeInfo.bg}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="label" style={{ fontWeight: "600" }}>{item.title || item.fileName}</Text>
                        <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                          {DOC_TYPE_LABEL[item.documentType ?? "OTHER"] ?? tr(lang, { en: "Other", pt: "Outro" })}{item.documentDate ? ` · ${formatDate(item.documentDate, lang)}` : ""}
                        </Text>
                      </View>
                      {/* O ícone diz para onde o toque leva: lupa quando abre
                          aqui, seta quando abre o navegador interno. */}
                      <Ionicons
                        name={isImageFile(item.fileType, item.fileName) ? "expand-outline" : "open-outline"}
                        size={16}
                        color={t.colors.textMuted}
                      />
                    </View>
                  </Card>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      {/* Em cima de tudo, para a imagem cobrir a tela inteira. */}
      <ImageViewer
        uri={imagemAberta?.uri ?? null}
        title={imagemAberta?.titulo}
        onClose={() => setImagemAberta(null)}
      />
    </Screen>
  );
}

/**
 * Gated on `mod_documents` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function Documents() {
  return (
    <PlanGate module="mod_documents">
      <DocumentsScreen />
    </PlanGate>
  );
}
