import { useState } from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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
        e instanceof AuthError ? e.message : "Não foi possível entrar. Tente novamente."
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
          {/* Logo / Brand */}
          <View style={{ alignItems: "center", gap: 16 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}>
              <LinearGradient
                colors={["#1a3a45", "#4a7c8a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 80,
                  height: 80,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: "rgba(93, 201, 192, 0.3)",
                }}
              >
                <Ionicons name="body-outline" size={36} color="#5dc9c0" />
              </LinearGradient>
            </View>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text variant="title" color="#5dc9c0" style={{ letterSpacing: -0.5 }}>
                BPR Clinic
              </Text>
              <Text variant="body" color={t.colors.textMuted}>
                Portal do Paciente
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={{
            gap: 16,
            backgroundColor: "rgba(26, 39, 64, 0.6)",
            borderRadius: t.radius.xl,
            padding: 24,
            borderWidth: 1,
            borderColor: "rgba(74, 124, 138, 0.1)",
          }}>
            {error ? (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                padding: 12,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.2)",
              }}>
                <Ionicons name="alert-circle" size={18} color={t.colors.danger} />
                <Text variant="caption" color={t.colors.danger} testID="login-error" style={{ flex: 1 }}>
                  {error}
                </Text>
              </View>
            ) : null}
            <Input
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              testID="login-email"
            />
            <Input
              label="Senha"
              placeholder="Sua senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="login-password"
            />
            <Button
              title="Entrar"
              onPress={onSubmit}
              loading={loading}
              disabled={!email || !password}
              testID="login-submit"
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
