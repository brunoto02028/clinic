/**
 * O dia hora a hora e a noite fase a fase (099 T-8).
 *
 * *"Com todas as informações e horas e minutos, assim como o pessoal da
 * Withings oferece."*
 *
 * Dois desenhos, com a mesma regra atravessando os dois: **mostra-se o que foi
 * medido e quando, e nunca se dá nota.** Nada de verde e âmbar por faixa de
 * referência — foi o que se tirou da tela na T-2, e não volta pela porta dos
 * fundos num gráfico.
 *
 * Desenhado com `View`, como a tendência: o app não tem biblioteca de gráficos
 * e uma dependência nova para duas faixas não se justifica.
 */
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
/*
 * As contas vivem em `@/lib/dia-e-noite-calculo`, e este ficheiro só desenha.
 *
 * Tê-las aqui dentro era uma **cópia**: o teste exercia o módulo e o ecrã corria
 * a cópia, então uma divergência entre os dois passaria verde. É o mesmo erro
 * que já me mordeu com o seed dos exames.
 */
import {
  horasDoDia,
  totaisPorFase,
  despertares,
  PontoDoDia,
  TrechoDaNoite,
} from "@/lib/dia-e-noite-calculo";

export type { PontoDoDia, TrechoDaNoite };

/* ──────────────────────────────── o dia ──────────────────────────────── */

/**
 * As 24 horas do dia, com buraco onde não houve medição.
 *
 * **"Ainda não aconteceu" e "não foi medido" têm de parecer diferentes.** Às
 * nove da manhã o resto do dia está vazio porque ainda não chegou; às nove da
 * noite, um vazio às três da tarde é o relógio fora do pulso. Desenhar os dois
 * iguais faz a pessoa procurar um defeito que não existe — ou ignorar um que
 * existe.
 */
export function ODia({
  pontos,
  minutosPorPonto,
  ehHoje,
}: {
  pontos: PontoDoDia[];
  minutosPorPonto: number;
  ehHoje: boolean;
}) {
  const t = useTheme();
  const lang = useLang();

  if (pontos.length === 0) {
    return (
      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 12 }}>
        {tr(lang, { en: "No readings for this day.", pt: "Sem leituras neste dia." })}
      </Text>
    );
  }

  const horas = horasDoDia(pontos, { ehHoje, horaAgora: new Date().getHours() });

  /*
   * **A escala sai do que é desenhado, não do que foi medido.**
   *
   * As barras são médias por hora; o mínimo e o máximo vinham dos pontos de
   * cinco minutos. Uma média horária nunca alcança o extremo de um ponto
   * isolado, então todas as barras ficavam apertadas no meio da altura e o
   * gráfico subestimava a variação do dia — um erro silencioso, porque o
   * desenho continua plausível.
   *
   * A frase por baixo continua a citar os extremos **medidos**, que é a
   * informação verdadeira sobre o dia; a altura é que passa a ser coerente
   * com o que está desenhado.
   */
  const mediasHorarias = horas.map((h) => h.hr).filter((x): x is number => x !== null);
  const maxBarra = mediasHorarias.length ? Math.max(...mediasHorarias) : 0;
  const minBarra = mediasHorarias.length ? Math.min(...mediasHorarias) : 0;
  const faixa = maxBarra - minBarra || 1;

  const hrs = pontos.map((p) => p.hr).filter((x): x is number => x !== null);
  const maxHr = hrs.length ? Math.max(...hrs) : 0;
  const minHr = hrs.length ? Math.min(...hrs) : 0;

  const passosTotal = pontos.reduce((s, p) => s + (p.steps ?? 0), 0);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 1, height: 58 }}>
        {horas.map((h) => {
          if (h.futuro) {
            /* Ainda não aconteceu: nada desenhado, só o espaço guardado. */
            return <View key={h.hora} style={{ flex: 1 }} />;
          }
          if (h.hr === null) {
            /* Medido não foi: traço na base, como na tendência. */
            return (
              <View
                key={h.hora}
                style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: t.colors.border }}
              />
            );
          }
          const altura = 8 + ((h.hr - minBarra) / faixa) * 46;
          return (
            <View
              key={h.hora}
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

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {["00", "06", "12", "18", "23"].map((h) => (
          <Text key={h} variant="caption" color={t.colors.textSecondary} style={{ fontSize: 10 }}>
            {h}h
          </Text>
        ))}
      </View>

      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 12, lineHeight: 17 }}>
        {hrs.length > 0
          ? tr(lang, {
              en: `Heart rate between ${Math.round(minHr)} and ${Math.round(maxHr)} bpm, hour by hour.`,
              pt: `Frequência cardíaca entre ${Math.round(minHr)} e ${Math.round(maxHr)} bpm, hora a hora.`,
            })
          : tr(lang, { en: "No heart rate for this day.", pt: "Sem frequência cardíaca neste dia." })}
        {passosTotal > 0
          ? tr(lang, {
              en: ` ${passosTotal.toLocaleString()} steps.`,
              pt: ` ${passosTotal.toLocaleString()} passos.`,
            })
          : ""}
      </Text>

      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 11 }}>
        {tr(lang, {
          en: `Each bar is one hour; the reading itself is every ${minutosPorPonto} minutes.`,
          pt: `Cada barra é uma hora; a leitura é de ${minutosPorPonto} em ${minutosPorPonto} minutos.`,
        })}
      </Text>
    </View>
  );
}

