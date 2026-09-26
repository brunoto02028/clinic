import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, ListItem, Button, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { useModule } from "@/store/module";
import { fetchProfile, updateProfile } from "@/api/profile";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { useAreaSwitch } from "@/lib/areas";
import { useThemeStore } from "@/store/theme";
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
  const modo = useThemeStore((s) => s.modo);
  const definirModo = useThemeStore((s) => s.definir);
  const bio = useBiometricCapability();
  const qc = useQueryClient();

  /**
   * Trocar de idioma vale na hora, e não ao salvar um formulário.
   *
   * `useLang()` lê a consulta `profile`, então mexer no cache já repinta o app
   * inteiro antes de o servidor responder. Se o servidor recusar, o
   * `invalidateQueries` do fim traz a verdade de volta — e o pior caso é a
   * língua voltar sozinha, não a pessoa ficar presa na errada.
   */
  const trocarIdioma = useMutation({
    mutationFn: (locale: string) => updateProfile({ preferredLocale: locale }),
    onMutate: async (locale) => {
      await qc.cancelQueries({ queryKey: ["profile"] });
      const antes = qc.getQueryData(["profile"]);
      qc.setQueryData(["profile"], (p: any) => (p ? { ...p, preferredLocale: locale } : p));
      return { antes };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(["profile"], ctx.antes);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

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

        {/* O idioma morava **só** dentro de "Editar perfil", num formulário
            que exige tocar em Salvar — e quem entra no app na língua errada
            tem dificuldade justamente para achar o caminho até lá. Aqui, ao
            lado da aparência, ele é o que é: uma preferência de leitura, que
            muda na hora (pedido do Bruno, 26/09/2026). */}
        <Card>
          <View style={{ paddingVertical: 4 }}>
            <Text variant="label" style={{ fontWeight: "600" }}>
              {tr(lang, { en: "Language", pt: "Idioma" })}
            </Text>
            <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>
              {tr(lang, { en: "The language you read the app in.", pt: "A língua em que você lê o app." })}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              {([
                { codigo: "en-GB", rotulo: "English", bandeira: "🇬🇧" },
                { codigo: "pt-BR", rotulo: "Português", bandeira: "🇧🇷" },
              ] as const).map((l) => {
                const ativo = (lang === "pt") === l.codigo.startsWith("pt");
                return (
                  <Pressable
                    key={l.codigo}
                    onPress={() => trocarIdioma.mutate(l.codigo)}
                    disabled={trocarIdioma.isPending}
                    testID={`lang-${l.codigo}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: ativo ? 2 : 1,
                      borderColor: ativo ? t.colors.health : t.colors.border,
                      backgroundColor: ativo ? t.colors.healthSoft : t.colors.surface,
                      opacity: trocarIdioma.isPending ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{l.bandeira}</Text>
                    <Text
                      variant="caption"
                      color={ativo ? t.colors.health : t.colors.textSecondary}
                      style={{ fontWeight: ativo ? "700" : "400" }}
                    >
                      {l.rotulo}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        {/* A aparência é escolha da pessoa (086). Dois botões e não um
            interruptor: "claro/escuro" como par mostra o que existe, enquanto
            um switch obriga a descobrir o que o estado desligado significa. */}
        <Card>
          <View style={{ paddingVertical: 4 }}>
            <Text variant="label" style={{ fontWeight: "600" }}>
              {tr(lang, { en: "Appearance", pt: "Aparência" })}
            </Text>
            <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>
              {tr(lang, { en: "How the app looks on this phone.", pt: "Como o app fica neste aparelho." })}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              {(["light", "dark"] as const).map((m) => {
                const ativo = modo === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => definirModo(m)}
                    testID={`theme-${m}`}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: ativo ? 2 : 1,
                      borderColor: ativo ? t.colors.health : t.colors.border,
                      backgroundColor: ativo ? t.colors.healthSoft : t.colors.surface,
                    }}
                  >
                    <Ionicons
                      name={m === "dark" ? "moon-outline" : "sunny-outline"}
                      size={20}
                      color={ativo ? t.colors.health : t.colors.textMuted}
                    />
                    <Text
                      variant="caption"
                      color={ativo ? t.colors.health : t.colors.textSecondary}
                      style={{ fontWeight: ativo ? "700" : "400" }}
                    >
                      {m === "dark" ? tr(lang, { en: "Dark", pt: "Escuro" }) : tr(lang, { en: "Light", pt: "Claro" })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
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
