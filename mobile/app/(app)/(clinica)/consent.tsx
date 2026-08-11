import { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

const SECTIONS = [
  {
    title: "Termos & Condições de Serviço",
    items: [
      "A plataforma oferece serviços de saúde e reabilitação física.",
      "Os serviços clínicos seguem as leis da Inglaterra e País de Gales.",
      "Todos os conteúdos, exercícios e recomendações requerem acompanhamento profissional.",
      "O consentimento informado para tratamento é obrigatório antes de qualquer sessão.",
    ],
  },
  {
    title: "Proteção de Dados (GDPR)",
    items: [
      "Seus dados são processados com base no consentimento e interesse legítimo.",
      "Coletamos: dados de identificação, email, histórico médico, dados de tratamento.",
      "Retenção de dados: mínimo 5 anos após o último tratamento.",
      "Seus direitos: acesso, retificação, exclusão, portabilidade dos dados.",
      "Uso de IA: Google Gemini e Minimax para análise biomecânica e relatórios.",
    ],
  },
];

export default function Consent() {
  const t = useTheme();
  const [accepted, setAccepted] = useState(true);

  return (
    <Screen scroll testID="consent-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Consentimento",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 20 }}>
        <View>
          <Text variant="title">Termos de Uso & Consentimento</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>
            Você aceitou os termos em 04/06/2026
          </Text>
        </View>

        {/* Accepted badge */}
        <Card variant="highlight">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="checkmark-circle" size={22} color={t.colors.ok} />
            <View>
              <Text variant="label" color={t.colors.ok} style={{ fontWeight: "600" }}>Termos aceitos</Text>
              <Text variant="caption" color={t.colors.textSecondary}>
                Você pode atualizar abaixo se algo mudou.
              </Text>
            </View>
          </View>
        </Card>

        {/* Terms sections */}
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 8 }}>{section.title}</Text>
            {section.items.map((item, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>•</Text>
                <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
                  {item}
                </Text>
              </View>
            ))}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
