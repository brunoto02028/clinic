import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

const SECTIONS = [
  {
    icon: "pulse-outline" as const,
    label: "Pressão arterial",
    desc: "Acompanhar medições",
    path: "/blood-pressure",
    color: "#ef4444",
  },
  {
    icon: "foot-outline" as const,
    label: "Scans 3D",
    desc: "Análise biomecânica",
    path: "/foot-scans",
    color: "#5dc9c0",
  },
  {
    icon: "checkbox-outline" as const,
    label: "Tarefas",
    desc: "Atividades pendentes",
    path: "/tasks",
    color: "#f59e0b",
  },
  {
    icon: "document-text-outline" as const,
    label: "Documentos",
    desc: "Laudos e exames",
    path: "/documents",
    color: "#3b82f6",
  },
  {
    icon: "school-outline" as const,
    label: "Educação",
    desc: "Material educativo",
    path: "/education",
    color: "#8b5cf6",
  },
] as const;

export default function Health() {
  const t = useTheme();

  return (
    <Screen scroll testID="health-screen">
      <View style={{ gap: 20 }}>
        <Text variant="title">Saúde & Dados</Text>

        <View style={{ gap: 12 }}>
          {SECTIONS.map((item) => (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path)}
              testID={`health-link-${item.path}`}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 16,
                backgroundColor: pressed ? "rgba(74, 124, 138, 0.12)" : "rgba(26, 39, 64, 0.8)",
                borderRadius: t.radius.lg,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.06)",
              })}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: `${item.color}15`,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontWeight: "600" }}>{item.label}</Text>
                <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                  {item.desc}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
