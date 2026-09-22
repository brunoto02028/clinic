import { useEffect, useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchProfile, updateProfile } from "@/api/profile";

// The system's Locale type is "en-GB" | "pt-BR" (lib/i18n.ts), and the web's
// switch writes exactly those. This wrote "en" / "pt", which nothing reads —
// so a patient who chose Portuguese kept receiving English email.
const LOCALES = [
  { value: "en-GB", label: "English" },
  { value: "pt-BR", label: "Português" },
];

export default function ProfileEdit() {
  const t = useTheme();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [preferredLocale, setPreferredLocale] = useState("en-GB");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setEmail(profile.email ?? "");
    setPhone(profile.phone ?? "");
    setDateOfBirth(profile.dateOfBirth ?? "");
    // Tolerates the short codes written before this was fixed.
    const stored = profile.preferredLocale ?? "en-GB";
    setPreferredLocale(stored.startsWith("pt") ? "pt-BR" : "en-GB");
  }, [profile]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    },
    // Without this the screen simply stayed put on failure. A patient typed
    // their date of birth in the format the placeholder asked for, hit Save,
    // and nothing happened — no error, no navigation — while the language
    // choice made in the same Save went down with it.
    onError: (e) => Alert.alert("Erro", (e as Error).message || "Não foi possível salvar."),
  });

  /** The field asks for DD/MM/YYYY; the API parses with `new Date`, which reads
   *  that as an Invalid Date. Convert here rather than ask the patient to type
   *  ISO. */
  const toIsoDate = (v: string): string | undefined => {
    const trimmed = v.trim();
    if (!trimmed) return undefined;
    const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return br ? `${br[3]}-${br[2]}-${br[1]}` : trimmed;
  };

  const handleSave = () => {
    mutation.mutate({
      // firstName/lastName are deliberately not sent: the endpoint's
      // allowedFields excludes them, so these were editable inputs whose
      // changes vanished without a word. The name is staff-managed; the
      // fields below are read-only until that changes.
      phone,
      dateOfBirth: toIsoDate(dateOfBirth),
      preferredLocale,
    });
  };

  if (isLoading) {
    return (
      <Screen testID="profile-edit-screen">
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Edit Profile",
            headerStyle: { backgroundColor: t.colors.background },
            headerTintColor: t.colors.text,
            headerShadowVisible: false,
          }}
        />
        <Spinner center />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="profile-edit-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Edit Profile",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={{ gap: 24 }}>
        {/* Avatar */}
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="person" size={40} color={t.colors.textMuted} />
          </View>
          {/* A camera badge sat here with no onPress: it gave touch feedback
              and did nothing. Same pattern removed from the home screen's
              "Directions". It comes back when there is an upload to run. */}
        </View>

        {/* Form */}
        <Card>
          <Input label="First Name" value={firstName} editable={false} />
          <Input label="Last Name" value={lastName} editable={false} />
          <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: -8, marginBottom: 8 }}>
            Para alterar seu nome, fale com a clínica.
          </Text>
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="Email" editable={false} />
          <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
          <Input label="Date of Birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="DD/MM/YYYY" />
        </Card>

        {/* Language preference */}
        <View style={{ gap: 8 }}>
          <Text variant="label" style={{ fontWeight: "600" }}>Language</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {LOCALES.map((loc) => (
              <Pressable
                key={loc.value}
                onPress={() => setPreferredLocale(loc.value)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: t.radius.md,
                  alignItems: "center",
                  backgroundColor: preferredLocale === loc.value ? t.colors.primary : t.colors.surface,
                  borderWidth: 1,
                  borderColor: preferredLocale === loc.value ? t.colors.primary : t.colors.border,
                }}
              >
                <Text
                  variant="label"
                  style={{
                    fontWeight: "600",
                    color: preferredLocale === loc.value ? t.colors.primaryFg : t.colors.text,
                  }}
                >
                  {loc.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Save */}
        <Button
          title="Save"
          variant="primary"
          onPress={handleSave}
          loading={mutation.isPending}
          disabled={mutation.isPending}
        />
      </View>
    </Screen>
  );
}
