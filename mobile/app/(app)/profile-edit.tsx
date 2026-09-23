import { useEffect, useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchProfile, updateProfile } from "@/api/profile";
import { useLang, t as tr } from "@/lib/i18n";

// The system's Locale type is "en-GB" | "pt-BR" (lib/i18n.ts), and the web's
// switch writes exactly those. This wrote "en" / "pt", which nothing reads —
// so a patient who chose Portuguese kept receiving English email.
const LOCALES = [
  { value: "en-GB", label: "English" },
  { value: "pt-BR", label: "Português" },
];

export default function ProfileEdit() {
  const t = useTheme();
  const lang = useLang();
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
    // The API sends "1990-05-12T00:00:00.000Z" into a field whose placeholder
    // says DD/MM/YYYY. The web splits on "T"; this showed the raw timestamp.
    const dob = profile.dateOfBirth ? String(profile.dateOfBirth).split("T")[0] : "";
    const iso = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    setDateOfBirth(iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : dob);
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
    onError: (e) => Alert.alert(
      tr(lang, { en: "Error", pt: "Erro" }),
      (e as Error).message || tr(lang, { en: "Could not save.", pt: "Não foi possível salvar." }),
    ),
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

  const nameMissing = !firstName.trim() || !lastName.trim();

  const handleSave = () => {
    if (nameMissing) {
      Alert.alert(
        tr(lang, { en: "Error", pt: "Erro" }),
        tr(lang, { en: "Your name cannot be empty.", pt: "Seu nome não pode ficar vazio." }),
      );
      return;
    }
    mutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
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
            title: tr(lang, { en: "Edit profile", pt: "Editar perfil" }),
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
          title: tr(lang, { en: "Edit profile", pt: "Editar perfil" }),
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
          <Input
            label={tr(lang, { en: "First name", pt: "Nome" })}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
          <Input
            label={tr(lang, { en: "Last name", pt: "Sobrenome" })}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
          {/* A disabled Save with no explanation is a dead end: the patient
              clears a field, the button greys out and nothing says why. */}
          {nameMissing && (
            <Text variant="caption" color={t.colors.danger} style={{ marginTop: -8, marginBottom: 8 }}>
              {tr(lang, {
                en: "Your first and last name cannot be empty.",
                pt: "Nome e sobrenome não podem ficar vazios.",
              })}
            </Text>
          )}
          {/* The e-mail stays read-only here on purpose: changing it is a
              verified flow of its own (the web asks for the password and mails
              a confirmation link), not a field on this form. */}
          <Input
            label={tr(lang, { en: "Email", pt: "E-mail" })}
            value={email}
            editable={false}
          />
          <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: -8, marginBottom: 8 }}>
            {tr(lang, {
              en: "To change your e-mail, ask the clinic.",
              pt: "Para alterar seu e-mail, fale com a clínica.",
            })}
          </Text>
          <Input
            label={tr(lang, { en: "Phone", pt: "Telefone" })}
            value={phone}
            onChangeText={setPhone}
            placeholder={tr(lang, { en: "Phone number", pt: "Número de telefone" })}
            keyboardType="phone-pad"
          />
          <Input
            label={tr(lang, { en: "Date of birth", pt: "Data de nascimento" })}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="DD/MM/YYYY"
          />
        </Card>

        {/* Language preference */}
        <View style={{ gap: 8 }}>
          <Text variant="label" style={{ fontWeight: "600" }}>
            {tr(lang, { en: "Language", pt: "Idioma" })}
          </Text>
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
          title={tr(lang, { en: "Save", pt: "Salvar" })}
          variant="primary"
          onPress={handleSave}
          loading={mutation.isPending}
          disabled={mutation.isPending || nameMissing}
        />
      </View>
    </Screen>
  );
}
