import { useEffect, useRef, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { fetchProfile, updateProfile } from "@/api/profile";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme/useTheme";

const MENU_ITEMS = [
  { icon: "lock-closed-outline" as const, label: "Alterar Senha", path: "/change-password", color: "#f59e0b" },
  { icon: "trophy-outline" as const, label: "Conquistas", path: "/achievements", color: "#34d399" },
  { icon: "card-outline" as const, label: "Assinatura", path: "/membership", color: "#8b5cf6" },
  { icon: "clipboard-outline" as const, label: "Notas Clínicas", path: "/clinical-notes", color: "#60a5fa" },
  { icon: "help-circle-outline" as const, label: "Quizzes", path: "/quizzes", color: "#3b82f6" },
  { icon: "notifications-outline" as const, label: "Notificações", path: "/notifications", color: "#5dc9c0" },
  { icon: "document-text-outline" as const, label: "Termos & Consentimento", path: "/consent", color: "#64748b" },
  { icon: "book-outline" as const, label: "Guia do Portal", path: "/guide", color: "#6ba3b0" },
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
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [emergName, setEmergName] = useState("");
  const [emergPhone, setEmergPhone] = useState("");
  const [emergRelation, setEmergRelation] = useState("");
  const [saved, setSaved] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (data && !initialized.current) {
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
      setDob(data.dateOfBirth ?? "");
      setEmergName(data.emergencyContactName ?? "");
      setEmergPhone(data.emergencyContactPhone ?? "");
      setEmergRelation(data.emergencyContactRelation ?? "");
      initialized.current = true;
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updateProfile({
      phone: phone.trim() || null,
      address: address.trim() || null,
      dateOfBirth: dob.trim() || null,
      emergencyContactName: emergName.trim() || null,
      emergencyContactPhone: emergPhone.trim() || null,
      emergencyContactRelation: emergRelation.trim() || null,
    }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const onLogout = async () => {
    await logout();
    router.replace("/");
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
            <Card variant="highlight">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 64, height: 64, borderRadius: 32,
                  backgroundColor: "rgba(74, 124, 138, 0.2)",
                  borderWidth: 2, borderColor: "rgba(93, 201, 192, 0.3)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text variant="subtitle" color="#5dc9c0" style={{ fontSize: 22, fontWeight: "700" }}>
                    {initials}
                  </Text>
                </View>
                <View>
                  <Text variant="subtitle" testID="profile-name">
                    {data.firstName} {data.lastName}
                  </Text>
                  <Text variant="caption" color={t.colors.textSecondary} testID="profile-email" style={{ marginTop: 2 }}>
                    {data.email}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Personal info */}
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Ionicons name="person-outline" size={18} color={t.colors.secondary} />
                <Text variant="label" style={{ fontWeight: "600" }}>Informações pessoais</Text>
              </View>

              <Input
                label="Data de nascimento"
                value={dob}
                onChangeText={(v) => { setDob(v); setSaved(false); }}
                placeholder="dd/mm/aaaa"
                testID="profile-dob"
              />
              <Input
                label="Telefone"
                value={phone}
                onChangeText={(v) => { setPhone(v); setSaved(false); }}
                placeholder="+55 ..."
                keyboardType="phone-pad"
                testID="profile-phone"
              />
              <Input
                label="Endereço"
                value={address}
                onChangeText={(v) => { setAddress(v); setSaved(false); }}
                placeholder="Seu endereço..."
                testID="profile-address"
              />
            </Card>

            {/* Emergency contact */}
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                <Text variant="label" style={{ fontWeight: "600" }}>Contato de emergência</Text>
              </View>
              <Input
                label="Nome"
                value={emergName}
                onChangeText={(v) => { setEmergName(v); setSaved(false); }}
                placeholder="Nome completo"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Telefone"
                    value={emergPhone}
                    onChangeText={(v) => { setEmergPhone(v); setSaved(false); }}
                    placeholder="+55 ..."
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Parentesco"
                    value={emergRelation}
                    onChangeText={(v) => { setEmergRelation(v); setSaved(false); }}
                    placeholder="Ex: Cônjuge"
                  />
                </View>
              </View>
            </Card>

            {/* Save button */}
            <View style={{ gap: 6 }}>
              {saved && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <Ionicons name="checkmark-circle" size={16} color={t.colors.success} />
                  <Text variant="caption" color={t.colors.success} testID="profile-saved">Alterações salvas</Text>
                </View>
              )}
              {mutation.isError && (
                <Text variant="caption" color={t.colors.danger} style={{ textAlign: "center" }}>
                  {(mutation.error as Error)?.message || "Falha ao salvar."}
                </Text>
              )}
              <Button
                title="Salvar alterações"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
                testID="profile-save"
              />
            </View>
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
                flexDirection: "row", alignItems: "center", gap: 12,
                paddingVertical: 14, paddingHorizontal: 4,
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
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            paddingVertical: 14, borderRadius: t.radius.md,
            borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.15)",
            backgroundColor: pressed ? "rgba(239, 68, 68, 0.08)" : "transparent",
          })}
        >
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text variant="label" color="#f87171">Sair da conta</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
