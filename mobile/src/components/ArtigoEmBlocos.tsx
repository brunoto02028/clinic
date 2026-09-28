import { View, Image } from "react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import type { BlocoDoArtigo } from "@/api/education";

/**
 * O artigo desenhado com a tipografia da casa (28/09/2026).
 *
 * ## O que havia antes
 *
 * O corpo do material vem em HTML — é o que o editor do site produz — e a tela
 * o entregava a um `<Text>`, que desenha o que recebe. O paciente lia
 * `<h2><span style="background-color: transparent…` e dezenas de `&nbsp;`.
 *
 * ## Por que blocos, e não HTML renderizado
 *
 * Um `WebView` ou uma biblioteca de HTML traria a tipografia do HTML junto —
 * um artigo clínico dentro de uma moldura que não é a do aplicativo parece um
 * site embutido, e não acompanha o modo escuro.
 *
 * Com blocos, o telefone desenha com a fonte, o espaçamento e as cores daqui.
 * A tradução mora no servidor (`lib/rich-text-blocks.ts`), num lugar só.
 */
export function ArtigoEmBlocos({ blocos }: { blocos: BlocoDoArtigo[] }) {
  const t = useTheme();

  return (
    <View style={{ gap: 14 }}>
      {blocos.map((b, i) => {
        switch (b.tipo) {
          case "titulo":
            return (
              <Text
                key={i}
                variant={b.nivel === 1 ? "title" : "subtitle"}
                style={{
                  // Um título encostado no parágrafo anterior não separa nada.
                  // O espaço acima é maior que o de baixo, de propósito: ele
                  // pertence ao que vem depois dele.
                  marginTop: i === 0 ? 0 : 10,
                  fontSize: b.nivel === 1 ? 22 : b.nivel === 2 ? 18 : 16,
                  lineHeight: b.nivel === 1 ? 29 : b.nivel === 2 ? 25 : 22,
                }}
              >
                {b.texto}
              </Text>
            );

          case "paragrafo":
            return (
              <Text key={i} variant="body" style={{ lineHeight: 25, fontSize: 15.5 }}>
                {b.texto}
              </Text>
            );

          case "lista":
            return (
              <View key={i} style={{ gap: 8 }}>
                {b.itens.map((item, j) => (
                  <View key={j} style={{ flexDirection: "row", gap: 10 }}>
                    <Text variant="body" color={t.colors.textMuted} style={{ lineHeight: 25, fontSize: 15.5 }}>
                      {b.ordenada ? `${j + 1}.` : "•"}
                    </Text>
                    <Text variant="body" style={{ flex: 1, lineHeight: 25, fontSize: 15.5 }}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            );

          case "citacao":
            return (
              <View
                key={i}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: t.colors.health,
                  paddingLeft: 14,
                  paddingVertical: 2,
                }}
              >
                <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 25, fontSize: 15.5, fontStyle: "italic" }}>
                  {b.texto}
                </Text>
              </View>
            );

          case "imagem":
            return (
              <View key={i} style={{ gap: 6 }}>
                <Image
                  source={{ uri: b.url }}
                  style={{ width: "100%", height: 200, borderRadius: t.radius.lg, backgroundColor: t.colors.surfaceMuted }}
                  resizeMode="cover"
                />
                {b.legenda ? (
                  <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 12 }}>
                    {b.legenda}
                  </Text>
                ) : null}
              </View>
            );

          case "separador":
            return (
              <View key={i} style={{ height: 1, backgroundColor: t.colors.border, marginVertical: 4 }} />
            );

          default:
            return null;
        }
      })}
    </View>
  );
}
