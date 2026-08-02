import { useState } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button } from "@/components/ui";
import { changePassword } from "@/api/change-password";
import { useTheme } from "@/theme/useTheme";

export default function ChangePassword() {
  const t = useTheme();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (newPass.length < 6) { setError("A nova senha deve ter no mínimo 6 caracteres."); return; }
    if (newPass !== confirm) { setError("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      await changePassword({ currentPassword: current || undefined, newPassword: newPass });
      setSuccess(true);
      setCurrent(""); setNewPass(""); setConfirm("");
    } catch (e) {
      setError((e as Error).message || "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll testID="change-password-screen">
      <Stack.Screen
        options={{ headerShown: true, title: "Alterar Senha", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 20 }}>
        <View>
          <Text variant="title">Alterar Senha</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>Atualize sua senha de acesso</Text>
        </View>

        {success && (
          <Card variant="highlight">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color={t.colors.ok} />
              <Text variant="label" color={t.colors.ok} style={{ fontWeight: "600" }}>Senha alterada com sucesso!</Text>
            </View>
          </Card>
        )}

        <Card>
          <Input
            label="Senha atual (opcional)"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            placeholder="Sua senha atual"
          />
          <Input
            label="Nova senha"
            value={newPass}
            onChangeText={v => { setNewPass(v); setSuccess(false); }}
            secureTextEntry
            placeholder="Mínimo 6 caracteres"
          />
          <Input
            label="Confirmar nova senha"
            value={confirm}
            onChangeText={v => { setConfirm(v); setSuccess(false); }}
            secureTextEntry
            placeholder="Repita a nova senha"
          />
          {error && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="alert-circle" size={14} color={t.colors.danger} />
              <Text variant="caption" color={t.colors.danger}>{error}</Text>
            </View>
          )}
          <Button
            title="Salvar nova senha"
            onPress={onSubmit}
            loading={loading}
            disabled={!newPass || !confirm}
          />
        </Card>
      </View>
    </Screen>
  );
}