/* ─────────────────────────────── a noite ─────────────────────────────── */

const NOME_DA_FASE: Record<number, { en: string; pt: string }> = {
  0: { en: "Awake", pt: "Acordado" },
  1: { en: "Light", pt: "Leve" },
  2: { en: "Deep", pt: "Profundo" },
  3: { en: "REM", pt: "REM" },
};

/**
 * A noite, trecho a trecho.
 *
 * **A forma da noite é o que se lê.** "6h30 de sono" não distingue uma noite
 * inteira de seis blocos partidos, e é a diferença que a pessoa sente ao
 * acordar. Os totais continuam por baixo, porque são a resposta curta.
 *
 * A altura de cada faixa diz a profundidade — acordado em cima, profundo em
 * baixo — que é como um hipnograma se lê em qualquer lado. **Não é uma nota:**
 * nenhuma fase é "boa", e nenhuma cor aqui quer dizer "melhor".
 */
export function ANoite({ trechos }: { trechos: TrechoDaNoite[] }) {
  const t = useTheme();
  const lang = useLang();

  if (trechos.length === 0) {
    return (
      <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 12 }}>
        {tr(lang, { en: "No sleep recorded for this night.", pt: "Sem sono registado nesta noite." })}
      </Text>
    );
  }

  const inicio = trechos[0].inicio;
  const fim = trechos[trechos.length - 1].fim;
  const total = Math.max(1, fim - inicio);

  /** Quatro degraus: acordado no topo, profundo no fundo. */
  const alturaDaFase = (fase: number) => ({ 0: 14, 3: 26, 1: 38, 2: 50 }[fase] ?? 20);

  const porFase = totaisPorFase(trechos);
  const acordou = despertares(trechos);

  const hhmm = (epoch: number) => {
    const d = new Date(epoch * 1000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const dur = (seg: number) => {
    const m = Math.round(seg / 60);
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 54, gap: 1 }}>
        {trechos.map((tr_, i) => (
          <View
            key={`${tr_.inicio}-${i}`}
            style={{
              flex: Math.max(1, Math.round(((tr_.fim - tr_.inicio) / total) * 1000)),
              height: alturaDaFase(tr_.fase),
              borderRadius: 2,
              backgroundColor: tr_.fase === 0 ? t.colors.border : t.colors.primary,
              opacity: tr_.fase === 0 ? 1 : 0.35 + tr_.fase * 0.2,
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 10 }}>
          {hhmm(inicio)}
        </Text>
        <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 10 }}>
          {hhmm(fim)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {acordou > 0 && (
          <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 12 }}>
            {tr(lang, {
              en: `Woke ${acordou}×`,
              pt: `Acordou ${acordou}×`,
            })}
          </Text>
        )}
        {[2, 3, 1, 0].map((fase) => {
          const seg = porFase[fase];
          if (!seg) return null;
          const nome = NOME_DA_FASE[fase] ?? { en: String(fase), pt: String(fase) };
          return (
            <Text
              key={fase}
              variant="caption"
              color={t.colors.textSecondary}
              style={{ fontSize: 12 }}
            >
              {tr(lang, nome)} {dur(seg)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
