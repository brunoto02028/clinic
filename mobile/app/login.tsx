import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen, Text, Input, Button } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { AuthError } from "@/api/auth";

export default function Login() {
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
      router.replace("/home");
    } catch (e) {
      setError(
        e instanceof AuthError ? e.message : "Could not sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen testID="login-screen">
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <View style={{ gap: 4, alignItems: "center" }}>
          <Text variant="title" color="#5dc9c0">
            BPR Rehab
          </Text>
          <Text variant="caption" muted>
            Sign in to your patient account
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {error ? (
            <Text variant="caption" color="#dc2626" testID="login-error">
              {error}
            </Text>
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
          <Button
            title="Sign in"
            onPress={onSubmit}
            loading={loading}
            disabled={!email || !password}
            testID="login-submit"
          />
        </View>
      </View>
    </Screen>
  );
}
