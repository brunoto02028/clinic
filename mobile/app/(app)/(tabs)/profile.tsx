import { View } from "react-native";
import { router } from "expo-router";
import { Screen, Text, Button } from "@/components/ui";
import { useAuth } from "@/store/auth";

export default function Profile() {
  const logout = useAuth((s) => s.logout);

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Screen testID="profile-screen">
      <View style={{ gap: 16 }}>
        <Text variant="title">Perfil</Text>
        <Text muted>Seus dados aparecerão aqui.</Text>
        <Button title="Sair" variant="ghost" onPress={onLogout} testID="logout" />
      </View>
    </Screen>
  );
}
