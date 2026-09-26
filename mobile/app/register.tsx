import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, Pressable, Linking } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Input, Button, Logo } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { AuthError } from "@/api/auth";
import { API_URL } from "@/api/config";
import { useTheme } from "@/theme/useTheme";
import { localeToLang, t as tr, type Lang } from "@/lib/i18n";

/**
 * Creating an account from the phone.
 *
 * The route behind this has existed and worked for a while —
 * `POST /api/mobile/register` resolves the clinic, refuses an unknown
 * professional code rather than quietly putting the person in someone else's
 * tenant, checks the clinic's patient limit and hands back tokens. What was
 * missing was any way to reach it: the app opened on a sign-in screen and a
 * person without an account had nowhere to go.
 *
 * The four refusals are kept apart on purpose. "An account with this email
 * already exists" is the one a real patient meets — the clinic created their
 * record — and it is the one where a single generic error would be a dead end.
 *
 * Nothing here claims the Terms were accepted. The account is deliberately
 * created without `consentAcceptedAt`: the acceptance is the last step of the
 * assessment, which is where it is read and recorded. Saying "by continuing
 * you agree" would be collecting a consent this screen does not store.
 */
function deviceLang(): Lang {
  try {
    return localeToLang(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return "en";
  }
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8; // the server's own rule — checked here so it costs no round trip

export default function Register() {
  const t = useTheme();
  const registerAccount = useAuth((s) => s.register);
  const [lang, setLang] = useState<Lang>(deviceLang);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // O código do estúdio ou da clínica. Opcional: sem ele a conta entra na
  // clínica padrão, com ele no tenant daquele profissional — e um código que
  // não existe é recusado, nunca silenciosamente trocado pela padrão.
  const [professionalCode, setProfessionalCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  // O 409 não é um erro a ser lido e esquecido: é a pessoa certa na porta
  // errada. Quem a clínica já cadastrou chega aqui sem saber que tem conta,
  // e muitas vezes sem nunca ter definido senha.
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [loading, setLoading] = useState(false);

  const complete =
    firstName.trim() && lastName.trim() && email.trim() && password && confirm;

  const onSubmit = async () => {
    setError(null);
    setAlreadyExists(false);

    if (!EMAIL_SHAPE.test(email.trim())) {
      setError(tr(lang, { en: "That e-mail does not look right.", pt: "Esse e-mail não parece certo." }));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(
        tr(lang, {
          en: `Your password needs at least ${MIN_PASSWORD} characters.`,
          pt: `Sua senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`,
        })
      );
      return;
    }
    if (password !== confirm) {
      setError(tr(lang, { en: "The two passwords do not match.", pt: "As duas senhas não são iguais." }));
      return;
    }

    setLoading(true);
    try {
      await registerAccount(
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        password,
        professionalCode.trim() || undefined
      );
      // A conta nasce sem consentimento, de propósito: o aceite é a última
      // etapa da avaliação. Cair na home seria cair numa pilha de 403 do gate,
      // todos pela mesma causa. Aluno de estúdio não faz avaliação clínica —
      // a rota é bloqueada para o tenant dele —, então esse vai ao seletor.
      const criado = useAuth.getState().user;
      // A pergunta antes da suposição (083). Mandar todo cadastro para a
      // triagem clínica era interrogar sobre dor noturna e histórico de câncer
      // quem baixou o app para comprar um exame de vitamina D. Agora a pessoa
      // diz o que veio fazer, e a triagem é o caminho de quem escolheu a
      // clínica. Aluno de estúdio não faz avaliação clínica — vai ao seletor.
      router.replace(
        criado?.clinicType === "PERSONAL_TRAINER"
          ? "/(app)/module-select"
          : "/(app)/welcome-choice"
      );
    } catch (e) {
      const status = e instanceof AuthError ? e.status : undefined;
      if (status === 409) {
        setAlreadyExists(true);
      } else if (status === 403) {
        // The clinic is at its patient limit. Nothing the person can do, and
        // telling them to try again would be false.
        setError(
          tr(lang, {
            en: "This clinic cannot take new patients right now. Please contact them.",
            pt: "Esta clínica não pode receber novos pacientes agora. Fale com ela.",
          })
        );
      } else if (status === 404) {
        setError(
          tr(lang, {
            en: "We could not find that professional code. Check it, or leave it empty.",
            pt: "Não encontramos esse código do profissional. Confira, ou deixe em branco.",
          })
        );
      } else if (status === 503) {
        setError(
          tr(lang, {
            en: "Sign-up is unavailable at the moment. Please try again later.",
            pt: "O cadastro está indisponível no momento. Tente mais tarde.",
          })
        );
      } else {
        setError(
          e instanceof AuthError && e.message
            ? e.message
            : tr(lang, {
                en: "Unable to create your account. Please try again.",
                pt: "Não foi possível criar sua conta. Tente de novo.",
              })
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const legal = (path: string) => Linking.openURL(`${API_URL}${path}`).catch(() => {});

  return (
    <Screen scroll testID="register-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ gap: 28, paddingVertical: 16 }}
      >
          <Logo tone="ink" height={96} style={{ alignSelf: "center" }} />

          <View style={{ gap: 6 }}>
            <Text variant="hero">{tr(lang, { en: "Create your account", pt: "Crie sua conta" })}</Text>
            <Text variant="body" color={t.colors.textMuted} style={{ fontSize: 13 }}>
              {tr(lang, {
                en: "A few details and you are in.",
                pt: "Alguns dados e você já entra.",
              })}
            </Text>
          </View>

          {alreadyExists ? (
            <View
              style={{
                gap: 12,
                backgroundColor: t.colors.surface,
                borderWidth: 1,
                borderColor: t.colors.border,
                padding: 16,
                borderRadius: t.radius.md,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="person-circle-outline" size={22} color={t.colors.textSecondary} />
                <Text variant="label" style={{ fontWeight: "600", flex: 1 }} testID="register-already-exists">
                  {tr(lang, { en: "You already have an account here", pt: "Você já tem uma conta aqui" })}
                </Text>
              </View>
              <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 18 }}>
                {tr(lang, {
                  en: "Your clinic may have created it for you. Sign in, or set a password if you have never chosen one.",
                  pt: "Pode ter sido sua clínica que criou. Entre, ou defina uma senha se você nunca escolheu uma.",
                })}
              </Text>
              <Button
                title={tr(lang, { en: "Sign in", pt: "Entrar" })}
                variant="primary"
                size="sm"
                onPress={() => router.push("/login")}
                testID="register-go-signin"
              />
              <Button
                title={tr(lang, { en: "Set my password", pt: "Definir minha senha" })}
                variant="greige"
                size="sm"
                onPress={() =>
                  router.push({
                    pathname: "/forgot-password",
                    params: { email: email.trim().toLowerCase(), lang },
                  })
                }
                testID="register-go-set-password"
              />
            </View>
          ) : null}

          <View style={{ gap: 4 }}>
            {error ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: t.colors.badSoft,
                  padding: 12,
                  borderRadius: t.radius.md,
                  marginBottom: 8,
                }}
              >
                <Ionicons name="alert-circle" size={18} color={t.colors.bad} />
                <Text variant="caption" color={t.colors.bad} testID="register-error" style={{ flex: 1 }}>
                  {error}
                </Text>
              </View>
            ) : null}

            <Input
              label={tr(lang, { en: "First name", pt: "Nome" })}
              placeholder={tr(lang, { en: "Ana", pt: "Ana" })}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoComplete="given-name"
              testID="register-first-name"
            />
            <Input
              label={tr(lang, { en: "Last name", pt: "Sobrenome" })}
              placeholder={tr(lang, { en: "Lima", pt: "Lima" })}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoComplete="family-name"
              testID="register-last-name"
            />
            <Input
              label={tr(lang, { en: "Email", pt: "E-mail" })}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              testID="register-email"
            />
            <Input
              label={tr(lang, { en: "Password", pt: "Senha" })}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="register-password"
            />
            <Input
              label={tr(lang, { en: "Confirm password", pt: "Confirme a senha" })}
              placeholder="••••••••"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              testID="register-confirm-password"
            />
            <Input
              label={tr(lang, { en: "Professional code (optional)", pt: "Código do profissional (opcional)" })}
              placeholder={tr(lang, {
                en: "Your trainer or clinic code",
                pt: "O código do seu treinador ou clínica",
              })}
              value={professionalCode}
              onChangeText={setProfessionalCode}
              autoCapitalize="none"
              testID="register-professional-code"
            />

            <View style={{ marginTop: 10 }}>
              <Button
                title={tr(lang, { en: "Create account", pt: "Criar conta" })}
                variant="primary"
                size="lg"
                onPress={onSubmit}
                loading={loading}
                disabled={!complete}
                testID="register-submit"
              />
            </View>
          </View>

          {/* What happens next, said plainly. The Terms are accepted on the
              last step of the assessment, not here. */}
          <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center", lineHeight: 18 }}>
            {tr(lang, {
              en: "After this you complete a short assessment, where you read and accept the Terms of Use and the Privacy Policy.",
              pt: "Depois disto você preenche uma avaliação curta, onde lê e aceita os Termos de Uso e a Política de Privacidade.",
            })}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 18, marginTop: -14 }}>
            <Pressable onPress={() => legal("/terms")} accessibilityRole="link" testID="register-terms">
              <Text variant="caption" color={t.colors.textSecondary} style={{ textDecorationLine: "underline" }}>
                {tr(lang, { en: "Terms of Use", pt: "Termos de Uso" })}
              </Text>
            </Pressable>
            <Pressable onPress={() => legal("/privacy")} accessibilityRole="link" testID="register-privacy">
              <Text variant="caption" color={t.colors.textSecondary} style={{ textDecorationLine: "underline" }}>
                {tr(lang, { en: "Privacy Policy", pt: "Política de Privacidade" })}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/login")}
            accessibilityRole="button"
            testID="register-back-to-login"
            style={{ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 10 }}
          >
            <Text variant="caption" color={t.colors.textMuted}>
              {tr(lang, { en: "I already have an account", pt: "Já tenho uma conta" })}
            </Text>
          </Pressable>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {(["en", "pt"] as const).map((code) => {
              const active = lang === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => setLang(code)}
                  testID={`register-lang-${code}`}
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
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10.5, color: active ? t.colors.primaryFg : t.colors.textSecondary }}>
                    {code === "en" ? "🌐 English" : "Português"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
