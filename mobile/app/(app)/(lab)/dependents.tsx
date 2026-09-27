import { useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Input, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { paraIsoDate, paraCampoDeData } from "@/lib/datas";
import { useVendoComo } from "@/store/vendo-como";
import {
  fetchDependentes,
  criarDependente,
  editarDependente,
  apagarDependente,
  type Dependente,
} from "@/api/dependents";

/**
 * Pessoas por quem eu peço (091 T-7; nasceu na T-2, que foi substituída).
 *
 * O Bruno, 27/09: *"crianças e adolescentes menor de idade sempre acompanhados
 * com os pais. São os pais que pedem para os filhos... se um pai ou uma mãe
 * quiser cadastrar um dependente para que esses exames saiam no nome da
 * criança, precisamos ter essa opção."*
 *
 * **A pessoa cadastrada aqui não tem conta.** Não há login, não há senha, e o
 * resultado do exame dela chega a quem responde por ela. A tela diz isso antes
 * do primeiro campo, porque quem cadastra um filho precisa saber onde o
 * resultado vai parar.
 *
 * O que se pede é o mínimo que o laboratório precisa para analisar a amostra
 * da pessoa certa: nome e data de nascimento. A data não é burocracia — é ela
 * que decide a faixa de referência do resultado, e um exame lido com a faixa
 * de um adulto é um exame errado.
 */

const VAZIO = { firstName: "", lastName: "", dateOfBirth: "", relationship: "" };

export default function Dependentes() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const entrarComo = useVendoComo((v) => v.entrar);
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  const lista = useQuery({ queryKey: ["lab-dependents"], queryFn: fetchDependentes });

  const fechar = () => {
    setForm(VAZIO);
    setEditando(null);
    setAberto(false);
  };

  const aoFalhar = (e: unknown) =>
    Alert.alert(
      tr(lang, { en: "Not saved", pt: "Não foi salvo" }),
      (e as Error).message || tr(lang, { en: "Try again.", pt: "Tente de novo." })
    );

  const salvar = useMutation({
    mutationFn: () => {
      const dados = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: paraIsoDate(form.dateOfBirth) ?? "",
        relationship: form.relationship.trim() || null,
      };
      return editando ? editarDependente(editando, dados) : criarDependente(dados);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-dependents"] });
      fechar();
    },
    onError: aoFalhar,
  });

  const remover = useMutation({
    mutationFn: apagarDependente,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-dependents"] }),
    onError: aoFalhar,
  });

  /**
   * Entrar na clínica como esta pessoa (091 T-7).
   *
   * O cache é limpo na entrada **e** na saída: sem isso, as telas seguiriam
   * mostrando o que já tinham — os dados da mãe, numa sessão que acabou de
   * virar da filha. Numa tela clínica, dado da pessoa errada com o nome certo
   * é o pior estado possível.
   */
  const verComo = async (d: Dependente) => {
    const ok = await entrarComo(d);
    if (!ok) {
      Alert.alert(
        tr(lang, { en: "Could not switch", pt: "Não foi possível trocar" }),
        tr(lang, { en: "Try again in a moment.", pt: "Tente de novo em instantes." })
      );
      return;
    }
    qc.clear();
    router.replace("/(app)/(clinica)");
  };

  const abrirEdicao = (d: Dependente) => {
    setForm({
      firstName: d.firstName,
      lastName: d.lastName,
      dateOfBirth: paraCampoDeData(d.dateOfBirth),
      relationship: d.relationship ?? "",
    });
    setEditando(d.id);
    setAberto(true);
  };

  const confirmarRemocao = (d: Dependente) =>
    Alert.alert(
      tr(lang, { en: "Remove this person?", pt: "Remover esta pessoa?" }),
      tr(lang, {
        en: `${d.firstName} will no longer appear when you order a test. Tests already ordered are not affected.`,
        pt: `${d.firstName} deixa de aparecer quando você pedir um exame. Exames já pedidos não mudam.`,
      }),
      [
        { text: tr(lang, { en: "Cancel", pt: "Cancelar" }), style: "cancel" },
        {
          text: tr(lang, { en: "Remove", pt: "Remover" }),
          style: "destructive",
          onPress: () => remover.mutate(d.id),
        },
      ]
    );

  const podeSalvar =
    form.firstName.trim().length > 0 && form.lastName.trim().length > 0 && form.dateOfBirth.trim().length > 0;

  return (
    <Screen scroll testID="dependentes-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          // "Pessoas por quem eu peço" era o nome de quando isto só servia para
          // pedir exame. Cuidar de alguém também é marcar a consulta dela.
          title: tr(lang, { en: "People I look after", pt: "Quem eu cuido" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={{ gap: 16 }}>
        <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 19 }}>
          {tr(lang, {
            en: "Someone you look after — a child, most often. You can book their consultation and order their blood test: it comes out in their name, and the result comes to you.",
            pt: "Alguém de quem você cuida — em geral um filho. Você pode marcar a consulta e pedir o exame dessa pessoa: sai no nome dela, e o resultado chega a você.",
          })}
        </Text>

        <Card style={{ backgroundColor: t.colors.labSoft, borderWidth: 0 }}>
          <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 19 }}>
            {tr(lang, {
              en: "A person added here has no account of their own: no login, and nothing arrives on their phone. A minor is always accompanied by whoever is responsible for them.",
              pt: "Uma pessoa adicionada aqui não tem conta própria: não faz login, e nada chega ao telefone dela. Um menor está sempre acompanhado de quem responde por ele.",
            })}
          </Text>
        </Card>

        {lista.isLoading ? (
          <Spinner center />
        ) : (
          <View style={{ gap: 10 }}>
            {(lista.data ?? []).map((d: Dependente) => (
              <Card key={d.id} testID={`dependente-${d.id}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="label" style={{ fontWeight: "700" }}>
                      {d.firstName} {d.lastName}
                    </Text>
                    <Text variant="caption" color={t.colors.textSecondary}>
                      {tr(lang, {
                        en: `${d.idade} years old`,
                        pt: `${d.idade} anos`,
                      })}
                      {d.relationship ? ` · ${d.relationship}` : ""}
                    </Text>
                  </View>
                  {/* Ver a clínica como esta pessoa (091 T-7).
                      O Bruno: *"é a criança que está fazendo o tratamento de
                      reabilitação."* Daqui a mãe entra na agenda, no protocolo
                      e nos exercícios da filha. */}
                  <Pressable
                    onPress={() => void verComo(d)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={tr(lang, {
                      en: `View the clinic as ${d.firstName}`,
                      pt: `Ver a clínica como ${d.firstName}`,
                    })}
                    testID={`ver-como-${d.id}`}
                  >
                    <Ionicons name="eye-outline" size={20} color={t.colors.lab} />
                  </Pressable>
                  <Pressable
                    onPress={() => abrirEdicao(d)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={tr(lang, { en: "Edit", pt: "Editar" })}
                    testID={`editar-${d.id}`}
                  >
                    <Ionicons name="create-outline" size={20} color={t.colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmarRemocao(d)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={tr(lang, { en: "Remove", pt: "Remover" })}
                    testID={`remover-${d.id}`}
                  >
                    <Ionicons name="trash-outline" size={20} color={t.colors.bad} />
                  </Pressable>
                </View>
              </Card>
            ))}

            {(lista.data ?? []).length === 0 && !aberto && (
              <Text variant="caption" color={t.colors.textMuted}>
                {tr(lang, {
                  en: "Nobody added yet.",
                  pt: "Ninguém adicionado ainda.",
                })}
              </Text>
            )}
          </View>
        )}

        {aberto ? (
          <Card testID="form-dependente">
            <View style={{ gap: 12 }}>
              <Text variant="label" style={{ fontWeight: "700" }}>
                {editando
                  ? tr(lang, { en: "Edit person", pt: "Editar pessoa" })
                  : tr(lang, { en: "Add a person", pt: "Adicionar uma pessoa" })}
              </Text>
              <Input
                label={tr(lang, { en: "First name", pt: "Nome" })}
                value={form.firstName}
                onChangeText={(v) => setForm({ ...form, firstName: v })}
                testID="dep-nome"
              />
              <Input
                label={tr(lang, { en: "Last name", pt: "Sobrenome" })}
                value={form.lastName}
                onChangeText={(v) => setForm({ ...form, lastName: v })}
                testID="dep-sobrenome"
              />
              <Input
                label={tr(lang, { en: "Date of birth", pt: "Data de nascimento" })}
                value={form.dateOfBirth}
                onChangeText={(v) => setForm({ ...form, dateOfBirth: v })}
                placeholder="DD/MM/YYYY"
                testID="dep-nascimento"
              />
              {/* Por que a data é obrigatória — dito onde a pergunta nasce, e
                  não num aviso genérico depois do erro. */}
              <Text variant="caption" color={t.colors.textMuted} style={{ lineHeight: 18 }}>
                {tr(lang, {
                  en: "Age matters to both: a result's reference range depends on it, and a minor is always accompanied.",
                  pt: "A idade importa nos dois: a faixa de referência de um resultado depende dela, e um menor está sempre acompanhado.",
                })}
              </Text>
              <Input
                label={tr(lang, { en: "Relationship (optional)", pt: "Parentesco (opcional)" })}
                value={form.relationship}
                onChangeText={(v) => setForm({ ...form, relationship: v })}
                placeholder={tr(lang, { en: "Daughter, son…", pt: "Filha, filho…" })}
                testID="dep-parentesco"
              />
              <Button
                title={
                  salvar.isPending
                    ? tr(lang, { en: "Saving…", pt: "Salvando…" })
                    : tr(lang, { en: "Save", pt: "Salvar" })
                }
                variant="primary"
                style={{ backgroundColor: t.colors.lab }}
                disabled={!podeSalvar || salvar.isPending}
                onPress={() => salvar.mutate()}
                testID="dep-salvar"
              />
              <Button
                title={tr(lang, { en: "Cancel", pt: "Cancelar" })}
                variant="ghost"
                onPress={fechar}
              />
            </View>
          </Card>
        ) : (
          <Button
            title={tr(lang, { en: "Add a person", pt: "Adicionar uma pessoa" })}
            variant="primary"
            style={{ backgroundColor: t.colors.lab }}
            onPress={() => setAberto(true)}
            testID="dep-abrir-form"
          />
        )}
      </View>
    </Screen>
  );
}
