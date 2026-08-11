import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Input, Button } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { AuthError } from "@/api/auth";
import { useTheme } from "@/theme/useTheme";

export default function Register() {
  const t = useTheme();
  const register = useAuth((s) => s.register);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(firstName.trim(), lastName.trim(), email.trim(), password);
      router.replace("/(app)/module-select");
    } catch (e) {
      setError(
        e instanceof AuthError ? e.message : "Unable to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isValid = firstName.trim() && lastName.trim() && email.trim() && password && confirmPassword;

  return (
    <Screen scroll testID="register-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: "center", gap: 32, paddingVertical: 40 }}>
          <View style={{ gap: 6 }}>
            <Text variant="hero">Create account</Text>
            <Text variant="body" color={t.colors.textMuted} style={{ fontSize: 13 }}>
              Start your journey with BA One.
            </Text>
          </View>

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
                <Text variant="caption" color={t.colors.bad} style={{ flex: 1 }}>
                  {error}
                </Text>
              </View>
            ) : null}

            <Input
              label="First name"
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              testID="register-first-name"
            />
            <Input
              label="Last name"
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              testID="register-last-name"
            />
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              testID="register-email"
            />
            <Input
              label="Password"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="register-password"
            />
            <Input
              label="Confirm password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              testID="register-confirm-password"
            />

            <View style={{ marginTop: 10 }}>
              <Button
                title="Create account"
                variant="primary"
                onPress={onSubmit}
                loading={loading}
                disabled={!isValid}
                testID="register-submit"
                size="lg"
              />
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/login")}
            style={{ alignItems: "center", paddingVertical: 14 }}
          >
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11.5, color: t.colors.textMuted }}>
              Already have an account?{" "}
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11.5, color: t.colors.text }}>
                Sign in
              </Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
