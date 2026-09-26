import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Variant = "hero" | "title" | "heading" | "subtitle" | "body" | "label" | "caption" | "eyebrow";

export interface TextProps extends RNTextProps {
  variant?: Variant;
  muted?: boolean;
  color?: string;
}

/**
 * A escala de texto do app.
 *
 * **Ela subiu em 26/09/2026.** O corpo era 11,5 e a legenda 10,5 — números de
 * página web vistos de perto, não de telefone na mão de alguém com dor. O Bruno
 * olhou a tela do laboratório no aparelho e a queixa foi direta: não dá para
 * enxergar. Subiu a ponta de baixo mais que a de cima, porque era lá que
 * apertava: o corpo ganhou 22%, o título 10%.
 *
 * Referência: o corpo padrão do iOS é 17pt. Mesmo depois desta subida estamos
 * abaixo disso — é um passo, não a chegada.
 */
const SIZES: Record<Variant, { size: number; weight: string; family: "display" | "body"; letterSpacing?: number }> = {
  hero: { size: 32, weight: "800", family: "display", letterSpacing: -1 },
  title: { size: 21, weight: "700", family: "display", letterSpacing: -0.3 },
  heading: { size: 16, weight: "600", family: "display" },
  subtitle: { size: 18.5, weight: "700", family: "display", letterSpacing: -0.2 },
  body: { size: 14, weight: "400", family: "body" },
  label: { size: 13.5, weight: "600", family: "body" },
  caption: { size: 12, weight: "500", family: "body" },
  eyebrow: { size: 10.5, weight: "700", family: "body", letterSpacing: 0.8 },
};

const FONT_MAP: Record<string, Record<string, string>> = {
  display: {
    "400": "Sora_400Regular",
    "500": "Sora_500Medium",
    "600": "Sora_600SemiBold",
    "700": "Sora_700Bold",
    "800": "Sora_800ExtraBold",
  },
  body: {
    "400": "Inter_400Regular",
    "500": "Inter_500Medium",
    "600": "Inter_600SemiBold",
    "700": "Inter_700Bold",
  },
};

/**
 * A altura de linha é **calculada**, não tabelada.
 *
 * Sem `lineHeight`, o iOS deixa a caixa de texto na métrica da fonte, e Sora e
 * Inter têm ascendente e descendente maiores que o normal: os glifos saíam
 * cortados em cima e embaixo no aparelho do Bruno, enquanto o navegador
 * desenhava tudo certo. Era por isso que eu não achava medindo aqui.
 *
 * Ela sai do tamanho **efetivo**, e não do tamanho da variante, porque dezenas
 * de chamadas passam `style={{ fontSize: N }}` por cima. Uma altura tabelada na
 * variante seria pequena demais justamente para quem aumentou a fonte na mão —
 * o corte de volta, pela porta dos fundos.
 */
function alturaDaLinha(size: number, family: "display" | "body"): number {
  return Math.round(size * (family === "display" ? 1.28 : 1.45));
}

export function Text({ variant = "body", muted, color, style, ...rest }: TextProps) {
  const t = useTheme();
  const v = SIZES[variant];
  const fontFamily = FONT_MAP[v.family]?.[v.weight] ?? (v.family === "display" ? "Sora_700Bold" : "Inter_400Regular");

  const passado = StyleSheet.flatten(style) as TextStyle | undefined;
  const size = typeof passado?.fontSize === "number" ? passado.fontSize : v.size;
  const lineHeight =
    typeof passado?.lineHeight === "number" ? passado.lineHeight : alturaDaLinha(size, v.family);

  return (
    <RNText
      style={[
        {
          fontSize: v.size,
          fontFamily,
          color: color ?? (muted ? t.colors.textMuted : t.colors.text),
          letterSpacing: v.letterSpacing,
          lineHeight,
        },
        style,
      ]}
      {...rest}
    />
  );
}
