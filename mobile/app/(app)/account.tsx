import { View } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, ListItem, Button, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { useModule } from "@/store/module";
import { fetchProfile } from "@/api/profile";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { useAreaSwitch } from "@/lib/areas";
import { BiometricLockRow, useBiometricCapability } from "@/components/BiometricLockRow";
import { ProfilePhotoPicker } from "@/components/ProfilePhotoPicker";

/**
 * A conta, sozinha numa tela.
 *
 * Antes, a aba do menu abria com o cartão do perfil — foto, nome, e-mail —
 * e **embaixo** as quatorze entradas da clínica, mais as da conta, mais sair.
 * Duas coisas diferentes na mesma tela: quem procurava o menu via o perfil
 * primeiro, e quem procurava o perfil tinha o menu inteiro junto.
 *
 * Agora a aba é o menu, e a conta é uma linha dentro dele — o padrão dos
 * Ajustes do telefone, onde a primeira linha é você e o resto são assuntos.
 */
export default function Account() {
  const t = useTheme();
  const lang = useLang();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const clearModule = useModule((s) => s.clearModule);
  const { canSwitch, switchArea } = useAreaSwitch();
  const bio = useBiometricCapability();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user?.name ?? "";
  const email = profile?.email ?? user?.email ?? "";

  const handleLogout = async () => {
    clearModule();
    await logout();
    // Sign-in, not `/`: the root path is ambiguous (see app/(app)/_layout.tsx)
    // and sending the signed-out user there froze the app.
    router.replace("/login");
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: tr(lang, { en: "My account", pt: "Minha conta" }),
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.text,
        headerShadowVisible: false,
      }}
    />
  );

  if (isLoading) {
    return (
      <Screen testID="account-screen">
        {header}
        <Spinner center />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="account-screen">
      {header}
      <View style={{ gap: 16 }}>
        <Card>
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
            <ProfilePhotoPicker size={72} />
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

        {/* Escondido por `!CLINIC_ONLY`, o que deixava a conta sem saída neste
            build: o servidor concedia o laboratório e nada no app levava até
            ele. Quem manda agora é quantas áreas a conta tem — `CLINIC_ONLY`
            decide onde a pessoa cai, não onde ela pode ir. */}
        {canSwitch && (
          <Button
            title={tr(lang, { en: "Switch area", pt: "Trocar de área" })}
            variant="ghost"
            onPress={switchArea}
            size="md"
            testID="account-switch-area"
          />
        )}

        <Button
          title={tr(lang, { en: "Sign out", pt: "Sair" })}
          variant="ghost"
          onPress={handleLogout}
          size="md"
          testID="sign-out"
        />
      </View>
    </Screen>
  );
}
