import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Avatar, ListItem, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { fetchProfile } from "@/api/profile";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import Constants from "expo-constants";
import { runningVersion } from "@/lib/app-updates";

export interface ProfileSection {
  /** English canonical, Portuguese alongside — this menu was English-only, so
   *  a pt-BR patient read fourteen English entries under a Portuguese home. */
  title: { en: string; pt: string };
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
}

/**
 * O menu do módulo (clinica, lab, ba).
 *
 * Era a aba "Perfil", e mostrava as duas coisas de uma vez: o cartão da conta
 * em cima — foto grande, nome, e-mail — e, embaixo, as quatorze entradas da
 * clínica mais as da conta mais o sair. Quem abria procurando o menu via o
 * perfil; quem abria procurando o perfil recebia o menu inteiro junto.
 *
 * Agora esta tela é só o menu, e a conta é a **primeira linha** dele, compacta,
 * levando para `/account`. É o padrão dos Ajustes do telefone, e é o que estava
 * faltando: uma tela, um assunto.
 *
 * `sections` continua sendo como cada módulo acrescenta as próprias entradas
 * sem este componente aprender sobre elas.
 */
export function ModuleProfile({ sections }: { sections?: ProfileSection[] } = {}) {
  const t = useTheme();
  const lang = useLang();
  const user = useAuth((s) => s.user);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : (user?.name?.[0] ?? "?").toUpperCase();

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user?.name ?? "";
  const email = profile?.email ?? user?.email ?? "";

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
          <ListItem
            title={fullName}
            subtitle={email}
            icon={
              <Avatar
                label={initials}
                uri={profile?.profileImageUrl}
                size={40}
                round
                pillar="health"
              />
            }
            right={<Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />}
            onPress={() => router.push("/account")}
            last
            testID="account-row"
          />
        </Card>

        {sections && sections.length > 0 && (
          <Card>
            {sections.map((s, i) => (
              <ListItem
                key={s.href}
                title={tr(lang, s.title)}
                icon={<Ionicons name={s.icon} size={18} color={t.colors.text} />}
                right={<Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />}
                onPress={() => router.push(s.href as any)}
                last={i === sections.length - 1}
              />
            ))}
          </Card>
        )}

        {/* Qual versão está rodando de fato.
            Existe para responder sem adivinhação a pergunta que custou horas
            em 24/09/2026: "o update chegou?". `embedded` verdadeiro significa
            que o app roda o JavaScript que veio dentro do binário — nenhum
            update aplicado. Também é o que o suporte vai pedir quando um
            paciente disser que algo não funciona. Fica no menu, e não na
            conta, porque é aqui que o Bruno já sabe olhar. */}
        {(() => {
          const v = runningVersion(Constants.expoConfig?.version ?? "?");
          return (
            <Text
              variant="caption"
              color={t.colors.textMuted}
              style={{ textAlign: "center", fontSize: 10, marginTop: 4 }}
              testID="running-version"
            >
              {`v${v.app}`}
              {v.embedded
                ? ` · ${tr(lang, { en: "build only", pt: "só o build" })}`
                : v.updateId
                ? ` · ${tr(lang, { en: "update", pt: "update" })} ${v.updateId}`
                : ""}
            </Text>
          );
        })()}
      </View>
    </Screen>
  );
}
