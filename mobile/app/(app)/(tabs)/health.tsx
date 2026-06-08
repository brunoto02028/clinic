import { View } from "react-native";
import { router } from "expo-router";
import { Screen, Text, Button } from "@/components/ui";

const LINKS = [
  { label: "Pressão arterial", path: "/blood-pressure" },
  { label: "Scans 3D", path: "/foot-scans" },
  { label: "Tarefas", path: "/tasks" },
  { label: "Documentos", path: "/documents" },
  { label: "Educação", path: "/education" },
] as const;

export default function Health() {
  return (
    <Screen testID="health-screen">
      <View style={{ gap: 16 }}>
        <Text variant="title">Saúde & Dados</Text>
        <View style={{ gap: 10 }}>
          {LINKS.map((l) => (
            <Button
              key={l.path}
              title={l.label}
              variant="secondary"
              onPress={() => router.push(l.path)}
              testID={`health-link-${l.path}`}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}
