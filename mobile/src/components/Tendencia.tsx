/**
 * A tendência de uma métrica ao longo do período (099 T-2).
 *
 * *"Um número solto não diz nada a ninguém: 62 bpm de repouso é bom ou ruim
 * conforme o que ele era há três semanas."*
 *
 * ## Três decisões que são o ponto da tarefa
 *
 * **Dia sem dado é buraco, não zero.** Uma noite sem o relógio no pulso não é
 * uma noite sem sono, e desenhá-la como barra de altura zero inventa uma queda
 * que não houve. Aqui um dia sem leitura é um traço fino na linha de base, numa
 * cor apagada — visivelmente *ausência*, não *fundo*.
 *
 * **Sem semáforo.** A tela do paciente não pinta valor de verde ou de âmbar.
 * Faixa de referência é leitura clínica, e uma cor é uma afirmação: a tela
 * anterior pintava SpO2 de 95% em âmbar, que é um valor normal. O que se mostra
 * é o que foi medido e como mudou.
 *
 * **A comparação diz o que compara.** Não "melhorou": *"a média dos últimos
 * dias, comparada à dos primeiros"*, com o número e a unidade. Uma frase que
 * não diz a sua base é um palpite com aparência de facto.
 *
 * Desenhado com `View` — o app não tem biblioteca de gráficos, e um dependência
 * nova para sete barras não se justifica.
 */
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

export { variacaoDoPeriodo } from "@/lib/tendencia-calculo";
export type { PontoDaSerie } from "@/lib/tendencia-calculo";
import { variacaoDoPeriodo, PontoDaSerie } from "@/lib/tendencia-calculo";

export function Tendencia({
  pontos,
  unidade,
  casas = 0,
  /** Quando `true`, o eixo começa no zero. Para passos faz sentido; para FC não. */
  deZero = false,
}: {
  pontos: PontoDaSerie[];
  unidade: string;
  casas?: number;
  deZero?: boolean;
}) {
  const t = useTheme();
  const lang = useLang();

  const valores = pontos.map((p) => p.valor).filter((v): v is number => v !== null);
  if (valores.length === 0) {
    return (
      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 12 }}>
        {tr(lang, { en: "No readings in this period.", pt: "Sem leituras neste período." })}
      </Text>
    );
  }

  const max = Math.max(...valores);
  const min = deZero ? 0 : Math.min(...valores);
  /** Faixa nunca zero: uma série constante desenha todas as barras no meio. */
  const faixa = max - min || 1;

  const v = variacaoDoPeriodo(pontos);
  const num = (x: number) => x.toFixed(casas);

  const frase = v
    ? Math.abs(v.delta) < Math.pow(10, -casas) / 2
      ? tr(lang, {
          en: `About the same as at the start of the period (${v.diasComparados}-day averages).`,
          pt: `Praticamente igual ao início do período (médias de ${v.diasComparados} dias).`,
        })
      : tr(lang, {
          en: `${num(Math.abs(v.delta))} ${unidade} ${v.delta > 0 ? "higher" : "lower"} than at the start of the period (${v.diasComparados}-day averages: ${num(v.antigo)} → ${num(v.recente)}).`,
          pt: `${num(Math.abs(v.delta))} ${unidade} ${v.delta > 0 ? "acima" : "abaixo"} do início do período (médias de ${v.diasComparados} dias: ${num(v.antigo)} → ${num(v.recente)}).`,
        })
    : tr(lang, {
        en: "Not enough days yet to compare.",
        pt: "Ainda não há dias suficientes para comparar.",
      });

  const semLeitura = pontos.filter((p) => p.valor === null).length;

  return (
    <View style={{ gap: 7 }}>
      <View
        style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 46 }}
        accessibilityRole="image"
        accessibilityLabel={frase}
      >
        {pontos.map((p) => {
          if (p.valor === null) {
            /* Buraco: um traço na base, apagado. Não é uma barra de altura zero. */
            return (
              <View
                key={p.dia}
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: t.colors.border,
                }}
              />
            );
          }
          const altura = 6 + ((p.valor - min) / faixa) * 38;
          return (
            <View
              key={p.dia}
              style={{
                flex: 1,
                height: altura,
                borderRadius: 2,
                backgroundColor: t.colors.primary,
                opacity: 0.85,
              }}
            />
          );
        })}
      </View>

      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 12, lineHeight: 17 }}>
        {frase}
      </Text>

      {semLeitura > 0 && (
        <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
          {tr(lang, {
            en: `${semLeitura} day${semLeitura === 1 ? "" : "s"} without a reading — shown as a gap, not as zero.`,
            pt: `${semLeitura} dia${semLeitura === 1 ? "" : "s"} sem leitura — mostrado como buraco, não como zero.`,
          })}
        </Text>
      )}
    </View>
  );
}
