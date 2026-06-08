import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { fetchProfile, updateProfile } from "@/api/profile";
import { useAuth } from "@/store/auth";

export default function Profile() {
  const logout = useAuth((s) => s.logout);
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const initialized = useRef(false);

  // Seed the input from the server value once, so a refetch (e.g. after save)
  // doesn't clobber what the user is typing.
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

  return (
    <Screen scroll testID="profile-screen">
      <View style={{ gap: 16 }}>
        <Text variant="title">Perfil</Text>

        {isLoading ? (
          <Spinner center />
        ) : isError || !data ? (
          <Text color="#dc2626">Não foi possível carregar o perfil.</Text>
        ) : (
          <>
            <Card>
              <Text variant="subtitle" testID="profile-name">
                {data.firstName} {data.lastName}
              </Text>
              <Text muted testID="profile-email">{data.email}</Text>
            </Card>

            <Card>
              <Text variant="label">Telefone</Text>
              <Input
                value={phone}
                onChangeText={(t) => { setPhone(t); setSaved(false); }}
                placeholder="+44 ..."
                keyboardType="phone-pad"
                testID="profile-phone"
              />
              {saved ? (
                <Text variant="caption" color="#16a34a" testID="profile-saved">
                  Salvo.
                </Text>
              ) : null}
              {mutation.isError ? (
                <Text variant="caption" color="#dc2626">
                  {(mutation.error as Error)?.message || "Falha ao salvar."}
                </Text>
              ) : null}
              <Button
                title="Salvar"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
                testID="profile-save"
              />
            </Card>
          </>
        )}

        <Button title="Sair" variant="ghost" onPress={onLogout} testID="logout" />
      </View>
    </Screen>
  );
}
