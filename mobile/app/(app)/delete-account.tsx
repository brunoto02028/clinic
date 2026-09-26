import { useState } from "react";
import { View, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Input } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { useAuth } from "@/store/auth";
import { apiFetch } from "@/api/client";

/**
 * Apagar a própria conta (090).
 *
 * A Apple exige isto de todo app que deixa criar conta, e é das rejeições mais
 * comuns. Mas a tela não existe só por causa da Apple — os nossos termos
 * publicados já prometem o direito de exclusão, e até hoje ele dependia de
 * alguém escrever para a clínica.
 *
 * **O que esta tela mais precisa acertar é o que ela promete.** A conta some;
 * o prontuário fica, porque a lei manda guardar e os termos dizem por quanto
 * tempo. Dizer "apagamos tudo" e guardar o registro seria mentir exatamente no
 * momento em que a pessoa decidiu confiar menos.
 *
 * Por isso a lista do que acontece vem **antes** do botão, e o botão só acorda
 * quando a pessoa escreve a palavra. Numa ação sem volta, o atrito é o ponto.
 */

export default function DeleteAccount() {
  const t = useTheme();
  const lang = useLang();
  const logout = useAuth((s) => s.logout);
  const [confirmacao, setConfirmacao] = useState("");

  const palavra = lang === "pt" ? "APAGAR" : "DELETE";

  const apagar = useMutation({
    mutationFn: () => apiFetch<{ success: boolean }>("/api/patient/account", { method: "DELETE" }),
    onSuccess: async () => {
      Alert.alert(
        tr(lang, { en: "Account deleted", pt: "Conta apagada" }),
        tr(lang, {
          en: "Your access has ended. Thank you for the time you spent with us.",
          pt: "Seu acesso foi encerrado. Obrigado pelo tempo que você passou conosco.",
        })
      );
      await logout();
      router.replace("/login");
    },
    onError: (e) =>
      Alert.alert(
        tr(lang, { en: "Not deleted", pt: "Não foi apagada" }),
        (e as Error).message ||
          tr(lang, { en: "Try again in a moment.", pt: "Tente de novo em instantes." })
      ),
  });

  const oQueAcontece = [
    {
      icone: "log-out-outline" as const,
      texto: {
        en: "You stop being able to sign in, from this moment.",
        pt: "Você deixa de conseguir entrar, a partir de agora.",
      },
    },
    {
      icone: "notifications-off-outline" as const,
      texto: {
        en: "Your phone stops receiving anything from the clinic.",
        pt: "Seu telefone para de receber qualquer coisa da clínica.",
      },
    },
    {
      icone: "document-text-outline" as const,
      texto: {
        en: "Your clinical record is kept for the period in the terms — the law requires it of the clinic, and it is not ours to delete on request.",
        pt: "Seu registro clínico é mantido pelo período que está nos termos — a lei exige isso da clínica, e ele não é nosso para apagar a pedido.",
      },
    },
    {
      icone: "mail-outline" as const,
      texto: {
        en: "To ask about the record itself, write to the clinic — that is a separate request, with its own answer.",
        pt: "Para tratar do registro em si, escreva à clínica — esse é outro pedido, com resposta própria.",
      },
    },
  ];

  return (
    <Screen scroll testID="delete-account-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Delete account", pt: "Apagar conta" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={{ gap: 16 }}>
        <Text variant="title">
          {tr(lang, { en: "Delete your account?", pt: "Apagar sua conta?" })}
        </Text>

        <Card style={{ backgroundColor: t.colors.badSoft, borderWidth: 0 }}>
          <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 19 }}>
            {tr(lang, {
              en: "This cannot be undone. Here is exactly what happens:",
              pt: "Isto não tem volta. Veja exatamente o que acontece:",
            })}
          </Text>
        </Card>

        {oQueAcontece.map((o) => (
          <View key={o.icone} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <Ionicons name={o.icone} size={18} color={t.colors.textMuted} style={{ marginTop: 2 }} />
            <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1, lineHeight: 19 }}>
              {tr(lang, o.texto)}
            </Text>
          </View>
        ))}

        <View style={{ gap: 8, marginTop: 8 }}>
          <Text variant="caption" color={t.colors.textSecondary}>
            {tr(lang, {
              en: `Type ${palavra} to confirm`,
              pt: `Escreva ${palavra} para confirmar`,
            })}
          </Text>
          <Input
            value={confirmacao}
            onChangeText={setConfirmacao}
            autoCapitalize="characters"
            autoCorrect={false}
            testID="confirmar-apagar"
          />
        </View>

        <Button
          title={
            apagar.isPending
              ? tr(lang, { en: "Deleting…", pt: "Apagando…" })
              : tr(lang, { en: "Delete my account", pt: "Apagar minha conta" })
          }
          variant="danger"
          size="lg"
          disabled={confirmacao.trim().toUpperCase() !== palavra || apagar.isPending}
          onPress={() => apagar.mutate()}
          testID="apagar-conta"
        />

        <Button
          title={tr(lang, { en: "Keep my account", pt: "Manter minha conta" })}
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}
