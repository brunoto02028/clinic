import { View, Pressable, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchScreening } from "@/api/screening";
import { fetchProfile } from "@/api/profile";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

/**
 * The clinic's terms, English first.
 *
 * English is the product's primary language and the canonical text here; the
 * Portuguese is the translation, and the screen falls back to English when the
 * patient has no preference stored.
 *
 * The AI line used to read "Google Gemini and Minimax for biomechanical
 * analysis and reports". That was wrong in the one direction a consent notice
 * must never be wrong: it named a provider the clinic's own policy forbids for
 * patient data ("NEVER send patient data to Minimax — Chinese jurisdiction, UK
 * GDPR risk"). What actually happens, with AI_STRICT_MODE on, is that clinical
 * text and images go to Anthropic via OpenRouter and the call fails rather than
 * falling back; recordings are transcribed by Groq with Google as fallback.
 * If AI_STRICT_MODE is ever turned off, this sentence stops being true.
 *
 * These are the CLINIC's terms. A studio's students are not clinic patients and
 * never reach this screen — the clinic module is not theirs.
 */
/** Screen copy, English canonical. Same rule as SECTIONS below. */
const UI = {
  en: {
    header: "Consent",
    title: "Terms of Use & Consent",
    checkFailed: "We could not check whether you have accepted.",
    retry: "Try again",
    accepted: "Terms accepted",
    notAccepted: "You have not accepted the terms yet. You accept them on the last step of your assessment.",
  },
  pt: {
    header: "Consentimento",
    title: "Termos de Uso e Consentimento",
    checkFailed: "Não foi possível verificar o seu aceite.",
    retry: "Tentar de novo",
    accepted: "Termos aceitos",
    notAccepted: "Você ainda não aceitou os termos. O aceite é feito na última etapa da sua avaliação.",
  },
} as const;

const SECTIONS: { en: { title: string; items: string[] }; pt: { title: string; items: string[] } }[] = [
  {
    en: {
      title: "Terms & Conditions of Service",
      items: [
        "This platform provides physical rehabilitation and health services.",
        "Clinical services follow the laws of England and Wales.",
        "All content, exercises and recommendations require professional supervision.",
        "Informed consent to treatment is required before any session.",
      ],
    },
    pt: {
      title: "Termos e Condições de Serviço",
      items: [
        "Esta plataforma oferece serviços de saúde e reabilitação física.",
        "Os serviços clínicos seguem as leis da Inglaterra e do País de Gales.",
        "Todo conteúdo, exercício e recomendação exige acompanhamento profissional.",
        "O consentimento informado para tratamento é obrigatório antes de qualquer sessão.",
      ],
    },
  },
  {
    en: {
      title: "Data Protection (UK GDPR)",
      items: [
        "Your data is processed on the basis of consent and legitimate interest.",
        "We collect: identification details, email, medical history and treatment data.",
        "Data retention: at least 5 years after your last treatment.",
        "Your rights: access, rectification, erasure and portability of your data.",
        "Use of AI: clinical analysis and reports are processed by Anthropic (Claude); recordings are transcribed by Groq, with Google as a fallback. Your data is not sent to any other AI provider.",
      ],
    },
    pt: {
      title: "Proteção de Dados (GDPR do Reino Unido)",
      items: [
        "Seus dados são processados com base no consentimento e no legítimo interesse.",
        "Coletamos: dados de identificação, e-mail, histórico médico e dados de tratamento.",
        "Retenção de dados: no mínimo 5 anos após o seu último tratamento.",
        "Seus direitos: acesso, retificação, exclusão e portabilidade dos seus dados.",
        "Uso de IA: análises clínicas e relatórios são processados pela Anthropic (Claude); gravações são transcritas pela Groq, com o Google como alternativa. Seus dados não são enviados a nenhum outro provedor de IA.",
      ],
    },
  },
];

export default function Consent() {
  const { data: screening, isLoading, isError, refetch } = useQuery({ queryKey: ["screening"], queryFn: fetchScreening });
  const accepted = screening?.consentGiven === true;
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  // English unless the patient chose Portuguese. The app has no i18n yet, so
  // this screen reads the same `preferredLocale` the profile screen writes.
  const lang: "en" | "pt" = profile?.preferredLocale?.startsWith("pt") ? "pt" : "en";
  const t = useTheme();

  return (
    <Screen scroll testID="consent-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: UI[lang].header,
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 20 }}>
        <View>
          <Text variant="title">{UI[lang].title}</Text>
        </View>

        {/* O estado de aceite vem da triagem, onde `consentGiven` de fato mora.
            Antes daqui saía a frase "Você aceitou os termos em 04/06/2026" —
            uma data literal, exibida a qualquer paciente — e um selo de "Termos
            aceitos" que renderizava sempre, aceito ou não. */}
        {/* Loading and failure are their own states. Falling through to the
            "not accepted" branch told a patient who had accepted that they
            had not, whenever the request was slow or failed. */}
        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <Text variant="body" style={{ textAlign: "center" }}>{UI[lang].checkFailed}</Text>
              <Button title={UI[lang].retry} variant="health" size="sm" onPress={() => refetch()} />
            </View>
          </Card>
        ) : accepted ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={22} color={t.colors.ok} />
              <Text variant="label" color={t.colors.ok} style={{ fontWeight: "600" }}>{UI[lang].accepted}</Text>
            </View>
          </Card>
        ) : (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name="information-circle-outline" size={22} color={t.colors.textSecondary} />
              <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1 }}>
{UI[lang].notAccepted}
              </Text>
            </View>
          </Card>
        )}

        {/* Terms sections */}
        {SECTIONS.map((section) => (
          <Card key={section.en.title}>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 8 }}>{section[lang].title}</Text>
            {section[lang].items.map((item, i) => (
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
