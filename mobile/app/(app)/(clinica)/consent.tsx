import { View, Pressable, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchScreening } from "@/api/screening";
import { fetchAccess } from "@/api/access";
import { fetchProfile } from "@/api/profile";
import { fetchTermos } from "@/api/terms";
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

/**
 * **O texto saiu daqui (26/09/2026).**
 *
 * Havia uma cópia local dos termos — duas seções, nove itens — enquanto os
 * publicados tinham quatro seções e vinte e seis, incluindo a do laboratório
 * inteira. O Bruno abriu esta tela para reler e achou curta. Estava.
 *
 * Duas cópias do mesmo texto divergem na primeira edição, e a esquecida é
 * sempre a que ninguém abre para editar — aqui, a que o paciente lê. Agora
 * vem do servidor, da mesma fonte que a página publicada.
 */
export default function Consent() {
  const { data: screening, isLoading, isError, refetch } = useQuery({ queryKey: ["screening"], queryFn: fetchScreening });
  const { data: access } = useQuery({ queryKey: ["patient-access"], queryFn: fetchAccess });
  // Two surfaces were answering "has this patient consented?" from two
  // different columns: the web gates the portal on `User.consentAcceptedAt`,
  // this screen read `screening.consentGiven`. A patient could be refused on
  // the web and told "Terms accepted" here. The server's own answer wins; the
  // screening stays as a fallback for the moment before access has loaded.
  const accepted = access
    ? access.onboarding.consentAccepted || screening?.consentGiven === true
    : screening?.consentGiven === true;
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  // English unless the patient chose Portuguese. The app has no i18n yet, so
  // this screen reads the same `preferredLocale` the profile screen writes.
  const lang: "en" | "pt" = profile?.preferredLocale?.startsWith("pt") ? "pt" : "en";
  // A chave inclui a língua: trocar de idioma tem de trocar o texto dos
  // termos junto, e não servir o do idioma anterior vindo do cache.
  const termos = useQuery({
    queryKey: ["termos", lang],
    queryFn: () => fetchTermos(lang === "pt" ? "pt-BR" : "en-GB"),
  });
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

        {/* The acceptance state comes from the server's own answer, the same
            one the web gates on. This used to print "Você aceitou os termos em
            04/06/2026" — a literal date shown to every patient — and an
            "accepted" badge that rendered whether or not they had. */}
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

        {/* O texto vem do servidor — a mesma fonte da página publicada. */}
        {termos.isLoading ? (
          <Card>
            <Text variant="caption" color={t.colors.textMuted}>
              {lang === "pt" ? "Carregando os termos…" : "Loading the terms…"}
            </Text>
          </Card>
        ) : termos.isError ? (
          // Sem texto, a tela não pode fingir que mostrou os termos: ela diz
          // que não conseguiu e oferece tentar de novo.
          <Card>
            <Text variant="caption" color={t.colors.bad}>
              {lang === "pt" ? "Não foi possível carregar os termos." : "We could not load the terms."}
            </Text>
            <Button title={UI[lang].retry} variant="health" size="sm" onPress={() => termos.refetch()} style={{ marginTop: 10 }} />
          </Card>
        ) : (
          (termos.data?.secoes ?? []).map((secao) => (
            <Card key={secao.chave}>
              <Text variant="label" style={{ fontWeight: "600", marginBottom: 8 }}>{secao.titulo}</Text>
              {secao.itens.map((item) => (
                <View key={item.n} style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                  <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2, minWidth: 16 }}>
                    {item.n}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" style={{ fontWeight: "700", marginBottom: 2 }}>{item.titulo}</Text>
                    <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 18 }}>
                      {item.corpo}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
