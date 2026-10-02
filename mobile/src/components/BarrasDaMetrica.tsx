/**
 * A tendência de uma métrica, em barras (118 T-9).
 *
 * ## Porque `View`s e não um gráfico
 *
 * `react-native-svg` não está instalado, e acrescentá-lo é um módulo nativo
 * novo — o que muda o *fingerprint* e faz o `eas update` **deixar de chegar aos
 * binários já instalados**. Um desenho bonito que ninguém recebe não é um
 * desenho.
 *
 * E a restrição dá o visual mais honesto: **uma barra que falta é inequívoca**.
 * No papel foi preciso uma regra para a linha não atravessar um dia sem dado;
 * aqui isso é a forma.
 *
 * A conta vive no `barras-da-metrica.ts` porque o que uma tela desenha não é
 * verificável numa suíte de testes; as alturas são.
 */
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { tendenciaEmBarras, type PontoDaSerie } from "@/lib/barras-da-metrica";

export function BarrasDaMetrica({
  serie,
  altura = 34,
  dias = 14,
}: {
  serie: PontoDaSerie[] | null | undefined;
  altura?: number;
  dias?: number;
}) {
  const t = useTheme();
  const lang = useLang();
  const tendencia = tendenciaEmBarras(serie, dias);

  /*
   * Sem tendência, **nada** — nem uma caixa vazia. Um espaço com eixos debaixo
   * de um número lê-se como "medimos e deu isto", quando o que houve foi não
   * haver medida.
   */
  if (!tendencia) return null;

  const formatar = (n: number) =>
    Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);

  return (
    <View style={{ marginTop: 10 }} testID="barras-da-metrica">
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: altura,
          gap: 2,
        }}
      >
        {tendencia.barras.map((b) => (
          <View key={b.dia} style={{ flex: 1, height: altura, justifyContent: "flex-end" }}>
            {b.altura === null ? (
              /*
               * O dia sem medição: um fio na base, para o lugar dele continuar a
               * existir. Sem nada, catorze dias com três medições pareceriam
               * três dias seguidos — e "há duas semanas" lê-se como "ontem".
               */
              <View
                style={{
                  height: 1,
                  borderRadius: 1,
                  backgroundColor: t.colors.border,
                }}
              />
            ) : (
              <View
                style={{
                  height: Math.max(2, altura * b.altura),
                  borderRadius: 2,
                  /* Uma cor só: a barra não julga — ver a regra da 099 T-2. */
                  backgroundColor: t.colors.primary,
                  opacity: 0.85,
                }}
              />
            )}
          </View>
        ))}
      </View>

      {/*
        * Os limites do período, escritos. Uma barra cheia não quer dizer "bom":
        * quer dizer "o maior destes dias", e sem os números ninguém sabe qual.
        */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 10 }}>
          {formatar(tendencia.minimo)}
        </Text>
        <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 10 }}>
          {formatar(tendencia.maximo)}
        </Text>
      </View>

      {/*
        * **De quando são estas barras** (achado do code review).
        *
        * O gráfico não tinha data nenhuma. Catorze barras densas lêem-se como as
        * últimas duas semanas mesmo quando a última é de há um mês — e o número
        * grande acima só mostra a data quando não é de hoje.
        *
        * Só aparece quando o último dado **não é de hoje**: repeti-lo todos os
        * dias seria ruído.
        */}
      {tendencia.ultimoComDado !== tendencia.ate ? (
        <Text
          variant="caption"
          color={t.colors.textMuted}
          style={{ fontSize: 10, marginTop: 2 }}
          testID="barras-ultimo-dado"
        >
          {tr(lang, {
            en: `last reading ${tendencia.ultimoComDado}`,
            pt: `última leitura ${tendencia.ultimoComDado}`,
          })}
        </Text>
      ) : null}
    </View>
  );
}
