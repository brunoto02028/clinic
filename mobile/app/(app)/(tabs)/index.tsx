import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchMe } from "@/api/patient";

export default function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  return (
    <Screen scroll testID="home-screen">
      <View style={{ gap: 16 }}>
        <Text variant="title">Início</Text>

        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <Text color="#dc2626">Não foi possível carregar seu perfil.</Text>
        ) : data ? (
          <Card>
            <Text variant="subtitle" testID="home-name">
              Olá, {data.user.firstName}
            </Text>
            <Text muted testID="home-clinic">
              {data.user.clinicName ?? "Sem clínica"}
            </Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
