import { useState } from "react";
import { View, Pressable, Alert, ActivityIndicator, Platform } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { explainDeniedPermission } from "@/lib/ask-permission";
import { usePathname } from "expo-router";
import { fetchProfile } from "@/api/profile";
import { uploadProfilePhoto, removeProfilePhoto } from "@/api/profile-photo";

/**
 * A foto de perfil, onde quer que o paciente vá procurá-la.
 *
 * Nasceu dentro da aba de perfil, e o Bruno foi procurar em "Editar perfil" —
 * que é onde qualquer pessoa procuraria. Em vez de duplicar o seletor,
 * ele virou isto, usado nos dois lugares.
 *
 * Recorte quadrado obrigatório: o avatar é redondo em toda tela onde aparece,
 * e sem recorte uma foto deitada entraria esticada.
 */
export function ProfilePhotoPicker({ size = 80 }: { size?: number }) {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const caminho = usePathname();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  const pick = async (source: "camera" | "gallery") => {
    // A permissão é pedida antes de abrir a galeria: sem isto o iOS devolve
    // "cancelado" e a tela parece ter ignorado o toque.
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      // "Permita o acesso para continuar" não dizia ONDE, e o iOS só pergunta
      // uma vez: depois de negada, todo toque voltava para o mesmo aviso sem
      // saída.
      explainDeniedPermission(permission, source === "camera" ? "camera" : "library", lang, caminho);
      return;
    }

    const options = { quality: 0.8, allowsEditing: true, aspect: [1, 1] as [number, number] };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;

    setBusy(true);
    try {
      const asset = result.assets[0];
      await uploadProfilePhoto(asset.uri, asset.mimeType ?? "image/jpeg");
      await qc.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      Alert.alert(
        tr(lang, { en: "Error", pt: "Erro" }),
        tr(lang, { en: "We could not save that photo.", pt: "Não foi possível salvar essa foto." })
      );
    } finally {
      setBusy(false);
    }
  };

  const drop = async () => {
    setBusy(true);
    try {
      await removeProfilePhoto();
      await qc.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      Alert.alert(
        tr(lang, { en: "Error", pt: "Erro" }),
        tr(lang, { en: "We could not remove the photo.", pt: "Não foi possível remover a foto." })
      );
    } finally {
      setBusy(false);
    }
  };

  const openMenu = () => {
    const options: Array<{ text: string; onPress?: () => void; style?: "cancel" | "destructive" }> = [
      { text: tr(lang, { en: "Take photo", pt: "Tirar foto" }), onPress: () => void pick("camera") },
      { text: tr(lang, { en: "Choose from library", pt: "Escolher da galeria" }), onPress: () => void pick("gallery") },
    ];
    if (profile?.profileImageUrl) {
      options.push({
        text: tr(lang, { en: "Remove photo", pt: "Remover foto" }),
        onPress: () => void drop(),
        style: "destructive",
      });
    }
    // O Android aceita no máximo três botões e descarta o quarto em silêncio —
    // com foto no perfil seriam quatro. Lá o cancelar vira o gesto do sistema,
    // com `cancelable` ligado na mão: o React Native passa `false` por padrão, e
    // sem isso o Android bloqueia o toque fora E o botão voltar.
    if (Platform.OS !== "android") {
      options.push({ text: tr(lang, { en: "Cancel", pt: "Cancelar" }), style: "cancel" });
    }
    Alert.alert(
      tr(lang, { en: "Profile photo", pt: "Foto de perfil" }),
      undefined,
      options,
      { cancelable: true }
    );
  };

  return (
    <Pressable
      onPress={openMenu}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={tr(lang, { en: "Change profile photo", pt: "Trocar foto de perfil" })}
      testID="profile-photo"
      style={{ alignItems: "center" }}
    >
      <View>
        <Avatar label={initials} uri={profile?.profileImageUrl} round size={size} />
        {/* O selo de câmera: sem ele nada dizia que o avatar era tocável. */}
        <View
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: t.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: t.colors.background,
          }}
        >
          <Ionicons name="camera" size={14} color="#FFFFFF" />
        </View>
      </View>

      {busy ? (
        <ActivityIndicator size="small" style={{ marginTop: 8 }} />
      ) : (
        <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 8, fontSize: 10.5 }}>
          {profile?.profileImageUrl
            ? tr(lang, { en: "Change photo", pt: "Trocar foto" })
            : tr(lang, { en: "Add a photo", pt: "Adicionar foto" })}
        </Text>
      )}
    </Pressable>
  );
}
