import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchProfile, updateProfile } from "@/api/profile";

const LOCALES = [
  { value: "en", label: "English" },
  { value: "pt", label: "Portuguese" },
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
  const [preferredLocale, setPreferredLocale] = useState("en");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setEmail(profile.email ?? "");
    setPhone(profile.phone ?? "");
    setDateOfBirth(profile.dateOfBirth ?? "");
    setPreferredLocale(profile.preferredLocale ?? "en");
  }, [profile]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    },
  });

  const handleSave = () => {
    mutation.mutate({
      firstName,
      lastName,
      phone,
      dateOfBirth: dateOfBirth || undefined,
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
          <Pressable
            style={{
              position: "absolute",
              bottom: 0,
              right: "50%",
              marginRight: -52,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: t.colors.primary,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: t.colors.background,
            }}
          >
            <Ionicons name="camera" size={14} color={t.colors.primaryFg} />
          </Pressable>
        </View>

        {/* Form */}
        <Card>
          <Input label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
          <Input label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
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
