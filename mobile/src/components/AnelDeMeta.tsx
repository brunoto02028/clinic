/**
 * O anel de meta (118 T-10).
 *
 * Duas metades recortadas, cada uma com meio anel lá dentro, rodadas pelos
 * ângulos e pintadas nos lados que o `anel-calculo` manda. Sem
 * `react-native-svg`, porque instalá-lo mudaria o *fingerprint* nativo e o
 * `eas update` deixaria de chegar aos telemóveis que já têm o app.
 *
 * **Este ficheiro não decide nada.** Que lados da borda pintar, quanto rodar e
 * qual dos três estados mostrar sai todo de funções testadas — foi este JSX a
 * escolher os lados que fez o anel desenhar um quarto de volta onde queria
 * meia, com os cinco testes dos ângulos verdes.
 */
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import {
  estadoDoAnel,
  ladosPintados,
  percentagemDoAnel,
  rotacaoDaMetade,
  type LadoDoAnel,
} from "@/lib/anel-calculo";

export function AnelDeMeta({
  valor,
  meta,
  dia,
  cor,
  tamanho = 58,
  espessura = 5,
  testID,
}: {
  valor: number | null | undefined;
  meta: number | null | undefined;
  /**
   * O dia do valor, `YYYY-MM-DD`. A fila diz "Metas de **hoje**": sem o dia,
   * uma leitura de sábado desenhava o anel cheio numa terça parada.
   */
  dia?: string | null;
  /** A cor do pilar a que a métrica pertence. */
  cor: string;
  tamanho?: number;
  espessura?: number;
  testID?: string;
}) {
  const t = useTheme();
  const lang = useLang();
  const estado = estadoDoAnel(valor, meta, dia);
  const r = tamanho / 2;

  if (estado.tipo !== "progresso") {
    return (
      <View
        testID={testID}
        accessibilityLabel={
          estado.tipo === "sem-meta"
            ? tr(lang, { en: "no goal set", pt: "sem meta definida" })
            : tr(lang, { en: "not today's reading", pt: "leitura de outro dia" })
        }
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: r,
          /*
           * **Sem tracejado, de propósito.** `borderStyle: "dashed"` com
           * `borderRadius` não desenha tracejado em várias versões do React
           * Native — sai **sólido**. Um anel vazio sólido na cor do progresso
           * lê-se como meta cumprida, que é a mentira mais cara que esta tela
           * podia contar.
           *
           * O que distingue "sem meta" de "meta cheia" passa a ser a **cor**:
           * aqui só o trilho, nunca a cor do pilar. Isso não depende de
           * plataforma nenhuma. E é `border`, não `borderSubtle`: o trilho
           * apagado dava 1,10 contra o cartão escuro, o que fazia o círculo
           * desaparecer e deixava um travessão solto no meio do nada.
           */
          borderWidth: espessura,
          borderColor: t.colors.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 13, fontWeight: "600" }}>
          —
        </Text>
      </View>
    );
  }

  const a = estado.angulo;

  /** Meio anel dentro de um recorte de meio plano, rodado. */
  const metade = (lado: LadoDoAnel) => {
    const [um, outro] = ladosPintados(lado);
    const pinta = (qual: string) => (qual === um || qual === outro ? cor : "transparent");
    return (
      <View
        style={{
          position: "absolute",
          width: r,
          height: tamanho,
          left: lado === "direita" ? r : 0,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: tamanho,
            height: tamanho,
            marginLeft: lado === "direita" ? -r : 0,
            borderRadius: r,
            borderWidth: espessura,
            /*
             * **Dois lados adjacentes**, não um. As junções entre cores de lado
             * correm nas diagonais do quadrado: um lado só pinta 90° de arco.
             */
            borderTopColor: pinta("top"),
            borderRightColor: pinta("right"),
            borderBottomColor: pinta("bottom"),
            borderLeftColor: pinta("left"),
            transform: [{ rotate: `${rotacaoDaMetade(a, lado)}deg` }],
          }}
        />
      </View>
    );
  };

  return (
    <View
      testID={testID}
      accessibilityLabel={tr(lang, {
        en: `${percentagemDoAnel(a)} per cent of goal`,
        pt: `${percentagemDoAnel(a)} por cento da meta`,
      })}
      style={{ width: tamanho, height: tamanho, alignItems: "center", justifyContent: "center" }}
    >
      {/* O trilho, sempre visível por baixo. */}
      <View
        style={{
          position: "absolute",
          width: tamanho,
          height: tamanho,
          borderRadius: r,
          borderWidth: espessura,
          borderColor: t.colors.border,
        }}
      />
      {metade("direita")}
      {metade("esquerda")}

      <Text
        variant="caption"
        /* Cumprida, o número veste a cor do pilar — é o que marca o fecho. */
        color={a.completo ? cor : undefined}
        style={{ fontSize: 13, fontWeight: "700", letterSpacing: -0.3 }}
      >
        {percentagemDoAnel(a)}
        <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 9 }}>
          %
        </Text>
      </Text>
    </View>
  );
}
