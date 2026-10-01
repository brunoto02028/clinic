/**
 * A página de uma família da aba Saúde (118 T-3).
 *
 * Uma tela, cinco configurações — em vez de cinco telas que divergem. O que
 * cada família leva está em `@/lib/familias-de-saude`, que é dado e testa-se;
 * aqui só se desenha.
 *
 * ## O que esta tela herda, e não vai perder
 *
 * - **buraco é buraco**, e dentro do dia há uma terceira categoria: *ainda não
 *   aconteceu*;
 * - **nenhuma faixa de referência**, nem em cor nem em palavra;
 * - **a fonte é dita** — de que aparelho veio;
 * - a variação **diz o que comparou**.
 */
import React, { useState } from "react";
import { View, ScrollView, Pressable, RefreshControl } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { fetchWearableData, fetchSerie } from "@/api/wearables";
import { LoadFailure } from "@/components/LoadFailure";
import { Tendencia, PontoDaSerie } from "@/components/Tendencia";
import { ODia, ANoite } from "@/components/ODiaEANoite";
import { diaLocal } from "@/lib/dia-e-noite-calculo";
import { familiaPorChave, valorMostrado, MetricaDaFamilia } from "@/lib/familias-de-saude";

export default function FamiliaScreen() {
  const t = useTheme();
  const lang = useLang();
  const { nome } = useLocalSearchParams<{ nome: string }>();
  const familia = familiaPorChave(String(nome ?? ""));

  const [janela, setJanela] = useState<7 | 30 | 90>(30);

  const dados = useQuery({
    queryKey: ["wearable-data", janela],
    queryFn: () => fetchWearableData(janela),
    enabled: !!familia,
  });

  const dia = useQuery({
    queryKey: ["wearable-serie", "INTRADAY"],
    queryFn: () => fetchSerie("INTRADAY"),
    enabled: !!familia?.temODia,
  });
  const noite = useQuery({
    queryKey: ["wearable-serie", "HYPNOGRAM"],
    queryFn: () => fetchSerie("HYPNOGRAM"),
    enabled: !!familia?.temANoite,
  });

  if (!familia) {
    return (
      <Screen testID="familia-desconhecida">
        <Text variant="body">
          {tr(lang, { en: "Unknown section.", pt: "Secção desconhecida." })}
        </Text>
      </Screen>
    );
  }

  /* Uma família com tela própria não se duplica aqui: manda-se para lá. */
  if (familia.telaPropria) {
    router.replace(familia.telaPropria as any);
    return <Screen><Spinner center /></Screen>;
  }

  const pontos = (dados.data ?? []) as any[];

  /**
   * A série de uma métrica, **um ponto por dia do período**.
   *
   * O servidor devolve só os dias com registo. Desenhar essa lista faria
   * catorze dias com três leituras virarem três barras encostadas, e a forma
   * mentiria sobre a frequência. O eixo é o calendário.
   */
  const serieDe = (m: MetricaDaFamilia): PontoDaSerie[] => {
    const porDia = new Map<string, number>();
    for (const p of pontos) {
      if (p.dataType !== familia.tipoDoPonto) continue;
      const v = p[m.campo as string];
      if (typeof v === "number") porDia.set(p.dataDate, valorMostrado(v, m));
    }
    const out: PontoDaSerie[] = [];
    const hoje = new Date();
    for (let i = janela - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const chave = diaLocal(d);
      out.push({ dia: chave, valor: porDia.has(chave) ? (porDia.get(chave) as number) : null });
    }
    return out;
  };

  const ultimoDe = (m: MetricaDaFamilia): number | null => {
    const comValor = pontos
      .filter((p) => p.dataType === familia.tipoDoPonto && typeof p[m.campo as string] === "number")
      .sort((a, b) => String(b.dataDate).localeCompare(String(a.dataDate)));
    if (comValor.length === 0) return null;
    return valorMostrado(comValor[0][m.campo as string], m);
  };

  const cartao = {
    padding: 16,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    gap: 12,
  } as const;

  const rotuloSecao = {
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: "700" as const,
  };

  const comAlgumValor = familia.metricas.some((m) => ultimoDe(m) !== null);

  return (
    <Screen scroll={false} testID={`familia-${familia.chave}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: familia.en, pt: familia.pt }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{ gap: 18, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={dados.isRefetching}
            onRefresh={() => {
              dados.refetch();
              if (familia.temODia) dia.refetch();
              if (familia.temANoite) noite.refetch();
            }}
            tintColor={t.colors.textSecondary}
          />
        }
      >
        <View style={{ flexDirection: "row", gap: 6 }} testID="janela-do-periodo">
          {([7, 30, 90] as const).map((d) => {
            const ativa = janela === d;
            return (
              <Pressable
                key={d}
                onPress={() => setJanela(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativa }}
                testID={`janela-${d}`}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: ativa ? t.colors.primary : t.colors.border,
                  backgroundColor: ativa ? t.colors.primary : "transparent",
                }}
              >
                <Text
                  variant="caption"
                  style={{ fontSize: 12.5, fontWeight: "600" }}
                  color={ativa ? t.colors.background : t.colors.textSecondary}
                >
                  {tr(lang, { en: `${d} days`, pt: `${d} dias` })}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {dados.isLoading ? (
          <Spinner center />
        ) : dados.isError ? (
          <LoadFailure error={dados.error} onRetry={() => dados.refetch()} />
        ) : (
          <>
            {/* O dia hora a hora — só onde faz sentido. */}
            {familia.temODia && (dia.data?.points?.length ?? 0) > 0 && (
              <View style={cartao} testID="o-dia">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text variant="caption" color={t.colors.textSecondary} style={rotuloSecao}>
                    {tr(lang, { en: "The day", pt: "O dia" })}
                  </Text>
                  <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
                    {dia.data?.dataDate ?? ""}
                    {dia.data?.provider ? ` · ${tr(lang, { en: "from your", pt: "do seu" })} ${dia.data.provider}` : ""}
                  </Text>
                </View>
                <ODia
                  pontos={dia.data!.points as any}
                  minutosPorPonto={dia.data?.bucketMinutes ?? 5}
                  ehHoje={dia.data?.dataDate === diaLocal()}
                />
              </View>
            )}

            {/* A noite, fase a fase. */}
            {familia.temANoite && (noite.data?.points?.length ?? 0) > 0 && (
              <View style={cartao} testID="a-noite">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text variant="caption" color={t.colors.textSecondary} style={rotuloSecao}>
                    {tr(lang, { en: "Last night", pt: "A noite" })}
                  </Text>
                  <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
                    {noite.data?.dataDate ?? ""}
                    {noite.data?.provider ? ` · ${tr(lang, { en: "from your", pt: "do seu" })} ${noite.data.provider}` : ""}
                  </Text>
                </View>
                <ANoite trechos={noite.data!.points as any} />
              </View>
            )}

            {/* Uma tendência por métrica da família. */}
            {familia.metricas.map((m) => {
              const ultimo = ultimoDe(m);
              if (ultimo === null) return null;
              return (
                <View key={m.campo} style={cartao} testID={`metrica-${m.campo}`}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                    <Text variant="caption" color={t.colors.textSecondary} style={rotuloSecao}>
                      {tr(lang, { en: m.en, pt: m.pt })}
                    </Text>
                    <Text variant="subtitle" style={{ fontWeight: "700" }}>
                      {m.casas ? ultimo.toFixed(m.casas) : Math.round(ultimo).toLocaleString()}
                      {m.unidade ? (
                        <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
                          {" "}
                          {m.unidade}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                  <Tendencia
                    pontos={serieDe(m)}
                    unidade={m.unidade}
                    casas={m.casas ?? 0}
                    deZero={m.deZero}
                  />
                </View>
              );
            })}

            {/*
              * O vazio que diz porquê. Uma família sem nenhuma leitura não é a
              * mesma coisa que uma família que não existe — e sem esta frase a
              * pessoa fica a achar que a tela está partida.
              */}
            {!comAlgumValor && (
              <View style={cartao} testID="familia-sem-dado">
                <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 13, lineHeight: 19 }}>
                  {tr(lang, {
                    en: "Nothing measured here yet. These values arrive from your device as it syncs.",
                    pt: "Nada medido aqui ainda. Estes valores chegam do seu aparelho à medida que ele sincroniza.",
                  })}
                </Text>
                <Pressable
                  onPress={() => router.push("/(app)/(clinica)/wearables")}
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
                    {tr(lang, { en: "See my devices", pt: "Ver os meus aparelhos" })}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* O ECG, com a conclusão do aparelho e nada nosso por cima. */}
            {familia.temEcg && (
              <Pressable
                onPress={() => router.push("/(app)/(clinica)/wearable-data")}
                accessibilityRole="button"
                style={[cartao, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                testID="ir-para-ecg"
              >
                <Text variant="body">{tr(lang, { en: "ECG recordings", pt: "Registos de ECG" })}</Text>
                <Text variant="caption" color={t.colors.textSecondary}>›</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
