import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Avatar, ListItem, Button, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { useModule } from "@/store/module";
import { fetchProfile } from "@/api/profile";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { CLINIC_ONLY } from "@/lib/feature-flags";
import { BiometricLockRow, useBiometricCapability } from "@/components/BiometricLockRow";
import { ProfilePhotoPicker } from "@/components/ProfilePhotoPicker";

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

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : (user?.name?.[0] ?? "?").toUpperCase();

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user?.name ?? "";
  const email = profile?.email ?? user?.email ?? "";

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
            <ProfilePhotoPicker size={56} />
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
