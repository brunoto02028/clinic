import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Input, Button, Logo } from "@/components/ui";
import { AuthError, forgotPasswordRequest } from "@/api/auth";
import { useTheme } from "@/theme/useTheme";
import { localeToLang, t as tr, type Lang } from "@/lib/i18n";

/**
 * The way back in, for someone who is locked out.
 *
 * The app had no such screen. A patient who forgot their password met
 * "Invalid email or password" and nothing else — no link, no hint that the
 * website has a reset form. Their only way back was to already know the
 * product has a website, which is not something to ask of someone holding a
 * phone.
 *
 * It posts to the same route the website's form posts to, rather than
 * inventing a second one. The link itself arrives by e-mail and opens in the
 * browser, because that is where the token is spent; what this screen owns is
 * the asking.
 *
 * The confirmation deliberately does not say "we sent you an e-mail". The
 * server answers the same sentence for an address it has never seen, so that
 * nobody can use this form to find out who is a patient here — and saying
 * "sent" would be a lie to everyone who mistyped their address.
 */
function deviceLang(): Lang {
  try {
    return localeToLang(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return "en";
  }
}

export default function ForgotPassword() {
  const t = useTheme();
  const params = useLocalSearchParams<{ email?: string; lang?: string }>();
  // The language and the address the person already typed on the sign-in
  // screen come along, so being locked out does not mean starting over.
  const [lang] = useState<Lang>(() =>
    params.lang === "pt" || params.lang === "en" ? params.lang : deviceLang()
  );
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await forgotPasswordRequest(email.trim());
      setSent(true);
    } catch (e) {
      setError(
        e instanceof AuthError && e.message
          ? e.message
          : tr(lang, {
              en: "Unable to ask for a new password. Please try again.",
              pt: "Não foi possível pedir uma nova senha. Tente de novo.",
            })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll testID="forgot-password-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ gap: 32, paddingVertical: 16 }}
      >
        <View style={{ gap: 32 }}>
          <Logo tone="ink" height={96} style={{ alignSelf: "center", marginBottom: 4 }} />

          <View style={{ gap: 6 }}>
            <Text variant="hero">
              {tr(lang, { en: "Forgot your password?", pt: "Esqueceu sua senha?" })}
            </Text>
            <Text variant="body" color={t.colors.textMuted} style={{ fontSize: 13 }}>
              {tr(lang, {
                en: "Give us your e-mail and we will send a link to set a new one.",
                pt: "Informe seu e-mail e enviaremos um link para definir uma nova.",
              })}
            </Text>
          </View>

          {sent ? (
            <View style={{ gap: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  backgroundColor: t.colors.surface,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  padding: 14,
                  borderRadius: t.radius.md,
                }}
              >
                <Ionicons name="mail-outline" size={20} color={t.colors.textSecondary} />
                <Text
                  variant="caption"
                  color={t.colors.textSecondary}
                  style={{ flex: 1, lineHeight: 18 }}
                  testID="forgot-password-sent"
                >
                  {tr(lang, {
                    en: "If an account exists with that e-mail, a link to set a new password is on its way. It is valid for one hour and opens in your browser.",
                    pt: "Se existir uma conta com esse e-mail, um link para definir uma nova senha está a caminho. Ele vale por uma hora e abre no navegador.",
                  })}
                </Text>
              </View>
              <Button
                title={tr(lang, { en: "Back to sign in", pt: "Voltar para entrar" })}
                variant="primary"
                size="lg"
                onPress={() => router.replace("/login")}
                testID="forgot-password-back"
              />
            </View>
          ) : (
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
                  <Text
                    variant="caption"
                    color={t.colors.bad}
                    testID="forgot-password-error"
                    style={{ flex: 1 }}
                  >
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
                testID="forgot-password-email"
              />
              <View style={{ marginTop: 10, gap: 12 }}>
                <Button
                  title={tr(lang, { en: "Send the link", pt: "Enviar o link" })}
                  variant="primary"
                  size="lg"
                  onPress={onSubmit}
                  loading={loading}
                  disabled={!email}
                  testID="forgot-password-submit"
                />
                <Pressable
                  onPress={() => router.replace("/login")}
                  accessibilityRole="button"
                  testID="forgot-password-cancel"
                  style={{ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 10 }}
                >
                  <Text variant="caption" color={t.colors.textMuted}>
                    {tr(lang, { en: "Back to sign in", pt: "Voltar para entrar" })}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
