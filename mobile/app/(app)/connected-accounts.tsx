import { useCallback, useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, ListItem, Button, Spinner } from "@/components/ui";
import {
  desligarProvedor,
  ligarApple,
  ligarGoogle,
  provedoresLigados,
  type ProvedoresLigados,
} from "@/api/social-link";
import {
  SocialCancelado,
  appleDisponivel,
  credencialDaApple,
  googlePronto,
  tokenDoGoogle,
} from "@/lib/social-signin";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * Contas conectadas (097 T-2).
 *
 * ## Por que esta tela existe
 *
 * A T-2 exige duas coisas do vínculo: que dê para **desfazer**, e que não dê
 * para ficar sem forma nenhuma de entrar. As duas precisam de um lugar onde a
 * pessoa veja o que está ligado — uma rota de API que ninguém alcança não
 * cumpre nenhuma das duas.
 *
 * ## O desligar que é recusado
 *
 * Quem entrou pelo Google e nunca definiu senha não tem outra porta. Desligar
 * ali seria trancar a pessoa do lado de fora da própria conta — então a linha
 * aparece, mas explica, e manda definir a senha primeiro. O servidor recusa de
 * novo, por conta própria: esta tela é a explicação, não a tranca.
 */
export default function ConnectedAccounts() {
  const t = useTheme();
  const lang = useLang();
  const [estado, setEstado] = useState<ProvedoresLigados | null>(null);
  const [ocupado, setOcupado] = useState<null | "google" | "apple">(null);
  const [erro, setErro] = useState<string | null>(null);
  const [temApple, setTemApple] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setEstado(await provedoresLigados());
    } catch {
      setEstado(null);
    }
  }, []);

  useEffect(() => {
    void carregar();
    let vivo = true;
    void appleDisponivel().then((ok) => vivo && setTemApple(ok));
    return () => {
      vivo = false;
    };
  }, [carregar]);

  const ligar = async (qual: "google" | "apple") => {
    setErro(null);
    setOcupado(qual);
    try {
      if (qual === "google") {
        await ligarGoogle(await tokenDoGoogle());
      } else {
        await ligarApple(await credencialDaApple());
      }
      await carregar();
    } catch (e) {
      // Desistir não é erro: quem fecha a folha do provedor quer a tela de
      // antes, como estava.
      if (!(e instanceof SocialCancelado)) {
        setErro(
          (e as Error)?.message ||
            tr(lang, { en: "We could not connect it.", pt: "Não foi possível conectar." })
        );
      }
    } finally {
      setOcupado(null);
    }
  };

  const desligar = (qual: "google" | "apple") => {
    const nome = qual === "google" ? "Google" : "Apple";
    Alert.alert(
      tr(lang, { en: `Disconnect ${nome}?`, pt: `Desconectar o ${nome}?` }),
      tr(lang, {
        en: "You will sign in with your email and password from now on.",
        pt: "A partir de agora você entra com e-mail e senha.",
      }),
      [
        { text: tr(lang, { en: "Cancel", pt: "Cancelar" }), style: "cancel" },
        {
          text: tr(lang, { en: "Disconnect", pt: "Desconectar" }),
          style: "destructive",
          onPress: async () => {
            setErro(null);
            setOcupado(qual);
            try {
              await desligarProvedor(qual);
              await carregar();
            } catch (e) {
              setErro(
                (e as Error)?.message ||
                  tr(lang, { en: "We could not disconnect it.", pt: "Não foi possível desconectar." })
              );
            } finally {
              setOcupado(null);
            }
          },
        },
      ]
    );
  };

  const semSenha = estado ? !estado.hasPassword : false;

  const linha = (qual: "google" | "apple", last?: boolean) => {
    const ligado = qual === "google" ? estado?.google : estado?.apple;
    const nome = qual === "google" ? "Google" : "Apple";
    // Desligar o último jeito de entrar deixaria a pessoa do lado de fora.
    const soRestaEste = ligado && semSenha;
    return (
      <ListItem
        key={qual}
        title={nome}
        subtitle={
          soRestaEste
            ? tr(lang, {
                en: "Connected — set a password before disconnecting",
                pt: "Conectado — defina uma senha antes de desconectar",
              })
            : ligado
              ? tr(lang, { en: "Connected", pt: "Conectado" })
              : tr(lang, { en: "Not connected", pt: "Não conectado" })
        }
        icon={
          <Ionicons
            name={qual === "google" ? "logo-google" : "logo-apple"}
            size={18}
            color={t.colors.text}
          />
        }
        last={last}
        testID={`connected-${qual}`}
        right={
          ocupado === qual ? (
            <Spinner />
          ) : (
            <Button
              title={
                ligado
                  ? tr(lang, { en: "Disconnect", pt: "Desconectar" })
                  : tr(lang, { en: "Connect", pt: "Conectar" })
              }
              variant={ligado ? "ghost" : "primary"}
              size="sm"
              disabled={!!ocupado || soRestaEste}
              onPress={() => (ligado ? desligar(qual) : void ligar(qual))}
              testID={`connected-${qual}-action`}
            />
          )
        }
      />
    );
  };

  const mostraGoogle = !!estado?.googleAvailable && (googlePronto() || !!estado?.google);
  const mostraApple = !!estado?.appleAvailable && (temApple || !!estado?.apple);

  return (
    <Screen scroll testID="connected-accounts-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Connected accounts", pt: "Contas conectadas" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 16 }}>
        <Text variant="caption" color={t.colors.textMuted}>
          {tr(lang, {
            en: "Sign in faster with an account you already have. We only ever receive your name, email and profile picture.",
            pt: "Entre mais rápido com uma conta que você já tem. Só recebemos o seu nome, e-mail e foto de perfil.",
          })}
        </Text>

        {erro ? (
          <Text variant="caption" color={t.colors.bad} testID="connected-error">
            {erro}
          </Text>
        ) : null}

        {estado === null ? (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <Spinner />
          </View>
        ) : !mostraGoogle && !mostraApple ? (
          <Card>
            <Text variant="caption" color={t.colors.textMuted}>
              {tr(lang, {
                en: "No sign-in provider is available on this device.",
                pt: "Nenhum provedor de entrada está disponível neste aparelho.",
              })}
            </Text>
          </Card>
        ) : (
          <Card>
            {mostraApple ? linha("apple", !mostraGoogle) : null}
            {mostraGoogle ? linha("google", true) : null}
          </Card>
        )}
      </View>
    </Screen>
  );
}
