import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Input, Button } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { AuthError } from "@/api/auth";
import { useTheme } from "@/theme/useTheme";

export default function Login() {
  const t = useTheme();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (e) {
      setError(
        e instanceof AuthError ? e.message : "Unable to sign in. Please try again."
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
          {/* Header */}
          <View style={{ gap: 6 }}>
            <Text variant="hero">Welcome back</Text>
            <Text variant="body" color={t.colors.textMuted} style={{ fontSize: 13 }}>
              Sign in to continue.
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
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              testID="login-email"
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="login-password"
            />
            <View style={{ marginTop: 10 }}>
              <Button
                title="Sign in"
                variant="primary"
                onPress={onSubmit}
                loading={loading}
                disabled={!email || !password}
                testID="login-submit"
                size="lg"
              />
            </View>
          </View>

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
            <Text variant="caption" color={t.colors.textMuted}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
          </View>

          {/* Social buttons */}
          <View style={{ gap: 9 }}>
            <Button title=" Continue with Apple" variant="ghost" size="md" />
            <Button title="G  Continue with Google" variant="ghost" size="md" />
          </View>

          {/* Language switcher */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            <Pressable style={{
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999,
              backgroundColor: t.colors.primary, borderWidth: 1, borderColor: t.colors.primary,
            }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10.5, color: "#FFFFFF" }}>
                🌐 English
              </Text>
            </Pressable>
            <Pressable style={{
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999,
              backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border,
            }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10.5, color: "#4A4F59" }}>
                Português
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
