import { useState } from "react";
import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { setIntent } from "@/api/onboarding";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * O que traz você aqui? (083)
 *
 * Sem esta pergunta o app tinha de adivinhar no primeiro segundo entre a casa
 * da clínica e a loja de exames — e adivinhava errado: depois do cadastro
 * mandava **todo mundo** para a triagem clínica, então quem baixou para
 * comprar um exame de vitamina D era interrogado sobre dor noturna, histórico
 * de câncer e disfunção de bexiga.
 *
 * Escolher a clínica é a pessoa dizendo "quero ser atendido": ela vira
 * paciente na hora, e a triagem passa a fazer sentido. Escolher o exame não
 * escreve nada — quem quer só um exame já é o que é.
 */
export default function WelcomeChoice() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [indo, setIndo] = useState<"lab" | "clinic" | null>(null);

  const escolher = async (intent: "lab" | "clinic", destino: string) => {
    setIndo(intent);
    try {
      await setIntent(intent);
      // A lista de áreas muda com a escolha: sem isto o app navegaria com a
      // resposta velha em cache e a guarda do módulo mandaria de volta.
      await qc.invalidateQueries({ queryKey: ["modules"] });
      router.replace(destino as any);
    } catch {
      setIndo(null);
    }
  };

  const Opcao = ({
    icone, cor, fundo, borda, titulo, corpo, onPress, testID,
  }: {
    icone: keyof typeof Ionicons.glyphMap; cor: string; fundo: string; borda: string;
    titulo: string; corpo: string; onPress: () => void; testID: string;
  }) => (
    <Pressable onPress={onPress} disabled={indo !== null} testID={testID}>
      <Card style={{ backgroundColor: fundo, borderColor: borda, borderWidth: 1 }}>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
          <Ionicons name={icone} size={26} color={cor} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", fontSize: 15 }}>{titulo}</Text>
            <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4, lineHeight: 17 }}>{corpo}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <Screen scroll testID="welcome-choice-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 16, paddingTop: 20 }}>
        <View>
          <Text variant="title" style={{ lineHeight: 30 }}>
            {user?.name
              ? tr(lang, { en: `What brings you here, ${user.name.split(" ")[0]}?`, pt: `O que traz você aqui, ${user.name.split(" ")[0]}?` })
              : tr(lang, { en: "What brings you here?", pt: "O que traz você aqui?" })}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 8, lineHeight: 19 }}>
            {tr(lang, {
              en: "You can change this later. It only decides where the app starts.",
              pt: "Você pode mudar depois. Isto só decide por onde o app começa.",
            })}
          </Text>
        </View>

        <Opcao
          icone="flask-outline" cor={t.colors.lab} fundo={t.colors.labSoft} borda={t.colors.lab}
          titulo={tr(lang, { en: "I want a blood test", pt: "Quero fazer um exame de sangue" })}
          corpo={tr(lang, {
            en: "A kit at home, collected with a finger-prick. No consultation, no clinic — the result is yours.",
            pt: "Kit em casa, picada no dedo. Sem consulta, sem clínica — o resultado é seu.",
          })}
          onPress={() => escolher("lab", "/(app)/profile-setup")}
          testID="choice-lab"
        />

        <Opcao
          icone="calendar-outline" cor={t.colors.health} fundo={t.colors.surface} borda={t.colors.border}
          titulo={tr(lang, { en: "I want to book an appointment", pt: "Quero marcar uma consulta" })}
          corpo={tr(lang, {
            en: "It starts with a short health questionnaire — the clinic needs it before your first session.",
            pt: "Começa com um questionário de saúde de poucos minutos — a clínica precisa dele antes da primeira sessão.",
          })}
          onPress={() => escolher("clinic", "/(app)/(clinica)/screening")}
          testID="choice-book"
        />

        <Opcao
          icone="heart-outline" cor={t.colors.work} fundo={t.colors.surface} borda={t.colors.border}
          titulo={tr(lang, { en: "I am already a BPR patient", pt: "Já sou paciente da BPR" })}
          corpo={tr(lang, {
            en: "Your record, your exercises and your conversations with your therapist.",
            pt: "Seu prontuário, seus exercícios e suas conversas com o terapeuta.",
          })}
          onPress={() => escolher("clinic", "/(app)/(clinica)/screening")}
          testID="choice-patient"
        />

        {indo && <Spinner center />}

        <Card>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Ionicons name="information-circle-outline" size={17} color={t.colors.textMuted} style={{ marginTop: 1 }} />
            <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1, lineHeight: 17 }}>
              {tr(lang, {
                en: "Choosing the test does not give you a record, exercises or messages — those belong to the clinic's patients. The day you book a consultation, they appear on their own.",
                pt: "Escolher o exame não dá prontuário, exercícios nem mensagens: são de quem é paciente da clínica. No dia em que marcar uma consulta, aparecem sozinhos.",
              })}
            </Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
