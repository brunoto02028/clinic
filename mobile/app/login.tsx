import { useEffect, useState } from "react";
import { View, KeyboardAvoidingView, Platform, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { Screen, Text, Input, Button, Logo } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { AuthError } from "@/api/auth";
import { ligarApple, ligarGoogle } from "@/api/social-link";
import {
  SocialCancelado,
  appleDisponivel,
  credencialDaApple,
  googlePronto,
  tokenDoGoogle,
  type CredencialApple,
} from "@/lib/social-signin";
import { useTheme } from "@/theme/useTheme";
import { deviceLang, t as tr, type Lang } from "@/lib/i18n";

/** A credencial de um provedor, enquanto ela ainda não virou sessão. */
type Pendente =
  | null
  | { tipo: "google"; idToken: string }
  | ({ tipo: "apple" } & CredencialApple);

export default function Login() {
  const t = useTheme();
  const login = useAuth((s) => s.login);
  const loginComGoogle = useAuth((s) => s.loginComGoogle);
  const loginComApple = useAuth((s) => s.loginComApple);
  const [lang, setLang] = useState<Lang>(deviceLang);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [social, setSocial] = useState<null | "google" | "apple">(null);
  const [temApple, setTemApple] = useState(false);

  /**
   * A credencial que ficou pendurada num 409 (097 T-2).
   *
   * O servidor recusou porque já existe conta com aquele e-mail e ela não tem
   * o provedor ligado — o e-mail sozinho não prova que é a mesma pessoa. A
   * prova a mais é a senha, e é por isso que a credencial fica guardada aqui:
   * assim que o login por senha dá certo, o vínculo se cria sem obrigar
   * ninguém a repetir a viagem toda.
   *
   * Só em memória, e só nesta tela. Sair daqui a descarta, que é o certo: ela
   * é de uma tentativa, não da pessoa.
   */
  const [pendente, setPendente] = useState<Pendente>(null);

  useEffect(() => {
    let vivo = true;
    void appleDisponivel().then((ok) => vivo && setTemApple(ok));
    return () => {
      vivo = false;
    };
  }, []);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      // A senha acabou de provar quem é. Se havia um provedor esperando, é
      // agora que ele entra — em silêncio: o login já deu certo, e uma falha
      // aqui não pode virar uma tela de erro sobre uma entrada bem-sucedida.
      if (pendente) {
        try {
          if (pendente.tipo === "google") {
            await ligarGoogle(pendente.idToken);
          } else {
            await ligarApple({
              identityToken: pendente.identityToken,
              nonce: pendente.nonce,
              fullName: pendente.fullName,
            });
          }
        } catch {
          /**
           * A entrada continua valendo — mas o silêncio, não.
           *
           * Isto engolia a falha com um "fica para a próxima". A pessoa tinha
           * acabado de ler *"entre com a sua senha uma vez e a gente liga"*,
           * entrava, e saía acreditando que ligou. Da próxima o Google pedia a
           * senha de novo, sem explicação nenhuma.
           *
           * Um aviso que não bloqueia: ela entrou, que era o que queria, e fica
           * sabendo onde terminar o serviço.
           */
          Alert.alert(
            tr(lang, { en: "You are in", pt: "Você entrou" }),
            tr(lang, {
              en: "We could not connect your account this time. You can do it under Profile → Connected accounts.",
              pt: "Não foi possível conectar sua conta desta vez. Você pode fazer isso em Perfil → Contas conectadas.",
            })
          );
        }
        setPendente(null);
      }
      router.replace("/(app)/module-select");
    } catch (e) {
      // The API answers in English only, and "Invalid email or password" is
      // the message a patient meets most. The web already translates this
      // one; the app printed the raw string under a Portuguese screen.
      const wrongCredentials =
        e instanceof AuthError && /invalid (email|e-mail)|credenc/i.test(e.message);
      // O app é do paciente: uma conta da clínica é recusada na porta, e a
      // recusa precisa dizer o que fazer em vez de parecer senha errada.
      const clinicAccount = e instanceof AuthError && e.status === 403;
      setError(
        clinicAccount
          ? tr(lang, {
              en: "The BPR app is for patients. This is a clinic account — please use bpr.clinic in your browser.",
              pt: "O app da BPR é para pacientes. Esta é uma conta da clínica — use o bpr.clinic no navegador.",
            })
          : wrongCredentials
          ? tr(lang, { en: "Invalid email or password", pt: "E-mail ou senha incorretos" })
          : e instanceof AuthError
            ? e.message
            : tr(lang, {
                en: "Unable to sign in. Please try again.",
                pt: "Não foi possível entrar. Tente de novo.",
              })
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Entrar com Google ou com Apple (097 T-3/T-4).
   *
   * Desistir não é erro: quem fecha a folha do Google não quer ler "não foi
   * possível entrar" — quer a tela de antes, como estava.
   */
  const entrarSocial = async (tipo: "google" | "apple") => {
    setError(null);
    setSocial(tipo);
    /**
     * A credencial é obtida **uma vez**, e fica aqui fora do `try`.
     *
     * É o que permite reaproveitá-la quando o servidor responde 409: pedi-la de
     * novo abriria a folha do Google uma segunda vez **em cima da mensagem de
     * erro** — ou, na Apple, pediria o Face ID outra vez. A pessoa acabou de
     * escolher a conta; perguntar de novo parece que algo deu errado nela.
     */
    let credencial: Pendente = null;
    try {
      credencial =
        tipo === "google"
          ? { tipo: "google", idToken: await tokenDoGoogle() }
          : { tipo: "apple", ...(await credencialDaApple()) };

      if (credencial.tipo === "google") {
        await loginComGoogle(credencial.idToken);
      } else {
        await loginComApple(credencial);
      }
      router.replace("/(app)/module-select");
    } catch (e) {
      if (e instanceof SocialCancelado) return;

      if (e instanceof AuthError && e.status === 409 && e.data?.code === "account_exists") {
        // Guardada para o login por senha logo abaixo: é ela que faz o vínculo
        // acontecer sozinho, sem uma segunda viagem ao provedor.
        setPendente(credencial);
        setError(
          e.data?.hasPassword === false
            ? tr(lang, {
                en: "There is already an account with this email, and it has no password yet. Use 'Forgot your password?' to set one.",
                pt: "Já existe uma conta com esse e-mail, e ela ainda não tem senha. Use 'Esqueceu sua senha?' para definir uma.",
              })
            : tr(lang, {
                // O segundo caminho existe porque o primeiro depende de os dois
                // passos acontecerem na mesma visita à tela. Quem sair no meio
                // — e o Bruno saiu — fica sem saber que há outro.
                en: "There is already an account with this email. Sign in with your password once and we will connect it — or connect it any time under Profile → Connected accounts.",
                pt: "Já existe uma conta com esse e-mail. Entre com a sua senha uma vez e a gente liga — ou ligue quando quiser em Perfil → Contas conectadas.",
              })
        );
        return;
      }

      if (e instanceof AuthError && e.status === 403) {
        setError(
          tr(lang, {
            en: "The BPR app is for patients. This is a clinic account — please use bpr.clinic in your browser.",
            pt: "O app da BPR é para pacientes. Esta é uma conta da clínica — use o bpr.clinic no navegador.",
          })
        );
        return;
      }

      setError(
        e instanceof AuthError
          ? e.message
          : tr(lang, {
              en: "Unable to sign in. Please try again.",
              pt: "Não foi possível entrar. Tente de novo.",
            })
      );
    } finally {
      setSocial(null);
    }
  };

  return (
    <Screen scroll testID="login-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ gap: 32, paddingVertical: 16 }}
      >
        <View style={{ gap: 32 }}>
          <Logo height={96} style={{ alignSelf: "center", marginBottom: 4 }} />

          {/* Header */}
          <View style={{ gap: 6 }}>
            <Text variant="hero">
              {tr(lang, { en: "Welcome back", pt: "Bem-vindo de volta" })}
            </Text>
            <Text variant="body" color={t.colors.textMuted} style={{ fontSize: 13 }}>
              {tr(lang, { en: "Sign in to continue.", pt: "Entre para continuar." })}
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 4 }}>
            {error ? (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: t.colors.badSoft,
                padding: 12,
                borderRadius: t.radius.md,
                marginBottom: 8,
              }}>
                <Ionicons name="alert-circle" size={18} color={t.colors.bad} />
                <Text variant="caption" color={t.colors.bad} testID="login-error" style={{ flex: 1 }}>
                  {error}
                </Text>
              </View>
            ) : null}
            <Input
              label={tr(lang, { en: "Email", pt: "E-mail" })}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              testID="login-email"
            />
            <Input
              label={tr(lang, { en: "Password", pt: "Senha" })}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="login-password"
            />
            <View style={{ marginTop: 10 }}>
              <Button
                title={tr(lang, { en: "Sign in", pt: "Entrar" })}
                variant="primary"
                onPress={onSubmit}
                loading={loading}
                disabled={!email || !password}
                testID="login-submit"
                size="lg"
              />
            </View>
            {/* Until this existed, "Invalid email or password" was the end of
                the road: the reset form lives on the website, and nothing here
                said so. The address already typed and the chosen language go
                along, so being locked out does not mean starting over. */}
            {/* Até aqui o app abria numa tela de entrar e quem não tinha conta
                não tinha caminho nenhum — a rota de cadastro existia e nenhuma
                tela chamava. */}
            <Pressable
              onPress={() => router.push("/register")}
              accessibilityRole="button"
              testID="login-create-account"
              style={{ alignSelf: "center", marginTop: 14, paddingVertical: 6, paddingHorizontal: 10 }}
            >
              <Text variant="caption" color={t.colors.text} style={{ fontWeight: "600" }}>
                {tr(lang, { en: "Create an account", pt: "Criar uma conta" })}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/forgot-password",
                  params: { email: email.trim(), lang },
                })
              }
              accessibilityRole="button"
              testID="login-forgot-password"
              style={{ alignSelf: "center", marginTop: 2, paddingVertical: 6, paddingHorizontal: 10 }}
            >
              <Text variant="caption" color={t.colors.textMuted}>
                {tr(lang, { en: "Forgot your password?", pt: "Esqueceu sua senha?" })}
              </Text>
            </Pressable>
          </View>

          {/* Os dois botões voltaram (097).
              Eles já estiveram aqui como desenho — sem onPress, sem provedor,
              sem rota — e foram tirados porque um botão que promete um caminho
              inexistente é pior que a ausência do botão. Agora há provedor:
              `/api/mobile/auth/google` e `/api/mobile/auth/apple`.
              Cada um só aparece onde de fato funciona: a Apple pergunta ao
              aparelho, e o Google fica fora do Android até o cliente OAuth de
              lá existir (ver GOOGLE_DISPONIVEL em lib/social-signin.ts). */}
          {temApple || googlePronto() ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
                <Text variant="caption" color={t.colors.textMuted}>
                  {tr(lang, { en: "or", pt: "ou" })}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
              </View>

              {temApple ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={
                    t.isDark
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={t.radius.md}
                  style={{ height: 50, opacity: social ? 0.6 : 1 }}
                  testID="login-apple"
                  onPress={() => {
                    if (!social) void entrarSocial("apple");
                  }}
                />
              ) : null}

              {googlePronto() ? (
                <Button
                  title={tr(lang, { en: "Continue with Google", pt: "Continuar com o Google" })}
                  variant="ghost"
                  size="lg"
                  loading={social === "google"}
                  disabled={!!social}
                  testID="login-google"
                  icon={<Ionicons name="logo-google" size={17} color={t.colors.text} />}
                  onPress={() => void entrarSocial("google")}
                />
              ) : null}
            </View>
          ) : null}

          {/* Language switcher */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {(["en", "pt"] as const).map((code) => {
              const active = lang === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => setLang(code)}
                  testID={`login-lang-${code}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 9999,
                    backgroundColor: active ? t.colors.primary : t.colors.surface,
                    borderWidth: 1,
                    borderColor: active ? t.colors.primary : t.colors.border,
                  }}
                >
                  <Text style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 10.5,
                    color: active ? t.colors.primaryFg : t.colors.textSecondary,
                  }}>
                    {code === "en" ? "🌐 English" : "Português"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
