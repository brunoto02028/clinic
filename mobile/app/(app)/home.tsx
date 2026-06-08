import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchMe } from "@/api/patient";
import { useAuth } from "@/store/auth";

export default function Home() {
  const logout = useAuth((s) => s.logout);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Screen scroll testID="home-screen">
      <View style={{ gap: 16 }}>
        <Text variant="title">Welcome</Text>

        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <Text color="#dc2626">Could not load your profile.</Text>
        ) : data ? (
          <Card>
            <Text variant="subtitle" testID="home-name">
              {data.user.name}
            </Text>
            <Text muted testID="home-clinic">
              {data.user.clinicName ?? "No clinic"}
            </Text>
            <Text variant="caption" muted>
              {data.user.email}
            </Text>
          </Card>
        ) : null}

        <Button title="Log out" variant="ghost" onPress={onLogout} testID="logout" />
      </View>
    </Screen>
  );
}
