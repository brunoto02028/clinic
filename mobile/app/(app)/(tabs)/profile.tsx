import { useEffect, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { fetchProfile, updateProfile } from "@/api/profile";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme/useTheme";

const MENU_ITEMS = [
  { icon: "trophy-outline" as const, label: "Conquistas", path: "/achievements", color: "#f59e0b" },
  { icon: "card-outline" as const, label: "Assinatura", path: "/membership", color: "#8b5cf6" },
  { icon: "help-circle-outline" as const, label: "Quizzes", path: "/quizzes", color: "#3b82f6" },
  { icon: "notifications-outline" as const, label: "Notificações", path: "/notifications", color: "#5dc9c0" },
];

export default function Profile() {
  const t = useTheme();
  const logout = useAuth((s) => s.logout);
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (data && !initialized.current) {
      setPhone(data.phone ?? "");
      initialized.current = true;
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updateProfile({ phone: phone.trim() }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const initials = data
    ? `${data.firstName?.[0] ?? ""}${data.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <Screen scroll testID="profile-screen">
      <View style={{ gap: 24 }}>
        <Text variant="title">Perfil</Text>

        {isLoading ? (
          <Spinner center />
        ) : isError || !data ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
              <Text color={t.colors.danger}>Não foi possível carregar o perfil.</Text>
            </View>
          </Card>
        ) : (
          <>
            {/* Profile header */}
            <View style={{ alignItems: "center", gap: 12 }}>
              <View style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(74, 124, 138, 0.2)",
                borderWidth: 2,
                borderColor: "rgba(93, 201, 192, 0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text variant="subtitle" color="#5dc9c0" style={{ fontSize: 24, fontWeight: "700" }}>
                  {initials}
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text variant="subtitle" testID="profile-name">
                  {data.firstName} {data.lastName}
                </Text>
                <Text variant="caption" color={t.colors.textSecondary} testID="profile-email" style={{ marginTop: 2 }}>
                  {data.email}
                </Text>
              </View>
            </View>

            {/* Phone edit */}
            <Card>
              <Text variant="label" style={{ fontWeight: "600", marginBottom: 4 }}>Telefone</Text>
              <Input
                value={phone}
                onChangeText={(val) => { setPhone(val); setSaved(false); }}
                placeholder="+55 ..."
                keyboardType="phone-pad"
                testID="profile-phone"
              />
              {saved ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={t.colors.success} />
                  <Text variant="caption" color={t.colors.success} testID="profile-saved">Salvo</Text>
                </View>
              ) : null}
              {mutation.isError ? (
                <Text variant="caption" color={t.colors.danger}>
                  {(mutation.error as Error)?.message || "Falha ao salvar."}
                </Text>
              ) : null}
              <Button
                title="Salvar"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
                testID="profile-save"
                size="sm"
              />
            </Card>
          </>
        )}

        {/* Menu */}
        <View style={{ gap: 2 }}>
          <Text variant="label" color={t.colors.textSecondary} style={{ marginBottom: 8 }}>Conta</Text>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path)}
              testID={`link-${item.path.slice(1)}`}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 4,
                backgroundColor: pressed ? "rgba(74, 124, 138, 0.08)" : "transparent",
                borderBottomWidth: i < MENU_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: "rgba(255, 255, 255, 0.04)",
              })}
            >
              <Ionicons name={item.icon} size={22} color={item.color} />
              <Text variant="body" style={{ flex: 1 }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          onPress={onLogout}
          testID="logout"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            backgroundColor: pressed ? "rgba(239, 68, 68, 0.08)" : "transparent",
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.15)",
          })}
        >
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text variant="label" color="#f87171">Sair da conta</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
