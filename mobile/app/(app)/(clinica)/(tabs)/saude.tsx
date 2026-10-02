/**
 * A aba Saúde: o resumo (118 T-1 e T-2).
 *
 * *"uma primeira página com um resumão de tudo e uma página para cada
 * informação, como o withings faz"*
 *
 * ## O que esta tela responde, e o que não
 *
 * Responde **uma** pergunta: *o que mudou desde ontem*. É a tela de alguém que
 * acorda e abre o telemóvel, não um painel de tudo — o tudo está nas cinco
 * páginas de família, a um toque daqui.
 *
 * ## O que está em falta é tão importante quanto os números
 *
 * **Hoje um relógio fora do pulso é indistinguível de um dia parado.** Zero
 * passos porque a pessoa não andou e zero passos porque o aparelho não
 * sincronizou desenham o mesmo gráfico, e levam a conclusões opostas sobre a
 * própria saúde. Por isso as pendências vêm **antes** dos destaques quando
 * existem: não adianta ler um número que não chegou.
 *
 * ## As regras que atravessam a aba inteira
 *
 * Nenhuma faixa de referência, nem em cor nem em palavra. Nenhuma pontuação
 * nossa. Buraco é buraco. A fonte é dita. EN e PT, inglês primeiro.
 */
import React from "react";
import { View, Pressable, ScrollView, RefreshControl } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { fetchWearableData, fetchConnections, fetchMetas } from "@/api/wearables";
import { LoadFailure } from "@/components/LoadFailure";
import { destaques, pendencias, metaDoDestaque, Destaque, Pendencia } from "@/lib/resumo-de-saude";
import { BarraDeMeta } from "@/components/BarraDeMeta";

/** As cinco famílias. A ordem é a do corpo, e é estável de propósito. */
const FAMILIAS = [
  { chave: "coracao", icone: "heart-outline", en: "Heart", pt: "Coração" },
  { chave: "sono", icone: "moon-outline", en: "Sleep", pt: "Sono" },
  { chave: "atividade", icone: "walk-outline", en: "Activity", pt: "Atividade" },
  { chave: "pressao", icone: "water-outline", en: "Blood pressure", pt: "Pressão" },
  { chave: "corpo", icone: "body-outline", en: "Body", pt: "Corpo" },
] as const;

/**
 * Para onde cada família leva: a página própria dela (118 T-3).
 *
 * A pressão é a exceção, e de propósito — ela já tem tela, com a atribuição da
 * braçadeira partilhada e o histórico. A página de família redireciona para lá
 * em vez de manter uma segunda versão a divergir da primeira.
 */
const DESTINO: Record<string, string> = {
  coracao: "/(app)/(clinica)/familia/coracao",
  sono: "/(app)/(clinica)/familia/sono",
  atividade: "/(app)/(clinica)/familia/atividade",
  pressao: "/(app)/(clinica)/blood-pressure",
  corpo: "/(app)/(clinica)/familia/corpo",
  /* As metas não são uma família — são o que dá sentido às barras delas. */
  metas: "/(app)/(clinica)/metas",
};

const ROTULO: Record<Destaque["chave"], { en: string; pt: string; unidade: string }> = {
  sono: { en: "Sleep", pt: "Sono", unidade: "h" },
  fcRepouso: { en: "Resting HR", pt: "FC repouso", unidade: "bpm" },
  hrv: { en: "HRV", pt: "HRV", unidade: "ms" },
  spo2: { en: "SpO2", pt: "SpO2", unidade: "%" },
  passos: { en: "Steps", pt: "Passos", unidade: "" },
};

