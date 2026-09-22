import { View, Pressable, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchScreening } from "@/api/screening";
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
  const { data: screening } = useQuery({ queryKey: ["screening"], queryFn: fetchScreening });
  const accepted = screening?.consentGiven === true;
  const t = useTheme();

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
        </View>

        {/* O estado de aceite vem da triagem, onde `consentGiven` de fato mora.
            Antes daqui saía a frase "Você aceitou os termos em 04/06/2026" —
            uma data literal, exibida a qualquer paciente — e um selo de "Termos
            aceitos" que renderizava sempre, aceito ou não. */}
        {accepted ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={22} color={t.colors.ok} />
              <Text variant="label" color={t.colors.ok} style={{ fontWeight: "600" }}>Termos aceitos</Text>
            </View>
          </Card>
        ) : (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name="information-circle-outline" size={22} color={t.colors.textSecondary} />
              <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1 }}>
                Você ainda não aceitou os termos. O aceite é feito na última etapa da sua avaliação.
              </Text>
            </View>
          </Card>
        )}

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
