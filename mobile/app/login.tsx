import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Input, Button, Logo } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { AuthError } from "@/api/auth";
import { useTheme } from "@/theme/useTheme";
import { localeToLang, t as tr, type Lang } from "@/lib/i18n";

/**
 * Which language to open the sign-in screen in.
 *
 * `useLang()` cannot answer here: it reads the patient's `preferredLocale`,
 * and before sign-in there is no patient. The device's own locale is the only
 * honest guess, and the switcher below lets the person override it.
 *
 * Read through `Intl`, which Hermes and every browser already provide, rather
 * than adding a localisation package for one string.
 */
function deviceLang(): Lang {
  try {
    return localeToLang(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return "en";
  }
}

export default function Login() {
  const t = useTheme();
  const login = useAuth((s) => s.login);
  const [lang, setLang] = useState<Lang>(deviceLang);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(app)/module-select");
    } catch (e) {
      // The API answers in English only, and "Invalid email or password" is
      // the message a patient meets most. The web already translates this
      // one; the app printed the raw string under a Portuguese screen.
      const wrongCredentials =
        e instanceof AuthError && /invalid (email|e-mail)|credenc/i.test(e.message);
      setError(
        wrongCredentials
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

  return (
    <Screen testID="login-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: "center", gap: 32 }}>
          <Logo tone="ink" height={96} style={{ alignSelf: "center", marginBottom: 4 }} />

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

          {/* "Continue with Apple" and "Continue with Google" sat here with no
              onPress at all. Neither provider exists anywhere in the product —
              no NextAuth provider, no /api/mobile route, no native library — so
              they were mockup artwork on the first screen a patient ever sees.
              Someone taps them before finding the email field and concludes the
              app is broken, which is exactly what happened. Same reasoning that
              removed "Directions" from the home and "Add to calendar" from the
              booking confirmation. They come back when there is a provider
              behind them. */}

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
                    color: active ? "#FFFFFF" : "#4A4F59",
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
