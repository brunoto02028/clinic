import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

const WEARABLE_LINKS = [
  { icon: "watch-outline" as const, label: "Dispositivos", desc: "Conectar wearables", path: "/wearables", color: "#8b5cf6" },
  { icon: "pulse-outline" as const, label: "Dados do Wearable", desc: "Sono, atividade, recuperação", path: "/wearable-data", color: "#5dc9c0" },
  { icon: "today-outline" as const, label: "Check-in Diário", desc: "Registro de bem-estar", path: "/daily-checkin", color: "#f59e0b" },
] as const;

const SECTIONS = [
  { icon: "analytics-outline" as const, label: "Progresso da Avaliação", desc: "Acompanhe suas etapas", path: "/assessment-progress", color: "#5dc9c0" },
  { icon: "speedometer-outline" as const, label: "Outcome Measures", desc: "Escala de dor e funcionalidade", path: "/outcome-measures", color: "#f59e0b" },
  { icon: "list-outline" as const, label: "Protocolo de Tratamento", desc: "Plano do terapeuta", path: "/treatment-protocol", color: "#34d399" },
  { icon: "checkbox-outline" as const, label: "Tarefas", desc: "Atividades pendentes", path: "/tasks", color: "#fbbf24" },
  { icon: "document-text-outline" as const, label: "Documentos", desc: "Laudos e exames", path: "/documents", color: "#3b82f6" },
  { icon: "school-outline" as const, label: "Educação", desc: "Material educativo", path: "/education", color: "#a78bfa" },
  { icon: "clipboard-outline" as const, label: "Notas Clínicas", desc: "SOAP notes das sessões", path: "/clinical-notes", color: "#60a5fa" },
] as const;

type LinkItem = (typeof WEARABLE_LINKS)[number] | (typeof SECTIONS)[number];

function LinkCard({ item, t }: { item: LinkItem; t: ReturnType<typeof useTheme> }) {
  return (
    <Pressable
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
  );
}

export default function Health() {
  const t = useTheme();

  return (
    <Screen scroll testID="health-screen">
      <View style={{ gap: 20 }}>
        <Text variant="title">Saúde & Dados</Text>

        <View style={{ gap: 12 }}>
          {WEARABLE_LINKS.map((item) => (
            <LinkCard key={item.path} item={item} t={t} />
          ))}
        </View>

        <View style={{ gap: 12 }}>
          {SECTIONS.map((item) => (
            <LinkCard key={item.path} item={item} t={t} />
          ))}
        </View>
      </View>
    </Screen>
  );
}
