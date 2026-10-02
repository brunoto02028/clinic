/**
 * A barra contra a meta — e o que ela tem de dizer quando a meta é passada
 * (118 T-7, achados do review de 02/10/2026).
 *
 * Vive num componente porque são **duas telas** a desenhá-la: o resumo da aba
 * Saúde e cada métrica da página de família. Enquanto era uma IIFE dentro do
 * JSX do resumo, as duas regras abaixo valiam num sítio só.
 *
 * ## Sem meta, nada
 *
 * A meta é do paciente. Não havendo, o número aparece sozinho — é o que ele é,
 * e nada na tela sugere que devia ser outro.
 *
 * ## Passar da meta tem de **aparecer**
 *
 * A largura de uma barra de 4px não pode passar dos 100%: é física. O que o
 * review apanhou é que, sem mais nada, quem andou 16.000 com meta de 8.000 via
 * **a mesma barra cheia** de quem andou 8.000 exactos — a regra *"quem andou o
 * dobro andou o dobro"* estava na função e desfeita no desenho.
 *
 * Então a barra continua cortada e a percentagem é dita por extenso. Dizer
 * "160% da sua meta" é relato; e é a única parte boa de um dia assim.
 *
 * ## E a barra é sobre **hoje**
 *
 * O resumo mostra o último valor medido, que pode ser de sábado. Debaixo de um
 * cabeçalho que diz "Boa tarde · terça", uma barra cheia afirma que a meta de
 * **hoje** foi cumprida — por um número de três dias antes. Quando o dia do
 * valor não é hoje, a barra não se desenha e a tela diz de quando é.
 */
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import {
  progresso,
  ehDeHoje,
  larguraDaBarra,
  passouDaMeta,
  porCentoDaMeta,
} from "@/lib/resumo-de-saude";

export interface BarraDeMetaProps {
  valor: number | null;
  meta: number | null;
  /**
   * O dia do valor, `YYYY-MM-DD`. Quando vem, a barra só se desenha se for
   * hoje. Omitido, desenha sempre — é o caso da página de família, que não
   * afirma nada sobre hoje.
   */
  dia?: string | null;
  testID?: string;
}

export function BarraDeMeta({ valor, meta, dia, testID }: BarraDeMetaProps) {
  const t = useTheme();
  const lang = useLang();

  const pr = progresso(valor, meta);
  if (!pr) return null;

  if (!ehDeHoje(dia)) {
    /*
     * Não é "sem dado": é dado de outro dia. Esconder a barra calado deixaria
     * a pessoa a achar que a meta desapareceu.
     */
    return (
      <Text
        variant="caption"
        color={t.colors.textSecondary}
        style={{ fontSize: 11, marginTop: 6 }}
        testID={testID ? `${testID}-nao-e-hoje` : undefined}
      >
        {tr(lang, {
          en: "Not today's reading — no progress drawn for today.",
          pt: "Leitura de outro dia — sem progresso de hoje.",
        })}
      </Text>
    );
  }

  return (
    <View style={{ marginTop: 6, gap: 4 }} testID={testID}>
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: t.colors.border,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            /* Cortado por força do desenho — o número abaixo é que diz a verdade. */
            width: `${larguraDaBarra(pr.fracao)}%`,
            height: 4,
            borderRadius: 2,
            backgroundColor: t.colors.primary,
          }}
        />
      </View>
      {passouDaMeta(pr.fracao) && (
        <Text
          variant="caption"
          color={t.colors.textSecondary}
          style={{ fontSize: 11 }}
          testID={testID ? `${testID}-acima` : undefined}
        >
          {tr(lang, {
            en: `${porCentoDaMeta(pr.fracao)}% of your goal`,
            pt: `${porCentoDaMeta(pr.fracao)}% da sua meta`,
          })}
        </Text>
      )}
    </View>
  );
}
