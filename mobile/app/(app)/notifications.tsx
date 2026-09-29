import { useEffect, useState } from "react";
import { View, Pressable, Switch, Linking } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchNotifications } from "@/api/notifications";
import { fetchProfile, updateProfile } from "@/api/profile";
import { permissaoDoSistema, registrarParaPush } from "@/lib/push";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr, pick } from "@/lib/i18n";
import { LoadFailure } from "@/components/LoadFailure";
import { appRouteFor } from "@/lib/app-route";

function getIconMap(t: ReturnType<typeof useTheme>): Record<string, { icon: string; color: string }> {
  return {
    appointment: { icon: "calendar-outline", color: t.colors.health },
    screening: { icon: "clipboard-outline", color: t.colors.work },
    profile: { icon: "person-outline", color: t.colors.warn },
    payment: { icon: "card-outline", color: t.colors.community },
    task: { icon: "checkbox-outline", color: t.colors.ok },
  };
}

export default function Notifications() {
  const t = useTheme();
  const lang = useLang();
  const ICON_MAP = getIconMap(t);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  /**
   * A chave do aviso no celular.
   *
   * Mora aqui porque é aqui que se procura por ela. E ela conta a verdade nos
   * dois níveis: desligada nos Ajustes do iPhone, uma chave ligada na tela
   * seria mentira — e ninguém lembra que desligou lá.
   */
  const [push, setPush] = useState<boolean | null>(null);
  const [permissao, setPermissao] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetchProfile()
      .then((p) => vivo && setPush(p.pushEnabled !== false))
      .catch(() => vivo && setPush(true));
    permissaoDoSistema().then((p) => vivo && setPermissao(p));
    return () => { vivo = false; };
  }, []);

  /**
   * Ligar aqui **pede a permissão ao sistema**, e não só grava a preferência.
   *
   * Antes, com a permissão ainda não pedida (`undetermined`), ligar a chave
   * gravava `pushEnabled: true` no servidor e pronto: nenhum pedido aparecia,
   * nenhum aparelho ficava registrado, e **nada chegava nunca**. A tela dizia
   * ligado e o telefone nunca tocava — exatamente no caso de quem acabou de
   * instalar, que é quem mais precisa do aviso da chamada.
   *
   * Se a pessoa recusar no pedido do sistema, a chave volta: a tela não pode
   * dizer que está ligado quando o sistema disse não.
   */
  const alternarPush = async (valor: boolean) => {
    setPush(valor);
    setSalvando(true);
    try {
      if (valor) {
        const token = await registrarParaPush();
        const agora = await permissaoDoSistema();
        setPermissao(agora);
        if (!token || agora !== "granted") {
          setPush(false);
          return;
        }
      }
      await updateProfile({ pushEnabled: valor });
    } catch {
      setPush(!valor); // não ficou salvo: a tela não pode dizer que ficou
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Screen scroll testID="notifications-screen">
      <Stack.Screen
        options={{ headerShown: true, title: tr(lang, { en: "Notifications", pt: "Notificações" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 16 }}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text variant="label">
                {tr(lang, { en: "Alerts on this phone", pt: "Avisos neste celular" })}
              </Text>
              <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2, lineHeight: 17 }}>
                {permissao === "denied"
                  ? tr(lang, {
                      en: "Turned off in your phone's Settings. Nothing will arrive until you allow it there.",
                      pt: "Desligado nos Ajustes do seu celular. Nada chega enquanto não liberar lá.",
                    })
                  : tr(lang, {
                      en: "Keep this on so your phone can reach you.",
                      pt: "Deixe ligado para o seu celular poder te alcançar.",
                    })}
              </Text>
              {permissao === "denied" && (
                <Pressable onPress={() => void Linking.openSettings()} hitSlop={8} style={{ marginTop: 6 }}>
                  <Text variant="caption" color={t.colors.health}>
                    {tr(lang, { en: "Open Settings", pt: "Abrir Ajustes" })}
                  </Text>
                </Pressable>
              )}
            </View>
            <Switch
              value={push === true && permissao !== "denied"}
              onValueChange={(v) => void alternarPush(v)}
              disabled={push === null || salvando || permissao === "denied"}
              testID="push-toggle"
            />
          </View>
        </Card>
        {/* O que de fato chega — nomeado, e com a chamada de vídeo primeiro.
            Uma chave sem dizer o que ela liga é uma decisão no escuro, e a
            consulta por vídeo é a única em que perder o aviso significa perder
            o atendimento: ela toca quando o profissional já entrou na sala. */}
        <Card>
          <Text variant="label" style={{ marginBottom: 10 }}>
            {tr(lang, { en: "What arrives on your phone", pt: "O que chega no seu celular" })}
          </Text>
          {[
            {
              icone: "videocam-outline" as const,
              en: "Your video consultation has started",
              pt: "Sua consulta por vídeo começou",
              enSub: "The one that matters most — it rings when the professional is already in the room.",
              ptSub: "O mais importante — ele toca quando o profissional já entrou na sala.",
            },
            {
              icone: "document-text-outline" as const,
              en: "A new document, prescription or result",
              pt: "Documento, receita ou resultado novo",
            },
            {
              icone: "chatbubble-outline" as const,
              en: "Your clinic wrote to you",
              pt: "Sua clínica escreveu para você",
            },
            {
              icone: "calendar-outline" as const,
              en: "An appointment was booked, moved or cancelled",
              pt: "Consulta marcada, remarcada ou cancelada",
            },
            {
              icone: "school-outline" as const,
              en: "New material for you to read",
              pt: "Material novo para você ler",
            },
            {
              icone: "barbell-outline" as const,
              en: "A reply to your exercise video, and activity reminders",
              pt: "Resposta ao seu vídeo de exercício, e lembretes de atividade",
            },
          ].map((linha, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 }}
            >
              <Ionicons name={linha.icone} size={18} color={t.colors.textMuted} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontSize: 14 }}>
                  {tr(lang, { en: linha.en, pt: linha.pt })}
                </Text>
                {linha.enSub ? (
                  <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 1, lineHeight: 16 }}>
                    {tr(lang, { en: linha.enSub, pt: linha.ptSub! })}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
          {/* A promessa que o texto do aviso cumpre, dita aqui para a pessoa
              saber que pode deixar ligado sem expor o tratamento dela. */}
          <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 17, marginTop: 2 }}>
            {tr(lang, {
              en: "The alert never says what it is about — the details stay inside the app, behind your phone's lock.",
              pt: "O aviso nunca diz do que se trata — o conteúdo fica dentro do app, atrás da senha do seu celular.",
            })}
          </Text>
        </Card>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          {unread > 0 && (
            <View style={{ backgroundColor: t.colors.badSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
              <Text variant="caption" color={t.colors.bad} style={{ fontWeight: "700", fontSize: 11 }}>{unread}</Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          /* A failed request is not "nothing pending". */
          <LoadFailure error={error} onRetry={() => refetch()} />
        ) : notifications.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <Ionicons name="notifications-off-outline" size={48} color={t.colors.textMuted} />
              <Text variant="subtitle" color={t.colors.textSecondary}>
                {tr(lang, { en: "All caught up", pt: "Tudo em dia!" })}
              </Text>
              <Text variant="caption" color={t.colors.textMuted}>
                {tr(lang, { en: "Nothing pending.", pt: "Nenhuma notificação pendente." })}
              </Text>
            </View>
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {notifications.map((notif) => {
              const iconInfo = ICON_MAP[notif.type] ?? { icon: "notifications-outline", color: t.colors.textMuted };
              // The API speaks the web's paths. Pushing "/dashboard/treatment"
              // into expo-router landed every notification on "Unmatched Route".
              const target = appRouteFor(notif.link);
              return (
                <Pressable
                  key={notif.id}
                  onPress={() => { if (target) router.push(target as any); }}
                  disabled={!target}
                  style={({ pressed }) => ({
                    flexDirection: "row", gap: 12, padding: 14,
                    backgroundColor: pressed ? t.colors.surfaceMuted : notif.isUrgent ? t.colors.badSoft : "transparent",
                    borderRadius: 12,
                    borderLeftWidth: notif.isUrgent ? 3 : 0,
                    borderLeftColor: t.colors.bad,
                  })}
                >
                  <View style={{
                    width: 42, height: 42, borderRadius: 12,
                    backgroundColor: `${iconInfo.color}15`,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name={iconInfo.icon as any} size={20} color={iconInfo.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={{ fontWeight: "600" }}>
                      {pick(lang, notif.title, notif.titlePt)}
                    </Text>
                    <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2, lineHeight: 18 }}>
                      {pick(lang, notif.message, notif.messagePt)}
                    </Text>
                  </View>
                  {notif.isUrgent && <Ionicons name="alert-circle" size={16} color={t.colors.bad} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}