function valorFormatado(d: Destaque): string {
  if (d.chave === "sono") {
    const h = Math.floor(d.valor / 60);
    const m = Math.round(d.valor % 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  if (d.chave === "passos") return Math.round(d.valor).toLocaleString();
  return String(Math.round(d.valor));
}

export default function SaudeScreen() {
  /* Declaradas dentro para apanharem o idioma do hook sem o passar por todo o lado. */
  const t = useTheme();
  const lang = useLang();

  const dados = useQuery({
    queryKey: ["wearable-data", 30],
    queryFn: () => fetchWearableData(30),
  });
  const ligacoes = useQuery({
    queryKey: ["wearable-connections"],
    queryFn: fetchConnections,
  });
  const metas = useQuery({ queryKey: ["metas"], queryFn: fetchMetas });

  const saudacao = (): string => {
    const h = new Date().getHours();
    if (h < 12) return tr(lang, { en: "Good morning", pt: "Bom dia" });
    if (h < 19) return tr(lang, { en: "Good afternoon", pt: "Boa tarde" });
    return tr(lang, { en: "Good evening", pt: "Boa noite" });
  };

  const dataPorExtenso = (): string => {
    const d = new Date();
    try {
      return d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      /* Um `Intl` em falta não pode derrubar a primeira tela da aba. */
      return d.toISOString().slice(0, 10);
    }
  };

  const lista = destaques((dados.data ?? []) as any);
  const faltas = pendencias((ligacoes.data ?? []) as any);
  const carregando = dados.isLoading || ligacoes.isLoading;

  const fraseDaPendencia = (p: Pendencia): { texto: string; acao?: string; para?: string } => {
    switch (p.tipo) {
      case "sem_aparelho":
        return {
          texto: tr(lang, {
            en: "No device connected yet. Nothing is being measured.",
            pt: "Nenhum aparelho ligado ainda. Nada está a ser medido.",
          }),
          acao: tr(lang, { en: "Connect", pt: "Ligar" }),
          para: "/(app)/(clinica)/wearables",
        };
      case "autorizacao_expirada":
        return {
          texto: tr(lang, {
            en: "The authorisation to your device account has expired. Nothing can be read until you grant it again.",
            pt: "A autorização à conta do seu aparelho expirou. Nada pode ser lido até a dar de novo.",
          }),
          acao: tr(lang, { en: "Reconnect", pt: "Reconectar" }),
          para: "/(app)/(clinica)/wearables",
        };
      case "falha_na_sincronizacao":
        return {
          texto: tr(lang, {
            en: `The last sync failed: ${p.mensagem}`,
            pt: `A última sincronização falhou: ${p.mensagem}`,
          }),
        };
      case "calado":
        return {
          texto: tr(lang, {
            en: `Nothing has arrived in ${p.dias} days. What you see below is older than that.`,
            pt: `Nada chegou há ${p.dias} dias. O que está abaixo é mais antigo do que isso.`,
          }),
          acao: tr(lang, { en: "Check device", pt: "Ver o aparelho" }),
          para: "/(app)/(clinica)/wearables",
        };
    }
  };

  return (
    <Screen testID="saude-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ gap: 18, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={dados.isRefetching}
            onRefresh={() => {
              dados.refetch();
              ligacoes.refetch();
            }}
            tintColor={t.colors.textSecondary}
          />
        }
      >
        {/*
          * O cabeçalho (118 T-4).
          *
          * A saudação e a data vêm da referência, e servem para a tela parecer
          * **de hoje** em vez de um painel sem tempo — é o que faz alguém abrir
          * de manhã.
          *
          * **O que não tem aqui: anéis de progresso.** Os da referência medem
          * contra metas, e nós não temos metas guardadas. Inventar "8.000
          * passos" seria pôr um alvo que o paciente não escolheu — a mesma
          * classe de coisa que a faixa de referência que saiu na 099 T-2. Os
          * números de hoje aparecem grandes, sem barra a dizer se são pouco.
          */}
        <View style={{ gap: 3, paddingTop: 6 }}>
          <Text
            variant="title"
            style={{ fontWeight: "700", fontSize: 26, letterSpacing: -0.4 }}
          >
            {saudacao()}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 13 }}>
            {dataPorExtenso()}
          </Text>
        </View>

        {/*
          * As pendências **antes** dos números: não adianta ler um valor que
          * não chegou, e um aparelho calado explica mais que qualquer gráfico.
          */}
        {faltas.map((p, i) => {
          const f = fraseDaPendencia(p);
          return (
            <View
              key={`${p.tipo}-${i}`}
              testID={`pendencia-${p.tipo}`}
              style={{
                padding: 14,
                borderRadius: t.radius.lg,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: t.colors.surface,
                gap: 10,
              }}
            >
              <Text variant="caption" style={{ fontSize: 13, lineHeight: 19 }}>
                {f.texto}
              </Text>
              {f.acao && f.para && (
                <Pressable
                  onPress={() => router.push(f.para as any)}
                  accessibilityRole="button"
                  style={{
                    alignSelf: "flex-start",
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                  }}
                >
                  <Text variant="caption" style={{ fontSize: 12.5, fontWeight: "600" }}>
                    {f.acao}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {carregando ? (
          <Spinner center />
        ) : dados.isError ? (
          <LoadFailure error={dados.error} onRetry={() => dados.refetch()} />
        ) : (
          <>
            {lista.length > 0 && (
              <View style={{ gap: 10 }} testID="destaques">
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {lista.map((d) => (
                    <Pressable
                      key={d.chave}
                      onPress={() => router.push(DESTINO[d.familia] as any)}
                      accessibilityRole="button"
                      testID={`destaque-${d.chave}`}
                      style={{
                        flexGrow: 1,
                        flexBasis: "46%",
                        padding: 14,
                        borderRadius: t.radius.lg,
                        borderWidth: 1,
                        borderColor: t.colors.border,
                        backgroundColor: t.colors.surface,
                        gap: 4,
                      }}
                    >
                      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
                        {tr(lang, ROTULO[d.chave])}
                      </Text>
                      <Text
                        variant="subtitle"
                        style={{ fontWeight: "700", fontSize: 24, letterSpacing: -0.5, marginTop: 2 }}
                      >
                        {valorFormatado(d)}
                        {ROTULO[d.chave].unidade ? (
                          <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
                            {" "}
                            {ROTULO[d.chave].unidade}
                          </Text>
                        ) : null}
                      </Text>
                      {/*
                        * A barra **só existe quando há meta** (118 T-7), e a
                        * meta é do paciente. Sem meta, o número aparece sozinho
                        * — é o que ele é, e nada na tela sugere que devia ser
                        * outro.
                        *
                        * O `dia` vai com ela porque o valor é o **último
                        * medido**, e uma barra cheia por uma leitura de sábado
                        * afirmaria a meta de hoje. Quem decide isso é a
                        * `BarraDeMeta`, que é a mesma das páginas de família.
                        */}
                      <BarraDeMeta
                        valor={d.valor}
                        meta={metaDoDestaque(d.chave, metas.data ?? null)}
                        dia={d.dia}
                        testID={`progresso-${d.chave}`}
                      />

                      {/*
                        * A variação **sem cor**: subir não é bom nem mau, e
                        * pintá-la de verde seria a faixa de referência a entrar
                        * pela porta dos fundos.
                        */}
                      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
                        {d.delta === null
                          ? tr(lang, { en: "not enough days yet", pt: "ainda sem dias para comparar" })
                          : Math.abs(d.delta) < 0.5
                            ? tr(lang, { en: "about the same", pt: "praticamente igual" })
                            : tr(lang, {
                                en: `${d.delta > 0 ? "+" : "−"}${Math.abs(Math.round(d.delta))} vs ${d.diasComparados}d ago`,
                                pt: `${d.delta > 0 ? "+" : "−"}${Math.abs(Math.round(d.delta))} vs há ${d.diasComparados}d`,
                              })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* As cinco famílias — o caminho para o detalhe. */}
            <View style={{ gap: 2 }} testID="familias">
              <Text
                variant="caption"
                color={t.colors.textSecondary}
                style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 11, fontWeight: "700", marginBottom: 6 }}
              >
                {tr(lang, { en: "Explore", pt: "Explorar" })}
              </Text>
              {[...FAMILIAS, { chave: "metas", icone: "flag-outline", en: "My goals", pt: "As minhas metas" } as const].map((f) => (
                <Pressable
                  key={f.chave}
                  onPress={() => router.push(DESTINO[f.chave] as any)}
                  accessibilityRole="button"
                  testID={`familia-${f.chave}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 13,
                    borderBottomWidth: 1,
                    borderBottomColor: t.colors.border,
                  }}
                >
                  <Ionicons name={f.icone as any} size={19} color={t.colors.textSecondary} />
                  <Text variant="body" style={{ flex: 1 }}>
                    {tr(lang, { en: f.en, pt: f.pt })}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
