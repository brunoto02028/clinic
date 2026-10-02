/**
 * As metas diárias — definidas pelo paciente (118 T-7).
 *
 * *"o paciente define as metas"* — e a tela existe para que isso seja verdade
 * em vez de ser uma frase. Três decisões que vêm dessa:
 *
 * **Nada vem preenchido.** Um valor por omissão seria dar a alguém um alvo que
 * ele não escolheu, e depois desenhar uma barra a dizer o quanto lhe falta. É a
 * mesma classe de coisa que a faixa de referência que saiu na 099 T-2.
 *
 * **Dá para apagar.** Uma meta que não se consegue remover deixa de ser escolha
 * na primeira vez que a pessoa muda de ideias.
 *
 * **Só há meta para o que se faz, não para o que o corpo é.** Passos, minutos
 * ativos, calorias e sono — coisas que alguém decide fazer. Não há meta de
 * frequência cardíaca nem de oxigenação: isso seria deixar o paciente definir
 * uma régua sobre o próprio coração, que é o oposto do que a decisão pretendia.
 *
 * **E quem está a ver a conta de outra pessoa lê, não escreve.** A área do
 * responsável é de leitura por construção (091 T-7): o `apiFetch` recusa
 * qualquer escrita enquanto o token é emprestado. Deixar o botão ativo faria
 * alguém preencher as quatro caixas para só então ser mandado trocar de conta —
 * e aqui a regra é mais do que técnica: a meta é de quem a vai cumprir.
 */
import React, { useEffect, useState } from "react";
import { View, TextInput, Pressable, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { ApiError } from "@/api/client";
import { useVendoComo } from "@/store/vendo-como";
import { fetchMetas, salvarMetas } from "@/api/wearables";
import { LoadFailure } from "@/components/LoadFailure";
import {
  CAMPOS_DE_META,
  textoInicial,
  lerFormulario,
  mensagemDaRecusa,
} from "@/lib/metas-formulario";

/** A unidade dita por extenso, que é coisa da tela e não da conta. */
const UNIDADE: Record<string, { en: string; pt: string }> = {
  steps: { en: "per day", pt: "por dia" },
  activeMinutes: { en: "per day", pt: "por dia" },
  activeCalories: { en: "kcal per day", pt: "kcal por dia" },
  sleepMinutes: { en: "hours per night", pt: "horas por noite" },
};

export default function MetasScreen() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();

  /* Enquanto se vê a conta de outra pessoa, isto é uma tela de leitura. */
  const outraPessoa = useVendoComo((s) => s.pessoa);

  const metas = useQuery({ queryKey: ["metas"], queryFn: fetchMetas });
  const [texto, setTexto] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!metas.data) return;
    setTexto(textoInicial(metas.data));
  }, [metas.data]);

  const guardar = useMutation({
    mutationFn: salvarMetas,
    onSuccess: (novas) => {
      qc.setQueryData(["metas"], novas);
      qc.invalidateQueries({ queryKey: ["wearable-data"] });
      setErro(null);
    },
    /*
     * A recusa **no idioma do aparelho**. O `ApiError` traz as duas frases e
     * mostrar só `message` punha inglês num telemóvel em português — achado do
     * review da 084, e a mesma armadilha estava aqui.
     */
    onError: (e: unknown) =>
      setErro(
        e instanceof ApiError
          ? e.localizada(lang)
          : tr(lang, {
              en: "Could not save your goals. Try again.",
              pt: "Não foi possível guardar as suas metas. Tente outra vez.",
            })
      ),
  });

  const aoGuardar = () => {
    const leitura = lerFormulario(texto);
    if (!leitura.ok) {
      setErro(tr(lang, mensagemDaRecusa(leitura)));
      return;
    }
    setErro(null);
    guardar.mutate(leitura.corpo);
  };

  return (
    <Screen scroll={false} testID="metas-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "My goals", pt: "As minhas metas" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 28 }}>
        <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 13, lineHeight: 19 }}>
          {outraPessoa
            ? tr(lang, {
                en: `These are ${outraPessoa.firstName}'s own goals. You can see them here, not change them.`,
                pt: `Estas metas são de ${outraPessoa.firstName}. Aqui pode vê-las, não alterá-las.`,
              })
            : tr(lang, {
                en: "These are yours. Leave one empty and that number shows without a target — nothing is set for you.",
                pt: "Estas são suas. Deixe uma vazia e aquele número aparece sem alvo — nada é definido por si.",
              })}
        </Text>

        {metas.isLoading ? (
          <Spinner center />
        ) : metas.isError ? (
          <LoadFailure error={metas.error} onRetry={() => metas.refetch()} />
        ) : (
          <>
            {CAMPOS_DE_META.map((c) => (
              <View
                key={c.chave}
                testID={`meta-${c.chave}`}
                style={{
                  padding: 14,
                  borderRadius: t.radius.lg,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.surface,
                  gap: 8,
                }}
              >
                <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 12 }}>
                  {tr(lang, { en: c.en, pt: c.pt })} · {tr(lang, UNIDADE[c.chave])}
                </Text>
                <TextInput
                  value={texto[c.chave] ?? ""}
                  onChangeText={(v) => setTexto((s) => ({ ...s, [c.chave]: v }))}
                  editable={!outraPessoa}
                  keyboardType="numeric"
                  placeholder={tr(lang, { en: "no goal", pt: "sem meta" })}
                  placeholderTextColor={t.colors.textMuted}
                  accessibilityLabel={tr(lang, { en: c.en, pt: c.pt })}
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: t.colors.text,
                    paddingVertical: 4,
                  }}
                />
              </View>
            ))}

            {erro && (
              <Text variant="caption" color={t.colors.bad} style={{ fontSize: 13 }} testID="metas-erro">
                {erro}
              </Text>
            )}

            {!outraPessoa && (
            <Pressable
              onPress={aoGuardar}
              disabled={guardar.isPending}
              accessibilityRole="button"
              testID="guardar-metas"
              style={{
                alignSelf: "flex-start",
                paddingVertical: 11,
                paddingHorizontal: 20,
                borderRadius: 999,
                backgroundColor: t.colors.primary,
                opacity: guardar.isPending ? 0.6 : 1,
              }}
            >
              <Text variant="body" color={t.colors.background} style={{ fontWeight: "700" }}>
                {guardar.isPending
                  ? tr(lang, { en: "Saving…", pt: "A guardar…" })
                  : tr(lang, { en: "Save", pt: "Guardar" })}
              </Text>
            </Pressable>
            )}

            {guardar.isSuccess && !erro && (
              <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 12 }} testID="metas-guardadas">
                {tr(lang, { en: "Saved.", pt: "Guardado." })}
              </Text>
            )}

            <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11, lineHeight: 16 }}>
              {tr(lang, {
                en: "Your therapist can see these, so you can talk about them together.",
                pt: "O seu terapeuta vê estas metas, para poderem falar sobre elas.",
              })}
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
