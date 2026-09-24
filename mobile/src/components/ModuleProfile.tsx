import { useState } from "react";
import { View, Pressable, Alert, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Avatar, ListItem, Button, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { useModule } from "@/store/module";
import { fetchProfile } from "@/api/profile";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { CLINIC_ONLY } from "@/lib/feature-flags";
import { BiometricLockRow, useBiometricCapability } from "@/components/BiometricLockRow";
import { uploadProfilePhoto, removeProfilePhoto } from "@/api/profile-photo";

export interface ProfileSection {
  /** English canonical, Portuguese alongside — this menu was English-only, so
   *  a pt-BR patient read fourteen English entries under a Portuguese home. */
  title: { en: string; pt: string };
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
}

/**
 * Shared profile tab used by every module (lab, clinica, ba).
 *
 * `sections` is how a module adds its own entries without this component
 * learning about them — the clinic needs somewhere to reach screens that have
 * no tab of their own, and lab and BA users must not see them.
 */
export function ModuleProfile({ sections }: { sections?: ProfileSection[] } = {}) {
  const t = useTheme();
  const lang = useLang();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const clearModule = useModule((s) => s.clearModule);
  const bio = useBiometricCapability();
  const qc = useQueryClient();
  const [photoBusy, setPhotoBusy] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : (user?.name?.[0] ?? "?").toUpperCase();

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user?.name ?? "";
  const email = profile?.email ?? user?.email ?? "";

  /**
   * Trocar a foto.
   *
   * Recorte quadrado obrigatório (`aspect: [1, 1]`): o avatar é redondo em
   * toda tela onde aparece, e sem o recorte uma foto deitada entraria
   * esticada. O pedido de permissão vem antes de abrir a galeria, senão o
   * iOS devolve "cancelado" e a tela parece ter ignorado o toque.
   */
  const pickPhoto = async (source: "camera" | "gallery") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        tr(lang, { en: "Permission needed", pt: "Permissão necessária" }),
        tr(lang, { en: "Allow access to continue.", pt: "Permita o acesso para continuar." })
      );
      return;
    }

    const options = { quality: 0.8, allowsEditing: true, aspect: [1, 1] as [number, number] };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;

    setPhotoBusy(true);
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
      setPhotoBusy(false);
    }
  };

  const dropPhoto = async () => {
    setPhotoBusy(true);
    try {
      await removeProfilePhoto();
      await qc.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      Alert.alert(
        tr(lang, { en: "Error", pt: "Erro" }),
        tr(lang, { en: "We could not remove the photo.", pt: "Não foi possível remover a foto." })
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const openPhotoMenu = () => {
    const options: Array<{ text: string; onPress?: () => void; style?: "cancel" | "destructive" }> = [
      { text: tr(lang, { en: "Take photo", pt: "Tirar foto" }), onPress: () => void pickPhoto("camera") },
      { text: tr(lang, { en: "Choose from library", pt: "Escolher da galeria" }), onPress: () => void pickPhoto("gallery") },
    ];
    if (profile?.profileImageUrl) {
      options.push({
        text: tr(lang, { en: "Remove photo", pt: "Remover foto" }),
        onPress: () => void dropPhoto(),
        style: "destructive",
      });
    }
    // O Android aceita no máximo três botões num Alert e descarta o quarto em
    // silêncio — com foto no perfil seriam quatro. Então lá o cancelar sai da
    // lista e vira o gesto do sistema, com `cancelable` ligado **na mão**: o
    // React Native passa `cancelable: false` por padrão, e sem este quarto
    // argumento o Android bloqueia o toque fora E o botão voltar — o paciente
    // com foto ficaria presto no menu, obrigado a escolher uma das três ações.
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

  const handleSwitchModule = () => {
    clearModule();
    router.replace("/module-select");
  };

  const handleLogout = async () => {
    clearModule();
    await logout();
    // Sign-in, not `/`: the root path is ambiguous (see app/(app)/_layout.tsx)
    // and sending the signed-out user there froze the app.
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <Screen testID="module-profile-screen">
        <Spinner center />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="module-profile-screen">
      <View style={{ gap: 16 }}>
        <Card>
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
            <Pressable
              onPress={openPhotoMenu}
              disabled={photoBusy}
              accessibilityRole="button"
              accessibilityLabel={tr(lang, { en: "Change profile photo", pt: "Trocar foto de perfil" })}
              testID="profile-photo"
              style={{ alignItems: "center" }}
            >
              <Avatar label={initials} uri={profile?.profileImageUrl} round size={56} />
              {/* O avatar era só um desenho: nada dizia que dava para tocar.
                  Esta linha é o convite. */}
              {photoBusy ? (
                <ActivityIndicator size="small" style={{ marginTop: 6 }} />
              ) : (
                <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 6, fontSize: 10.5 }}>
                  {tr(lang, { en: "Change photo", pt: "Trocar foto" })}
                </Text>
              )}
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Text variant="subtitle" testID="profile-name">
                {fullName}
              </Text>
              <Text variant="caption" color={t.colors.textMuted} testID="profile-email">
                {email}
              </Text>
            </View>
          </View>
        </Card>

        {sections && sections.length > 0 && (
          <Card>
            {sections.map((s, i) => (
              <ListItem
                key={s.href}
                title={tr(lang, s.title)}
                icon={<Ionicons name={s.icon} size={18} color={t.colors.text} />}
                onPress={() => router.push(s.href as any)}
                last={i === sections.length - 1}
              />
            ))}
          </Card>
        )}

        <Card>
          <ListItem
            title={tr(lang, { en: "Edit profile", pt: "Editar perfil" })}
            icon={<Ionicons name="person-outline" size={18} color={t.colors.text} />}
            onPress={() => router.push("/profile-edit")}
          />
          <ListItem
            title={tr(lang, { en: "Notifications", pt: "Notificações" })}
            icon={<Ionicons name="notifications-outline" size={18} color={t.colors.text} />}
            onPress={() => router.push("/notifications")}
          />
          <ListItem
            title={tr(lang, { en: "Change password", pt: "Alterar senha" })}
            icon={<Ionicons name="lock-closed-outline" size={18} color={t.colors.text} />}
            onPress={() => router.push("/change-password")}
            last={!bio || !bio.hasHardware}
          />
          {/* Num aparelho sem sensor a linha não existe, e aí quem fecha a
              lista é "Alterar senha" — daí o `last` condicional acima. */}
          {bio?.hasHardware && <BiometricLockRow cap={bio} last />}
        </Card>

        {/* Nothing to switch to in a clinic-only build, and the chooser it
            opens is the screen that build exists to skip. */}
        {!CLINIC_ONLY && (
          <Button title={tr(lang, { en: "Switch module", pt: "Trocar de módulo" })} variant="ghost" onPress={handleSwitchModule} size="md" />
        )}

        <Button title={tr(lang, { en: "Sign out", pt: "Sair" })} variant="ghost" onPress={handleLogout} size="md" />
      </View>
    </Screen>
  );
}
