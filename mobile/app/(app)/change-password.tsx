import { useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button } from "@/components/ui";
import { changePassword } from "@/api/change-password";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

export default function ChangePassword() {
  const t = useTheme();
  const lang = useLang();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (newPass.length < 6) {
      setError(tr(lang, {
        en: "The new password must be at least 6 characters.",
        pt: "A nova senha deve ter no mínimo 6 caracteres.",
      }));
      return;
    }
    if (newPass !== confirm) {
      setError(tr(lang, { en: "The passwords do not match.", pt: "As senhas não coincidem." }));
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword: current || undefined, newPassword: newPass });
      setSuccess(true);
      setCurrent(""); setNewPass(""); setConfirm("");
    } catch (e) {
      setError((e as Error).message
        || tr(lang, { en: "We could not change your password.", pt: "Não foi possível alterar a senha." }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll testID="change-password-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Change password", pt: "Alterar senha" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 20 }}>
        {/* The header already names the screen; repeating it read as
            "Alterar Senha Alterar Senha". */}
        <Text variant="body" color={t.colors.textSecondary}>
          {tr(lang, { en: "Update the password you sign in with", pt: "Atualize sua senha de acesso" })}
        </Text>

        {success && (
          <Card accent="health">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color={t.colors.ok} />
              <Text variant="label" color={t.colors.ok} style={{ fontWeight: "600" }}>
                {tr(lang, { en: "Password changed", pt: "Senha alterada com sucesso!" })}
              </Text>
            </View>
          </Card>
        )}

        <Card>
          <Input
            label={tr(lang, { en: "Current password (optional)", pt: "Senha atual (opcional)" })}
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            placeholder={tr(lang, { en: "Your current password", pt: "Sua senha atual" })}
          />
          <Input
            label={tr(lang, { en: "New password", pt: "Nova senha" })}
            value={newPass}
            onChangeText={v => { setNewPass(v); setSuccess(false); }}
            secureTextEntry
            placeholder={tr(lang, { en: "At least 6 characters", pt: "Mínimo 6 caracteres" })}
          />
          <Input
            label={tr(lang, { en: "Confirm new password", pt: "Confirmar nova senha" })}
            value={confirm}
            onChangeText={v => { setConfirm(v); setSuccess(false); }}
            secureTextEntry
            placeholder={tr(lang, { en: "Repeat the new password", pt: "Repita a nova senha" })}
          />
          {error && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="alert-circle" size={14} color={t.colors.danger} />
              <Text variant="caption" color={t.colors.danger}>{error}</Text>
            </View>
          )}
          <Button
            title={tr(lang, { en: "Save new password", pt: "Salvar nova senha" })}
            onPress={onSubmit}
            loading={loading}
            disabled={!newPass || !confirm}
          />
        </Card>
      </View>
    </Screen>
  );
}
